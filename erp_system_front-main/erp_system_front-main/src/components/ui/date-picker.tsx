"use client";

interface CustomDatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
}

export default function CustomDatePicker({ 
  value, 
  onChange, 
  placeholder = "اختر التاريخ", 
  disabled = false,
  required = false,
  error,
  className = ""
}: CustomDatePickerProps) {
  // تحويل التاريخ إلى التنسيق المطلوب للحقل (YYYY-MM-DD)
  const formattedValue = value ? value : "";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    onChange(dateValue);
  };

  return (
    <div className={className}>
      <input
        type="date"
        value={formattedValue}
        onChange={handleChange}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
      />
      
      {/* رسالة الخطأ */}
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}