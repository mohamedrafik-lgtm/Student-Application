'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { useCrmInboxSocket } from '../../../contexts/CrmInboxSocketContext';
import {
  FiInbox, FiSend, FiUser, FiPhone, FiArrowRight, FiLoader,
  FiLock, FiUnlock, FiXCircle, FiSearch, FiAlertCircle,
  FiFile, FiPlay, FiPause, FiDownload, FiRefreshCw,
  FiImage, FiMic, FiTrash2, FiX
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import {
  getCrmConversations,
  getCrmMessages,
  sendCrmMessage,
  sendCrmMediaMessage,
  claimCrmConversation,
  releaseCrmConversation,
  closeCrmConversation,
  markCrmConversationRead,
  type CrmConversation,
  type CrmMessage,
} from '../../lib/api/crm-inbox';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

function formatTime(dateStr: string | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} س`;
  return d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
}

function formatMessageTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

// ===== مكون تشغيل الصوت =====
function AudioPlayer({ src, isInbound = true }: { src: string; isInbound?: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [speed, setSpeed] = useState(1);

  const speeds = [1, 1.5, 2];
  const cycleSpeed = () => {
    const next = speeds[(speeds.indexOf(speed) + 1) % speeds.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  // تحميل الملف كـ blob لتفادي مشاكل CORS
  useEffect(() => {
    let cancelled = false;
    const loadAudio = async () => {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
        const res = await fetch(src, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        setLoading(false);
      } catch (e) {
        console.error('Audio fetch error:', src, e);
        if (!cancelled) { setError(true); setLoading(false); }
      }
    };
    loadAudio();
    return () => { cancelled = true; if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current || error || loading) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => setError(true));
    }
    setPlaying(!playing);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressBarRef.current || error) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = clickX / rect.width;
    audioRef.current.currentTime = pct * (audioRef.current.duration || 0);
  };

  const formatTime = (s: number) => {
    if (!s || !isFinite(s)) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  // الألوان حسب نوع الرسالة
  const btnBg = isInbound ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-white/30 hover:bg-white/40 text-white';
  const trackBg = isInbound ? 'bg-gray-200' : 'bg-white/20';
  const trackFill = isInbound ? 'bg-blue-500' : 'bg-white/80';
  const timeColor = isInbound ? 'text-gray-400' : 'text-blue-200';

  return (
    <div className="flex items-center gap-2.5 min-w-[220px] max-w-[280px]" dir="ltr">
      {blobUrl && (
        <audio
          ref={audioRef}
          src={blobUrl}
          preload="metadata"
          onTimeUpdate={() => {
            if (audioRef.current) {
              setCurrentTime(audioRef.current.currentTime);
              setProgress((audioRef.current.currentTime / (audioRef.current.duration || 1)) * 100);
            }
          }}
          onLoadedMetadata={() => {
            if (audioRef.current) setDuration(audioRef.current.duration);
          }}
          onEnded={() => { setPlaying(false); setProgress(0); setCurrentTime(0); }}
          onError={() => setError(true)}
        />
      )}
      <button
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${error ? 'bg-red-100 text-red-400 cursor-not-allowed' : loading ? 'opacity-50 cursor-wait ' + btnBg : btnBg}`}
      >
        {error ? (
          <FiAlertCircle className="w-4 h-4" />
        ) : loading ? (
          <FiLoader className="w-4 h-4 animate-spin" />
        ) : playing ? (
          <FiPause className="w-4 h-4" />
        ) : (
          <FiPlay className="w-4 h-4 ml-0.5" />
        )}
      </button>
      <div className="flex-1 space-y-1 min-w-0">
        <div
          ref={progressBarRef}
          className={`h-2 ${trackBg} rounded-full overflow-hidden cursor-pointer relative`}
          onClick={handleSeek}
        >
          <div
            className={`h-full ${trackFill} rounded-full transition-all duration-100`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className={`flex justify-between text-[10px] ${timeColor}`}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      {!error && !loading && (
        <button
          onClick={cycleSpeed}
          className={`text-[10px] font-bold rounded-full w-8 h-5 flex items-center justify-center flex-shrink-0 transition-colors ${isInbound ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' : 'bg-white/20 text-white hover:bg-white/30'}`}
        >
          {speed}x
        </button>
      )}
    </div>
  );
}

