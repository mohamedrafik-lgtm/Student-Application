'use client';

// يعيد التوجيه للرئيسية حيث البيانات الشخصية موجودة فيها
import { redirect } from 'next/navigation';

export default function CrmProfile() {
  redirect('/crm');
}
