"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  BookOpen,
  GraduationCap,
  ArrowLeft,
  Loader2,
  Sparkles,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface SystemSettings {
  centerName: string;
  centerManagerName: string;
  centerAddress: string;
  licenseNumber: string;
}

const authOptions = [
  {
    href: "/trainee-auth",
    title: "بوابة المتدربين",
    description: "الوصول إلى الجدول الدراسي، الدرجات، والشؤون المالية",
    icon: GraduationCap,
  },
  {
    href: "/instructor-login",
    title: "بوابة المحاضرين",
    description: "إدارة المقررات، تسجيل الحضور، ورصد الدرجات",
    icon: BookOpen,
  },
  {
    href: "/login",
    title: "بوابة الموظفين",
    description: "إدارة شؤون المتدربين، المالية، والعمليات الإدارية",
    icon: ShieldCheck,
  },
];

export default function AuthSelectPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const fetchSettings = async () => {
      try {
        const { getSystemSettings } = await import("@/lib/settings-cache");
        const data = await getSystemSettings();
        setSettings(data);
        if (data.centerName) {
          document.title = `${data.centerName} - اختيار نوع الحساب`;
        }
      } catch (error) {
        console.error("خطأ في جلب الإعدادات:", error);
      }
    };
    fetchSettings();
  }, []);

  const handleNavigation = (href: string) => {
    setIsLoading(href);
    setTimeout(() => {
      router.push(href);
    }, 600);
  };

  if (!mounted) return null;

  const centerName = settings?.centerName || "إدارة التدريب";

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center font-cairo antialiased bg-white selection:bg-blue-600 selection:text-white relative overflow-hidden">
      
      {/* Subtle Page Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-50 pointer-events-none" />

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full px-6 pt-10 pb-8 flex flex-col items-center text-center z-10 relative"
      >
        {/* StarNova Logo Concept */}
        <div className="relative w-16 h-16 flex items-center justify-center mb-6 group cursor-default">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0"
          >
            <div className="absolute inset-0 bg-blue-600 rounded-xl rotate-0 opacity-80 mix-blend-multiply" />
            <div className="absolute inset-0 bg-blue-500 rounded-xl rotate-45 opacity-80 mix-blend-multiply" />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-700 to-blue-400 rounded-full blur-md opacity-50 group-hover:opacity-80 transition-opacity duration-500" />
          <Sparkles className="w-8 h-8 text-white relative z-10" strokeWidth={1.5} />
        </div>

        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 mb-3 tracking-tight">
          مرحباً بك في <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-800">{centerName}</span>
        </h1>
        <p className="text-base md:text-lg text-slate-500 font-medium max-w-xl leading-relaxed">
          اختر البوابة المناسبة للبدء
        </p>
      </motion.div>

      {/* Cards Grid */}
      <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 pb-10 grid grid-cols-1 md:grid-cols-3 gap-6 z-10 relative">
        {authOptions.map((option, index) => {
          const Icon = option.icon;
          const isHovered = hoveredIndex === index;
          const isNavigating = isLoading === option.href;
          const isOtherLoading = isLoading !== null && !isNavigating;

          return (
            <motion.div
              key={option.href}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 + index * 0.12, ease: [0.21, 0.47, 0.32, 0.98] }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => !isLoading && handleNavigation(option.href)}
              className="relative group"
            >
              {/* Outer Glow (The Nova Aura) */}
              <div className={cn(
                "absolute -inset-0.5 rounded-[2rem] bg-gradient-to-b from-blue-400 to-blue-600 opacity-0 blur-xl transition-all duration-700 z-0",
                isHovered && "opacity-60 scale-105",
                isNavigating && "opacity-80 animate-pulse"
              )} />

              {/* Card Body */}
              <div
                className={cn(
                  "relative h-full min-h-[320px] flex flex-col items-center justify-center text-center p-8 overflow-hidden rounded-[2rem] transition-all duration-500 ease-out z-10",
                  "bg-gradient-to-br from-blue-700 via-blue-800 to-blue-950",
                  isHovered ? "shadow-2xl shadow-blue-900/50 -translate-y-2 border-blue-400/30" : "shadow-xl shadow-blue-900/10 border-white/5",
                  "border",
                  isNavigating && "scale-[0.95] opacity-90",
                  isOtherLoading && "opacity-40 grayscale pointer-events-none"
                )}
              >
                {/* --- STARNOVA ANIMATIONS (Background of Card) --- */}
                
                {/* 1. Nebula Blob */}
                <motion.div
                  animate={isHovered ? { scale: [1, 1.5, 1], opacity: 0.6 } : { scale: 1, opacity: 0.2 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_30%,rgba(59,130,246,0.4),transparent_60%)] pointer-events-none"
                />

                {/* 2. Supernova Shockwave Ring */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={isHovered ? { scale: [0.5, 2.5], opacity: [0.8, 0], borderWidth: ["2px", "0px"] } : { scale: 0.5, opacity: 0 }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border-blue-300 pointer-events-none"
                />

                {/* 3. Starburst Particles */}
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0, x: "-50%", y: "-50%" }}
                    animate={isHovered ? {
                      opacity: [0, 1, 0],
                      scale: [0, 1.5, 0],
                      x: `calc(-50% + ${Math.cos(i * 45 * Math.PI / 180) * 140}px)`,
                      y: `calc(-50% + ${Math.sin(i * 45 * Math.PI / 180) * 140}px)`,
                    } : { opacity: 0, scale: 0, x: "-50%", y: "-50%" }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                    className="absolute top-[35%] left-1/2 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_2px_rgba(255,255,255,0.8)] pointer-events-none"
                  />
                ))}

                {/* 4. Twinkling Background Stars */}
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={`star-${i}`}
                      animate={isHovered ? { opacity: [0.2, 1, 0.2], scale: [1, 1.5, 1] } : { opacity: 0.2, scale: 1 }}
                      transition={{ duration: 1.5 + Math.random(), repeat: Infinity, delay: Math.random() * 2 }}
                      className="absolute w-1 h-1 bg-white rounded-full"
                      style={{
                        top: `${20 + Math.random() * 60}%`,
                        left: `${10 + Math.random() * 80}%`,
                        boxShadow: "0 0 8px 1px white"
                      }}
                    />
                  ))}
                </div>

                {/* --- CARD CONTENT --- */}
                <div className="relative z-20 flex flex-col items-center w-full h-full">
                  
                  {/* Glowing Icon Core */}
                  <div className="relative mb-6 mt-2">
                    <motion.div
                      animate={isHovered ? { scale: 1.2, rotate: 180 } : { scale: 1, rotate: 0 }}
                      transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 rounded-full border border-dashed border-blue-400/30"
                    />
                    <motion.div
                      animate={isHovered ? { scale: 1.15, boxShadow: "0 0 40px 10px rgba(59, 130, 246, 0.6)" } : { scale: 1, boxShadow: "0 0 0px 0px rgba(59, 130, 246, 0)" }}
                      transition={{ duration: 0.4 }}
                      className="relative w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center z-10"
                    >
                      <AnimatePresence mode="wait">
                        {isNavigating ? (
                          <motion.div
                            key="loader"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                          >
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="icon"
                            animate={isHovered ? { scale: 1.1 } : { scale: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 15 }}
                          >
                            <Icon className="w-9 h-9 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" strokeWidth={1.5} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </div>

                  {/* Text Content */}
                  <motion.h3
                    animate={isHovered ? { y: -5 } : { y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-2xl font-bold text-white mb-3 tracking-wide"
                  >
                    {option.title}
                  </motion.h3>
                  
                  <motion.p
                    animate={isHovered ? { opacity: 1, y: -5 } : { opacity: 0.7, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.05 }}
                    className="text-blue-100 text-sm leading-relaxed max-w-[240px]"
                  >
                    {option.description}
                  </motion.p>

                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.8 }}
        className="pb-6 flex items-center gap-3 text-slate-400 text-xs font-bold z-10"
      >
        <span>© {new Date().getFullYear()} StarNova ERP</span>
        <span className="w-1 h-1 rounded-full bg-slate-300" />
        <span>جميع الحقوق محفوظة</span>
      </motion.div>
    </main>
  );
}