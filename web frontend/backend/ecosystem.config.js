module.exports = {
  apps: [{
    name: 'tiba-backend',
    script: 'dist/main.js',
    instances: 1, // عملية واحدة فقط للذاكرة المحدودة
    exec_mode: 'fork', // fork mode أكثر كفاءة للذاكرة
    
    // إعدادات الذاكرة المحسنة لـ 1GB RAM
    max_memory_restart: '800M', // إعادة تشغيل عند 800MB
    node_args: [
      '--max-old-space-size=700',    // حد أقصى 700MB للـ heap
      '--gc-interval=100',           // garbage collection متكرر
      '--optimize-for-size',         // تحسين للحجم وليس السرعة
      '--always-compact',            // ضغط الذاكرة دائماً
      '--expose-gc'                  // السماح بـ manual garbage collection
    ],
    
    // متغيرات البيئة المحسنة
    env: {
      NODE_ENV: 'production',
      PORT: 4000,
      
      // إعدادات تحسين الذاكرة
      UV_THREADPOOL_SIZE: 2,         // تقليل عدد threads
      NODE_OPTIONS: '--max-old-space-size=700 --gc-interval=100',
      
      // إعدادات PDF محسنة
      PDF_GENERATION_TIMEOUT: 15000,
      PDF_QUALITY: 60,
      PDF_MEMORY_LIMIT: 100,
      
      // إعدادات WhatsApp محسنة
      WHATSAPP_MEMORY_MODE: 'true',
      WHATSAPP_RESTART_ON_HIGH_MEMORY: 'true',
      
      // إعدادات قاعدة البيانات
      DATABASE_POOL_MIN: 1,
      DATABASE_POOL_MAX: 3,
      DATABASE_TIMEOUT: 10000
    },
    
    // مراقبة الأداء
    monitoring: false, // إيقاف المراقبة لتوفير الذاكرة
    
    // إعدادات إعادة التشغيل
    autorestart: true,
    max_restarts: 5,
    min_uptime: '10s',
    restart_delay: 5000,
    
    // إعدادات السجلات
    log_file: './logs/app.log',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // تنظيف السجلات
    log_type: 'json',
    max_size: '10M',
    retain: 5,
    
    // إعدادات إضافية للأداء
    kill_timeout: 5000,
    listen_timeout: 8000,
    
    // متغيرات إضافية لتحسين الأداء
    env_production: {
      NODE_ENV: 'production',
      NODE_OPTIONS: '--max-old-space-size=700 --gc-interval=100 --optimize-for-size'
    }
  }]
};
