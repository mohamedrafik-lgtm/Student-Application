'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useChatSocket } from '../../contexts/ChatSocketContext';
import { fetchAPI, API_BASE_URL, getAuthToken, getImageUrl } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import {
  FiSearch, FiSend, FiMic, FiImage,
  FiUsers, FiArrowRight, FiCheck, FiCheckCircle,
  FiTrash2, FiX, FiPlus, FiPaperclip, FiPlay, FiPause
} from 'react-icons/fi';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

// ============ Types ============

interface ChatUser {
  id: string;
  name: string;
  email: string;
  photoUrl: string | null;
  accountType: string;
  lastSeenAt: string | null;
}

interface Participant {
  id: string;
  userId: string;
  user: ChatUser;
  isAdmin: boolean;
  isMuted: boolean;
  lastReadAt: string | null;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender: { id: string; name: string; photoUrl: string | null };
  type: 'TEXT' | 'IMAGE' | 'VOICE' | 'FILE';
  content: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  duration: number | null;
  isDeleted: boolean;
  createdAt: string;
  readBy: { userId: string; readAt: string }[];
}

interface Conversation {
  id: string;
  type: 'PRIVATE' | 'GROUP';
  name: string | null;
  avatarUrl: string | null;
  lastMessageAt: string | null;
  lastMessageText: string | null;
  participants: Participant[];
  messages: Message[];
  unreadCount: number;
}

// ============ Notification Sound ============

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

    // Note 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(830, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1).connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Note 2 (higher, delayed)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1100, now + 0.12);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(0.18, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);

    setTimeout(() => ctx.close(), 600);
  } catch {}
}

// ============ Voice Player ============

