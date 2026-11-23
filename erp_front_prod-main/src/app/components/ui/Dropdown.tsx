import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

interface DropdownProps {
  trigger: React.ReactNode;
  items: {
    label: string;
    icon?: React.ReactNode;
    onClick?: () => void;
    href?: string;
    className?: string;
  }[];
  align?: 'left' | 'right';
  className?: string;
  menuClassName?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  align = 'right',
  className = '',
  menuClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const toggleDropdown = () => {
    if (!isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      
      // Adjust position based on align
      let left;
      if (align === 'left') {
        left = rect.left;
      } else {
        left = rect.right;
      }
      
      setPosition({
        top: rect.bottom + window.scrollY,
        left: left + window.scrollX
      });
    }
    
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleItemClick = (item: typeof items[0]) => {
    console.log('Dropdown item clicked:', item.label);
    
    // إغلاق القائمة المنسدلة
    setIsOpen(false);
    
    // تنفيذ الإجراء المخصص إذا كان موجودًا
    if (item.onClick) {
      console.log('Executing onClick handler');
      item.onClick();
    }
    
    // التنقل إلى الرابط إذا كان موجودًا
    if (item.href) {
      console.log('Navigating to:', item.href);
      router.push(item.href);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div
        onClick={toggleDropdown}
        className="cursor-pointer"
        role="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleDropdown();
          }
        }}
      >
        {trigger}
      </div>

      {isOpen && mounted && createPortal(
        <div 
          className={`fixed rounded-md shadow-lg bg-white border border-gray-200 focus:outline-none z-[9999] ${menuClassName}`}
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: align === 'right' ? 'translateX(-100%)' : 'none',
            width: '200px',
          }}
        >
          <div className="py-1 rounded-md overflow-hidden">
            {items.map((item, index) => (
              <button
                key={index}
                onClick={() => handleItemClick(item)}
                className={`${item.className || ''} w-full text-left block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2`}
              >
                {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                <span className="flex-1 text-right">{item.label}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}; 