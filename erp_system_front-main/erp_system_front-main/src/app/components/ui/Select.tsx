'use client';

import Select from 'react-select';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  icon?: React.ReactNode;
  isMulti?: boolean;
  isSearchable?: boolean;
  isClearable?: boolean;
  menuPortalTarget?: HTMLElement | null;
  instanceId?: string;
}

// تخصيص تصميم react-select ليتناسب مع هوية Tiba
const customStyles = {
  control: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: 'white',
    borderColor: state.isFocused ? '#1e3a8a' : state.error ? '#ef4444' : '#d1d5db',
    borderWidth: '1px',
    borderRadius: '0.5rem',
    minHeight: '48px',
    boxShadow: state.isFocused ? '0 0 0 2px rgba(30, 58, 138, 0.2)' : 'none',
    '&:hover': {
      borderColor: state.isFocused ? '#1e3a8a' : '#3b82f6'
    },
    direction: 'rtl',
    textAlign: 'right'
  }),
  option: (provided: any, state: any) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? '#eff6ff'
      : state.isFocused
        ? '#f8fafc'
        : 'white',
    color: state.isSelected
      ? '#1d4ed8'
      : state.isFocused
        ? '#1f2937'
        : '#374151',
    fontWeight: state.isSelected ? '600' : '400',
    padding: '12px 16px',
    cursor: 'pointer',
    textAlign: 'right',
    direction: 'rtl',
    borderBottom: '1px solid #f3f4f6',
    '&:last-child': {
      borderBottom: 'none'
    }
  }),
  menu: (provided: any) => ({
    ...provided,
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    zIndex: 99999,
    marginTop: '4px'
  }),

  menuList: (provided: any) => ({
    ...provided,
    padding: '8px 0',
    maxHeight: '240px',
    overscrollBehavior: 'contain'
  }),
  valueContainer: (provided: any) => ({
    ...provided,
    padding: '2px 8px',
    direction: 'rtl',
  }),
  singleValue: (provided: any) => ({
    ...provided,
    color: '#1f2937',
    direction: 'rtl',
    textAlign: 'right',
    marginRight: '2px',
    marginLeft: '2px',
  }),
  multiValue: (provided: any) => ({
    ...provided,
    backgroundColor: '#eff6ff',
    borderRadius: '0.375rem',
    margin: '2px'
  }),
  multiValueLabel: (provided: any) => ({
    ...provided,
    color: '#1d4ed8',
    fontWeight: '500',
    padding: '4px 8px'
  }),
  multiValueRemove: (provided: any) => ({
    ...provided,
    color: '#1d4ed8',
    '&:hover': {
      backgroundColor: '#dbeafe',
      color: '#1e40af'
    }
  }),
  placeholder: (provided: any) => ({
    ...provided,
    color: '#9ca3af',
    textAlign: 'right',
    direction: 'rtl',
    paddingRight: '2px'
  }),
  input: (provided: any) => ({
    ...provided,
    color: '#1f2937',
    textAlign: 'right',
    direction: 'rtl',
    paddingRight: '2px'
  }),
  indicatorSeparator: () => ({
    display: 'none'
  }),
  dropdownIndicator: (provided: any, state: any) => ({
    ...provided,
    color: '#9ca3af',
    transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
    transition: 'transform 0.2s ease',
    padding: '0 8px'
  }),
  clearIndicator: (provided: any) => ({
    ...provided,
    color: '#9ca3af',
    '&:hover': {
      color: '#ef4444'
    },
    padding: '0 8px'
  }),
  noOptionsMessage: (provided: any) => ({
    ...provided,
    color: '#6b7280',
    textAlign: 'center',
    padding: '16px'
  }),
  loadingMessage: (provided: any) => ({
    ...provided,
    color: '#6b7280',
    textAlign: 'center',
    padding: '16px'
  }),
  menuPortal: (base: any) => ({
    ...base,
    zIndex: 99999,
    pointerEvents: 'auto'
  })
};

