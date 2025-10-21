import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MessageCircle, User, ArrowLeft, RefreshCcw } from 'lucide-react';
import { useDirectMessages, Conversation, DirectMessage } from '@/hooks/use-direct-messages';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/badges';

interface DirectMessagesChatProps {
  onBack?: () => void;
}

export const DirectMessagesChat = ({ onBack }: DirectMessagesChatProps) => {
  const {
    conversations,
    currentConversation,
    loading,
    unreadCount,
    selectedUserId,
    fetchConversation,
    sendMessage,
    setSelectedUserId,
    loadMoreConversations,
    hasMoreConversations,
    refreshConversations
  } = useDirectMessages();

  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll al final de los mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation]);

  // Enviar mensaje
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedUserId || sendingMessage) return;

    setSendingMessage(true);
    try {
      await sendMessage(selectedUserId, messageInput.trim());
      setMessageInput('');
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleRefreshConversations = () => {
    refreshConversations();
  };

  // Manejar Enter para enviar mensaje
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Seleccionar conversación
  const handleSelectConversation = (conversation: Conversation) => {
    fetchConversation(conversation.user_id);
  };

  // Formatear hora del mensaje
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return format(date, 'HH:mm', { locale: es });
    } else {
      return format(date, 'dd/MM HH:mm', { locale: es });
    }
  };

  if (!selectedUserId) {
    // Vista de lista de conversaciones
    return (
      <Card className="h-[600px] flex flex-col">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Mensajes Directos
              {unreadCount > 0 && (
                <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {unreadCount}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleRefreshConversations} disabled={loading}>
                <RefreshCcw className="h-4 w-4" />
              </Button>
              {onBack && (
                <Button variant="ghost" size="sm" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">
                Cargando conversaciones...
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No tienes conversaciones aún</p>
                <p className="text-sm">Selecciona un usuario para empezar a chatear</p>
              </div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.user_id}
                    onClick={() => handleSelectConversation(conversation)}
                    className={cn(
                      "flex items-center gap-3 p-4 hover:bg-accent cursor-pointer transition-colors",
                      "border-b last:border-b-0"
                    )}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={conversation.user_avatar || ''} />
                      <AvatarFallback>
                        {conversation.user_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">{conversation.user_name}</p>
                        <span className="text-xs text-muted-foreground">
                          {formatMessageTime(conversation.last_message_time)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm text-muted-foreground truncate">
                          {conversation.last_message}
                        </p>
                        {conversation.unread_count > 0 && (
                          <Badge variant="destructive" className="h-5 px-2 text-xs">
                            {conversation.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          {hasMoreConversations && (
            <div className="p-4 pt-2">
              <Button
                variant="ghost"
                className="w-full"
                onClick={loadMoreConversations}
                disabled={loading}
              >
                {loading ? 'Cargando...' : 'Cargar más'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Vista de conversación individual
  const selectedConversation = conversations.find(c => c.user_id === selectedUserId);

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-4 border-b">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedUserId(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <Avatar className="h-10 w-10">
            <AvatarImage src={selectedConversation?.user_avatar || ''} />
            <AvatarFallback>
              {selectedConversation?.user_name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-medium">{selectedConversation?.user_name}</p>
            <p className="text-sm text-muted-foreground">En línea</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 flex flex-col">
        <ScrollArea className="flex-1 p-4">
          {loading ? (
            <div className="text-center text-muted-foreground">
              Cargando mensajes...
            </div>
          ) : currentConversation.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay mensajes en esta conversación</p>
              <p className="text-sm">Envía el primer mensaje para empezar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentConversation.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.is_sent ? "justify-end" : "justify-start"
                  )}
                >
                  {!message.is_sent && (
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarImage src={message.sender_avatar || ''} />
                      <AvatarFallback className="text-xs">
                        {message.sender_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "max-w-[70%] rounded-lg px-4 py-2",
                      message.is_sent
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p
                      className={cn(
                        "text-xs mt-1",
                        message.is_sent
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      )}
                    >
                      {formatMessageTime(message.created_at)}
                      {!message.is_sent && !message.read_at && (
                        <span className="ml-2">✓✓</span>
                      )}
                    </p>
                  </div>
                  {message.is_sent && (
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarFallback className="text-xs">YO</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe un mensaje..."
              disabled={sendingMessage}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!messageInput.trim() || sendingMessage}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
