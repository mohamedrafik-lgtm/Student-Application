'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { getTraineeNotes, createTraineeNote, updateTraineeNote, deleteTraineeNote, TraineeNote } from '@/lib/api/trainee-notes';
import { useAuth } from '@/lib/auth-context';
import { TibaModal } from '@/components/ui/tiba-modal';

interface TraineeNotesModalProps {
  traineeId: number;
  traineeName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function TraineeNotesModal({ traineeId, traineeName, isOpen, onClose }: TraineeNotesModalProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<TraineeNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadNotes();
    }
  }, [isOpen, traineeId]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const response = await getTraineeNotes(traineeId);
      setNotes(response.notes);
    } catch (error: any) {
      toast.error(error.message || 'فشل في تحميل الملاحظات');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) {
      toast.error('يرجى كتابة محتوى الملاحظة');
      return;
    }

    setSubmitting(true);
    try {
      const response = await createTraineeNote(traineeId, newNoteContent.trim());
      setNotes([response.note, ...notes]);
      setNewNoteContent('');
      toast.success('تم إضافة الملاحظة بنجاح');
    } catch (error: any) {
      toast.error(error.message || 'فشل في إضافة الملاحظة');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editingContent.trim()) {
      toast.error('يرجى كتابة محتوى الملاحظة');
      return;
    }

    setSubmitting(true);
    try {
      const response = await updateTraineeNote(noteId, editingContent.trim());
      setNotes(notes.map(note => note.id === noteId ? response.note : note));
      setEditingNoteId(null);
      setEditingContent('');
      toast.success('تم تحديث الملاحظة بنجاح');
    } catch (error: any) {
      toast.error(error.message || 'فشل في تحديث الملاحظة');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) {
      return;
    }

    setSubmitting(true);
    try {
      await deleteTraineeNote(noteId);
      setNotes(notes.filter(note => note.id !== noteId));
      toast.success('تم حذف الملاحظة بنجاح');
    } catch (error: any) {
      toast.error(error.message || 'فشل في حذف الملاحظة');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (note: TraineeNote) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
  };

  const cancelEdit = () => {
    setEditingNoteId(null);
    setEditingContent('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <TibaModal
      open={isOpen}
      onClose={onClose}
      variant="primary"
      size="lg"
      title="ملاحظات المتدرب"
      subtitle={traineeName}
      icon={
        <svg className="w-full h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      }
      footer={
        <button
          onClick={onClose}
          className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
        >
          إغلاق
        </button>
      }
    >
      {/* Add Note Form */}
      <form onSubmit={handleAddNote} className="mb-6">
        <div className="flex flex-col gap-3">
          <textarea
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder="أضف ملاحظة جديدة..."
            rows={3}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-tiba-primary-500/10 focus:border-tiba-primary-400 resize-none transition-all text-slate-900 placeholder:text-slate-400"
            disabled={submitting}
          />
          <button
            type="submit"
            disabled={submitting || !newNoteContent.trim()}
            className="self-end flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-tiba-primary-600 to-tiba-primary-700 text-white rounded-xl hover:from-tiba-primary-700 hover:to-tiba-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-tiba-primary-200 hover:shadow-lg font-medium"
          >
            <PlusIcon className="h-5 w-5" />
            <span>إضافة ملاحظة</span>
          </button>
        </div>
      </form>

      {/* Notes List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-tiba-primary-600"></div>
          <p className="mt-2 text-slate-600">جاري التحميل...</p>
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          </div>
          <p className="text-slate-500 font-medium">لا توجد ملاحظات حتى الآن</p>
          <p className="text-sm text-slate-400 mt-1">أضف أول ملاحظة من الحقل أعلاه</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <div key={note.id} className="border-2 border-slate-200 rounded-xl p-4 bg-gradient-to-r from-white to-slate-50/50 hover:border-slate-300 transition-all duration-200">
              {editingNoteId === note.id ? (
                /* Edit Mode */
                <div className="space-y-3">
                  <textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-tiba-primary-500/10 focus:border-tiba-primary-400 resize-none transition-all text-slate-900"
                    disabled={submitting}
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={cancelEdit}
                      disabled={submitting}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 disabled:opacity-50 transition-colors font-medium"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={() => handleUpdateNote(note.id)}
                      disabled={submitting || !editingContent.trim()}
                      className="px-4 py-2 bg-tiba-primary-600 text-white rounded-xl hover:bg-tiba-primary-700 disabled:opacity-50 transition-colors font-medium shadow-sm"
                    >
                      حفظ
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-slate-900">{note.user.name}</p>
                      <p className="text-sm text-slate-500">{formatDate(note.createdAt)}</p>
                    </div>
                    {user?.userId === note.user.id && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEdit(note)}
                          disabled={submitting}
                          className="p-2 text-tiba-primary-600 hover:bg-tiba-primary-50 rounded-xl disabled:opacity-50 transition-colors"
                          title="تعديل"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          disabled={submitting}
                          className="p-2 text-tiba-danger-600 hover:bg-tiba-danger-50 rounded-xl disabled:opacity-50 transition-colors"
                          title="حذف"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                  {note.updatedAt !== note.createdAt && (
                    <p className="text-xs text-slate-400 mt-2">
                      تم التحديث: {formatDate(note.updatedAt)}
                    </p>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </TibaModal>
  );
}

