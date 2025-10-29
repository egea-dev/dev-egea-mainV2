import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

type ConversationSummaryRow = {
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  last_message: string | null;
  last_message_time: string | null;
  unread_count: number | null;
  total_conversations?: number;
};

const CONVERSATIONS_PAGE_SIZE = 20;
const ENABLE_REALTIME = false;

export const useDirectMessages = (options: { enabled?: boolean } = {}) => {
  const { enabled = true } = options;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<DirectMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [realtimeAvailable, setRealtimeAvailable] = useState(ENABLE_REALTIME);

  const paginationRef = useRef<{ page: number; hasMore: boolean; total: number }>({
    page: -1,
    hasMore: true,
    total: 0,
  });
  const fetchingConversationsRef = useRef(false);
  const realtimeFallbackRef = useRef(false);

  const loading = loadingConversations || loadingMessages;

  const unreadCount = useMemo(
    () => conversations.reduce((sum, conversation) => sum + (conversation.unread_count ?? 0), 0),
    [conversations]
  );

  const hydrateCurrentUser = useCallback(async () => {
    if (!enabled) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error getting current user profile:', error);
        return;
      }

      if (profile?.id) {
        setCurrentUserId(profile.id);
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    hydrateCurrentUser();
  }, [hydrateCurrentUser, enabled]);

  const mergeConversations = useCallback((existing: Conversation[], incoming: Conversation[]) => {
    const map = new Map<string, Conversation>();

    existing.forEach((conversation) => {
      map.set(conversation.user_id, conversation);
    });

    incoming.forEach((conversation) => {
      const previous = map.get(conversation.user_id);
      map.set(conversation.user_id, {
        ...previous,
        ...conversation,
        is_online: previous?.is_online ?? conversation.is_online,
      });
    });

    return Array.from(map.values()).sort((a, b) => {
      const aTime = new Date(a.last_message_time).getTime();
      const bTime = new Date(b.last_message_time).getTime();
      return bTime - aTime;
    });
  }, []);

  const loadConversations = useCallback(
    async ({ reset = false }: { reset?: boolean } = {}) => {
      if (!enabled || !currentUserId) return;

      const pagination = paginationRef.current;

      if (!reset && (!pagination.hasMore || fetchingConversationsRef.current)) {
        return;
      }

      const targetPage = reset ? 0 : pagination.page + 1;
      if (reset) {
        paginationRef.current = { page: -1, hasMore: true, total: 0 };
      }

      fetchingConversationsRef.current = true;
      setLoadingConversations(true);

      try {
        const { data, error } = await supabase.rpc('get_direct_message_conversations', {
          p_profile_id: currentUserId,
          p_limit: CONVERSATIONS_PAGE_SIZE,
          p_offset: targetPage * CONVERSATIONS_PAGE_SIZE,
        });

        if (error) throw error;

        const rows = (data ?? []) as ConversationSummaryRow[];
        const mapped = rows.map<Conversation>((row) => ({
          user_id: row.user_id,
          user_name: row.user_name,
          user_avatar: row.user_avatar,
          last_message: row.last_message ?? '',
          last_message_time: row.last_message_time ?? new Date(0).toISOString(),
          unread_count: row.unread_count ?? 0,
          is_online: false,
        }));

        const total =
          rows.length > 0 && typeof rows[0]?.total_conversations === 'number'
            ? Number(rows[0]?.total_conversations)
            : reset
            ? mapped.length
            : pagination.total;
        const hasMore = total > (targetPage + 1) * CONVERSATIONS_PAGE_SIZE;

        setConversations((previous) => (reset ? mapped : mergeConversations(previous, mapped)));
        paginationRef.current = { page: targetPage, hasMore, total };
      } catch (error) {
        console.error('Error fetching conversations:', error);
        toast.error('Error al cargar conversaciones');
      } finally {
        fetchingConversationsRef.current = false;
        setLoadingConversations(false);
      }
  },
  [currentUserId, enabled, mergeConversations]
  );

  useEffect(() => {
    if (!enabled || !currentUserId) return;
    loadConversations({ reset: true });
  }, [currentUserId, enabled, loadConversations]);

  const markMessagesAsRead = useCallback(
    async (senderId: string) => {
      if (!currentUserId || !senderId) return;

      try {
        const { error } = await supabase.rpc('mark_messages_read', {
          p_sender_id: senderId,
        });

        if (error) throw error;

        setConversations((previous) =>
          previous.map((conversation) =>
            conversation.user_id === senderId ? { ...conversation, unread_count: 0 } : conversation
          )
        );
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    },
    [currentUserId]
  );

  const fetchConversation = useCallback(
    async (userId: string) => {
      if (!currentUserId || !userId) return;

      setSelectedUserId(userId);
      setLoadingMessages(true);

      try {
        const { data, error } = await supabase.rpc('get_conversation', {
          user1_id: currentUserId,
          user2_id: userId,
          limit_count: 50,
        });

        if (error) throw error;

        setCurrentConversation(data || []);
        await markMessagesAsRead(userId);
        loadConversations({ reset: true });
      } catch (error) {
        console.error('Error fetching conversation:', error);
        toast.error('Error al cargar conversación');
      } finally {
        setLoadingMessages(false);
      }
    },
    [currentUserId, loadConversations, markMessagesAsRead]
  );

  const sendMessage = useCallback(
    async (
      recipientId: string,
      content: string,
      messageType: 'text' | 'image' | 'file' | 'system' = 'text',
      metadata?: Record<string, unknown>
    ) => {
      if (!currentUserId || !content.trim()) return;

      try {
        const { data, error } = await supabase.rpc('send_direct_message', {
          p_recipient_id: recipientId,
          p_content: content.trim(),
          p_message_type: messageType,
          ...(metadata ? { p_metadata: metadata } : {}),
        });

        if (error) throw error;

        if (data?.[0]?.success) {
          await fetchConversation(recipientId);
          loadConversations({ reset: true });
          return data[0].message_id as string | undefined;
        }

        throw new Error(data?.[0]?.error_message || 'Error al enviar mensaje');
      } catch (error) {
        console.error('Error sending message:', error);
        toast.error('Error al enviar mensaje');
        throw error;
      }
    },
    [currentUserId, fetchConversation, loadConversations]
  );

  const loadMoreConversations = useCallback(async () => {
    await loadConversations();
  }, [loadConversations]);

  const refreshConversations = useCallback(async () => {
    await loadConversations({ reset: true });
  }, [loadConversations]);

  useEffect(() => {
    if (!currentUserId || !realtimeAvailable) return;

    const newChannel = supabase
      .channel(`direct-messages-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `recipient_id=eq.${currentUserId}`,
        },
        (payload) => {
          const newMessage = payload.new as { sender_id: string; content: string };
          if (!newMessage?.sender_id) return;

          if (selectedUserId === newMessage.sender_id) {
            fetchConversation(newMessage.sender_id);
          } else {
            toast.info('Nuevo mensaje recibido');
          }
          loadConversations({ reset: true });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') return;
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          if (!realtimeFallbackRef.current) {
            realtimeFallbackRef.current = true;
            setRealtimeAvailable(false);
            toast.warning('Realtime no disponible; se usara una recarga periodica.');
          }
        }
      });

    return () => {
      supabase.removeChannel(newChannel);
    };
  }, [currentUserId, loadConversations, fetchConversation, selectedUserId, realtimeAvailable]);


  useEffect(() => {
    if (realtimeAvailable) return;

    const interval = setInterval(() => {
      loadConversations({ reset: true });
      if (selectedUserId) {
        fetchConversation(selectedUserId);
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, [realtimeAvailable, loadConversations, fetchConversation, selectedUserId]);

  return {
    conversations,
    currentConversation,
    loading,
    unreadCount,
    selectedUserId,
    fetchConversation,
    sendMessage,
    markMessagesAsRead,
    setSelectedUserId,
    loadMoreConversations,
    hasMoreConversations: paginationRef.current.hasMore,
    refreshConversations,
  };
};
