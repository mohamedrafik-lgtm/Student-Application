'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { HomeIcon, ArrowRightIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

export default function NotFound() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main 
      className="min-h-screen bg-slate-50 flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden relative selection:bg-blue-200 selection:text-blue-900"
    >
      {/* ━━━━━━━━━━━━━━━━━━━━━
          1. Animated Background Elements (StarNova Vibe)
         ━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center">
        {/* Rotating Dashed Rings */}
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.3, 0.1], rotate: [0, 90, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] border-2 border-blue-200 rounded-full border-dashed"
        />
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2], rotate: [0, -90, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute w-[700px] h-[700px] sm:w-[900px] sm:h-[900px] border border-blue-100 rounded-full border-dashed"
        />
        
        {/* Floating Glowing Orbs */}
        <motion.div 
          animate={{ x: [-50, 50, -50], y: [-50, 50, -50] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-400/20 rounded-full blur-[80px]"
        />
        <motion.div 
          animate={{ x: [50, -50, 50], y: [50, -50, 50] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px]"
        />
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━
          2. Main Content Container
         ━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="relative z-10 max-w-3xl w-full text-center flex flex-col items-center">
        
        {/* ━━━━━━━━━━━━━━━━━━━━━
            3. Highly Animated 404 Text
           ━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="flex items-center justify-center gap-4 sm:gap-8 mb-12">
          {/* First '4' */}
          <motion.span 
            animate={{ y: [-15, 15, -15] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="text-[8rem] sm:text-[14rem] font-black text-slate-900 drop-shadow-xl leading-none"
          >
            4
          </motion.span>
          
          {/* The '0' (Radar/Planet) */}
          <motion.div 
            animate={{ y: [15, -15, 15] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="relative flex items-center justify-center"
          >
            <span className="text-[8rem] sm:text-[14rem] font-black text-blue-600 drop-shadow-2xl leading-none relative z-10">
              0
            </span>
            {/* Radar Scanner Effect inside the 0 */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border-t-8 border-blue-400 opacity-60 w-3/4 h-3/4 m-auto"
            />
            {/* Inner Pulse */}
            <motion.div 
              animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full bg-blue-300 w-1/2 h-1/2 m-auto blur-md"
            />
          </motion.div>

          {/* Second '4' */}
          <motion.span 
            animate={{ y: [-10, 20, -10] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="text-[8rem] sm:text-[14rem] font-black text-slate-900 drop-shadow-xl leading-none"
          >
            4
          </motion.span>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━
            4. Message
           ━━━━━━━━━━━━━━━━━━━━━ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="space-y-6 mb-14"
        >
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-6 py-2.5 rounded-full text-sm font-bold shadow-sm">
            <MagnifyingGlassIcon className="w-5 h-5" />
            <span>خطأ 404</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            الصفحة غير موجودة
          </h2>
          <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
            الرابط الذي تحاول الوصول إليه غير متاح. تأكد من صحة العنوان أو عُد إلى الصفحة الرئيسية.
          </p>
        </motion.div>

        {/* ━━━━━━━━━━━━━━━━━━━━━
            5. Action Buttons
           ━━━━━━━━━━━━━━━━━━━━━ */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto"
        >
          {/* Primary Button */}
          <Link
            href="/"
            className="group relative inline-flex items-center justify-center gap-3 px-10 py-4 rounded-2xl text-xl font-bold text-white bg-blue-600 overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_15px_30px_rgba(37,99,235,0.4)] w-full sm:w-auto"
          >
            {/* Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
            <HomeIcon className="w-6 h-6 relative z-10" />
            <span className="relative z-10">العودة للرئيسية</span>
          </Link>
          
          {/* Secondary Button */}
          <button
            onClick={() => router.back()}
            className="group inline-flex items-center justify-center gap-3 px-10 py-4 rounded-2xl text-xl font-bold text-slate-700 bg-white border-2 border-slate-200 hover:border-blue-600 hover:text-blue-600 transition-all duration-300 hover:shadow-lg w-full sm:w-auto"
          >
            <ArrowRightIcon className="w-6 h-6 group-hover:-translate-x-2 transition-transform" />
            <span>العودة للخلف</span>
          </button>
        </motion.div>

      </div>
    </main>
  );
}
