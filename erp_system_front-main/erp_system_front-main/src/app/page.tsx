"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Sparkles,
  LogIn,
  ArrowLeft,
  ChevronDown,
  Play,
  CheckCircle2
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ─── Floating Particle ─── */
function FloatingParticle({ delay, x, y, size, duration = 8 }: { delay: number; x: string; y: string; size: number; duration?: number }) {
  return (
    <motion.div
      className="absolute rounded-full bg-blue-500/20 blur-[2px]"
      style={{ left: x, top: y, width: size, height: size }}
      animate={{
        y: [0, -40, 0, 30, 0],
        x: [0, 20, -15, 10, 0],
        opacity: [0.1, 0.6, 0.2, 0.5, 0.1],
        scale: [1, 1.3, 0.8, 1.2, 1],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

/* ─── Main Component ─── */
export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main className="h-screen w-full flex flex-col font-cairo antialiased bg-[#FAFCFF] selection:bg-blue-200 selection:text-blue-900 overflow-hidden relative">
      
      {/* ════════ Navbar ════════ */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
        className="absolute top-0 left-0 right-0 bg-transparent z-50"
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-24 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer">
            <motion.div
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.6, type: "spring" }}
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg shadow-blue-600/30 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
              <Sparkles className="w-6 h-6 text-white relative z-10" />
            </motion.div>
            <div className="flex flex-col leading-none">
              <span className="text-xl font-black text-slate-900 tracking-tight">StarNova</span>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">ERP System</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/auth-select"
              className="hidden sm:flex text-sm font-bold text-slate-700 hover:text-blue-600 transition-colors"
            >
              تسجيل الدخول
            </Link>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="/auth-select"
                className={cn(
                  buttonVariants({ size: "default" }),
                  "gap-2 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/20 border-none"
                )}
              >
                ابدأ مجاناً
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* ════════ Hero Section (Full Screen) ════════ */}
      <section className="flex-1 relative flex items-center justify-center overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-blue-400/20 rounded-full blur-[120px] mix-blend-multiply animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-400/20 rounded-full blur-[100px] mix-blend-multiply animate-pulse" style={{ animationDuration: '10s' }} />
          <div className="absolute top-[20%] left-[20%] w-[300px] h-[300px] bg-sky-300/20 rounded-full blur-[80px] mix-blend-multiply animate-pulse" style={{ animationDuration: '12s' }} />
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

          {/* Particles */}
          <FloatingParticle delay={0} x="15%" y="25%" size={12} duration={10} />
          <FloatingParticle delay={2} x="85%" y="15%" size={8} duration={12} />
          <FloatingParticle delay={4} x="75%" y="65%" size={16} duration={15} />
          <FloatingParticle delay={1} x="20%" y="70%" size={10} duration={11} />
          <FloatingParticle delay={3} x="50%" y="85%" size={14} duration={14} />
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10 w-full">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            
            {/* Text Content */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex-1 text-center lg:text-right pt-20 lg:pt-0"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-bold mb-8 shadow-sm"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600" />
                </span>
                الإصدار 2.0 متاح الآن
              </motion.div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-[5rem] font-black text-slate-900 leading-[1.1] tracking-tight mb-6">
                أدر مركزك التدريبي <br />
                <span className="relative inline-block mt-2">
                  <span className="relative z-10 bg-gradient-to-l from-blue-600 via-blue-500 to-indigo-600 bg-clip-text text-transparent">
                    بذكاء وسهولة
                  </span>
                  <motion.span 
                    className="absolute bottom-2 left-0 w-full h-4 bg-blue-200/50 -z-10 rounded-full"
                    initial={{ scaleX: 0, originX: 1 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.8, duration: 0.8, ease: "circOut" }}
                  />
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-500 font-medium leading-relaxed mb-10 max-w-2xl mx-auto lg:mx-0">
                منصة سحابية متكاملة مصممة خصيصاً لإدارة مراكز التدريب، تتيح لك التحكم الكامل في المتدربين، الدورات، والشؤون المالية والإدارية باحترافية تامة.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full sm:w-auto">
                  <Link
                    href="/auth-select"
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "gap-3 rounded-2xl px-8 h-16 text-lg font-bold w-full sm:w-auto",
                      "bg-blue-600 text-white hover:bg-blue-700",
                      "shadow-[0_8px_30px_rgba(37,99,235,0.25)] hover:shadow-[0_12px_40px_rgba(37,99,235,0.4)]",
                      "transition-all duration-300 border-none"
                    )}
                  >
                    <LogIn className="w-6 h-6" />
                    ابدأ تجربتك الآن
                  </Link>
                </motion.div>

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full sm:w-auto">
                  <Link
                    href="#demo"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "lg" }),
                      "gap-3 rounded-2xl px-8 h-16 text-lg font-bold w-full sm:w-auto",
                      "bg-white border-2 border-slate-200 text-slate-700 hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50",
                      "transition-all duration-300"
                    )}
                  >
                    <Play className="w-5 h-5 fill-current" />
                    شاهد كيف يعمل
                  </Link>
                </motion.div>
              </div>

              <div className="mt-10 flex items-center justify-center lg:justify-start gap-6 text-sm font-semibold text-slate-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  <span>لا يتطلب بطاقة ائتمان</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  <span>دعم فني 24/7</span>
                </div>
              </div>
            </motion.div>

            {/* Hero Image/Mockup */}
            <motion.div 
              initial={{ opacity: 0, x: -50, rotateY: -20 }}
              animate={{ opacity: 1, x: 0, rotateY: 0 }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
              className="flex-1 relative w-full max-w-2xl perspective-1000 hidden md:block"
            >
              <motion.div 
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="relative rounded-3xl bg-white/80 backdrop-blur-sm border border-slate-200/60 shadow-2xl shadow-blue-900/10 overflow-hidden transform-gpu"
              >
                {/* Mockup Header */}
                <div className="h-12 bg-slate-50/80 border-b border-slate-100 flex items-center px-4 gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <div className="mx-auto w-1/2 h-6 bg-white rounded-md border border-slate-200" />
                </div>
                {/* Mockup Body */}
                <div className="p-6 grid grid-cols-3 gap-4 bg-slate-50/30">
                  <div className="col-span-2 space-y-4">
                    <div className="h-32 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col justify-between">
                      <div className="w-1/3 h-4 bg-slate-100 rounded-full" />
                      <div className="w-full h-12 bg-blue-50 rounded-lg" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-24 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col justify-between">
                        <div className="w-8 h-8 rounded-full bg-indigo-100" />
                        <div className="w-2/3 h-3 bg-slate-100 rounded-full" />
                      </div>
                      <div className="h-24 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col justify-between">
                        <div className="w-8 h-8 rounded-full bg-emerald-100" />
                        <div className="w-2/3 h-3 bg-slate-100 rounded-full" />
                      </div>
                    </div>
                  </div>
                  <div className="col-span-1 space-y-4">
                    <div className="h-full bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3">
                      <div className="w-full h-4 bg-slate-100 rounded-full" />
                      <div className="w-full h-16 bg-slate-50 rounded-lg" />
                      <div className="w-full h-16 bg-slate-50 rounded-lg" />
                      <div className="w-full h-16 bg-slate-50 rounded-lg" />
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden lg:block"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-slate-300/60 flex items-start justify-center p-1.5">
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-slate-400"
              animate={{ y: [0, 12, 0], opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      </section>
    </main>
  );
}