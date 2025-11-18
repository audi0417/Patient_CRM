/**
 * LINE 訊息管理頁面
 * 完整復刻 LINE 風格的聊天介面
 * - 無限捲動 + Lazy Loading
 * - 未讀訊息紅線標記
 * - 日期分隔線
 * - 智能定位（未讀訊息或最底部）
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LineStickerPicker } from '@/components/LineStickerPicker';
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
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MESSAGES_PER_PAGE = 30;

const LineMessages = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<LineMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [offset, setOffset] = useState(0);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unreadMarkerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);
  const isInitialLoadRef = useRef(true);

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
      isInitialLoadRef.current = true;
      setMessages([]);
      setOffset(0);
      setHasMoreMessages(true);
      loadMessages(selectedConversation.id, 0, true);

      // 每 10 秒自動重新載入新訊息
      const interval = setInterval(() => {
        loadNewMessages(selectedConversation.id);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  // 監聽捲動事件，顯示「捲到底部」按鈕
  const handleScroll = useCallback((event: any) => {
    const target = event.target;
    if (!target) return;

    const { scrollTop, scrollHeight, clientHeight } = target;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // 距離底部超過 200px 時顯示按鈕
    setShowScrollToBottom(distanceFromBottom > 200);

    // 接近頂部時載入更多訊息
    if (scrollTop < 100 && !loadingOlderMessages && hasMoreMessages) {
      loadOlderMessages();
    }
  }, [loadingOlderMessages, hasMoreMessages]);

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

  const loadMessages = async (conversationId: string, offsetValue: number = 0, isInitial: boolean = false) => {
    try {
      if (isInitial) {
        setLoadingMessages(true);
      }

      const response = await lineApi.conversations.getMessages(conversationId, {
        limit: MESSAGES_PER_PAGE,
        offset: offsetValue,
      });

      if (response.success && response.data) {
        const newMessages = response.data.reverse(); // API 返回 DESC，需要反轉

        if (isInitial) {
          setMessages(newMessages);
          setOffset(MESSAGES_PER_PAGE);
        }

        setHasMoreMessages(newMessages.length === MESSAGES_PER_PAGE);

        // 初次載入時智能定位
        if (isInitial) {
          setTimeout(() => {
            scrollToUnreadOrBottom(newMessages);
          }, 100);

          // 標記對話為已讀（重置未讀計數）
          if (selectedConversation.unreadCount > 0) {
            lineApi.conversations.markAsRead(selectedConversation.id)
              .then(() => {
                // 更新本地狀態
                setConversations(prev =>
                  prev.map(conv =>
                    conv.id === selectedConversation.id
                      ? { ...conv, unreadCount: 0 }
                      : conv
                  )
                );
                setSelectedConversation(prev =>
                  prev ? { ...prev, unreadCount: 0 } : null
                );
              })
              .catch(error => {
                console.error('標記已讀失敗:', error);
              });
          }
        }
      }
    } catch (error: any) {
      toast({
        title: '載入訊息失敗',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingMessages(false);
      isInitialLoadRef.current = false;
    }
  };

  const loadOlderMessages = async () => {
    if (!selectedConversation || loadingOlderMessages || !hasMoreMessages) return;

    try {
      setLoadingOlderMessages(true);

      // 記錄當前捲動位置
      const scrollArea = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
      const oldScrollHeight = scrollArea?.scrollHeight || 0;

      const response = await lineApi.conversations.getMessages(selectedConversation.id, {
        limit: MESSAGES_PER_PAGE,
        offset: offset,
      });

      if (response.success && response.data) {
        const olderMessages = response.data.reverse();

        if (olderMessages.length > 0) {
          setMessages(prev => [...olderMessages, ...prev]);
          setOffset(prev => prev + olderMessages.length);
          setHasMoreMessages(olderMessages.length === MESSAGES_PER_PAGE);

          // 恢復捲動位置
          setTimeout(() => {
            if (scrollArea) {
              const newScrollHeight = scrollArea.scrollHeight;
              scrollArea.scrollTop = newScrollHeight - oldScrollHeight;
            }
          }, 50);
        } else {
          setHasMoreMessages(false);
        }
      }
    } catch (error: any) {
      console.error('載入歷史訊息失敗:', error);
    } finally {
      setLoadingOlderMessages(false);
    }
  };

  const loadNewMessages = async (conversationId: string) => {
    if (loadingMessages) return;

    try {
      const response = await lineApi.conversations.getMessages(conversationId, {
        limit: 10,
        offset: 0,
      });

      if (response.success && response.data) {
        const newMessages = response.data.reverse();

        // 只添加真正的新訊息
        setMessages(prev => {
          const lastMessageId = prev[prev.length - 1]?.id;
          const newMessagesFiltered = newMessages.filter(msg => {
            const msgIndex = prev.findIndex(m => m.id === msg.id);
            return msgIndex === -1;
          });

          if (newMessagesFiltered.length > 0) {
            // 如果用戶在底部，自動捲動
            const scrollArea = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollArea) {
              const { scrollTop, scrollHeight, clientHeight } = scrollArea;
              const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

              if (isNearBottom) {
                setTimeout(() => scrollToBottom(), 100);
              }
            }

            return [...prev, ...newMessagesFiltered];
          }

          return prev;
        });
      }
    } catch (error: any) {
      console.error('載入新訊息失敗:', error);
    }
  };

  const scrollToUnreadOrBottom = (msgs: LineMessage[]) => {
    const firstUnreadIndex = msgs.findIndex(msg =>
      msg.senderType === 'PATIENT' && !msg.readAt
    );

    if (firstUnreadIndex !== -1 && unreadMarkerRef.current) {
      // 有未讀訊息，捲動到未讀標記
      unreadMarkerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      // 沒有未讀訊息，捲動到底部
      scrollToBottom();
    }
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation) {
      return;
    }

    try {
      setSending(true);
      const response = await lineApi.messages.sendText({
        lineUserId: selectedConversation.lineUserId,
        text: messageText,
      });

      if (response.success) {
        setMessageText('');
        // 重新載入訊息
        await loadNewMessages(selectedConversation.id);
        scrollToBottom();
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

  const handleSendSticker = async (packageId: string, stickerId: string) => {
    if (!selectedConversation) {
      return;
    }

    try {
      setSending(true);

      const response = await lineApi.messages.sendSticker({
        lineUserId: selectedConversation.lineUserId,
        packageId,
        stickerId,
      });

      if (response.success) {
        await loadNewMessages(selectedConversation.id);
        scrollToBottom();
        toast({
          title: '貼圖已送出',
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

  const formatMessageTime = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateSeparator = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return '今天';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨天';
    } else {
      return date.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' });
    }
  };

  const shouldShowDateSeparator = (currentMsg: LineMessage, previousMsg?: LineMessage) => {
    if (!previousMsg) return true;

    const currentDate = new Date(currentMsg.sentAt || currentMsg.createdAt).toDateString();
    const previousDate = new Date(previousMsg.sentAt || previousMsg.createdAt).toDateString();

    return currentDate !== previousDate;
  };

  const shouldShowUnreadMarker = (currentMsg: LineMessage, previousMsg?: LineMessage) => {
    // 顯示在第一則未讀訊息之前
    if (!previousMsg) return false;

    const isPreviousRead = previousMsg.readAt || previousMsg.senderType !== 'PATIENT';
    const isCurrentUnread = !currentMsg.readAt && currentMsg.senderType === 'PATIENT';

    return isPreviousRead && isCurrentUnread;
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
                        <Avatar className="h-12 w-12">
                          {conversation.lineUser?.pictureUrl && (
                            <AvatarImage src={conversation.lineUser.pictureUrl} alt={conversation.displayName || '用戶'} />
                          )}
                          <AvatarFallback className="bg-primary/10">
                            <User className="h-5 w-5 text-primary" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium truncate">
                              {conversation.displayName || conversation.lineUser?.displayName || '未知用戶'}
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
                              <Badge variant="destructive" className="h-5 min-w-5 px-1.5">
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
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      {selectedConversation.lineUser?.pictureUrl && (
                        <AvatarImage src={selectedConversation.lineUser.pictureUrl} alt={selectedConversation.displayName || '用戶'} />
                      )}
                      <AvatarFallback className="bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">
                        {selectedConversation.displayName || selectedConversation.lineUser?.displayName || '未知用戶'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedConversation.status === 'ACTIVE' ? '活躍' : '非活躍'}
                      </p>
                    </div>
                  </div>
                  {getPriorityBadge(selectedConversation.priority)}
                </div>
              </CardHeader>

              {/* 訊息列表 */}
              <CardContent className="flex-1 p-0 overflow-hidden relative">
                <ScrollArea
                  className="h-full"
                  ref={scrollAreaRef}
                  onScroll={handleScroll}
                >
                  <div className="p-4 space-y-2">
                    {/* 載入更多指示器 */}
                    {loadingOlderMessages && (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    )}

                    {!hasMoreMessages && messages.length > 0 && (
                      <div className="flex justify-center py-4">
                        <p className="text-xs text-muted-foreground">已載入所有訊息</p>
                      </div>
                    )}

                    {loadingMessages && messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : (
                      <>
                        {messages.map((message, index) => {
                          const previousMessage = index > 0 ? messages[index - 1] : undefined;
                          const showDateSeparator = shouldShowDateSeparator(message, previousMessage);
                          const showUnreadMarker = shouldShowUnreadMarker(message, previousMessage);
                          const isOutgoing = message.senderType === 'USER' || message.senderType === 'ADMIN';

                          return (
                            <div key={message.id}>
                              {/* 日期分隔線 */}
                              {showDateSeparator && (
                                <div className="flex items-center justify-center my-4">
                                  <div className="bg-muted px-3 py-1 rounded-full">
                                    <p className="text-xs text-muted-foreground font-medium">
                                      {formatDateSeparator(message.sentAt || message.createdAt)}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* 未讀訊息分隔線 */}
                              {showUnreadMarker && (
                                <div
                                  ref={unreadMarkerRef}
                                  className="flex items-center gap-2 my-4"
                                >
                                  <div className="flex-1 h-[2px] bg-red-500"></div>
                                  <p className="text-xs text-red-500 font-medium whitespace-nowrap">
                                    以下為未讀訊息
                                  </p>
                                  <div className="flex-1 h-[2px] bg-red-500"></div>
                                </div>
                              )}

                              {/* 訊息氣泡 */}
                              <div
                                className={cn(
                                  'flex mb-2',
                                  isOutgoing ? 'justify-end' : 'justify-start'
                                )}
                              >
                                <div
                                  className={cn(
                                    'max-w-[70%] rounded-2xl px-4 py-2 shadow-sm',
                                    isOutgoing
                                      ? 'bg-[#06C755] text-white rounded-tr-sm'
                                      : 'bg-white border border-gray-200 rounded-tl-sm',
                                    message.messageType === 'SYSTEM' && 'bg-muted/50 border-muted'
                                  )}
                                >
                                  {message.messageType === 'TEXT' && (
                                    <p className={cn(
                                      "whitespace-pre-wrap break-words text-[15px] leading-relaxed",
                                      isOutgoing ? 'text-white' : 'text-gray-900'
                                    )}>
                                      {typeof message.messageContent === 'string'
                                        ? message.messageContent
                                        : message.messageContent?.text || ''}
                                    </p>
                                  )}
                                  {message.messageType === 'STICKER' && (() => {
                                    // 解析貼圖資料
                                    let stickerData;
                                    if (typeof message.messageContent === 'string') {
                                      try {
                                        stickerData = JSON.parse(message.messageContent);
                                      } catch {
                                        stickerData = message.messageContent;
                                      }
                                    } else {
                                      stickerData = message.messageContent;
                                    }

                                    const stickerId = stickerData?.stickerId;
                                    const stickerUrl = message.metadata?.stickerUrl ||
                                      (stickerId ? `https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/android/sticker.png` : null);

                                    return stickerUrl ? (
                                      <img
                                        src={stickerUrl}
                                        alt="貼圖"
                                        className="w-32 h-32 object-contain"
                                      />
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <Smile className="h-5 w-5" />
                                        <span className="text-sm">貼圖訊息</span>
                                      </div>
                                    );
                                  })()}
                                  {message.messageType === 'SYSTEM' && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <AlertCircle className="h-4 w-4" />
                                      <span className="text-sm">
                                        {typeof message.messageContent === 'string'
                                          ? message.messageContent
                                          : message.messageContent?.text || ''}
                                      </span>
                                    </div>
                                  )}
                                  <div
                                    className={cn(
                                      'flex items-center gap-1.5 mt-1 text-[11px]',
                                      isOutgoing
                                        ? 'text-white/80 justify-end'
                                        : 'text-gray-500'
                                    )}
                                  >
                                    <span>
                                      {formatMessageTime(message.sentAt || message.createdAt)}
                                    </span>
                                    {isOutgoing && getStatusIcon(message.status)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>
                </ScrollArea>

                {/* 捲到底部按鈕 */}
                {showScrollToBottom && (
                  <div className="absolute bottom-4 right-4">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-10 w-10 rounded-full shadow-lg"
                      onClick={() => scrollToBottom()}
                    >
                      <ChevronDown className="h-5 w-5" />
                    </Button>
                  </div>
                )}
              </CardContent>

              <Separator />

              {/* 輸入區域 */}
              <CardContent className="p-4 bg-gray-50">
                <div className="flex gap-2">
                  <LineStickerPicker
                    onSelectSticker={handleSendSticker}
                    disabled={sending}
                  />
                  <Input
                    placeholder="輸入訊息..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={sending}
                    className="bg-white flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={sending || !messageText.trim()}
                    className="bg-[#06C755] hover:bg-[#05b34c]"
                  >
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
