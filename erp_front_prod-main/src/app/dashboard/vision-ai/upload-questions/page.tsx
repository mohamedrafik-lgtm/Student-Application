'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PageHeader from '@/app/components/PageHeader';
import { fetchAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { FiUpload, FiCheckCircle, FiAlertCircle, FiDownload } from 'react-icons/fi';
import * as XLSX from 'xlsx';

export default function UploadQuestionsPage() {
  const [step, setStep] = useState(1);
  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [trainingContents, setTrainingContents] = useState<any[]>([]);
  const [selectedContentId, setSelectedContentId] = useState('');
  const [excelData, setExcelData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState({
    question: '',
    option1: '',
    option2: '',
    option3: '',
    option4: '',
    correctAnswer: '', // عمود الإجابة الصحيحة
  });
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    try {
      const data = await fetchAPI('/programs');
      setPrograms(data || []);
    } catch (error) {
      toast.error('فشل تحميل البرامج');
    }
  };

  const loadTrainingContents = async (programId: string) => {
    try {
      // استخدام API مباشر
      const contents = await fetchAPI(`/training-contents`);
      
      // فلترة حسب البرنامج
      const programContents = contents.filter((c: any) => {
        return c.classroom?.programId === parseInt(programId);
      });
      
      setTrainingContents(programContents);
      
      console.log('Program contents:', programContents);
      toast.success(`تم تحميل ${programContents.length} مادة تدريبية`);
    } catch (error) {
      toast.error('فشل تحميل المواد التدريبية');
      console.error(error);
    }
  };

  const handleProgramChange = (programId: string) => {
    setSelectedProgramId(programId);
    setSelectedContentId('');
    if (programId) {
      loadTrainingContents(programId);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/)) {
      toast.error('يرجى اختيار ملف Excel (.xlsx أو .xls)');
      return;
    }

    try {
      setLoading(true);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length < 2) {
        toast.error('الملف فارغ أو لا يحتوي على بيانات');
        return;
      }

      // الصف الأول = أسماء الأعمدة
      const headers = jsonData[0] as string[];
      setColumns(headers);
      setExcelData(jsonData.slice(1)); // البيانات بدون الصف الأول
      setStep(3);
      toast.success(`تم تحميل ${jsonData.length - 1} صف من الملف`);
    } catch (error) {
      toast.error('فشل قراءة ملف Excel');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const processExcelData = async () => {
    if (!columnMapping.question || !columnMapping.option1 || !columnMapping.option2) {
      toast.error('يجب اختيار عمود السؤال والإجابة 1 و 2 على الأقل');
      return;
    }

    // شاشة المعالجة
    setProcessing(true);
    
    // انتظار 7 ثواني
    await new Promise(resolve => setTimeout(resolve, 7000));

    const questionIndex = columns.indexOf(columnMapping.question);
    const option1Index = columns.indexOf(columnMapping.option1);
    const option2Index = columns.indexOf(columnMapping.option2);
    const option3Index = columnMapping.option3 ? columns.indexOf(columnMapping.option3) : -1;
    const option4Index = columnMapping.option4 ? columns.indexOf(columnMapping.option4) : -1;
    const correctAnswerIndex = columnMapping.correctAnswer ? columns.indexOf(columnMapping.correctAnswer) : -1;

    const processedQuestions = excelData
      .filter((row: any[]) => row[questionIndex]) // تجاهل الصفوف الفارغة
      .map((row: any[], index) => {
        const options = [
          { text: row[option1Index], isCorrect: false },
          { text: row[option2Index], isCorrect: false },
        ];

        if (option3Index >= 0 && row[option3Index]) {
          options.push({ text: row[option3Index], isCorrect: false });
        }
        if (option4Index >= 0 && row[option4Index]) {
          options.push({ text: row[option4Index], isCorrect: false });
        }

        // تحديد الإجابة الصحيحة من Excel
        let correctIndex = null;
        if (correctAnswerIndex >= 0 && row[correctAnswerIndex]) {
          const correctValue = String(row[correctAnswerIndex]).trim().toUpperCase();
          
          // دعم عدة صيغ: 1,2,3,4 أو A,B,C,D أو الإجابة 1, الإجابة 2
          if (correctValue === '1' || correctValue === 'A' || correctValue === 'الإجابة 1') {
            correctIndex = 0;
          } else if (correctValue === '2' || correctValue === 'B' || correctValue === 'الإجابة 2') {
            correctIndex = 1;
          } else if (correctValue === '3' || correctValue === 'C' || correctValue === 'الإجابة 3') {
            correctIndex = 2;
          } else if (correctValue === '4' || correctValue === 'D' || correctValue === 'الإجابة 4') {
            correctIndex = 3;
          } else {
            // محاولة تحويل لرقم مباشر
            const numValue = parseInt(correctValue);
            if (!isNaN(numValue) && numValue >= 1 && numValue <= options.length) {
              correctIndex = numValue - 1;
            }
          }
        }

        return {
          id: `temp-${index}`,
          text: row[questionIndex],
          options: options,
          correctAnswerIndex: correctIndex,
          chapter: 1, // افتراضي
          skill: 'COMPREHENSION', // افتراضي
          difficulty: 'MEDIUM', // افتراضي
        };
      });

    setQuestions(processedQuestions);
    setProcessing(false);
    setStep(4);
    toast.success(`تم معالجة ${processedQuestions.length} سؤال`);
  };

  const handleSaveQuestions = async () => {
    // التحقق من تحديد الإجابات الصحيحة
    const unanswered = questions.filter(q => q.correctAnswerIndex === null);
    if (unanswered.length > 0) {
      toast.error(`يجب تحديد الإجابة الصحيحة لـ ${unanswered.length} سؤال`);
      return;
    }

    try {
      setLoading(true);

      // حفظ الأسئلة واحدة تلو الأخرى
      let successCount = 0;
      for (const question of questions) {
        try {
          // تحديد الإجابة الصحيحة
          const options = question.options.map((opt: any, index: number) => ({
            text: opt.text,
            isCorrect: index === question.correctAnswerIndex,
          }));

          await fetchAPI('/questions', {
            method: 'POST',
            body: JSON.stringify({
              text: question.text,
              type: 'MULTIPLE_CHOICE',
              contentId: parseInt(selectedContentId),
              chapter: question.chapter || 1,
              skill: question.skill || 'COMPREHENSION',
              difficulty: question.difficulty || 'MEDIUM',
              options: options,
            }),
          });
          successCount++;
        } catch (error) {
          console.error('فشل حفظ سؤال:', question.text, error);
        }
      }

      // عرض Dialog النجاح
      setSavedCount(successCount);
      setShowSuccessDialog(true);
    } catch (error: any) {
      toast.error('فشل حفظ الأسئلة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Success Dialog */}
      {showSuccessDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full border-4 border-green-500">
            <div className="text-center">
              <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <FiCheckCircle className="w-16 h-16 text-white" />
              </div>
              
              <h3 className="text-3xl font-black text-gray-900 mb-4">نجحت العملية!</h3>
              
              <div className="bg-green-50 rounded-2xl p-6 mb-6 border-2 border-green-200">
                <div className="space-y-3 text-right">
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-700">عدد الأسئلة:</span>
                    <span className="font-black text-green-700 text-xl">{savedCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-700">تم الحفظ:</span>
                    <span className="font-black text-green-700 text-xl">{savedCount} / {questions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-700">الحالة:</span>
                    <span className="font-black text-green-700">✅ مكتملة</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => {
                  setShowSuccessDialog(false);
                  // إعادة تعيين
                  setStep(1);
                  setExcelData([]);
                  setColumns([]);
                  setColumnMapping({ question: '', option1: '', option2: '', option3: '', option4: '', correctAnswer: '' });
                  setQuestions([]);
                  setSavedCount(0);
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 text-xl font-black rounded-xl"
              >
                استمر
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Processing Screen */}
      {processing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-900 to-indigo-900 p-4">
          <div className="text-center">
            <div className="relative mb-8">
              <div className="w-32 h-32 border-8 border-blue-300 border-t-white rounded-full animate-spin mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-16 h-16 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="3" strokeWidth="2"/>
                  <path strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>
            
            <h2 className="text-4xl font-black text-white mb-4">Vision AI</h2>
            <p className="text-2xl text-blue-200 font-bold mb-2">يستخرج الأسئلة والإجابات...</p>
            <p className="text-lg text-blue-300">جاري المعالجة الذكية</p>
            
            <div className="flex justify-center gap-2 mt-6">
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="رفع أسئلة من Excel"
        description="استيراد أسئلة اختيار من متعدد من ملف Excel"
      />

      {/* Progress Steps - شريط أفقي احترافي */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-lg border-2 border-blue-200 p-10">
        <div className="flex items-center justify-between gap-4">
          {['اختيار البرنامج', 'رفع Excel', 'تحديد الأعمدة', 'مراجعة وحفظ'].map((label, index) => (
            <div key={index} className="flex items-center flex-1">
              {/* الدائرة */}
              <div className="flex flex-col items-center">
                <div className={`flex items-center justify-center w-16 h-16 rounded-full border-4 shadow-xl mb-2 transition-all duration-300 ${
                  step > index + 1
                    ? 'bg-green-500 border-green-300 scale-110'
                    : step === index + 1
                    ? 'bg-blue-600 border-blue-300 scale-110 ring-4 ring-blue-200'
                    : 'bg-white border-gray-300'
                } font-bold text-xl`}>
                  {step > index + 1 ? (
                    <FiCheckCircle className="w-8 h-8 text-white" />
                  ) : (
                    <span className={step === index + 1 ? 'text-white' : 'text-gray-400'}>
                      {index + 1}
                    </span>
                  )}
                </div>
                <span className={`text-sm font-bold text-center ${
                  step >= index + 1 ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {label}
                </span>
              </div>

              {/* الخط الواصل */}
              {index < 3 && (
                <div className="flex-1 h-3 bg-gray-200 rounded-full mx-4 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      step > index + 1 ? 'bg-gradient-to-r from-blue-500 to-green-500 w-full' : 'w-0'
                    }`}
                  ></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: اختيار البرنامج والمادة */}
      {step === 1 && (
        <Card className="p-8 bg-white shadow-xl border-2">
          <h2 className="text-3xl font-black mb-2 text-gray-900">الخطوة 1: اختيار البرنامج والمادة</h2>
          <p className="text-gray-600 mb-8">حدد البرنامج والمادة التدريبية لإضافة الأسئلة إليها</p>
          
          <div className="space-y-6 max-w-3xl mx-auto">
            <div>
              <label className="block text-base font-bold mb-3 text-gray-900">البرنامج التدريبي</label>
              <select
                value={selectedProgramId}
                onChange={(e) => handleProgramChange(e.target.value)}
                className="w-full px-6 py-4 border-3 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 text-lg font-medium bg-white shadow-sm"
              >
                <option value="">اختر البرنامج...</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.nameAr}
                  </option>
                ))}
              </select>
            </div>

            {selectedProgramId && (
              <div>
                <label className="block text-base font-bold mb-3 text-gray-900">المادة التدريبية</label>
                <select
                  value={selectedContentId}
                  onChange={(e) => setSelectedContentId(e.target.value)}
                  className="w-full px-6 py-4 border-3 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 text-lg font-medium bg-white shadow-sm"
                >
                  <option value="">اختر المادة...</option>
                  {trainingContents.map((content) => (
                    <option key={content.id} value={content.id}>
                      {content.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Button
              onClick={() => setStep(2)}
              disabled={!selectedContentId}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-5 text-xl font-black rounded-xl shadow-xl transform hover:scale-105 transition-all mt-8"
            >
              التالي: رفع ملف Excel →
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: رفع Excel */}
      {step === 2 && (
        <Card className="p-8 bg-white shadow-xl border-2">
          <h2 className="text-3xl font-black mb-2 text-gray-900">الخطوة 2: رفع ملف Excel</h2>
          <p className="text-gray-600 mb-8">ارفع ملف Excel يحتوي على الأسئلة والإجابات</p>
          
          <div className="max-w-2xl mx-auto">
            <div className="border-4 border-dashed border-blue-400 rounded-2xl p-16 text-center bg-gradient-to-br from-blue-50 to-indigo-50 hover:border-blue-600 transition-all">
              <FiUpload className="w-20 h-20 text-blue-600 mx-auto mb-4 animate-bounce" />
              <h3 className="text-2xl font-black text-gray-900 mb-3">اسحب ملف Excel هنا</h3>
              <p className="text-gray-700 font-medium mb-6">أو اضغط للاختيار من جهازك</p>
              
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                id="excel-upload"
                disabled={loading}
              />
              <label
                htmlFor="excel-upload"
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer transition-all"
              >
                {loading ? 'جاري التحميل...' : 'اختيار ملف'}
              </label>
            </div>

            <div className="mt-8 bg-gradient-to-r from-yellow-50 to-orange-50 border-3 border-yellow-300 rounded-2xl p-6 shadow-md">
              <p className="font-black text-yellow-900 text-lg mb-3">📋 تنسيق الملف المطلوب:</p>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• الصف الأول: أسماء الأعمدة (مثل: السؤال، الإجابة 1، الإجابة 2، الإجابة الصحيحة)</li>
                <li>• كل صف = سؤال واحد</li>
                <li>• على الأقل: عمود السؤال + عمودين للإجابات</li>
                <li>• يمكن إضافة حتى 4 إجابات لكل سؤال</li>
                <li>• <strong className="text-green-700">✨ جديد:</strong> أضف عمود "الإجابة الصحيحة" واكتب رقم الإجابة (1، 2، 3، 4) أو حرف (A، B، C، D)</li>
              </ul>
            </div>

            <Button
              onClick={() => setStep(1)}
              variant="outline"
              className="w-full mt-4"
            >
              رجوع
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: تحديد الأعمدة */}
      {step === 3 && (
        <Card className="p-8 bg-white shadow-xl border-2">
          <h2 className="text-3xl font-black mb-2 text-gray-900">الخطوة 3: تحديد الأعمدة</h2>
          <p className="text-gray-600 mb-8">حدد الأعمدة التي تحتوي على السؤال والإجابات</p>
          
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-gradient-to-r from-blue-100 to-indigo-100 border-3 border-blue-300 rounded-2xl p-6 mb-8 shadow-md">
              <p className="font-black text-blue-900 text-xl">
                📊 تم تحميل {excelData.length} سؤال من الملف
              </p>
            </div>

            <div>
              <label className="block text-base font-bold mb-3 text-gray-900">عمود السؤال *</label>
              <select
                value={columnMapping.question}
                onChange={(e) => setColumnMapping({ ...columnMapping, question: e.target.value })}
                className="w-full px-6 py-4 border-3 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 text-lg font-medium bg-white shadow-sm"
              >
                <option value="">اختر العمود...</option>
                {columns.map((col, i) => (
                  <option key={i} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-base font-bold mb-3 text-gray-900">عمود الإجابة 1 *</label>
              <select
                value={columnMapping.option1}
                onChange={(e) => setColumnMapping({ ...columnMapping, option1: e.target.value })}
                className="w-full px-6 py-4 border-3 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 text-lg font-medium bg-white shadow-sm"
              >
                <option value="">اختر العمود...</option>
                {columns.map((col, i) => (
                  <option key={i} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-base font-bold mb-3 text-gray-900">عمود الإجابة 2 *</label>
              <select
                value={columnMapping.option2}
                onChange={(e) => setColumnMapping({ ...columnMapping, option2: e.target.value })}
                className="w-full px-6 py-4 border-3 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 text-lg font-medium bg-white shadow-sm"
              >
                <option value="">اختر العمود...</option>
                {columns.map((col, i) => (
                  <option key={i} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-base font-bold mb-3 text-gray-700">عمود الإجابة 3 (اختياري)</label>
              <select
                value={columnMapping.option3}
                onChange={(e) => setColumnMapping({ ...columnMapping, option3: e.target.value })}
                className="w-full px-6 py-4 border-3 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 text-lg font-medium bg-white shadow-sm"
              >
                <option value="">اختر العمود...</option>
                {columns.map((col, i) => (
                  <option key={i} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-base font-bold mb-3 text-gray-700">عمود الإجابة 4 (اختياري)</label>
              <select
                value={columnMapping.option4}
                onChange={(e) => setColumnMapping({ ...columnMapping, option4: e.target.value })}
                className="w-full px-6 py-4 border-3 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 text-lg font-medium bg-white shadow-sm"
              >
                <option value="">اختر العمود...</option>
                {columns.map((col, i) => (
                  <option key={i} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <div className="mt-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-3 border-green-300 rounded-2xl">
              <h3 className="font-black text-green-900 text-lg mb-3">✨ جديد: تحديد الإجابة الصحيحة تلقائياً</h3>
              <p className="text-green-800 text-sm mb-4">اختر العمود الذي يحتوي على الإجابة الصحيحة لتوفير الوقت!</p>
              
              <div>
                <label className="block text-base font-bold mb-3 text-green-900">عمود الإجابة الصحيحة (اختياري)</label>
                <select
                  value={columnMapping.correctAnswer}
                  onChange={(e) => setColumnMapping({ ...columnMapping, correctAnswer: e.target.value })}
                  className="w-full px-6 py-4 border-3 border-green-400 rounded-xl focus:border-green-600 focus:ring-4 focus:ring-green-100 text-lg font-medium bg-white shadow-sm"
                >
                  <option value="">اختر العمود...</option>
                  {columns.map((col, i) => (
                    <option key={i} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div className="mt-4 bg-white p-4 rounded-xl border-2 border-green-200">
                <p className="font-bold text-green-900 mb-2">📋 الصيغ المدعومة للإجابة الصحيحة:</p>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• <strong>أرقام:</strong> 1، 2، 3، 4 (للإجابة الأولى، الثانية، إلخ)</li>
                  <li>• <strong>حروف:</strong> A، B، C، D (بالإنجليزية)</li>
                  <li>• <strong>نص:</strong> الإجابة 1، الإجابة 2، إلخ</li>
                </ul>
                <p className="text-xs text-green-700 mt-3 font-medium">💡 مثال: إذا كانت الإجابة الصحيحة هي الخيار الثاني، اكتب: 2 أو B أو الإجابة 2</p>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <Button
                onClick={processExcelData}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-5 text-xl font-black rounded-xl shadow-xl"
              >
                معالجة البيانات →
              </Button>
              <Button
                onClick={() => setStep(2)}
                variant="outline"
                className="px-10 py-5 text-lg font-bold border-3"
              >
                رجوع
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 4: مراجعة وتحديد الإجابات */}
      {step === 4 && (
        <Card className="p-10 bg-gradient-to-br from-gray-50 to-white shadow-2xl border-3 border-gray-300">
          <h2 className="text-4xl font-black mb-3 text-gray-900">الخطوة 4: مراجعة وحفظ</h2>
          <p className="text-gray-700 text-lg font-medium mb-8">راجع الأسئلة وحدد الإجابة الصحيحة لكل سؤال</p>
          
          <div className="mb-8">
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 shadow-xl mb-4">
              <div className="text-2xl font-black text-white">
                📊 إجمالي: {questions.length} سؤال
              </div>
              <div className="text-2xl font-black text-green-200">
                ✅ تم تحديد: {questions.filter(q => q.correctAnswerIndex !== null).length} إجابة
              </div>
            </div>
            
            {columnMapping.correctAnswer && questions.filter(q => q.correctAnswerIndex !== null).length > 0 && (
              <div className="bg-gradient-to-r from-green-100 to-emerald-100 border-3 border-green-400 rounded-2xl p-5 shadow-md">
                <p className="text-green-900 font-bold text-lg flex items-center gap-2">
                  <span className="text-2xl">🎉</span>
                  رائع! تم تحديد {questions.filter(q => q.correctAnswerIndex !== null).length} إجابة تلقائياً من ملف Excel
                </p>
                <p className="text-green-700 text-sm mt-2">يمكنك مراجعة الإجابات أدناه وتعديلها إذا لزم الأمر</p>
              </div>
            )}
          </div>

          <div className="space-y-6 max-h-[600px] overflow-y-auto mb-8 pr-2">
            {questions.map((question, qIndex) => (
              <div key={question.id} className="border-4 border-blue-200 rounded-2xl p-8 bg-white shadow-xl hover:shadow-2xl transition-all">
                <p className="font-black text-gray-900 text-xl mb-6 flex items-center gap-4">
                  <span className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center text-xl font-black shadow-lg">
                    {qIndex + 1}
                  </span>
                  <span className="flex-1">{question.text}</span>
                </p>
                
                <div className="space-y-4">
                  {question.options.map((option: any, optIndex: number) => (
                    <button
                      key={optIndex}
                      onClick={() => {
                        const updated = [...questions];
                        updated[qIndex].correctAnswerIndex = optIndex;
                        setQuestions(updated);
                      }}
                      className={`w-full p-5 rounded-2xl border-4 transition-all text-right ${
                        question.correctAnswerIndex === optIndex
                          ? 'border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 scale-[1.02] shadow-xl'
                          : 'border-gray-400 hover:border-blue-500 bg-white hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center ${
                          question.correctAnswerIndex === optIndex
                            ? 'border-green-600 bg-green-600'
                            : 'border-gray-500 bg-white'
                        }`}>
                          {question.correctAnswerIndex === optIndex && (
                            <FiCheckCircle className="text-white text-lg" />
                          )}
                        </div>
                        <span className="font-black text-gray-900 text-xl">
                          {['A', 'B', 'C', 'D'][optIndex]}.
                        </span>
                        <span className="text-gray-900 font-bold text-lg">{option.text}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {question.correctAnswerIndex === null && (
                  <div className="mt-4 flex items-center gap-3 text-xl text-red-900 font-black bg-red-100 p-5 rounded-2xl border-4 border-red-400 shadow-md">
                    <FiAlertCircle className="w-7 h-7" />
                    <span>⚠️ يجب تحديد الإجابة الصحيحة (اضغط على الإجابة الصحيحة أعلاه)</span>
                  </div>
                )}
                
                {question.correctAnswerIndex !== null && columnMapping.correctAnswer && (
                  <div className="mt-4 flex items-center gap-3 text-sm text-green-700 font-bold bg-green-50 p-3 rounded-xl border-2 border-green-300">
                    <FiCheckCircle className="w-5 h-5" />
                    <span>✅ تم تحديد الإجابة تلقائياً من Excel - يمكنك تغييرها بالضغط على إجابة أخرى</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-6 mt-10">
            <Button
              onClick={handleSaveQuestions}
              disabled={loading || questions.some(q => q.correctAnswerIndex === null)}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-6 text-xl font-black rounded-xl shadow-2xl transform hover:scale-105 transition-all"
            >
              {loading ? '⏳ جاري الحفظ...' : `💾 حفظ ${questions.length} سؤال`}
            </Button>
            <Button
              onClick={() => setStep(3)}
              variant="outline"
              className="px-10 py-6 text-lg font-bold border-3"
              disabled={loading}
            >
              رجوع
            </Button>
          </div>
        </Card>
      )}

      {/* Download Template */}
      <Card className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg mb-2">💡 هل تحتاج قالب Excel؟</h3>
            <p className="text-sm text-gray-600">
              حمّل قالب Excel جاهز لتسهيل رفع الأسئلة
            </p>
          </div>
          <Button
            onClick={() => {
              // إنشاء قالب Excel محدث
              const template = [
                ['السؤال', 'الإجابة 1', 'الإجابة 2', 'الإجابة 3', 'الإجابة 4', 'الإجابة الصحيحة'],
                ['ما هو...؟', 'خيار 1', 'خيار 2', 'خيار 3', 'خيار 4', '1'],
                ['كم عدد...؟', 'خيار 1', 'خيار 2', 'خيار 3', 'خيار 4', '2'],
                ['أي مما يلي...؟', 'خيار 1', 'خيار 2', 'خيار 3', 'خيار 4', 'A'],
              ];
              const ws = XLSX.utils.aoa_to_sheet(template);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, 'الأسئلة');
              XLSX.writeFile(wb, 'قالب_الأسئلة.xlsx');
              toast.success('تم تحميل القالب');
            }}
            variant="outline"
            className="gap-2"
          >
            <FiDownload />
            تحميل القالب
          </Button>
        </div>
      </Card>
      </div>
    </>
  );
}