/** Return question options in the persisted order used to print and scan this model. */
export function getPaperExamQuestionOptions(examQuestion: any): any[] {
  const options = examQuestion?.question?.options ?? [];
  const order = examQuestion?.optionsOrder;

  if (examQuestion?.question?.type === 'TRUE_FALSE') {
    const isTrue = (option: any) => ['صح', 'صحيح', 'true'].includes(String(option.text || '').trim().toLowerCase());
    const isFalse = (option: any) => ['خطأ', 'خطا', 'false'].includes(String(option.text || '').trim().toLowerCase());
    const trueOption = options.find(isTrue);
    const falseOption = options.find(isFalse);
    if (trueOption && falseOption) return [trueOption, falseOption];
  }

  if (!Array.isArray(order) || order.length === 0) return options;

  const optionsById = new Map(options.map((option: any) => [option.id, option]));
  const ordered = order.map((optionId: number) => optionsById.get(optionId)).filter(Boolean);
  return ordered.length === options.length ? ordered : options;
}
