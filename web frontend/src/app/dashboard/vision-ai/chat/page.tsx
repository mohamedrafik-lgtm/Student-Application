'use client';

import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { FiSend, FiUser, FiRefreshCw, FiAlertTriangle } from 'react-icons/fi';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function VisionAIChatPage() {
  const IS_MAINTENANCE_MODE = true;

  if (IS_MAINTENANCE_MODE) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
        <Card className="w-full max-w-3xl text-center p-10 space-y-6 border-2 border-amber-200/60 shadow-2xl bg-white/90 backdrop-blur">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-3xl bg-amber-100 border border-amber-200 flex items-center justify-center shadow-lg">
              <FiAlertTriangle className="w-10 h-10 text-amber-500" />
            </div>
          </div>

          <div className="space-y-3">
            <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 text-amber-600 text-sm font-semibold border border-amber-100">
              ⚙️ الصفحة مغلقة مؤقتاً
            </p>
            <h1 className="text-3xl font-black text-gray-900">
              Vision AI Chat غير متاح حالياً
            </h1>
            <p className="text-gray-600 text-lg leading-relaxed max-w-2xl mx-auto">
              تم إيقاف هذه الخدمة مؤقتاً بسبب قيود موارد الخادم. سنقوم بإعادة تشغيل صفحة الدردشة
              فور استقرار الموارد لضمان تجربة ثابتة وسلسة. شكراً لتفهمك وصبرك.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 text-right">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">الوضع الحالي</p>
              <p className="font-semibold text-gray-800">الصيانة قيد التنفيذ ⏳</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">السبب</p>
              <p className="font-semibold text-gray-800">استهلاك مرتفع لموارد الخادم</p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => window.location.reload()}
              className="w-full md:w-auto px-8 py-6 rounded-2xl text-base font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg text-white"
            >
              سأحاول مجدداً لاحقاً
            </Button>
            <p className="text-sm text-gray-500">
              يمكنك متابعة المهام الأخرى داخل لوحة التحكم ريثما ننتهي من ترقية الموارد.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'مرحباً! أنا Vision AI، مساعدك الذكي من شركة كوديكس. كيف يمكنني مساعدتك اليوم؟',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Prepare conversation history
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Call API
      const response = await fetchAPI('/openai-vision/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory
        })
      });

      // Add assistant response
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.reply,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('حدث خطأ في إرسال الرسالة');
      
      // Add error message
      const errorMessage: Message = {
        role: 'assistant',
        content: 'عذراً، حدث خطأ في معالجة رسالتك. يرجى المحاولة مرة أخرى.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'مرحباً! أنا Vision AI، مساعدك الذكي من شركة كوديكس. كيف يمكنني مساعدتك اليوم؟',
        timestamp: new Date()
      }
    ]);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl shadow-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white bg-opacity-20 backdrop-blur-sm p-3 rounded-2xl">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-black">Vision AI</h1>
              <p className="text-blue-100 text-sm">محادثة مع المساعد الذكي</p>
            </div>
          </div>
          
          <button
            onClick={clearChat}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-xl font-semibold transition-all hover:scale-105 border border-white/20"
          >
            <FiRefreshCw className="w-4 h-4" />
            <span>مسح المحادثة</span>
          </button>
        </div>
        
        <div className="flex gap-2 mt-4">
          <div className="px-3 py-1 bg-white bg-opacity-20 backdrop-blur-sm rounded-full text-white text-xs font-medium">
            🧠 ذكاء متقدم
          </div>
          <div className="px-3 py-1 bg-white bg-opacity-20 backdrop-blur-sm rounded-full text-white text-xs font-medium">
            ⚡ استجابة فورية
          </div>
          <div className="px-3 py-1 bg-white bg-opacity-20 backdrop-blur-sm rounded-full text-white text-xs font-medium">
            🎯 دقة عالية
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <Card className="flex-1 overflow-hidden flex flex-col rounded-t-none border-t-0">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <circle cx="12" cy="12" r="2" />
                    <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
              )}

              <div
                className={`max-w-[70%] ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-sm'
                    : 'bg-gray-100 text-gray-900 rounded-2xl rounded-tl-sm'
                } px-5 py-3 shadow-md`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
                <p className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString('ar-EG', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0 w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center shadow-md">
                  <FiUser className="w-5 h-5 text-gray-600" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <circle cx="12" cy="12" r="2" />
                  <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-5 py-3 shadow-md">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="flex gap-3">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="اكتب رسالتك هنا... (اضغط Enter للإرسال)"
              className="flex-1 resize-none rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none px-4 py-3 text-sm transition-colors min-h-[60px] max-h-[120px]"
              disabled={isLoading}
              rows={2}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed h-[60px]"
            >
              <FiSend className="w-5 h-5" />
            </Button>
          </div>
          
          <p className="text-xs text-gray-500 mt-2 text-center">
            Vision AI من شركة كوديكس • مساعدك الذكي للتدريب
          </p>
        </div>
      </Card>
    </div>
  );
}