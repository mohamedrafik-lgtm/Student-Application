'use client';

import { useState } from 'react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { Button } from './button';
import { FiSmile, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

interface EmojiPickerComponentProps {
  onEmojiSelect: (emoji: string) => void;
  buttonClassName?: string;
  pickerPosition?: 'top' | 'bottom' | 'left' | 'right';
}

export function EmojiPickerComponent({ 
  onEmojiSelect, 
  buttonClassName = '',
  pickerPosition = 'bottom'
}: EmojiPickerComponentProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji);
    setIsOpen(false);
  };


  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300 text-yellow-700 hover:from-yellow-100 hover:to-orange-100 hover:border-yellow-400 transition-all duration-200 ${buttonClassName}`}
      >
        <FiSmile className="w-4 h-4" />
        <span className="hidden sm:inline">إيموجيز</span>
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* خلفية معتمة */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/20"
              onClick={() => setIsOpen(false)}
            />

            {/* منتقي الإيموجيز - موضع ثابت في وسط الشاشة */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden max-w-sm w-full max-h-[90vh] flex flex-col">
                {/* رأس منتقي الإيموجيز */}
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <FiSmile className="w-5 h-5" />
                    <span className="font-medium text-sm">اختر إيموجي</span>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded-full hover:bg-white/20 transition-colors"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>

                {/* منتقي الإيموجيز */}
                <div className="emoji-picker-container flex-1 overflow-hidden">
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    theme={Theme.LIGHT}
                    searchDisabled={false}
                    skinTonesDisabled={false}
                    width="100%"
                    height={400}
                    previewConfig={{
                      showPreview: true,
                      defaultEmoji: "1f60a",
                      defaultCaption: "اختر إيموجي من الأسفل!"
                    }}
                    searchPlaceHolder="ابحث عن إيموجي..."
                    categoriesConfig={{
                      categoryOrder: [
                        'smileys_people',
                        'animals_nature', 
                        'food_drink',
                        'travel_places',
                        'activities',
                        'objects',
                        'symbols',
                        'flags'
                      ]
                    }}
                  />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// مكون الإيموجيز المتكررة السريعة
interface QuickEmojisProps {
  onEmojiSelect: (emoji: string) => void;
  className?: string;
}

export function QuickEmojis({ onEmojiSelect, className = '' }: QuickEmojisProps) {
  const quickEmojis = [
    '😊', '👋', '❤️', '🎉', '👍', '🔥', '💯', '✨',
    '📱', '💬', '📝', '✅', '⭐', '🚀', '💡', '🎯'
  ];

  return (
    <div className={`${className}`}>
      <span className="text-sm font-medium text-gray-600 mb-2 block">الإيموجيز الشائعة:</span>
      <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-16 gap-1 sm:gap-2">
        {quickEmojis.map((emoji, index) => (
          <motion.button
            key={index}
            type="button"
            onClick={() => onEmojiSelect(emoji)}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-base sm:text-lg hover:scale-110 transform duration-150 quick-emoji-button"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {emoji}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
