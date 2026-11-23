'use client';

import { motion } from 'framer-motion';
import { Sparkles, Clock3, BellRing } from 'lucide-react';

export default function CrmDashboardUnavailable() {
  return (
    <main className="relative h-full min-h-screen overflow-hidden bg-slate-950 text-white" dir="rtl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.25),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(14,165,233,0.2),transparent_35%),radial-gradient(circle_at_50%_80%,rgba(99,102,241,0.2),transparent_45%)]" />

      <motion.div
        className="absolute -top-16 -right-16 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl"
        animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl"
        animate={{ x: [0, 25, 0], y: [0, -25, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 flex h-full min-h-screen items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="w-full max-w-2xl rounded-3xl border border-white/15 bg-white/10 p-8 text-center shadow-2xl backdrop-blur-xl sm:p-12"
        >
          <motion.div
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-500/20"
            animate={{ rotate: [0, 8, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles className="h-10 w-10 text-blue-200" />
          </motion.div>

          <h1 className="mb-3 text-3xl font-black tracking-tight sm:text-4xl">
            نظام CRM غير متاح الآن
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-sm leading-7 text-slate-200 sm:text-base">
            نعمل حاليًا على تحسينات كبيرة لإطلاق تجربة أفضل. سيكون النظام متاحًا قريبًا جدًا.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/15 bg-slate-900/40 p-4">
              <div className="mb-2 flex items-center justify-center gap-2 text-blue-200">
                <Clock3 className="h-4 w-4" />
                <span className="text-xs font-bold">الحالة الحالية</span>
              </div>
              <p className="text-sm font-semibold">تحديثات قيد التنفيذ</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-slate-900/40 p-4">
              <div className="mb-2 flex items-center justify-center gap-2 text-cyan-200">
                <BellRing className="h-4 w-4" />
                <span className="text-xs font-bold">الإتاحة</span>
              </div>
              <p className="text-sm font-semibold">سيكون متاحًا قريبًا</p>
            </div>
          </div>

          <motion.div
            className="mt-8 h-1.5 overflow-hidden rounded-full bg-white/10"
            initial={{ opacity: 0.5 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-400"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>
        </motion.div>
      </div>
    </main>
  );
}