function VoicePlayer({ src, duration, isMine }: { src: string; duration?: number | null; isMine: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && isFinite(audio.duration)) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    const onLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setTotalDuration(audio.duration);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration || !isFinite(audio.duration)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    audio.currentTime = pct * audio.duration;
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2.5 min-w-[180px] max-w-[260px]">
      <audio ref={audioRef} src={src} preload="metadata" />

      <button
        onClick={togglePlay}
        className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center transition-colors ${
          isMine
            ? 'bg-white/20 hover:bg-white/30 text-white'
            : 'bg-blue-100 hover:bg-blue-200 text-blue-600'
        }`}
      >
        {isPlaying ? <FiPause className="w-4 h-4" /> : <FiPlay className="w-4 h-4 mr-[-1px]" />}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        <div
          className={`relative h-1.5 rounded-full cursor-pointer ${
            isMine ? 'bg-white/20' : 'bg-slate-200'
          }`}
          onClick={handleSeek}
        >
          <div
            className={`absolute inset-y-0 right-0 rounded-full transition-all ${
              isMine ? 'bg-white/70' : 'bg-blue-500'
            }`}
            style={{ width: `${progress}%` }}
          />
          {/* Waveform bars decoration */}
          <div className="absolute inset-0 flex items-center justify-between px-0.5">
            {[4,6,3,7,5,8,4,6,3,7,5,8,4,6,3,7,5,8,4,6].map((h, i) => (
              <div
                key={i}
                className={`w-[2px] rounded-full ${
                  isMine ? 'bg-white/30' : 'bg-slate-300'
                }`}
                style={{ height: `${h}px` }}
              />
            ))}
          </div>
        </div>
        <div className={`flex justify-between text-[10px] leading-none ${
          isMine ? 'text-white/60' : 'text-slate-400'
        }`}>
          <span>{fmt(currentTime)}</span>
          <span>{fmt(totalDuration)}</span>
        </div>
      </div>
    </div>
  );
}

// ============ Main Chat Page ============

export default function ChatPageContent() {
  const { user } = useAuth();
  const { socket, isConnected, onlineUserIds } = useChatSocket();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [showUsersList, setShowUsersList] = useState(false);
  const [allUsers, setAllUsers] = useState<ChatUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Image lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Delete confirmation
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // ============ Load Conversations ============

  const loadConversations = useCallback(async () => {
    try {
      const data = await fetchAPI('/chat/conversations');
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ============ Socket Events ============

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      // تشغيل صوت الإشعار للرسائل الواردة
      if (message.senderId !== user?.id) {
        playNotificationSound();
      }

      if (activeConversation && message.conversationId === activeConversation.id) {
        setMessages((prev) => [...prev, message]);
        socket.emit('message:read', { conversationId: message.conversationId });
      }

      setConversations((prev) => {
        const exists = prev.some((conv) => conv.id === message.conversationId);
        
        if (!exists) {
          // محادثة جديدة - إعادة تحميل القائمة بالكامل
          loadConversations();
          return prev;
        }

        const updated = prev.map((conv) => {
          if (conv.id === message.conversationId) {
            return {
              ...conv,
              lastMessageAt: message.createdAt,
              lastMessageText:
                message.type === 'IMAGE' ? '📷 صورة'
                  : message.type === 'VOICE' ? '🎤 رسالة صوتية'
                  : message.content?.substring(0, 100) || '',
              unreadCount:
                activeConversation?.id === message.conversationId
                  ? 0 : conv.unreadCount + (message.senderId !== user?.id ? 1 : 0),
              messages: [message],
            };
          }
          return conv;
        });
        return updated.sort((a, b) =>
          new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
        );
      });
    };

    const handleTypingUpdate = (data: { userId: string; userName: string; conversationId: string; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        if (data.isTyping) {
          next.set(`${data.conversationId}:${data.userId}`, data.userName);
        } else {
          next.delete(`${data.conversationId}:${data.userId}`);
        }
        return next;
      });
    };

    const handleMessageRead = (data: { userId: string; conversationId: string }) => {
      if (activeConversation?.id === data.conversationId) {
        setMessages((prev) =>
          prev.map((msg) => ({
            ...msg,
            readBy: [...msg.readBy, { userId: data.userId, readAt: new Date().toISOString() }],
          })),
        );
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('typing:update', handleTypingUpdate);
    socket.on('message:read', handleMessageRead);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('typing:update', handleTypingUpdate);
      socket.off('message:read', handleMessageRead);
    };
  }, [socket, activeConversation, user?.id, loadConversations]);

  // ============ Load Messages ============

  const loadMessages = useCallback(async (conversationId: string, cursor?: string) => {
    setIsLoadingMessages(true);
    try {
      const params = cursor ? `?cursor=${cursor}` : '';
      const data = await fetchAPI(`/chat/conversations/${conversationId}/messages${params}`);
      if (cursor) {
        setMessages((prev) => [...data.messages, ...prev]);
      } else {
        setMessages(data.messages);
      }
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  // ============ Select Conversation ============

  const selectConversation = useCallback(async (conv: Conversation) => {
    setActiveConversation(conv);
    setShowMobileChat(true);
    await loadMessages(conv.id);
    if (socket) {
      socket.emit('message:read', { conversationId: conv.id });
      socket.emit('conversation:join', { conversationId: conv.id });
    }
    setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c)));
    setTimeout(() => messageInputRef.current?.focus(), 100);
  }, [socket, loadMessages]);

  // ============ Send Message ============

  const sendMessage = useCallback(async () => {
    if (!messageText.trim() || !activeConversation || !socket) return;
    const text = messageText.trim();
    setMessageText('');
    socket.emit('message:send', { conversationId: activeConversation.id, content: text, type: 'TEXT' });
    socket.emit('typing:stop', { conversationId: activeConversation.id });
  }, [messageText, activeConversation, socket]);

  // ============ Typing Indicator ============

  const handleTyping = useCallback(() => {
    if (!socket || !activeConversation) return;
    socket.emit('typing:start', { conversationId: activeConversation.id });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId: activeConversation.id });
    }, 2000);
  }, [socket, activeConversation]);

  // ============ File Upload ============

  const handleFileUpload = useCallback(async (file: File) => {
    if (!activeConversation || !socket) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/chat/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const result = await res.json();
      if (result.url) {
        const isImage = file.type.startsWith('image/');
        socket.emit('message:send', {
          conversationId: activeConversation.id,
          type: isImage ? 'IMAGE' : 'FILE',
          fileUrl: result.url,
          fileName: file.name,
          fileSize: file.size,
        });
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  }, [activeConversation, socket]);

  // ============ Voice Recording ============

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        if (!activeConversation || !socket) return;

        const formData = new FormData();
        formData.append('file', file);
        try {
          const token = getAuthToken();
          const res = await fetch(`${API_BASE_URL}/chat/upload`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
          const result = await res.json();
          if (result.url) {
            socket.emit('message:send', {
              conversationId: activeConversation.id,
              type: 'VOICE',
              fileUrl: result.url,
              duration: recordingTime,
            });
          }
        } catch (error) {
          console.error('Voice upload failed:', error);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000);
    } catch (error) {
      console.error('Cannot access microphone:', error);
    }
  }, [activeConversation, socket, recordingTime]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop());
    }
    setIsRecording(false);
    setRecordingTime(0);
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
  }, []);

  // ============ Scroll to Bottom ============

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ============ New Conversation ============

  const startNewConversation = useCallback(async (otherUser: ChatUser) => {
    try {
      const conv = await fetchAPI('/chat/conversations/private', {
        method: 'POST',
        body: JSON.stringify({ otherUserId: otherUser.id }),
      });
      setShowUsersList(false);
      await loadConversations();
      selectConversation(conv);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  }, [loadConversations, selectConversation]);

  // ============ Load Users ============

  useEffect(() => {
    if (showUsersList) {
      fetchAPI(`/chat/users${userSearch ? `?search=${encodeURIComponent(userSearch)}` : ''}`)
        .then(setAllUsers)
        .catch(console.error);
    }
  }, [showUsersList, userSearch]);

  // ============ Delete Message ============

  const confirmDeleteMessage = useCallback(async () => {
    if (!pendingDeleteId) return;
    try {
      await fetchAPI(`/chat/messages/${pendingDeleteId}`, { method: 'DELETE' });
      setMessages((prev) => prev.filter((m) => m.id !== pendingDeleteId));
    } catch (error) {
      console.error('Failed to delete message:', error);
    } finally {
      setPendingDeleteId(null);
    }
  }, [pendingDeleteId]);

  // ============ Helpers ============

  const getConversationName = (conv: Conversation) => {
    if (conv.type === 'GROUP') return conv.name || 'مجموعة';
    const other = conv.participants.find((p) => p.userId !== user?.id);
    return other?.user.name || 'محادثة';
  };

  const getConversationAvatar = (conv: Conversation): string | null => {
    if (conv.type === 'GROUP') return conv.avatarUrl || null;
    const other = conv.participants.find((p) => p.userId !== user?.id);
    return other?.user.photoUrl || null;
  };

  const getConversationUserId = (conv: Conversation): string | null => {
    if (conv.type === 'GROUP') return null;
    const other = conv.participants.find((p) => p.userId !== user?.id);
    return other?.userId || null;
  };

  const isUserOnline = (userId: string | null) => userId ? onlineUserIds.includes(userId) : false;

  const formatTime = (d: string) => new Date(d).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const days = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (days === 0) return 'اليوم';
    if (days === 1) return 'أمس';
    if (days < 7) return `منذ ${days} أيام`;
    return date.toLocaleDateString('ar-EG');
  };

  const formatLastSeen = (ls: string | null) => {
    if (!ls) return 'غير متصل';
    const diff = Math.floor((Date.now() - new Date(ls).getTime()) / 1000);
    if (diff < 60) return 'متصل الآن';
    if (diff < 3600) return `آخر ظهور منذ ${Math.floor(diff / 60)} د`;
    if (diff < 86400) return `آخر ظهور منذ ${Math.floor(diff / 3600)} س`;
    return `آخر ظهور ${new Date(ls).toLocaleDateString('ar-EG')}`;
  };

  const formatRecTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const getActiveTyping = () => {
    if (!activeConversation) return [];
    const u: string[] = [];
    typingUsers.forEach((name, key) => { if (key.startsWith(activeConversation.id + ':')) u.push(name); });
    return u;
  };

  const filtered = conversations.filter((c) =>
    !searchText || getConversationName(c).toLowerCase().includes(searchText.toLowerCase())
  );

  // ============ Render ============

  return (
    <div className="h-full overflow-hidden">
      {/* Chat Container */}
      <div className="h-full flex bg-white overflow-hidden">

        {/* ===== Conversations Sidebar ===== */}
        <div className={`${showMobileChat ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-[380px] lg:border-l border-slate-100 bg-white`}>
          {/* Search & New */}
          <div className="sticky top-0 z-10 p-4 border-b border-slate-100 bg-white">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="ابحث في المحادثات..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full bg-slate-50 text-slate-700 placeholder-slate-400 pr-10 pl-4 py-3 rounded-xl text-sm sm:text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all"
                />
              </div>
              <button
                onClick={() => setShowUsersList(true)}
                className="p-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white transition-colors shadow-sm"
                title="محادثة جديدة"
              >
                <FiPlus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <ChatBubbleLeftRightIcon className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-sm font-medium text-slate-500">لا توجد محادثات</p>
                <p className="text-xs text-slate-400 mt-1">ابدأ محادثة جديدة</p>
              </div>
            ) : (
              filtered.map((conv) => {
                const cuid = getConversationUserId(conv);
                const online = isUserOnline(cuid);
                const active = activeConversation?.id === conv.id;

                return (
                  <button
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={`w-full flex items-center gap-3.5 px-4 py-4 transition-all border-b border-slate-50 hover:bg-slate-50 ${
                      active ? 'bg-blue-50/70 border-r-[3px] border-r-blue-600' : ''
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-base overflow-hidden">
                        {getConversationAvatar(conv) ? (
                          <img src={getImageUrl(getConversationAvatar(conv))} alt="" className="w-full h-full object-cover" />
                        ) : (
                          getConversationName(conv).charAt(0)
                        )}
                      </div>
                      {online && (
                        <div className="absolute bottom-0 left-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 text-right">
                      <div className="flex items-center justify-between">
                        <h3 className={`font-semibold text-sm sm:text-sm truncate ${active ? 'text-blue-800' : 'text-slate-800'}`}>
                          {getConversationName(conv)}
                        </h3>
                        <span className="text-xs text-slate-400 flex-shrink-0 mr-2">
                          {conv.lastMessageAt ? formatDate(conv.lastMessageAt) : ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm sm:text-xs text-slate-500 truncate max-w-[220px]">
                          {conv.lastMessageText || 'ابدأ المحادثة'}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="bg-blue-600 text-white text-[10px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5 mr-2">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ===== Chat Area ===== */}
        <div className={`${showMobileChat ? 'flex' : 'hidden lg:flex'} flex-1 flex-col bg-slate-50/50 min-h-0`}>
          {activeConversation ? (
            <>
              {/* Header */}
              <div className="flex items-center gap-3 px-4 sm:px-5 py-4 bg-white border-b border-slate-200">
                <button
                  onClick={() => setShowMobileChat(false)}
                  className="lg:hidden p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
                >
                  <FiArrowRight className="w-5 h-5" />
                </button>

                <div className="relative">
                  <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-base overflow-hidden">
                    {getConversationAvatar(activeConversation) ? (
                      <img src={getImageUrl(getConversationAvatar(activeConversation))} alt="" className="w-full h-full object-cover" />
                    ) : (
                      getConversationName(activeConversation).charAt(0)
                    )}
                  </div>
                  {isUserOnline(getConversationUserId(activeConversation)) && (
                    <div className="absolute bottom-0 left-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base sm:text-sm text-blue-900 truncate">{getConversationName(activeConversation)}</h3>
                  <p className="text-sm sm:text-xs text-slate-500">
                    {isUserOnline(getConversationUserId(activeConversation))
                      ? <span className="text-emerald-600">متصل الآن</span>
                      : (() => {
                          const other = activeConversation.participants.find((p) => p.userId !== user?.id);
                          return formatLastSeen(other?.user.lastSeenAt || null);
                        })()}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-2">
                {hasMore && (
                  <div className="text-center py-2">
                    <button
                      onClick={() => nextCursor && loadMessages(activeConversation.id, nextCursor)}
                      className="text-blue-600 text-xs hover:underline font-medium"
                      disabled={isLoadingMessages}
                    >
                      {isLoadingMessages ? 'جاري التحميل...' : 'تحميل رسائل أقدم'}
                    </button>
                  </div>
                )}

                {messages.map((msg, idx) => {
                  const isMine = msg.senderId === user?.id;
                  const showAvatar = idx === 0 || messages[idx - 1]?.senderId !== msg.senderId;
                  const showDateSep = idx === 0 || new Date(msg.createdAt).toDateString() !== new Date(messages[idx - 1]?.createdAt).toDateString();

                  return (
                    <React.Fragment key={msg.id}>
                      {showDateSep && (
                        <div className="flex items-center justify-center my-3">
                          <div className="h-px bg-slate-200 flex-1" />
                          <span className="text-slate-400 text-xs px-3 font-medium">{formatDate(msg.createdAt)}</span>
                          <div className="h-px bg-slate-200 flex-1" />
                        </div>
                      )}

                      <div className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
                        {showAvatar && !isMine ? (
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold flex-shrink-0 overflow-hidden">
                            {msg.sender.photoUrl ? (
                              <img src={getImageUrl(msg.sender.photoUrl)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              msg.sender.name.charAt(0)
                            )}
                          </div>
                        ) : (
                          <div className="w-8 flex-shrink-0" />
                        )}

                        <div className={`group max-w-[80%] sm:max-w-[70%]`}>
                          {showAvatar && !isMine && activeConversation.type === 'GROUP' && (
                            <p className="text-xs text-slate-400 mb-0.5 mx-2">{msg.sender.name}</p>
                          )}
                          <div
                            className={`relative rounded-2xl px-4 py-2.5 ${
                              isMine
                                ? 'bg-blue-600 text-white rounded-bl-md'
                                : 'bg-white text-slate-800 rounded-br-md border border-slate-200 shadow-sm'
                            }`}
                          >
                            {msg.type === 'TEXT' && (
                              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                            )}

                            {msg.type === 'IMAGE' && (
                              <div className="rounded-lg overflow-hidden max-w-[300px] -m-1">
                                <img
                                  src={getImageUrl(msg.fileUrl!)}
                                  alt=""
                                  className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => setLightboxUrl(getImageUrl(msg.fileUrl!))}
                                />
                              </div>
                            )}

                            {msg.type === 'VOICE' && (
                              <VoicePlayer
                                src={getImageUrl(msg.fileUrl!)}
                                duration={msg.duration}
                                isMine={isMine}
                              />
                            )}

                            {msg.type === 'FILE' && (
                              <a
                                href={getImageUrl(msg.fileUrl!)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 text-sm ${isMine ? 'text-white hover:text-white/80' : 'text-blue-600 hover:text-blue-700'}`}
                              >
                                <FiPaperclip className="w-4 h-4 flex-shrink-0" />
                                <span className="underline truncate">{msg.fileName || 'ملف'}</span>
                              </a>
                            )}

                            <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-start' : 'justify-end'}`}>
                              <span className={`text-xs ${isMine ? 'text-white/60' : 'text-slate-400'}`}>
                                {formatTime(msg.createdAt)}
                              </span>
                              {isMine && (
                                msg.readBy.length > 0
                                  ? <FiCheckCircle className="w-3 h-3 text-emerald-300" />
                                  : <FiCheck className="w-3 h-3 text-white/60" />
                              )}
                            </div>

                            {isMine && (
                              <button
                                onClick={() => setPendingDeleteId(msg.id)}
                                className="absolute -top-2 -left-2 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow"
                              >
                                <FiTrash2 className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}

                {/* Typing */}
                {getActiveTyping().length > 0 && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs px-2 py-1">
                    <div className="flex gap-0.5">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span>{getActiveTyping().join('، ')} يكتب...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 sm:p-3 bg-white border-t border-slate-200">
                {isRecording ? (
                  <div className="flex items-center gap-3 bg-rose-50 rounded-xl px-4 py-3.5 border border-rose-200">
                    <button onClick={cancelRecording} className="p-2 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors">
                      <FiX className="w-4 h-4 text-slate-500" />
                    </button>
                    <div className="flex-1 flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />
                      <span className="text-rose-600 font-mono font-medium">{formatRecTime(recordingTime)}</span>
                      <span className="text-rose-400 text-sm">جاري التسجيل...</span>
                    </div>
                    <button onClick={stopRecording} className="p-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white transition-colors shadow-sm">
                      <FiSend className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-end gap-2">
                    <div className="flex items-center gap-0.5 pb-1">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="إرفاق ملف"
                      >
                        <FiImage className="w-5 h-5" />
                      </button>
                      <button
                        onClick={startRecording}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="رسالة صوتية"
                      >
                        <FiMic className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex-1">
                      <textarea
                        ref={messageInputRef}
                        value={messageText}
                        onChange={(e) => { setMessageText(e.target.value); handleTyping(); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        placeholder="اكتب رسالة..."
                        className="w-full bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder-slate-400 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 resize-none max-h-32 transition-all"
                        rows={1}
                        style={{ minHeight: '46px' }}
                      />
                    </div>

                    <button
                      onClick={sendMessage}
                      disabled={!messageText.trim()}
                      className={`p-2.5 rounded-xl transition-all ${
                        messageText.trim()
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <FiSend className="w-5 h-5" />
                    </button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                    e.target.value = '';
                  }}
                />
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-5">
                <ChatBubbleLeftRightIcon className="w-12 h-12 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-600 mb-1">اختر محادثة</h3>
              <p className="text-slate-400 text-sm text-center max-w-sm">
                اختر محادثة من القائمة أو ابدأ محادثة جديدة
              </p>
              <button
                onClick={() => setShowUsersList(true)}
                className="mt-5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-xl font-medium transition-colors shadow-sm"
              >
                <FiPlus className="w-4 h-4 inline-block ml-1.5" />
                محادثة جديدة
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ===== Users Modal ===== */}
      {showUsersList && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm sm:p-4">
          <div className="bg-white sm:rounded-2xl shadow-xl w-full sm:max-w-md h-full sm:h-auto sm:max-h-[75vh] flex flex-col overflow-hidden sm:border sm:border-slate-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-blue-900 flex items-center gap-2">
                <FiUsers className="w-5 h-5 text-blue-600" />
                محادثة جديدة
              </h3>
              <button
                onClick={() => { setShowUsersList(false); setUserSearch(''); }}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="relative">
                <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="ابحث عن مستخدم..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full bg-slate-50 text-slate-700 placeholder-slate-400 pr-10 pl-4 py-2.5 rounded-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all"
                />
              </div>
            </div>

            {/* Users List */}
            <div className="flex-1 overflow-y-auto">
              {allUsers.map((u) => {
                const online = onlineUserIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => startNewConversation(u)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50"
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm overflow-hidden">
                        {u.photoUrl ? (
                          <img src={getImageUrl(u.photoUrl)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          u.name.charAt(0)
                        )}
                      </div>
                      {online && (
                        <div className="absolute bottom-0 left-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1 text-right min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">{u.name}</p>
                      <p className="text-xs text-slate-400">
                        {online ? <span className="text-emerald-600">متصل الآن</span> : formatLastSeen(u.lastSeenAt)}
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                      {u.accountType === 'STAFF' ? 'موظف' : 'محاضر'}
                    </span>
                  </button>
                );
              })}

              {allUsers.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <FiUsers className="w-10 h-10 mb-3 opacity-40" />
                  <p className="text-sm">لا يوجد مستخدمون</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== Delete Confirmation ===== */}
      {pendingDeleteId && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-150 px-4"
          onClick={() => setPendingDeleteId(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center">
                <FiTrash2 className="w-7 h-7 text-rose-500" />
              </div>
            </div>

            {/* Text */}
            <h3 className="text-center text-lg font-semibold text-slate-800 mb-1">حذف الرسالة</h3>
            <p className="text-center text-sm text-slate-500 mb-6">هل أنت متأكد من حذف هذه الرسالة؟ لا يمكن التراجع عن هذا الإجراء.</p>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setPendingDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={confirmDeleteMessage}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium transition-colors"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Image Lightbox ===== */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setLightboxUrl(null)}
          onKeyDown={(e) => e.key === 'Escape' && setLightboxUrl(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>

          {/* Action buttons */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const a = document.createElement('a');
                a.href = lightboxUrl;
                a.download = `chat-image-${Date.now()}.jpg`;
                a.target = '_blank';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors backdrop-blur-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              تحميل
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(lightboxUrl, '_blank');
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              فتح خارجياً
            </button>
          </div>

          {/* Image */}
          <img
            src={lightboxUrl}
            alt=""
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
