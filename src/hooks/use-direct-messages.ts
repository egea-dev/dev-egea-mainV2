import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';

export interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
  sender_name: string;
  sender_avatar: string | null;
  is_sent: boolean;
}

export interface Conversation {
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  is_online: boolean;
}

export const useDirectMessages = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // Obtener el ID del usuario actual
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('auth_user_id', user.id)
            .single();
          
          if (profile) {
            setCurrentUserId(profile.id);
          }
        }
      } catch (error) {
        console.error('Error getting current user:', error);
      }
    };

    getCurrentUser();
  }, []);

  // Configurar Realtime para recibir mensajes en tiempo real
  useEffect(() => {
    if (!currentUserId) return;

    const newChannel = supabase
      .channel('direct_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `recipient_id=eq.${currentUserId}`
        },
        (payload) => {
          const newMessage = payload.new as DirectMessage;
          
          // Si es del usuario seleccionado, añadir a la conversación actual
          if (selectedUserId === newMessage.sender_id) {
            setCurrentConversation(prev => [newMessage, ...prev]);
            // Marcar como leído automáticamente
            markMessagesAsRead(newMessage.sender_id);
          } else {
            // Actualizar lista de conversaciones y contador de no leídos
            fetchConversations();
            setUnreadCount(prev => prev + 1);
          }
          
          // Mostrar notificación
          toast.success(`Nuevo mensaje de ${newMessage.sender_name}`);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'direct_messages',
          filter: `recipient_id=eq.${currentUserId}`
        },
        () => {
          // Actualizar contador de no leídos cuando se marcan como leídos
          fetchUnreadCount();
        }
      )
      .subscribe();

    setChannel(newChannel);

    return () => {
      if (newChannel) {
        supabase.removeChannel(newChannel);
      }
    };
  }, [currentUserId, selectedUserId]);

  // Obtener conversaciones
  const fetchConversations = useCallback(async () => {
    if (!currentUserId) return;

    try {
      setLoading(true);
      
      // Obtener usuarios con los que se ha tenido conversación
      const { data: conversationsData, error } = await supabase
        .from('direct_messages')
        .select(`
          sender_id,
          recipient_id,
          content,
          created_at,
          sender:profiles!direct_messages_sender_id_fkey(
            id,
            full_name,
            avatar_url
          )
        `)
        .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Procesar conversaciones únicas
      const conversationsMap = new Map<string, Conversation>();
      
      conversationsData?.forEach((msg: any) => {
        const otherUserId = msg.sender_id === currentUserId ? msg.recipient_id : msg.sender_id;
        const otherUser = msg.sender;
        
        if (!conversationsMap.has(otherUserId) && otherUser) {
          conversationsMap.set(otherUserId, {
            user_id: otherUserId,
            user_name: otherUser.full_name,
            user_avatar: otherUser.avatar_url,
            last_message: msg.content,
            last_message_time: msg.created_at,
            unread_count: 0,
            is_online: false
          });
        }
      });

      // Contar mensajes no leídos por conversación
      for (const [userId, conversation] of conversationsMap) {
        const { count } = await supabase
          .from('direct_messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_id', userId)
          .eq('recipient_id', currentUserId)
          .is('read_at', null);

        conversation.unread_count = count || 0;
      }

      setConversations(Array.from(conversationsMap.values()));
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast.error('Error al cargar conversaciones');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  // Obtener mensajes de una conversación específica
  const fetchConversation = useCallback(async (userId: string) => {
    if (!currentUserId) return;

    try {
      setLoading(true);
      setSelectedUserId(userId);

      const { data, error } = await supabase
        .rpc('get_conversation', {
          user1_id: currentUserId,
          user2_id: userId,
          limit_count: 50
        });

      if (error) throw error;

      setCurrentConversation(data || []);
      
      // Marcar mensajes como leídos
      await markMessagesAsRead(userId);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      toast.error('Error al cargar conversación');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  // Enviar mensaje
  const sendMessage = useCallback(async (recipientId: string, content: string, messageType: 'text' | 'image' | 'file' | 'system' = 'text') => {
    if (!currentUserId || !content.trim()) return;

    try {
      const { data, error } = await supabase
        .rpc('send_direct_message', {
          p_recipient_id: recipientId,
          p_content: content.trim(),
          p_message_type: messageType
        });

      if (error) throw error;

      if (data?.[0]?.success) {
        // Si es la conversación actual, actualizarla
        if (selectedUserId === recipientId) {
          fetchConversation(recipientId);
        }
        // Actualizar lista de conversaciones
        fetchConversations();
        
        return data[0].message_id;
      } else {
        throw new Error(data?.[0]?.error_message || 'Error al enviar mensaje');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error al enviar mensaje');
      throw error;
    }
  }, [currentUserId, selectedUserId]);

  // Marcar mensajes como leídos
  const markMessagesAsRead = useCallback(async (senderId: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .rpc('mark_messages_read', {
          p_sender_id: senderId
        });

      if (error) throw error;

      // Actualizar contador de no leídos
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [currentUserId]);

  // Obtener contador de mensajes no leídos
  const fetchUnreadCount = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const { data, error } = await supabase
        .rpc('get_unread_count');

      if (error) throw error;

      setUnreadCount(data || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [currentUserId]);

  // Cargar datos iniciales
  useEffect(() => {
    if (currentUserId) {
      fetchConversations();
      fetchUnreadCount();
    }
  }, [currentUserId, fetchConversations, fetchUnreadCount]);

  return {
    conversations,
    currentConversation,
    loading,
    unreadCount,
    selectedUserId,
    fetchConversations,
    fetchConversation,
    sendMessage,
    markMessagesAsRead,
    setSelectedUserId
  };
};