'use client';

import { useState, useEffect } from 'react';
import PageHeader from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/Button';
import { TibaSelect } from '@/app/components/ui/Select';
import { ProtectedPage } from '@/components/permissions/ProtectedPage';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  TableCellsIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';

interface Program {
  id: number;
  nameAr: string;
  nameEn: string;
}

interface Classroom {
  id: number;
  name: string;
  classNumber: number;
}

interface TrainingContent {
  id: number;
  name: string;
  code: string;
  classroomId: number;
  maxMarks: {
    yearWorkMarks: number;
    practicalMarks: number;
    writtenMarks: number;
    attendanceMarks: number;
    quizzesMarks: number;
    finalExamMarks: number;
    total: number;
  };
}

interface Trainee {
  id: number;
  nameAr: string;
  nationalId: string;
}

interface ValidationError {
  row: number;
  trainee: string;
  field: string;
  error: string;
}

export default function BulkUploadGradesPage() {
  return (
    <ProtectedPage requiredPermission={{ resource: 'dashboard.grades.bulk-upload', action: 'manage' }}>
      <BulkUploadGradesContent />
    </ProtectedPage>
  );
}

function BulkUploadGradesContent() {
  const [step, setStep] = useState(1);

  // Step 1: اختيار البرنامج والفصل
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<number | null>(null);

  // Step 2: اختيار المواد (متعدد)
  const [contents, setContents] = useState<TrainingContent[]>([]);
  const [selectedContentIds, setSelectedContentIds] = useState<number[]>([]);
  const [selectedContents, setSelectedContents] = useState<TrainingContent[]>([]);

  // Step 3: قائمة الطلاب
  const [trainees, setTrainees] = useState<Trainee[]>([]);

  // اختيار الدرجات المطلوبة
  const [selectedGrades, setSelectedGrades] = useState({
    yearWorkMarks: true,
    practicalMarks: true,
    writtenMarks: true,
    attendanceMarks: true,
    quizzesMarks: true,
    finalExamMarks: true,
  });

  // Step 4: رفع الملف
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedSheets, setParsedSheets] = useState<{ contentId: number; contentName: string; data: any[] }[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [uploading, setUploading] = useState(false);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPrograms();
  }, []);

  useEffect(() => {
    if (selectedProgramId) {
      loadClassrooms(selectedProgramId);
    }
  }, [selectedProgramId]);

  useEffect(() => {
    if (selectedClassroomId) {
      loadContents(selectedClassroomId);
      loadTrainees(selectedClassroomId);
    }
  }, [selectedClassroomId]);

  const loadPrograms = async () => {
    try {
      setLoading(true);
      const data = await fetchAPI('/training-programs');
      setPrograms(Array.isArray(data) ? data : data?.programs || []);
    } catch (error) {
      console.error('Error loading programs:', error);
      toast.error('فشل تحميل البرامج التدريبية');
    } finally {
      setLoading(false);
    }
  };

  const loadClassrooms = async (programId: number) => {
    try {
      setLoading(true);
      const data = await fetchAPI(`/programs/${programId}`);
      setClassrooms(data?.classrooms || []);
    } catch (error) {
      console.error('Error loading classrooms:', error);
      toast.error('فشل تحميل الفصول الدراسية');
    } finally {
      setLoading(false);
    }
  };

  const loadContents = async (classroomId: number) => {
    try {
      setLoading(true);
      const data = await fetchAPI(`/training-contents?classroomId=${classroomId}`);
      const rawContents = Array.isArray(data) ? data : data?.contents || [];
      
      // تحويل البيانات من Backend format إلى Frontend format
      const transformedContents = rawContents.map((content: any) => ({
        ...content,
        maxMarks: {
          yearWorkMarks: content.yearWorkMarks || 0,
          practicalMarks: content.practicalMarks || 0,
          writtenMarks: content.writtenMarks || 0,
          attendanceMarks: content.attendanceMarks || 0,
          quizzesMarks: content.quizzesMarks || 0,
          finalExamMarks: content.finalExamMarks || 0,
          total: (content.yearWorkMarks || 0) + 
                 (content.practicalMarks || 0) + 
                 (content.writtenMarks || 0) + 
                 (content.attendanceMarks || 0) + 
                 (content.quizzesMarks || 0) + 
                 (content.finalExamMarks || 0),
        }
      }));
      
      setContents(transformedContents);
    } catch (error) {
      console.error('Error loading contents:', error);
      toast.error('فشل تحميل المواد التدريبية');
    } finally {
      setLoading(false);
    }
  };

  const loadTrainees = async (classroomId: number) => {
    try {
      setLoading(true);
      const data = await fetchAPI(`/trainees?classroomId=${classroomId}`);
      setTrainees(Array.isArray(data) ? data : data?.trainees || []);
    } catch (error) {
      console.error('Error loading trainees:', error);
      toast.error('فشل تحميل قائمة الطلاب');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    if (selectedContents.length === 0 || trainees.length === 0) {
      toast.error('يرجى اختيار المواد أولاً');
      return;
    }

    // التحقق من اختيار درجة واحدة على الأقل
    const hasSelectedGrades = Object.values(selectedGrades).some(v => v);
    if (!hasSelectedGrades) {
      toast.error('يرجى اختيار نوع واحد من الدرجات على الأقل');
      return;
    }

    try {
      setLoading(true);
      const wb = XLSX.utils.book_new();

      // إنشاء sheet لكل مادة مختارة
      for (const content of selectedContents) {
        // جلب الدرجات الحالية لهذه المادة
        let existingGradesMap: Record<number, any> = {};
        try {
          const gradesData = await fetchAPI(`/grades/content/${content.id}?classroomId=${selectedClassroomId}`);
          // البيانات تأتي في gradesData.data بصيغة [{ trainee, grade }]
          if (gradesData?.data && Array.isArray(gradesData.data)) {
            gradesData.data.forEach((item: any) => {
              if (item.grade) {
                existingGradesMap[item.trainee?.id] = item.grade;
              }
            });
          }
        } catch (error) {
          console.log('No existing grades found for', content.name);
        }

        // إنشاء البيانات للملف
        const data = trainees.map((trainee, index) => {
          const row: any = {
            '#': index + 1,
            'رقم المتدرب': trainee.id,
            'الرقم القومي': trainee.nationalId,
            'اسم المتدرب': trainee.nameAr,
          };
          
          const existingGrade = existingGradesMap[trainee.id];
          
          // إضافة الأعمدة المختارة فقط مع الدرجات الموجودة (+ التحقق من أن المادة تحتوي على هذا النوع)
          if (selectedGrades.yearWorkMarks && content.maxMarks?.yearWorkMarks > 0) {
            row['أعمال السنة'] = existingGrade?.yearWorkMarks ?? '';
          }
          if (selectedGrades.practicalMarks && content.maxMarks?.practicalMarks > 0) {
            row['العملي'] = existingGrade?.practicalMarks ?? '';
          }
          if (selectedGrades.writtenMarks && content.maxMarks?.writtenMarks > 0) {
            row['التحريري'] = existingGrade?.writtenMarks ?? '';
          }
          if (selectedGrades.attendanceMarks && content.maxMarks?.attendanceMarks > 0) {
            row['الحضور'] = existingGrade?.attendanceMarks ?? '';
          }
          if (selectedGrades.quizzesMarks && content.maxMarks?.quizzesMarks > 0) {
            row['اختبارات مصغرة'] = existingGrade?.quizzesMarks ?? '';
          }
          if (selectedGrades.finalExamMarks && content.maxMarks?.finalExamMarks > 0) {
            row['الميد تيرم'] = existingGrade?.finalExamMarks ?? '';
          }
          
          row['ملاحظات'] = existingGrade?.notes || '';
          return row;
        });

        // إضافة صف التعليمات
        const instructions: any = {
          '#': 'تعليمات:',
          'رقم المتدرب': 'لا تقم بتعديل هذا العمود',
          'الرقم القومي': 'لا تقم بتعديل هذا العمود',
          'اسم المتدرب': 'لا تقم بتعديل هذا العمود',
        };
        
        // إضافة التعليمات للأعمدة المختارة فقط
        if (selectedGrades.yearWorkMarks && content.maxMarks?.yearWorkMarks) {
          instructions['أعمال السنة'] = `الحد الأقصى: ${content.maxMarks.yearWorkMarks}`;
        }
        if (selectedGrades.practicalMarks && content.maxMarks?.practicalMarks) {
          instructions['العملي'] = `الحد الأقصى: ${content.maxMarks.practicalMarks}`;
        }
        if (selectedGrades.writtenMarks && content.maxMarks?.writtenMarks) {
          instructions['التحريري'] = `الحد الأقصى: ${content.maxMarks.writtenMarks}`;
        }
        if (selectedGrades.attendanceMarks && content.maxMarks?.attendanceMarks) {
          instructions['الحضور'] = `الحد الأقصى: ${content.maxMarks.attendanceMarks}`;
        }
        if (selectedGrades.quizzesMarks && content.maxMarks?.quizzesMarks) {
          instructions['اختبارات مصغرة'] = `الحد الأقصى: ${content.maxMarks.quizzesMarks}`;
        }
        if (selectedGrades.finalExamMarks && content.maxMarks?.finalExamMarks) {
          instructions['الميد تيرم'] = `الحد الأقصى: ${content.maxMarks.finalExamMarks}`;
        }
        
        instructions['ملاحظات'] = 'اختياري';

        const finalData = [instructions, ...data];

        // إنشاء Worksheet
        const ws = XLSX.utils.json_to_sheet(finalData, { skipHeader: false });
        
        // تنسيق العرض بناءً على الأعمدة الموجودة
        const wscols: any[] = [
          { wch: 5 },   // #
          { wch: 12 },  // رقم المتدرب
          { wch: 18 },  // الرقم القومي
          { wch: 30 },  // اسم المتدرب
        ];
        
        // إضافة عرض الأعمدة المختارة فقط (مع التحقق من maxMarks)
        if (selectedGrades.yearWorkMarks && content.maxMarks?.yearWorkMarks > 0) wscols.push({ wch: 12 });
        if (selectedGrades.practicalMarks && content.maxMarks?.practicalMarks > 0) wscols.push({ wch: 12 });
        if (selectedGrades.writtenMarks && content.maxMarks?.writtenMarks > 0) wscols.push({ wch: 12 });
        if (selectedGrades.attendanceMarks && content.maxMarks?.attendanceMarks > 0) wscols.push({ wch: 12 });
        if (selectedGrades.quizzesMarks && content.maxMarks?.quizzesMarks > 0) wscols.push({ wch: 15 });
        if (selectedGrades.finalExamMarks && content.maxMarks?.finalExamMarks > 0) wscols.push({ wch: 12 });
        
        wscols.push({ wch: 20 }); // ملاحظات
        ws['!cols'] = wscols;

        // إضافة Sheet باسم المادة (مع تقصير الاسم إذا كان طويلاً)
        const sheetName = content.name.length > 30 ? content.name.substring(0, 27) + '...' : content.name;
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }

      // تحميل الملف
      const fileName = `درجات_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast.success(`تم تحميل القالب بنجاح - ${selectedContents.length} مادة`);
    } catch (error) {
      console.error('Error generating template:', error);
      toast.error('حدث خطأ في إنشاء القالب');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const sheets: { contentId: number; contentName: string; data: any[] }[] = [];
        const allErrors: ValidationError[] = [];
        let allData: any[] = [];

        // قراءة كل الشيتات ومطابقتها مع المواد المختارة
        workbook.SheetNames.forEach((sheetName) => {
          const matchedContent = selectedContents.find(
            (c) => c.name === sheetName || c.name.substring(0, 27) + '...' === sheetName
          );

          if (!matchedContent) {
            console.log(`Sheet "${sheetName}" does not match any selected content, skipping.`);
            return;
          }

          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          // تجاهل صف التعليمات
          const filteredData = jsonData.filter((row: any) => {
            return row['#'] !== 'تعليمات:' && row['رقم المتدرب'];
          });

          sheets.push({
            contentId: matchedContent.id,
            contentName: matchedContent.name,
            data: filteredData,
          });

          allData = [...allData, ...filteredData];

          // التحقق من صحة بيانات هذا الشيت
          validateSheetData(filteredData, matchedContent, allErrors, sheetName);
        });

        if (sheets.length === 0) {
          toast.error('لم يتم العثور على شيتات تطابق المواد المختارة');
          return;
        }

        setParsedSheets(sheets);
        setActiveSheetIndex(0);
        setValidationErrors(allErrors);

        toast.success(`تم قراءة ${sheets.length} شيت بنجاح`);
      } catch (error) {
        console.error('Error parsing file:', error);
        toast.error('خطأ في قراءة الملف');
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const validateSheetData = (data: any[], content: TrainingContent, errors: ValidationError[], sheetName: string) => {
    data.forEach((row: any, index: number) => {
      const rowNumber = index + 2;
      const traineeName = row['اسم المتدرب'] || 'غير معروف';

      if (!row['رقم المتدرب']) {
        errors.push({
          row: rowNumber,
          trainee: `[${sheetName}] ${traineeName}`,
          field: 'رقم المتدرب',
          error: 'رقم المتدرب مطلوب',
        });
        return;
      }

      const gradeFields: { key: string; field: keyof typeof selectedGrades; max: number }[] = [
        { key: 'أعمال السنة', field: 'yearWorkMarks', max: content.maxMarks?.yearWorkMarks || 0 },
        { key: 'العملي', field: 'practicalMarks', max: content.maxMarks?.practicalMarks || 0 },
        { key: 'التحريري', field: 'writtenMarks', max: content.maxMarks?.writtenMarks || 0 },
        { key: 'الحضور', field: 'attendanceMarks', max: content.maxMarks?.attendanceMarks || 0 },
        { key: 'اختبارات مصغرة', field: 'quizzesMarks', max: content.maxMarks?.quizzesMarks || 0 },
        { key: 'الميد تيرم', field: 'finalExamMarks', max: content.maxMarks?.finalExamMarks || 0 },
      ];

      gradeFields.forEach(({ key, field, max }) => {
        if (!selectedGrades[field]) return;
        if (max === 0) return;
        
        const value = row[key];
        if (value !== undefined && value !== '' && value !== null) {
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            errors.push({ row: rowNumber, trainee: `[${sheetName}] ${traineeName}`, field: key, error: 'قيمة غير صحيحة' });
          } else if (numValue < 0) {
            errors.push({ row: rowNumber, trainee: `[${sheetName}] ${traineeName}`, field: key, error: 'القيمة لا يمكن أن تكون سالبة' });
          } else if (numValue > max) {
            errors.push({ row: rowNumber, trainee: `[${sheetName}] ${traineeName}`, field: key, error: `القيمة تتجاوز الحد الأقصى (${max})` });
          }
        }
      });
    });
  };

  const handleUploadGrades = async () => {
    if (parsedSheets.length === 0 || !selectedClassroomId) {
      toast.error('يرجى إكمال جميع الخطوات');
      return;
    }

    if (validationErrors.length > 0) {
      toast.error('يوجد أخطاء في البيانات، يرجى تصحيحها أولاً');
      return;
    }

    try {
      setUploading(true);
      let totalUploaded = 0;

      // رفع كل شيت (مادة) على حدة
      for (const sheet of parsedSheets) {
        const content = selectedContents.find(c => c.id === sheet.contentId);
        if (!content) continue;

        // جلب الدرجات الحالية لهذه المادة للحفاظ على القيم غير المختارة
        let existingGradesMap: Record<number, any> = {};
        try {
          const gradesData = await fetchAPI(`/grades/content/${sheet.contentId}?classroomId=${selectedClassroomId}`);
          if (gradesData?.data && Array.isArray(gradesData.data)) {
            gradesData.data.forEach((item: any) => {
              if (item.grade) {
                existingGradesMap[item.trainee?.id] = item.grade;
              }
            });
          }
        } catch (error) {
          console.log('No existing grades for content:', sheet.contentName);
        }

        // دمج البيانات الجديدة مع القديمة
        const grades = sheet.data.map((row: any) => {
          const traineeId = parseInt(row['رقم المتدرب']);
          const existing = existingGradesMap[traineeId] || {};

          // للحقول المختارة: إذا المستخدم أدخل قيمة في الإكسل نستخدمها، وإذا تركها فارغة نحتفظ بالقديمة
          // للحقول غير المختارة: دائماً نحتفظ بالقيمة القديمة
          const getValue = (field: keyof typeof selectedGrades, excelKey: string, dbField: string) => {
            const maxVal = (content.maxMarks as any)?.[dbField] || 0;
            if (selectedGrades[field] && maxVal > 0) {
              // حقل مختار: استخدم القيمة من الإكسل إن وُجدت، وإلا القديمة
              const val = row[excelKey];
              if (val !== undefined && val !== '' && val !== null) {
                return parseFloat(val) || 0;
              }
              // المستخدم ترك الخلية فارغة → احتفظ بالقيمة القديمة
              return existing[dbField] ?? 0;
            }
            // حقل غير مختار: احتفظ بالقيمة القديمة
            return existing[dbField] ?? 0;
          };

          return {
            traineeId,
            yearWorkMarks: getValue('yearWorkMarks', 'أعمال السنة', 'yearWorkMarks'),
            practicalMarks: getValue('practicalMarks', 'العملي', 'practicalMarks'),
            writtenMarks: getValue('writtenMarks', 'التحريري', 'writtenMarks'),
            attendanceMarks: getValue('attendanceMarks', 'الحضور', 'attendanceMarks'),
            quizzesMarks: getValue('quizzesMarks', 'اختبارات مصغرة', 'quizzesMarks'),
            finalExamMarks: getValue('finalExamMarks', 'الميد تيرم', 'finalExamMarks'),
            notes: row['ملاحظات'] || existing.notes || '',
          };
        });

        // رفع الدرجات لهذه المادة
        await fetchAPI('/grades/bulk', {
          method: 'POST',
          body: JSON.stringify({
            trainingContentId: sheet.contentId,
            classroomId: selectedClassroomId,
            grades,
          }),
        });

        totalUploaded += grades.length;
      }

      toast.success(`تم رفع الدرجات بنجاح - ${totalUploaded} سجل في ${parsedSheets.length} مادة`);
      
      // إعادة تعيين النموذج
      setStep(1);
      setSelectedProgramId(null);
      setSelectedClassroomId(null);
      setSelectedContentIds([]);
      setSelectedContents([]);
      setUploadedFile(null);
      setParsedSheets([]);
      setValidationErrors([]);
    } catch (error: any) {
      console.error('Error uploading grades:', error);
      toast.error(error.message || 'حدث خطأ في رفع الدرجات');
    } finally {
      setUploading(false);
    }
  };

  const selectedProgram = programs.find(p => p.id === selectedProgramId);
  const selectedClassroom = classrooms.find(c => c.id === selectedClassroomId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="رفع درجات المتدربين"
        description="رفع درجات المتدربين بشكل جماعي من خلال ملف Excel"
      />

      {/* Progress Steps */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-8">
          {[
            { num: 1, title: 'اختيار البرنامج والفصل' },
            { num: 2, title: 'اختيار المادة' },
            { num: 3, title: 'تحميل القالب' },
            { num: 4, title: 'رفع الدرجات' },
          ].map((s, idx) => (
            <div key={s.num} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${
                    step >= s.num
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {step > s.num ? <CheckCircleIcon className="w-5 h-5" /> : s.num}
                </div>
                <p className={`text-sm mt-2 font-medium ${step >= s.num ? 'text-blue-600' : 'text-slate-500'}`}>
                  {s.title}
                </p>
              </div>
              {idx < 3 && (
                <div className={`h-1 flex-1 mx-4 rounded ${step > s.num ? 'bg-blue-600' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: اختيار البرنامج والفصل */}
      {step === 1 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
            <h2 className="text-xl font-bold text-slate-800">اختيار البرنامج والفصل الدراسي</h2>
          </div>
          <div className="p-6 space-y-6">
            {/* اختيار البرنامج */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                البرنامج التدريبي <span className="text-red-500">*</span>
              </label>
              <TibaSelect
                instanceId="program-select"
                options={programs.map((program) => ({ value: String(program.id), label: program.nameAr }))}
                value={selectedProgramId ? String(selectedProgramId) : ''}
                onChange={(val) => {
                  const programId = parseInt(val);
                  setSelectedProgramId(programId);
                  setSelectedClassroomId(null);
                  setClassrooms([]);
                }}
                placeholder="-- اختر البرنامج --"
              />
            </div>

            {/* اختيار الفصل */}
            {selectedProgramId && (
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  الفصل الدراسي <span className="text-red-500">*</span>
                </label>
                <TibaSelect
                  instanceId="classroom-select"
                  options={classrooms.map((classroom) => ({ value: String(classroom.id), label: classroom.name }))}
                  value={selectedClassroomId ? String(selectedClassroomId) : ''}
                  onChange={(val) => setSelectedClassroomId(parseInt(val))}
                  placeholder="-- اختر الفصل --"
                  disabled={classrooms.length === 0}
                />
                {classrooms.length === 0 && selectedProgramId && (
                  <p className="text-sm text-slate-500 mt-2">لا توجد فصول دراسية لهذا البرنامج</p>
                )}
              </div>
            )}

            {/* معلومات إضافية */}
            {selectedClassroomId && trainees.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <InformationCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">معلومات الفصل</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• البرنامج: <strong>{selectedProgram?.nameAr}</strong></li>
                      <li>• الفصل: <strong>{selectedClassroom?.name}</strong></li>
                      <li>• عدد الطلاب: <strong>{trainees.length} طالب</strong></li>
                      <li>• عدد المواد: <strong>{contents.length} مادة</strong></li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedClassroomId || loading}
              >
                التالي
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: اختيار المادة */}
      {step === 2 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
            <h2 className="text-xl font-bold text-slate-800">اختيار المادة التدريبية</h2>
          </div>
          <div className="p-6 space-y-6">
            {contents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500">لا توجد مواد تدريبية في هذا الفصل</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contents.map((content) => {
                  const isSelected = selectedContentIds.includes(content.id);
                  return (
                  <label
                    key={content.id}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedContentIds([...selectedContentIds, content.id]);
                          setSelectedContents([...selectedContents, content]);
                        } else {
                          setSelectedContentIds(selectedContentIds.filter(id => id !== content.id));
                          setSelectedContents(selectedContents.filter(c => c.id !== content.id));
                        }
                      }}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mt-1"
                    />
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-800 mb-2">{content.name}</h3>
                      <p className="text-sm text-slate-600 mb-3">كود المادة: {content.code}</p>
                    {content.maxMarks ? (
                      <div className="text-xs text-slate-500 space-y-1">
                        <p>• أعمال السنة: {content.maxMarks.yearWorkMarks || 0}</p>
                        <p>• العملي: {content.maxMarks.practicalMarks || 0}</p>
                        <p>• التحريري: {content.maxMarks.writtenMarks || 0}</p>
                        <p>• الحضور: {content.maxMarks.attendanceMarks || 0}</p>
                        <p>• اختبارات: {content.maxMarks.quizzesMarks || 0}</p>
                        <p>• الميد تيرم: {content.maxMarks.finalExamMarks || 0}</p>
                        <p className="font-semibold text-blue-600 pt-1">المجموع: {content.maxMarks.total || 0}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-600 flex items-center gap-1"><ExclamationTriangleIcon className="w-4 h-4 text-amber-500" /> لم يتم تحديد درجات لهذه المادة</p>
                    )}
                    </div>
                  </label>
                  );
                })}
              </div>
            )}

            {/* أزرار التحديد السريع */}
            <div className="flex gap-2 pb-4 border-b border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const allIds = contents.map(c => c.id);
                  setSelectedContentIds(allIds);
                  setSelectedContents(contents);
                }}
              >
                تحديد الكل
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedContentIds([]);
                  setSelectedContents([]);
                }}
              >
                إلغاء التحديد
              </Button>
              <div className="flex-1 text-left">
                <span className="text-sm text-slate-600">المحدد: {selectedContentIds.length} من {contents.length}</span>
              </div>
            </div>

            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep(1)}>
                السابق
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={selectedContentIds.length === 0}
              >
                التالي ({selectedContentIds.length} مواد)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: تحميل القالب */}
      {step === 3 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
            <h2 className="text-xl font-bold text-slate-800">تحميل قالب الدرجات</h2>
          </div>
          <div className="p-6 space-y-6">
            {/* معلومات المواد المختارة */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="font-bold text-blue-900 text-lg mb-4">المواد المختارة ({selectedContents.length})</h3>
              
              <div className="space-y-3 mb-4">
                {selectedContents.map((content, index) => (
                  <div key={content.id} className="bg-white rounded-xl p-4 border border-blue-200">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">{index + 1}</span>
                          <h4 className="font-bold text-slate-800">{content.name}</h4>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">كود المادة: {content.code}</p>
                        {content.maxMarks && (
                          <div className="flex gap-4 text-xs text-slate-500">
                            <span>المجموع: {content.maxMarks.total} درجة</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm pt-4 border-t border-blue-200">
                <div>
                  <p className="text-blue-700 mb-1">عدد المواد</p>
                  <p className="font-semibold text-slate-800">{selectedContents.length} مادة</p>
                </div>
                <div>
                  <p className="text-blue-700 mb-1">عدد الطلاب</p>
                  <p className="font-semibold text-slate-800">{trainees.length} طالب</p>
                </div>
              </div>
            </div>

            {/* اختيار الدرجات المطلوبة */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <h3 className="font-bold text-amber-900 text-lg mb-4 flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-amber-600" />
                اختر الدرجات المطلوب إدخالها (تطبق على جميع المواد)
              </h3>
              <p className="text-sm text-amber-700 mb-4">يمكنك تحديد أنواع الدرجات التي تريد إدخالها فقط:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedContents.length > 0 && selectedContents[0]?.maxMarks && (
                  <>
                    {selectedContents.some(c => c.maxMarks && c.maxMarks.yearWorkMarks > 0) && (
                      <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-amber-200 cursor-pointer hover:bg-amber-50 transition">
                        <input
                          type="checkbox"
                          checked={selectedGrades.yearWorkMarks}
                          onChange={(e) => setSelectedGrades({ ...selectedGrades, yearWorkMarks: e.target.checked })}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800">أعمال السنة</p>
                          <p className="text-xs text-slate-500">يوجد في {selectedContents.filter(c => c.maxMarks && c.maxMarks.yearWorkMarks > 0).length} مواد</p>
                        </div>
                      </label>
                    )}
                    
                    {selectedContents.some(c => c.maxMarks && c.maxMarks.practicalMarks > 0) && (
                      <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-amber-200 cursor-pointer hover:bg-amber-50 transition">
                        <input
                          type="checkbox"
                          checked={selectedGrades.practicalMarks}
                          onChange={(e) => setSelectedGrades({ ...selectedGrades, practicalMarks: e.target.checked })}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800">العملي</p>
                          <p className="text-xs text-slate-500">يوجد في {selectedContents.filter(c => c.maxMarks && c.maxMarks.practicalMarks > 0).length} مواد</p>
                        </div>
                      </label>
                    )}
                    
                    {selectedContents.some(c => c.maxMarks && c.maxMarks.writtenMarks > 0) && (
                      <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-amber-200 cursor-pointer hover:bg-amber-50 transition">
                        <input
                          type="checkbox"
                          checked={selectedGrades.writtenMarks}
                          onChange={(e) => setSelectedGrades({ ...selectedGrades, writtenMarks: e.target.checked })}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800">التحريري</p>
                          <p className="text-xs text-slate-500">يوجد في {selectedContents.filter(c => c.maxMarks && c.maxMarks.writtenMarks > 0).length} مواد</p>
                        </div>
                      </label>
                    )}
                    
                    {selectedContents.some(c => c.maxMarks && c.maxMarks.attendanceMarks > 0) && (
                      <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-amber-200 cursor-pointer hover:bg-amber-50 transition">
                        <input
                          type="checkbox"
                          checked={selectedGrades.attendanceMarks}
                          onChange={(e) => setSelectedGrades({ ...selectedGrades, attendanceMarks: e.target.checked })}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800">الحضور</p>
                          <p className="text-xs text-slate-500">يوجد في {selectedContents.filter(c => c.maxMarks && c.maxMarks.attendanceMarks > 0).length} مواد</p>
                        </div>
                      </label>
                    )}
                    
                    {selectedContents.some(c => c.maxMarks && c.maxMarks.quizzesMarks > 0) && (
                      <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-amber-200 cursor-pointer hover:bg-amber-50 transition">
                        <input
                          type="checkbox"
                          checked={selectedGrades.quizzesMarks}
                          onChange={(e) => setSelectedGrades({ ...selectedGrades, quizzesMarks: e.target.checked })}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800">اختبارات اونلاين</p>
                          <p className="text-xs text-slate-500">يوجد في {selectedContents.filter(c => c.maxMarks && c.maxMarks.quizzesMarks > 0).length} مواد</p>
                        </div>
                      </label>
                    )}
                    
                    {selectedContents.some(c => c.maxMarks && c.maxMarks.finalExamMarks > 0) && (
                      <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-amber-200 cursor-pointer hover:bg-amber-50 transition">
                        <input
                          type="checkbox"
                          checked={selectedGrades.finalExamMarks}
                          onChange={(e) => setSelectedGrades({ ...selectedGrades, finalExamMarks: e.target.checked })}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800">الميد تيرم</p>
                          <p className="text-xs text-slate-500">يوجد في {selectedContents.filter(c => c.maxMarks && c.maxMarks.finalExamMarks > 0).length} مواد</p>
                        </div>
                      </label>
                    )}
                  </>
                )}
              </div>
              
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedGrades({
                    yearWorkMarks: true,
                    practicalMarks: true,
                    writtenMarks: true,
                    attendanceMarks: true,
                    quizzesMarks: true,
                    finalExamMarks: true,
                  })}
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  تحديد الكل
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedGrades({
                    yearWorkMarks: false,
                    practicalMarks: false,
                    writtenMarks: false,
                    attendanceMarks: false,
                    quizzesMarks: false,
                    finalExamMarks: false,
                  })}
                >
                  إلغاء التحديد
                </Button>
              </div>
            </div>

            {/* زر التحميل */}
            <div className="text-center py-8">
              <Button
                onClick={handleDownloadTemplate}
                variant="success"
                size="lg"
              >
                <ArrowDownTrayIcon className="w-5 h-5 ml-3" />
                تحميل قالب Excel
              </Button>
              <p className="text-sm text-slate-600 mt-4">
                سيتم تحميل ملف Excel يحتوي على قائمة الطلاب والدرجات الخاصة بهم
              </p>
            </div>

            {/* تعليمات */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-900 mb-2">تعليمات هامة</h3>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• <strong>لا تقم بتعديل</strong> أعمدة: #، رقم المتدرب، الرقم القومي، اسم المتدرب</li>
                    <li>• قم بإدخال الدرجات في الأعمدة المخصصة فقط</li>
                    <li>• تأكد من عدم تجاوز الحد الأقصى لكل درجة</li>
                    <li>• يمكنك ترك الخلايا فارغة (ستكون = 0)</li>
                    <li>• يمكنك إضافة ملاحظات في العمود الأخير</li>
                    <li>• احفظ الملف بعد إدخال الدرجات ثم قم برفعه في الخطوة التالية</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep(2)}>
                السابق
              </Button>
              <Button
                onClick={() => setStep(4)}
              >
                التالي: رفع الملف
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: رفع الملف */}
      {step === 4 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
            <h2 className="text-xl font-bold text-slate-800">رفع ملف الدرجات</h2>
          </div>
          <div className="p-6 space-y-6">
            {/* منطقة رفع الملف */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">
                اختر ملف Excel <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="flex items-center justify-center gap-3 w-full px-6 py-12 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
                >
                  <TableCellsIcon className="w-12 h-12 text-green-600" />
                  <div className="text-center">
                    <p className="text-lg font-semibold text-slate-800">
                      {uploadedFile ? uploadedFile.name : 'اضغط لاختيار ملف Excel'}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      أو اسحب الملف وأفلته هنا
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* عرض البيانات المرفوعة */}
            {parsedSheets.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-800">
                    البيانات المرفوعة ({parsedSheets.length} مادة - {parsedSheets.reduce((sum, s) => sum + s.data.length, 0)} طالب)
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setUploadedFile(null);
                      setParsedSheets([]);
                      setValidationErrors([]);
                    }}
                  >
                    <XMarkIcon className="w-4 h-4 ml-2" />
                    مسح
                  </Button>
                </div>

                {/* الأخطاء */}
                {validationErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-red-900 mb-2">
                          تم العثور على {validationErrors.length} خطأ
                        </h4>
                        <div className="max-h-48 overflow-y-auto space-y-2">
                          {validationErrors.map((error, idx) => (
                            <div key={idx} className="text-sm text-red-800 bg-white rounded p-2">
                              <strong>الصف {error.row}:</strong> {error.trainee} - {error.field}: {error.error}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* معاينة البيانات */}
                {validationErrors.length === 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-3">
                      <CheckCircleIcon className="w-5 h-5 text-green-600" />
                      <p className="text-green-800 font-medium">
                        البيانات صحيحة وجاهزة للرفع - {parsedSheets.length} مادة ✓
                      </p>
                    </div>
                  </div>
                )}

                {/* تبويبات المواد */}
                {parsedSheets.length > 1 && (
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                    {parsedSheets.map((sheet, idx) => (
                      <button
                        key={sheet.contentId}
                        onClick={() => setActiveSheetIndex(idx)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                          activeSheetIndex === idx
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {sheet.contentName} ({sheet.data.length})
                      </button>
                    ))}
                  </div>
                )}

                {/* جدول المعاينة للشيت الحالي */}
                {parsedSheets[activeSheetIndex] && (
                  <div className="bg-slate-50 rounded-xl p-4 max-h-96 overflow-auto">
                    <div className="mb-2 text-sm font-semibold text-blue-800">
                      {parsedSheets[activeSheetIndex].contentName} - {parsedSheets[activeSheetIndex].data.length} طالب
                    </div>
                    <table className="w-full text-sm">
                      <thead className="bg-slate-200 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-right">#</th>
                          <th className="px-3 py-2 text-right">اسم المتدرب</th>
                          {selectedGrades.yearWorkMarks && <th className="px-3 py-2 text-center">أعمال السنة</th>}
                          {selectedGrades.practicalMarks && <th className="px-3 py-2 text-center">العملي</th>}
                          {selectedGrades.writtenMarks && <th className="px-3 py-2 text-center">التحريري</th>}
                          {selectedGrades.attendanceMarks && <th className="px-3 py-2 text-center">الحضور</th>}
                          {selectedGrades.quizzesMarks && <th className="px-3 py-2 text-center">اختبارات اونلاين</th>}
                          {selectedGrades.finalExamMarks && <th className="px-3 py-2 text-center">ميد تيرم</th>}
                          <th className="px-3 py-2 text-center">المجموع</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedSheets[activeSheetIndex].data.map((row: any, idx: number) => {
                          let total = 0;
                          if (selectedGrades.yearWorkMarks) total += parseFloat(row['أعمال السنة']) || 0;
                          if (selectedGrades.practicalMarks) total += parseFloat(row['العملي']) || 0;
                          if (selectedGrades.writtenMarks) total += parseFloat(row['التحريري']) || 0;
                          if (selectedGrades.attendanceMarks) total += parseFloat(row['الحضور']) || 0;
                          if (selectedGrades.quizzesMarks) total += parseFloat(row['اختبارات مصغرة']) || 0;
                          if (selectedGrades.finalExamMarks) total += parseFloat(row['الميد تيرم']) || 0;
                          
                          return (
                            <tr key={idx} className="border-b">
                              <td className="px-3 py-2">{idx + 1}</td>
                              <td className="px-3 py-2 font-medium">{row['اسم المتدرب']}</td>
                              {selectedGrades.yearWorkMarks && <td className="px-3 py-2 text-center">{row['أعمال السنة'] ?? '-'}</td>}
                              {selectedGrades.practicalMarks && <td className="px-3 py-2 text-center">{row['العملي'] ?? '-'}</td>}
                              {selectedGrades.writtenMarks && <td className="px-3 py-2 text-center">{row['التحريري'] ?? '-'}</td>}
                              {selectedGrades.attendanceMarks && <td className="px-3 py-2 text-center">{row['الحضور'] ?? '-'}</td>}
                              {selectedGrades.quizzesMarks && <td className="px-3 py-2 text-center">{row['اختبارات مصغرة'] ?? '-'}</td>}
                              {selectedGrades.finalExamMarks && <td className="px-3 py-2 text-center">{row['الميد تيرم'] ?? '-'}</td>}
                              <td className="px-3 py-2 text-center font-bold text-blue-600">
                                {total.toFixed(1)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep(3)}>
                السابق
              </Button>
              <Button
                onClick={handleUploadGrades}
                disabled={parsedSheets.length === 0 || validationErrors.length > 0 || uploading}
                variant="success"
              >
                <ArrowUpTrayIcon className="w-5 h-5 ml-2" />
                {uploading ? 'جاري الرفع...' : `رفع درجات ${parsedSheets.reduce((sum, s) => sum + s.data.length, 0)} طالب في ${parsedSheets.length} مادة`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
