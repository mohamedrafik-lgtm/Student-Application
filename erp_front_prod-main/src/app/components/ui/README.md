# مكونات Select المتطورة - Tiba Design System

هذا الملف يوضح كيفية استخدام مكونات Select المتطورة والجميلة في تطبيق Tiba، المبنية على مكتبة `react-select` مع تصميم مخصص يتناسب مع هوية Tiba.

## المكونات المتاحة

### 1. TibaSelect (المكون الأساسي)
مكون Select متطور مع جميع الميزات المتقدمة.

```tsx
import { TibaSelect } from '@/app/components/ui/Select';

const options = [
  { value: 'option1', label: 'الخيار الأول' },
  { value: 'option2', label: 'الخيار الثاني' },
  { value: 'option3', label: 'الخيار الثالث' }
];

<TibaSelect
  options={options}
  value={selectedValue}
  onChange={(value) => setSelectedValue(value)}
  placeholder="اختر خياراً..."
  icon={<SomeIcon className="h-5 w-5" />}
  isMulti={false}
  isSearchable={true}
  isClearable={true}
/>
```

### 2. SimpleSelect
مكون Select بسيط بدون بحث أو مسح.

```tsx
import { SimpleSelect } from '@/app/components/ui/Select';

<SimpleSelect
  options={options}
  value={selectedValue}
  onChange={(value) => setSelectedValue(value)}
  placeholder="اختر خياراً..."
  icon={<SomeIcon className="h-5 w-5" />}
/>
```

### 3. SearchableSelect
مكون Select مع البحث والمسح (الأكثر استخداماً).

```tsx
import { SearchableSelect } from '@/app/components/ui/Select';

<SearchableSelect
  options={options}
  value={selectedValue}
  onChange={(value) => setSelectedValue(value)}
  placeholder="اختر خياراً..."
  icon={<SomeIcon className="h-5 w-5" />}
/>
```

### 4. MultiSelect
مكون Select للتحديد المتعدد.

```tsx
import { MultiSelect } from '@/app/components/ui/Select';

<MultiSelect
  options={options}
  value={selectedValues}
  onChange={(value) => setSelectedValues(value)}
  placeholder="اختر عدة خيارات..."
  icon={<SomeIcon className="h-5 w-5" />}
/>
```

### 5. IconSelect
مكون Select مع أيقونات في الخيارات.

```tsx
import { IconSelect } from '@/app/components/ui/Select';

const iconOptions = [
  { value: 'user', label: 'مستخدم', icon: <UserIcon className="h-4 w-4" /> },
  { value: 'admin', label: 'مشرف', icon: <ShieldIcon className="h-4 w-4" /> }
];

<IconSelect
  options={iconOptions}
  value={selectedValue}
  onChange={(value) => setSelectedValue(value)}
  placeholder="اختر نوع المستخدم"
/>
```

## الخصائص المشتركة

| الخاصية | النوع | الوصف | الافتراضي |
|---------|-------|--------|-----------|
| `options` | `SelectOption[]` | قائمة الخيارات المتاحة | مطلوب |
| `value` | `string` | القيمة المحددة حالياً | مطلوب |
| `onChange` | `(value: string) => void` | دالة التحديث | مطلوب |
| `placeholder` | `string` | النص الافتراضي | "اختر خياراً..." |
| `disabled` | `boolean` | تعطيل المكون | `false` |
| `error` | `string` | رسالة الخطأ | `undefined` |
| `className` | `string` | CSS classes إضافية | `""` |
| `icon` | `React.ReactNode` | أيقونة المكون | `undefined` |
| `isMulti` | `boolean` | التحديد المتعدد | `false` |
| `isSearchable` | `boolean` | تفعيل البحث | `true` |
| `isClearable` | `boolean` | إمكانية المسح | `true` |

## خصائص SelectOption

```tsx
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode; // للأيقونات في الخيارات
}
```

## أمثلة الاستخدام

### مثال 1: فلتر بسيط
```tsx
const branchOptions = [
  { value: '', label: 'جميع الفروع' },
  { value: 'branch1', label: 'الفرع الأول' },
  { value: 'branch2', label: 'الفرع الثاني' }
];

<SearchableSelect
  options={branchOptions}
  value={filters.branch}
  onChange={(value) => setFilters({ ...filters, branch: value })}
  placeholder="اختر الفرع"
  icon={<FunnelIcon className="h-5 w-5" />}
/>
```

### مثال 2: اختيار الدور مع خطأ
```tsx
<SearchableSelect
  options={roleOptions}
  value={newUser.role}
  onChange={(value) => setNewUser({ ...newUser, role: value })}
  placeholder="اختر الدور"
  error={errors.role}
  icon={<UsersIcon className="h-5 w-5" />}
/>
```

### مثال 3: اختيار متعدد مع أيقونات
```tsx
const programOptions = [
  { value: 'program1', label: 'برنامج أول', icon: <AcademicCapIcon className="h-4 w-4" /> },
  { value: 'program2', label: 'برنامج ثاني', icon: <BookOpenIcon className="h-4 w-4" /> }
];

<MultiSelect
  options={programOptions}
  value={selectedPrograms}
  onChange={(value) => setSelectedPrograms(value)}
  placeholder="اختر البرامج"
  icon={<AcademicCapIcon className="h-5 w-5" />}
/>
```

### مثال 4: فلتر متقدم
```tsx
<TibaSelect
  options={advancedOptions}
  value={selectedValue}
  onChange={(value) => setSelectedValue(value)}
  placeholder="اختر خياراً..."
  isMulti={true}
  isSearchable={true}
  isClearable={true}
  icon={<FunnelIcon className="h-5 w-5" />}
/>
```

## تصميم موحد

جميع مكونات Select تستخدم نفس نظام الألوان والتصميم:

- **الخلفية**: أبيض
- **الحدود**: رمادي فاتح (#d1d5db)
- **التركيز**: أزرق Tiba (#1e3a8a)
- **الخطأ**: أحمر Tiba (#ef4444)
- **التعطيل**: رمادي فاتح (#f9fafb)
- **الخيار المحدد**: أزرق فاتح (#eff6ff)
- **الخيار المحدد**: أزرق داكن (#1d4ed8)

## الميزات المتقدمة

✅ تصميم جميل ومتطور  
✅ دعم الأيقونات في الخيارات  
✅ البحث المباشر في الخيارات  
✅ التحديد المتعدد  
✅ إمكانية مسح القيمة  
✅ رسائل الخطأ الجميلة  
✅ حالة التعطيل  
✅ تأثيرات بصرية سلسة  
✅ دعم RTL كامل  
✅ قابلية التخصيص الشاملة  
✅ أداء محسن  
✅ تجربة مستخدم ممتازة  
✅ رسائل "لا توجد خيارات" و "جاري التحميل"  
✅ تأثيرات hover و focus جميلة  
✅ scrollbar مخصص  
✅ انيميشن سلس للقائمة المنسدلة  

## المميزات التقنية

- **مبنية على react-select**: مكتبة موثوقة ومستقرة
- **TypeScript**: دعم كامل للأنواع
- **Tailwind CSS**: تصميم متجاوب
- **Headless**: قابلية تخصيص كاملة
- **Accessibility**: دعم كامل لإمكانية الوصول
- **Performance**: أداء محسن مع قوائم كبيرة
- **Mobile**: دعم كامل للأجهزة المحمولة
``` 