// ===== مكون عارض الصور =====
function ImageViewer({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 left-4 text-white p-2 hover:bg-white/10 rounded-full">
        <FiXCircle className="w-8 h-8" />
      </button>
      <img src={src} alt="" className="max-w-full max-h-[90vh] rounded-lg object-contain" onClick={e => e.stopPropagation()} />
    </div>
  );
}

// ===== مكون فقاعة الرسالة =====
function MessageBubble({ message }: { message: CrmMessage }) {
  const [viewingImage, setViewingImage] = useState(false);
  const isInbound = message.direction === 'inbound';
  const mediaFullUrl = message.mediaUrl ? `${API_BASE}${message.mediaUrl}` : null;

  const renderContent = () => {
    switch (message.messageType) {
      case 'image':
        return (
          <div>
            {mediaFullUrl && (
              <img
                src={mediaFullUrl}
                alt=""
                className="max-w-[280px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setViewingImage(true)}
              />
            )}
            {message.content && <p className="mt-2 text-sm">{message.content}</p>}
          </div>
        );
      case 'audio':
        return mediaFullUrl ? <AudioPlayer src={mediaFullUrl} isInbound={isInbound} /> : <p className="text-sm opacity-70">🎵 رسالة صوتية</p>;
      case 'video':
        return (
          <div>
            {mediaFullUrl ? (
              <video src={mediaFullUrl} controls className="max-w-[280px] rounded-lg" />
            ) : <p className="text-sm opacity-70">🎬 فيديو</p>}
            {message.content && <p className="mt-2 text-sm">{message.content}</p>}
          </div>
        );
      case 'document':
        return (
          <a
            href={mediaFullUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          >
            <FiFile className="w-8 h-8 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{message.mediaFileName || 'مستند'}</p>
              {message.content && <p className="text-xs opacity-70 truncate">{message.content}</p>}
            </div>
            <FiDownload className="w-4 h-4 flex-shrink-0" />
          </a>
        );
      case 'sticker':
        return mediaFullUrl ? (
          <img src={mediaFullUrl} alt="ملصق" className="w-24 h-24 object-contain" />
        ) : <p className="text-2xl">🏷️</p>;
      case 'text':
      default:
        return <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>;
    }
  };

  return (
    <>
      <div className={`flex ${isInbound ? 'justify-start' : 'justify-end'} mb-2`}>
        <div
          className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm ${
            isInbound
              ? 'bg-white text-gray-800 border border-gray-100 rounded-tr-sm'
              : 'bg-blue-600 text-white rounded-tl-sm'
          }`}
        >
          {isInbound && message.senderName && (
            <p className="text-xs font-bold text-blue-600 mb-1">{message.senderName}</p>
          )}
          {renderContent()}
          <p className={`text-[10px] mt-1 text-left ${isInbound ? 'text-gray-400' : 'text-blue-200'}`}>
            {formatMessageTime(message.createdAt)}
          </p>
        </div>
      </div>
      {viewingImage && mediaFullUrl && (
        <ImageViewer src={mediaFullUrl} onClose={() => setViewingImage(false)} />
      )}
    </>
  );
}

// ===== الصفحة الرئيسية =====
export default function CrmInboxPage() {
  const { user } = useAuth();
  const { socket } = useCrmInboxSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedConvRef = useRef<CrmConversation | null>(null);
  const [conversations, setConversations] = useState<CrmConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<CrmConversation | null>(null);
  const [messages, setMessages] = useState<CrmMessage[]>([]);
  const [filter, setFilter] = useState<'unassigned' | 'mine'>('unassigned');
  const [messageText, setMessageText] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [claimedAlert, setClaimedAlert] = useState<string | null>(null);
  // ميديا
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // مرجع للمحادثة المحددة حالياً (للاستخدام في callbacks الـ socket)
  useEffect(() => { selectedConvRef.current = selectedConv; }, [selectedConv]);

  // تحميل المحادثات
  const loadConversations = useCallback(async () => {
    try {
      const data = await getCrmConversations(filter);
      setConversations(data);
    } catch {
      // خطأ
    } finally {
      setLoadingConvs(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoadingConvs(true);
    loadConversations();
  }, [loadConversations]);

  // ===== أحداث WebSocket في الوقت الفعلي =====
  useEffect(() => {
    if (!socket) return;

    // رسالة واردة جديدة من واتساب
    const onNewMessage = (data: { conversationId: string; message: CrmMessage; conversation: any }) => {
      // تحديث الرسائل إذا كانت المحادثة مفتوحة
      if (selectedConvRef.current?.id === data.conversationId) {
        setMessages(prev => {
          if (prev.some(m => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
        markCrmConversationRead(data.conversationId).catch(() => {});
      }

      // تحديث قائمة المحادثات
      setConversations(prev => {
        const exists = prev.find(c => c.id === data.conversationId);
        if (exists) {
          return prev.map(c => c.id === data.conversationId ? {
            ...c,
            lastMessage: data.conversation.lastMessage,
            lastMessageAt: data.conversation.lastMessageAt,
            unreadCount: selectedConvRef.current?.id === data.conversationId ? 0 : (c.unreadCount + 1),
          } : c).sort((a, b) => {
            const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
            const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
            return tb - ta;
          });
        }
        return prev; // المحادثة الجديدة ستصل عبر conversation:new
      });
    };

    // محادثة جديدة أُنشئت
    const onNewConversation = (data: { conversation: any }) => {
      setConversations(prev => {
        if (prev.some(c => c.id === data.conversation.id)) return prev;
        return [data.conversation, ...prev];
      });
    };

    // محادثة تم حجزها
    const onClaimed = (data: { conversationId: string; claimedByUserId: string; claimedByName: string }) => {
      // إذا حجزها شخص آخر وأنا أشاهدها حالياً → أخرجني منها
      if (selectedConvRef.current?.id === data.conversationId && data.claimedByUserId !== user?.id) {
        setSelectedConv(null);
        setMessages([]);
        setShowMobileChat(false);
        setClaimedAlert(`تم حجز هذا العميل من طرف ${data.claimedByName || 'موظف آخر'}`);
        setTimeout(() => setClaimedAlert(null), 5000);
      }

      // إذا أنا من حجزها → انقلها لمحادثاتي
      if (data.claimedByUserId === user?.id) {
        setConversations(prev => prev.map(c =>
          c.id === data.conversationId
            ? { ...c, assignedToId: data.claimedByUserId, assignedToName: data.claimedByName, status: 'assigned' as const }
            : c
        ));
        if (selectedConvRef.current?.id === data.conversationId) {
          setSelectedConv(prev => prev ? {
            ...prev,
            assignedToId: data.claimedByUserId,
            assignedToName: data.claimedByName,
            status: 'assigned' as const,
          } : null);
        }
      } else {
        // حجزها شخص آخر → أزلها من قائمتي
        setConversations(prev => prev.filter(c => c.id !== data.conversationId));
      }
    };

    // محادثة تم تحرير حجزها
    const onReleased = (data: { conversationId: string }) => {
      setConversations(prev => prev.map(c =>
        c.id === data.conversationId
          ? { ...c, assignedToId: null, assignedToName: null, status: 'open' as const }
          : c
      ));
      if (selectedConvRef.current?.id === data.conversationId) {
        setSelectedConv(prev => prev ? { ...prev, assignedToId: null, assignedToName: null, status: 'open' as const } : null);
      }
    };

    // محادثة تم إغلاقها
    const onClosed = (data: { conversationId: string }) => {
      setConversations(prev => prev.map(c =>
        c.id === data.conversationId ? { ...c, status: 'closed' as const } : c
      ));
      if (selectedConvRef.current?.id === data.conversationId) {
        setSelectedConv(prev => prev ? { ...prev, status: 'closed' as const } : null);
      }
    };

    // رسالة صادرة من موظف آخر
    const onOutbound = (data: { conversationId: string; message: CrmMessage; senderUserId: string }) => {
      // تجاهل إذا كنت أنا المرسل (أضفتها محلياً بالفعل)
      if (data.senderUserId === user?.id) return;

      if (selectedConvRef.current?.id === data.conversationId) {
        setMessages(prev => {
          if (prev.some(m => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }

      setConversations(prev => prev.map(c =>
        c.id === data.conversationId
          ? { ...c, lastMessage: data.message.content || `[${data.message.messageType}]`, lastMessageAt: data.message.createdAt }
          : c
      ));
    };

    socket.on('message:new', onNewMessage);
    socket.on('conversation:new', onNewConversation);
    socket.on('conversation:claimed', onClaimed);
    socket.on('conversation:released', onReleased);
    socket.on('conversation:closed', onClosed);
    socket.on('message:outbound', onOutbound);

    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('conversation:new', onNewConversation);
      socket.off('conversation:claimed', onClaimed);
      socket.off('conversation:released', onReleased);
      socket.off('conversation:closed', onClosed);
      socket.off('message:outbound', onOutbound);
    };
  }, [socket, user?.id]);

  // تحميل الرسائل
  const loadMessages = async (convId: string, silent = false) => {
    if (!silent) setLoadingMsgs(true);
    try {
      const data = await getCrmMessages(convId);
      setMessages(data.messages);
      // تعليم كمقروءة
      markCrmConversationRead(convId).catch(() => {});
    } catch {
      // خطأ
    } finally {
      setLoadingMsgs(false);
    }
  };

  // إزالة الرسائل المكررة
  const uniqueMessages = Array.from(new Map(messages.map(m => [m.id, m])).values());

  // التمرير لآخر رسالة
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectConversation = (conv: CrmConversation) => {
    setSelectedConv(conv);
    setShowMobileChat(true);
    loadMessages(conv.id);
    // تصفير عداد الرسائل غير المقروءة محلياً
    setConversations(prev =>
      prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c)
    );
  };

  const handleSend = async () => {
    if (!selectedConv || sending) return;

    // إذا كانت هناك صورة مرفقة
    if (attachedImage) {
      setSending(true);
      try {
        const caption = messageText.trim() || undefined;
        const { message } = await sendCrmMediaMessage(selectedConv.id, attachedImage, 'image', caption);
        setMessages(prev => [...prev, message]);
        setConversations(prev =>
          prev.map(c => c.id === selectedConv.id ? { ...c, lastMessage: caption || '📷 صورة', lastMessageAt: new Date().toISOString() } : c)
        );
        clearAttachedImage();
        setMessageText('');
      } catch { /* فشل */ }
      finally { setSending(false); }
      return;
    }

    // رسالة نصية عادية
    if (!messageText.trim()) return;
    const text = messageText.trim();
    setMessageText('');
    setSending(true);
    try {
      const { message } = await sendCrmMessage(selectedConv.id, text);
      setMessages(prev => [...prev, message]);
      setConversations(prev =>
        prev.map(c => c.id === selectedConv.id ? { ...c, lastMessage: text, lastMessageAt: new Date().toISOString() } : c)
      );
    } catch {
      setMessageText(text);
    } finally {
      setSending(false);
    }
  };

  // ===== إرفاق صورة =====
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedImage(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const clearAttachedImage = () => {
    setAttachedImage(null);
    setImagePreview(null);
  };

  // ===== تسجيل صوتي =====
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm' });
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => { stream.getTracks().forEach(t => t.stop()); };
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch {
      alert('لا يمكن الوصول للميكروفون');
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current.stop();
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingTime(0);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  const stopAndSendRecording = async () => {
    if (!mediaRecorderRef.current || !selectedConv) return;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    const recorder = mediaRecorderRef.current;
    const audioBlob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        recorder.stream?.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        resolve(blob);
      };
      recorder.stop();
    });

    setIsRecording(false);
    setRecordingTime(0);

    if (audioBlob.size < 100) return; // تسجيل فارغ

    setSending(true);
    try {
      const file = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
      const { message } = await sendCrmMediaMessage(selectedConv.id, file, 'audio');
      setMessages(prev => [...prev, message]);
      setConversations(prev =>
        prev.map(c => c.id === selectedConv.id ? { ...c, lastMessage: '🎤 رسالة صوتية', lastMessageAt: new Date().toISOString() } : c)
      );
    } catch { /* فشل */ }
    finally { setSending(false); }
  };

  const handleClaim = async () => {
    if (!selectedConv) return;
    try {
      await claimCrmConversation(selectedConv.id);
      // التحديث سيأتي عبر WebSocket (conversation:claimed)
    } catch {
      // المحادثة محجوزة لشخص آخر - سيتم التحديث عبر WebSocket
      loadConversations();
    }
  };

  const handleRelease = async () => {
    if (!selectedConv) return;
    try {
      await releaseCrmConversation(selectedConv.id);
      // التحديث سيأتي عبر WebSocket (conversation:released)
    } catch { /* خطأ */ }
  };

  // تصفية المحادثات بالبحث
  const filteredConversations = conversations.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.customerPhone.includes(q) ||
      (c.customerName && c.customerName.toLowerCase().includes(q)) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
    );
  });

  const filters = [
    { value: 'unassigned' as const, label: 'غير محجوزة' },
    { value: 'mine' as const, label: 'محادثاتي' },
  ];

  return (
    <div className="h-full flex bg-gray-50 relative overflow-hidden" dir="rtl">
      {/* تنبيه الحجز */}
      {claimedAlert && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-bounce">
          <span className="font-medium">{claimedAlert}</span>
          <button onClick={() => setClaimedAlert(null)} className="text-white/80 hover:text-white text-lg font-bold">&times;</button>
        </div>
      )}
      {/* ===== القائمة الجانبية - المحادثات ===== */}
      <div className={`${showMobileChat ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 lg:w-[420px] h-full bg-white border-l border-gray-200 flex-shrink-0`}>
        {/* رأس القائمة */}
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiInbox className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">صندوق الرسائل</h2>
            </div>
            <button
              onClick={() => { setLoadingConvs(true); loadConversations(); }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="تحديث"
            >
              <FiRefreshCw className={`w-4 h-4 text-gray-500 ${loadingConvs ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* البحث */}
          <div className="relative">
            <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو الرقم..."
              className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* فلاتر */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {filters.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  filter === f.value
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* قائمة المحادثات */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex items-center justify-center py-20">
              <FiLoader className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <FiInbox className="w-12 h-12 mb-3" />
              <p className="text-sm font-medium">لا توجد محادثات</p>
            </div>
          ) : (
            filteredConversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`w-full flex items-start gap-3 p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors text-right ${
                  selectedConv?.id === conv.id ? 'bg-blue-50 border-r-4 border-r-blue-500' : ''
                }`}
              >
                {/* أفاتار */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
                    <FiUser className="w-5 h-5 text-gray-500" />
                  </div>
                  {/* شارة القناة */}
                  <div className="absolute -bottom-0.5 -left-0.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                    <FaWhatsapp className="w-3 h-3 text-white" />
                  </div>
                </div>

                {/* المعلومات */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-gray-900 truncate">
                      {conv.customerName || conv.customerPhone}
                    </h3>
                    <span className="text-[10px] text-gray-400 flex-shrink-0 mr-2">
                      {formatTime(conv.lastMessageAt)}
                    </span>
                  </div>
                  {conv.customerName && (
                    <p className="text-[11px] text-gray-400 flex items-center gap-1">
                      <FiPhone className="w-3 h-3" />
                      {conv.customerPhone}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 truncate mt-1">{conv.lastMessage || 'لا توجد رسائل'}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {conv.assignedToId && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {conv.assignedToName || 'محجوزة'}
                      </span>
                    )}
                    {conv.status === 'closed' && (
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">مغلقة</span>
                    )}
                  </div>
                </div>

                {/* عداد غير المقروءة */}
                {conv.unreadCount > 0 && (
                  <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-1">
                    {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* ===== لوحة الدردشة ===== */}
      <div className={`${showMobileChat ? 'flex' : 'hidden md:flex'} flex-col flex-1 min-w-0 h-full bg-gray-50`}>
        {selectedConv ? (
          <>
            {/* رأس الدردشة */}
            <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
              {/* زر الرجوع للموبايل */}
              <button
                onClick={() => setShowMobileChat(false)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiArrowRight className="w-5 h-5 text-gray-600" />
              </button>

              {/* أفاتار */}
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
                  <FiUser className="w-4 h-4 text-gray-500" />
                </div>
                <div className="absolute -bottom-0.5 -left-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                  <FaWhatsapp className="w-2.5 h-2.5 text-white" />
                </div>
              </div>

              {/* معلومات العميل */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm text-gray-900 truncate">
                  {selectedConv.customerName || selectedConv.customerPhone}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <FiPhone className="w-3 h-3" />
                    {selectedConv.customerPhone}
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">{selectedConv.channel?.name}</span>
                </div>
              </div>

              {/* أزرار الإجراءات */}
              <div className="flex items-center gap-1.5">
                {selectedConv.assignedToId === user?.id ? (
                  <button
                    onClick={handleRelease}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                    title="إلغاء الحجز"
                  >
                    <FiUnlock className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">إلغاء الحجز</span>
                  </button>
                ) : !selectedConv.assignedToId ? (
                  <button
                    onClick={handleClaim}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    title="حجز المحادثة"
                  >
                    <FiLock className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">حجز</span>
                  </button>
                ) : null}

                {selectedConv.status !== 'closed' && (
                  <button
                    onClick={async () => {
                      await closeCrmConversation(selectedConv.id);
                      setSelectedConv(prev => prev ? { ...prev, status: 'closed' as const } : null);
                      loadConversations();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    title="إغلاق المحادثة"
                  >
                    <FiXCircle className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">إغلاق</span>
                  </button>
                )}
              </div>
            </div>

            {/* منطقة الرسائل */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/svg%3E")' }}>
              {loadingMsgs ? (
                <div className="flex items-center justify-center py-20">
                  <FiLoader className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : uniqueMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <FaWhatsapp className="w-16 h-16 mb-4 text-gray-200" />
                  <p className="text-sm">لا توجد رسائل بعد</p>
                </div>
              ) : (
                uniqueMessages.map(msg => <MessageBubble key={msg.id} message={msg} />)
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* شريط الإرسال */}
            {selectedConv.status !== 'closed' && (
              <div className="bg-white border-t border-gray-200">
                {/* معاينة الصورة المرفقة */}
                {imagePreview && (
                  <div className="px-3 pt-3 flex items-start gap-2">
                    <div className="relative">
                      <img src={imagePreview} alt="" className="w-20 h-20 rounded-xl object-cover border border-gray-200" />
                      <button
                        onClick={clearAttachedImage}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        <FiX className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />

                <div className="p-3">
                  {/* وضع التسجيل */}
                  {isRecording ? (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={cancelRecording}
                        className="p-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors flex-shrink-0"
                        title="إلغاء"
                      >
                        <FiTrash2 className="w-5 h-5" />
                      </button>
                      <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-red-50 rounded-2xl">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-sm text-red-700 font-medium">
                          جاري التسجيل... {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
                        </span>
                      </div>
                      <button
                        onClick={stopAndSendRecording}
                        className="p-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 transition-all flex-shrink-0"
                        title="إرسال التسجيل"
                      >
                        <FiSend className="w-5 h-5 rotate-180" />
                      </button>
                    </div>
                  ) : (
                    /* الوضع العادي */
                    <div className="flex items-end gap-2">
                      {/* أزرار المرفقات */}
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors"
                          title="إرفاق صورة"
                        >
                          <FiImage className="w-5 h-5" />
                        </button>
                        <button
                          onClick={startRecording}
                          className="p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-red-500 transition-colors"
                          title="تسجيل صوتي"
                        >
                          <FiMic className="w-5 h-5" />
                        </button>
                      </div>
                      {/* حقل النص */}
                      <div className="flex-1 relative">
                        <textarea
                          value={messageText}
                          onChange={e => setMessageText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSend();
                            }
                          }}
                          placeholder={attachedImage ? 'أضف تعليق (اختياري)...' : 'اكتب رسالة...'}
                          rows={1}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-32"
                          style={{ minHeight: '44px' }}
                        />
                      </div>
                      {/* زر الإرسال */}
                      <button
                        onClick={handleSend}
                        disabled={(!messageText.trim() && !attachedImage) || sending}
                        className={`p-3 rounded-2xl transition-all flex-shrink-0 ${
                          (messageText.trim() || attachedImage) && !sending
                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {sending ? (
                          <FiLoader className="w-5 h-5 animate-spin" />
                        ) : (
                          <FiSend className="w-5 h-5 rotate-180" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          /* حالة عدم اختيار محادثة */
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FiInbox className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-500 mb-1">صندوق الرسائل</h3>
            <p className="text-sm">اختر محادثة من القائمة للبدء</p>
          </div>
        )}
      </div>
    </div>
  );
}