// مكون Select الأساسي باستخدام react-select
export function TibaSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "اختر خياراً...",
  disabled = false,
  error,
  className = "",
  icon,
  isMulti = false,
  isSearchable = false,
  isClearable = false,
  menuPortalTarget,
  instanceId
}: SelectProps) {

  // تحويل القيمة إلى التنسيق المطلوب لـ react-select
  const getValue = () => {
    if (isMulti) {
      if (typeof value === 'string' && value) {
        const values = value.split(',').filter(v => v.trim());
        return options.filter(option => values.includes(option.value));
      }
      return [];
    }
    return options.find(option => option.value === value) || null;
  };

  // معالجة التغيير
  const handleChange = (selectedOption: any) => {
    if (isMulti) {
      const values = selectedOption ? selectedOption.map((option: any) => option.value) : [];
      onChange(values.join(','));
    } else {
      onChange(selectedOption ? selectedOption.value : '');
    }
  };

  // The 'label' for react-select must be a string.
  // The custom rendering is handled by formatOptionLabel.
  const selectOptions = options.map(option => ({
    ...option,
    label: option.label
  }));

  const formatOptionLabel = ({ label, icon }: SelectOption, { context }: { context: string }) => {
    // في القيمة المختارة: نص عادي بدون عناصر التفاف إضافية لمنع قص الحرف العربي الأول
    if (context === 'value') {
      return icon ? (
        <div className="flex items-center gap-2" style={{ direction: 'rtl' }}>
          <span>{label}</span>
          <span className="text-gray-400 flex-shrink-0">{icon}</span>
        </div>
      ) : label;
    }
    // في القائمة المنسدلة
    return (
      <div className="flex items-center justify-between w-full" style={{ direction: 'rtl' }}>
        <span>{label}</span>
        {icon && (
          <span className="mr-2 text-gray-400">{icon}</span>
        )}
      </div>
    );
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          className="block text-sm font-medium text-tiba-gray-700 mb-1"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {/* أيقونة مخصصة */}
        {icon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none z-10">
            <div className="text-tiba-gray-400">
              {icon}
            </div>
          </div>
        )}

        <Select
          instanceId={instanceId}
          value={getValue()}
          onChange={handleChange}
          options={selectOptions}
          formatOptionLabel={formatOptionLabel}
          placeholder={placeholder}
          isDisabled={disabled}
          isMulti={isMulti}
          isSearchable={isSearchable}
          isClearable={isClearable}
          isOptionDisabled={(option) => option.disabled || false}
          styles={{
            ...customStyles,
            valueContainer: (provided) => ({
              ...customStyles.valueContainer(provided),
              paddingRight: icon ? '48px' : '12px',
            })
          }}
          classNamePrefix="tiba-select"
          noOptionsMessage={() => "لا توجد خيارات متاحة"}
          loadingMessage={() => "جاري التحميل..."}
          menuPlacement="auto"
          menuPosition={menuPortalTarget === null ? "absolute" : "fixed"}
          menuPortalTarget={menuPortalTarget !== undefined ? menuPortalTarget : (typeof document !== 'undefined' ? document.body : null)}
          menuShouldScrollIntoView={false}
          maxMenuHeight={250}
          closeMenuOnSelect={!isMulti}
          hideSelectedOptions={false}
          blurInputOnSelect={true}
          isOptionSelected={(option) => {
            if (isMulti) {
              const values = typeof value === 'string' ? value.split(',').filter(v => v.trim()) : [];
              return values.includes(option.value);
            }
            return option.value === value;
          }}
          isRtl
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-tiba-danger-600">{error}</p>
      )}
    </div>
  );
}

// مكون Select بسيط للاستخدام السريع
export function SimpleSelect(props: SelectProps) {
  return (
    <TibaSelect
      {...props}
      isMulti={false}
      isSearchable={false}
      isClearable={false}
      menuPortalTarget={props.menuPortalTarget}
    />
  );
}

// مكون Select متقدم مع البحث
export function SearchableSelect(props: SelectProps) {
  return (
    <TibaSelect
      {...props}
      isMulti={false}
      isSearchable={true}
      isClearable={true}
    />
  );
}

// مكون Select متعدد
export function MultiSelect(props: SelectProps) {
  return (
    <TibaSelect
      {...props}
      isMulti={true}
      isSearchable={true}
      isClearable={true}
    />
  );
}

// مكون Select مع أيقونات
export function IconSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "اختر خياراً...",
  disabled = false,
  error,
  className = "",
  icon
}: SelectProps) {
  return (
    <TibaSelect
      label={label}
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      error={error}
      className={className}
      icon={icon}
      isSearchable={false}
    />
  );
} 