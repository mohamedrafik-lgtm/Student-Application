'use client';

import { useState, useEffect, use } from 'react';
import { fetchAPI } from '@/lib/api';

export default function CommitteesQuestionsPrintPage({ params }: { params: Promise<{ examId: string }> }) {
  const resolvedParams = use(params);
  const examId = parseInt(resolvedParams.examId);
  
  const [data, setData] = useState<any>(null);
  const [modelsData, setModelsData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [examId]);

  useEffect(() => {
    if (!loading && data) {
      setTimeout(() => window.print(), 500);
    }
  }, [loading, data]);

  const loadData = async () => {
    try {
      const result = await fetchAPI(`/paper-exams/${examId}/committees-sheets`);
      setData(result);
      
      // جلب بيانات كل نموذج مع الأسئلة
      const uniqueModelIds = new Set<number>();
      result.groups?.forEach((group: any) => {
        group.committees.forEach((committee: any) => {
          committee.sheets.forEach((sheet: any) => {
            uniqueModelIds.add(sheet.model.id);
          });
        });
      });
      
      const modelsMap: any = {};
      for (const modelId of uniqueModelIds) {
        const modelData = await fetchAPI(`/paper-exams/models/${modelId}`);
        modelsMap[modelId] = modelData;
      }
      setModelsData(modelsMap);
    } catch (error) {
      console.error('خطأ في تحميل البيانات:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600">جاري تحميل أوراق الأسئلة...</p>
        </div>
      </div>
    );
  }

  if (!data || !data.groups || data.groups.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-600">لا توجد بيانات</p>
      </div>
    );
  }

  const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div>
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .page-break {
            page-break-after: always;
          }
        }
        .compact-question {
          break-inside: avoid;
        }
      `}</style>

      {data.groups.map((group: any, groupIndex: number) => (
        <div key={group.groupName}>
          {group.committees.map((committee: any, committeeIndex: number) => {
            // تجميع النماذج في هذه اللجنة
            const committeeModels = new Map();
            committee.sheets.forEach((sheet: any) => {
              const modelId = sheet.model.id;
              if (!committeeModels.has(modelId)) {
                committeeModels.set(modelId, {
                  model: sheet.model,
                  count: 0
                });
              }
              committeeModels.get(modelId).count++;
            });

            return (
              <div key={committee.committeeNumber}>
                {/* صفحة غلاف اللجنة */}
                <div className="min-h-screen flex flex-col items-center justify-center page-break">
                  <div className="text-center">
                    <div className="mb-8">
                      <div className="inline-block bg-slate-700 text-white px-12 py-6 rounded-xl shadow-sm">
                        <h1 className="text-5xl font-black mb-2">{group.groupName}</h1>
                        <h2 className="text-4xl font-bold mb-2">اللجنة {committee.committeeNumber}</h2>
                        <p className="text-2xl font-bold">{committee.sheetsCount} طالب</p>
                      </div>
                    </div>
                    
                    <div className="mt-12 bg-white border-4 border-purple-200 rounded-xl p-8 inline-block">
                      <p className="text-2xl font-bold mb-4 text-slate-800">النماذج المستخدمة:</p>
                      <div className="space-y-2">
                        {Array.from(committeeModels.entries()).map(([modelId, info]: [any, any]) => (
                          <div key={modelId} className="flex items-center gap-4 text-xl">
                            <span className="font-black text-purple-600 text-3xl">{info.model.modelCode}</span>
                            <span className="text-slate-600">-</span>
                            <span className="font-bold text-slate-700">{info.count} طالب</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* طباعة ورقة منفصلة لكل طالب */}
                {committee.sheets.map((sheet: any, sheetIndex: number) => {
                  const modelData = modelsData[sheet.model.id];
                  if (!modelData) return null;

                  const isLastSheet = sheetIndex === committee.sheets.length - 1;
                  const isLastCommittee = committeeIndex === group.committees.length - 1;
                  const isLastGroup = groupIndex === data.groups.length - 1;

                  return (
                  <div key={sheet.id} className={`p-8 bg-white max-w-4xl mx-auto ${!isLastSheet || !isLastCommittee || !isLastGroup ? 'page-break' : ''}`}>
                    {/* Header - نفس تصميم الصفحة القديمة */}
                    <div className="text-center mb-8 border-b-4 border-black pb-4">
                      <h1 className="text-3xl font-bold mb-2">{modelData.paperExam.trainingContent.program.nameAr}</h1>
                      <h2 className="text-2xl font-bold mb-3">{modelData.paperExam.title}</h2>
                      <div className="flex justify-around items-center mt-4 pt-4 border-t-2 border-slate-300">
                        <p>نموذج: <span className="font-bold text-xl">{sheet.model.modelCode}</span></p>
                        <p>اللجنة: <span className="font-bold text-xl text-orange-600">{committee.committeeNumber}</span></p>
                        <p>المدة: <span className="font-bold">{modelData.paperExam.duration} دقيقة</span></p>
                        <p>الدرجات: <span className="font-bold">{modelData.paperExam.totalMarks} درجة</span></p>
                      </div>
                    </div>

                {/* بيانات الطالب */}
                <div className="border-2 border-black p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-semibold">الاسم: </span>
                      <span className="font-bold">{sheet.trainee.nameAr}</span>
                    </div>
                    <div>
                      <span className="font-semibold">الرقم القومي: </span>
                      <span className="font-bold">{sheet.trainee.nationalId}</span>
                    </div>
                  </div>
                </div>

                {/* التعليمات */}
                {modelData.paperExam.instructions && (
                  <div className="bg-slate-100 border-2 border-slate-400 p-4 mb-6">
                    <h3 className="font-bold mb-2">◆ التعليمات:</h3>
                    <p className="whitespace-pre-wrap text-sm">{modelData.paperExam.instructions}</p>
                  </div>
                )}

                {/* الأسئلة - نفس تصميم الصفحة القديمة */}
                <div className="space-y-4">
                  {modelData.questions?.map((examQuestion: any, index: number) => (
                    <div key={examQuestion.id} className="compact-question border-b pb-3">
                      <div className="flex gap-2">
                        <span className="font-bold text-base min-w-[30px]">{index + 1}.</span>
                        <div className="flex-1">
                          <p className="text-base mb-2 leading-normal">{examQuestion.question.text}</p>
                          
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mr-4 text-sm">
                            {examQuestion.question.options.map((option: any, optionIndex: number) => (
                              <div key={option.id} className="flex items-start gap-2">
                                <div className="flex items-center gap-1 min-w-[50px] flex-shrink-0">
                                  <div className="w-4 h-4 border-2 border-black rounded-full flex-shrink-0"></div>
                                  <span className="font-semibold">{optionLabels[optionIndex]}.</span>
                                </div>
                                <p className="flex-1 leading-tight">{option.text}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="mt-8 pt-4 border-t-2 border-black text-center">
                  <p className="text-sm">نهاية الأسئلة - بالتوفيق</p>
                  <p className="text-xs text-slate-600 mt-2">
                    {group.groupName} - اللجنة {committee.committeeNumber} - النموذج {sheet.model.modelCode} - {sheet.trainee.nameAr}
                  </p>
                </div>
              </div>
              );
            })}
          </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
