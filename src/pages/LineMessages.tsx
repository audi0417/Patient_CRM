/**
 * LINE 訊息管理頁面
 * 包含對話列表和聊天介面
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { lineApi, Conversation, LineMessage } from '@/lib/api/lineApi';
import {
  Loader2,
  Send,
  MessageSquare,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Smile,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const LineMessages = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<LineMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 載入對話列表
  useEffect(() => {
    loadConversations();
    // 每 30 秒自動重新載入
    const interval = setInterval(loadConversations, 30000);
    return () => clearInterval(interval);
  }, []);

  // 當選擇對話時載入訊息
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      // 每 10 秒自動重新載入訊息
      const interval = setInterval(() => {
        loadMessages(selectedConversation.id);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  // 自動捲動到最新訊息
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const response = await lineApi.conversations.getAll({ status: 'ACTIVE' });
      if (response.success && response.data) {
        setConversations(response.data);
      }
    } catch (error: any) {
      console.error('載入對話失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      setLoadingMessages(true);
      const response = await lineApi.conversations.getMessages(conversationId, {
        limit: 100,
      });
      if (response.success && response.data) {
        setMessages(response.data);
      }
    } catch (error: any) {
      toast({
        title: '載入訊息失敗',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation) {
      return;
    }

    try {
      setSending(true);
      const response = await lineApi.messages.sendText({
        patientId: selectedConversation.patientId,
        text: messageText,
      });

      if (response.success) {
        setMessageText('');
        // 重新載入訊息
        await loadMessages(selectedConversation.id);
        toast({
          title: '訊息已送出',
        });
      }
    } catch (error: any) {
      toast({
        title: '傳送失敗',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT':
        return <Clock className="h-3 w-3 text-gray-400" />;
      case 'DELIVERED':
        return <CheckCircle2 className="h-3 w-3 text-blue-500" />;
      case 'READ':
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case 'FAILED':
        return <XCircle className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return <Badge variant="destructive">緊急</Badge>;
      case 'HIGH':
        return <Badge variant="default" className="bg-orange-500">重要</Badge>;
      case 'MEDIUM':
        return <Badge variant="secondary">一般</Badge>;
      case 'LOW':
        return <Badge variant="outline">低</Badge>;
      default:
        return null;
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '剛才';
    if (diffMins < 60) return `${diffMins} 分鐘前`;
    if (diffHours < 24) return `${diffHours} 小時前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    return date.toLocaleDateString('zh-TW');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">LINE 訊息</h1>
        <p className="text-muted-foreground mt-2">與患者進行即時對話</p>
      </div>

      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
        {/* 對話列表 */}
        <Card className="col-span-4 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>對話列表</span>
              <Badge variant="secondary">{conversations.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mb-4" />
                  <p>目前沒有對話</p>
                </div>
              ) : (
                <div className="divide-y">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={cn(
                        'p-4 cursor-pointer hover:bg-accent transition-colors',
                        selectedConversation?.id === conversation.id && 'bg-accent'
                      )}
                      onClick={() => setSelectedConversation(conversation)}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium truncate">
                              {conversation.patientName || '未知患者'}
                            </p>
                            {getPriorityBadge(conversation.priority)}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {conversation.lastMessagePreview || '尚無訊息'}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">
                              {formatTime(conversation.lastMessageAt)}
                            </span>
                            {conversation.unreadCount > 0 && (
                              <Badge variant="destructive" className="h-5 min-w-5 px-1">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* 聊天介面 */}
        <Card className="col-span-8 flex flex-col">
          {selectedConversation ? (
            <>
              {/* 聊天標題 */}
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">
                        {selectedConversation.patientName || '未知患者'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedConversation.status === 'ACTIVE' ? '線上' : '離線'}
                      </p>
                    </div>
                  </div>
                  {getPriorityBadge(selectedConversation.priority)}
                </div>
              </CardHeader>

              <Separator />

              {/* 訊息列表 */}
              <CardContent className="flex-1 p-4 overflow-hidden">
                <ScrollArea className="h-full pr-4">
                  {loadingMessages && messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => {
                        const isOutgoing = message.senderType === 'USER';
                        return (
                          <div
                            key={message.id}
                            className={cn(
                              'flex',
                              isOutgoing ? 'justify-end' : 'justify-start'
                            )}
                          >
                            <div
                              className={cn(
                                'max-w-[70%] rounded-lg px-4 py-2',
                                isOutgoing
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              )}
                            >
                              {message.messageType === 'TEXT' && (
                                <p className="whitespace-pre-wrap break-words">
                                  {message.messageContent.text}
                                </p>
                              )}
                              {message.messageType === 'STICKER' && (
                                <div className="flex items-center gap-2">
                                  <Smile className="h-5 w-5" />
                                  <span>貼圖訊息</span>
                                </div>
                              )}
                              {message.messageType === 'SYSTEM' && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <AlertCircle className="h-4 w-4" />
                                  <span className="text-sm">
                                    {message.messageContent.text}
                                  </span>
                                </div>
                              )}
                              <div
                                className={cn(
                                  'flex items-center gap-1 mt-1 text-xs',
                                  isOutgoing
                                    ? 'text-primary-foreground/70'
                                    : 'text-muted-foreground'
                                )}
                              >
                                <span>
                                  {new Date(message.sentAt || message.createdAt).toLocaleTimeString('zh-TW', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                {isOutgoing && getStatusIcon(message.status)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>
              </CardContent>

              <Separator />

              {/* 輸入區域 */}
              <CardContent className="p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="輸入訊息..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={sending}
                  />
                  <Button onClick={handleSendMessage} disabled={sending || !messageText.trim()}>
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">選擇一個對話開始聊天</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default LineMessages;
