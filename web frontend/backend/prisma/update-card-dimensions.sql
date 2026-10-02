-- تحديث أبعاد الكارنيهات الموجودة للأبعاد الصحيحة (ISO/IEC 7810 ID-1)
-- العرض: 85.60mm = 1011px @ 300 DPI
-- الارتفاع: 53.98mm = 638px @ 300 DPI

-- تحديث التصاميم الموجودة التي تستخدم الأبعاد القديمة الخاطئة
UPDATE id_card_designs 
SET 
    width = 1011,
    height = 638
WHERE 
    width = 324 AND height = 204;

-- تحديث التصاميم التي قد تكون قريبة من الأبعاد القديمة
UPDATE id_card_designs 
SET 
    width = 1011,
    height = 638
WHERE 
    width BETWEEN 320 AND 330 
    AND height BETWEEN 200 AND 210;

-- إضافة تعليق للسجل
-- تم التحديث لمطابقة المعايير الدولية الدقيقة ISO/IEC 7810 ID-1
-- الأبعاد الجديدة: 85.60mm × 53.98mm = 1011px × 638px @ 300 DPI
