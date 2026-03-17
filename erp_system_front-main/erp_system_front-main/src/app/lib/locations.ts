// بيانات الدول والمحافظات والمدن
export interface City {
  value: string;
  label: string;
}

export interface Governorate {
  value: string;
  label: string;
  cities: City[];
}

export interface Country {
  value: string;
  label: string;
  governorates?: Governorate[];
}

// قائمة المحافظات المصرية مع مدنها
export const egyptGovernoratesAndCities: Governorate[] = [
  {
    value: "cairo",
    label: "القاهرة",
    cities: [
      { value: "nasr_city", label: "مدينة نصر" },
      { value: "heliopolis", label: "مصر الجديدة" },
      { value: "maadi", label: "المعادي" },
      { value: "zamalek", label: "الزمالك" },
      { value: "downtown", label: "وسط البلد" },
      { value: "shubra", label: "شبرا" },
      { value: "abbasia", label: "العباسية" },
      { value: "helwan", label: "حلوان" },
      { value: "ain_shams", label: "عين شمس" },
      { value: "manshiet_nasser", label: "منشية ناصر" },
      { value: "new_cairo", label: "القاهرة الجديدة" },
      { value: "old_cairo", label: "مصر القديمة" },
      { value: "mokattam", label: "المقطم" }
    ]
  },
  {
    value: "giza",
    label: "الجيزة",
    cities: [
      { value: "giza_city", label: "مدينة الجيزة" },
      { value: "6th_october", label: "مدينة 6 أكتوبر" },
      { value: "sheikh_zayed", label: "الشيخ زايد" },
      { value: "haram", label: "الهرم" },
      { value: "faisal", label: "فيصل" },
      { value: "dokki", label: "الدقي" },
      { value: "mohandessin", label: "المهندسين" },
      { value: "agouza", label: "العجوزة" },
      { value: "imbaba", label: "إمبابة" },
      { value: "bulaq_dakrur", label: "بولاق الدكرور" },
      { value: "kit_kat", label: "كيت كات" },
      { value: "waraq", label: "الوراق" }
    ]
  },
  {
    value: "alexandria",
    label: "الإسكندرية",
    cities: [
      { value: "alex_center", label: "وسط الإسكندرية" },
      { value: "montaza", label: "المنتزة" },
      { value: "king_mariout", label: "برج العرب" },
      { value: "borg_el_arab", label: "برج العرب الجديدة" },
      { value: "amreya", label: "العامرية" },
      { value: "dekheila", label: "الدخيلة" },
      { value: "max", label: "العجمي" },
      { value: "miami", label: "ميامي" },
      { value: "sidi_gaber", label: "سيدي جابر" },
      { value: "sporting", label: "سبورتنج" },
      { value: "san_stefano", label: "سان ستيفانو" },
      { value: "stanley", label: "ستانلي" }
    ]
  },
  {
    value: "qalyubia",
    label: "القليوبية",
    cities: [
      { value: "benha", label: "بنها" },
      { value: "shibin_el_kanater", label: "شبين القناطر" },
      { value: "qaha", label: "قها" },
      { value: "kafr_shukr", label: "كفر شكر" },
      { value: "tukh", label: "طوخ" },
      { value: "khanka", label: "الخانكة" },
      { value: "khosous", label: "الخصوص" },
      { value: "obour_city", label: "مدينة العبور" },
      { value: "shoubra_el_kheima", label: "شبرا الخيمة" },
      { value: "qalyub", label: "قليوب" }
    ]
  },
  {
    value: "dakahlia",
    label: "الدقهلية",
    cities: [
      { value: "mansoura", label: "المنصورة" },
      { value: "talk", label: "طلخا" },
      { value: "mit_ghamr", label: "ميت غمر" },
      { value: "dekernes", label: "دكرنس" },
      { value: "aga", label: "أجا" },
      { value: "manzala", label: "المنزلة" },
      { value: "sherbin", label: "شربين" },
      { value: "belqas", label: "بلقاس" },
      { value: "sinbillawein", label: "السنبلاوين" },
      { value: "nabaroh", label: "نبروة" },
      { value: "temi_el_amdid", label: "تمي الأمديد" }
    ]
  },
  {
    value: "gharbia",
    label: "الغربية",
    cities: [
      { value: "tanta", label: "طنطا" },
      { value: "mahalla", label: "المحلة الكبرى" },
      { value: "kafr_el_zayat", label: "كفر الزيات" },
      { value: "zifta", label: "زفتى" },
      { value: "samanoud", label: "السنطة" },
      { value: "qutur", label: "قطور" },
      { value: "bassyoun", label: "بسيون" },
      { value: "santa", label: "السنطة" },
      { value: "kotoor", label: "قطور" }
    ]
  },
  {
    value: "sharqia",
    label: "الشرقية",
    cities: [
      { value: "zagazig", label: "الزقازيق" },
      { value: "10th_ramadan", label: "العاشر من رمضان" },
      { value: "bilbeis", label: "بلبيس" },
      { value: "minya_qamh", label: "منيا القمح" },
      { value: "abu_kebir", label: "أبو كبير" },
      { value: "faqous", label: "فاقوس" },
      { value: "kafr_saqr", label: "كفر صقر" },
      { value: "awlad_saqr", label: "أولاد صقر" },
      { value: "deirb_negm", label: "ديرب نجم" },
      { value: "hehya", label: "ههيا" },
      { value: "mashtool_souq", label: "مشتول السوق" },
      { value: "san_el_hagar", label: "صان الحجر" }
    ]
  },
  {
    value: "beheira",
    label: "البحيرة",
    cities: [
      { value: "damanhour", label: "دمنهور" },
      { value: "kafr_el_dawar", label: "كفر الدوار" },
      { value: "rashid", label: "رشيد" },
      { value: "edko", label: "إدكو" },
      { value: "abu_hummus", label: "أبو حمص" },
      { value: "delengat", label: "الدلنجات" },
      { value: "mahmoudiya", label: "المحمودية" },
      { value: "rahmaniya", label: "الرحمانية" },
      { value: "kom_hamada", label: "كوم حمادة" },
      { value: "itay_el_baroud", label: "إيتاي البارود" }
    ]
  },
  {
    value: "kafr_sheikh",
    label: "كفر الشيخ",
    cities: [
      { value: "kafr_sheikh_city", label: "كفر الشيخ" },
      { value: "desouk", label: "دسوق" },
      { value: "fouh", label: "فوه" },
      { value: "metoubes", label: "مطوبس" },
      { value: "qallin", label: "قلين" },
      { value: "sidi_salem", label: "سيدي سالم" },
      { value: "hamoul", label: "الحامول" },
      { value: "baltim", label: "بلطيم" },
      { value: "burg_el_burulus", label: "برج البرلس" },
      { value: "riyadh_kafr_sheikh", label: "الرياض" },
      { value: "biyala", label: "بيلا" }
    ]
  },
  {
    value: "monufia",
    label: "المنوفية",
    cities: [
      { value: "shibin_el_kom", label: "شبين الكوم" },
      { value: "menouf", label: "منوف" },
      { value: "sadat_city", label: "مدينة السادات" },
      { value: "ashmoun", label: "أشمون" },
      { value: "bagour", label: "باجور" },
      { value: "berket_el_sabaa", label: "بركة السبع" },
      { value: "tala", label: "تلا" },
      { value: "el_shouhada", label: "الشهداء" },
      { value: "quesna", label: "قويسنا" }
    ]
  },
  {
    value: "damietta",
    label: "دمياط",
    cities: [
      { value: "damietta_city", label: "دمياط" },
      { value: "new_damietta", label: "دمياط الجديدة" },
      { value: "ras_el_bar", label: "رأس البر" },
      { value: "faraskour", label: "فارسكور" },
      { value: "zarqa", label: "الزرقا" },
      { value: "kafr_el_batikh", label: "كفر البطيخ" }
    ]
  },
  {
    value: "port_said",
    label: "بورسعيد",
    cities: [
      { value: "port_said_city", label: "بورسعيد" },
      { value: "port_fouad", label: "بور فؤاد" },
      { value: "arab_district", label: "الحي العربي" },
      { value: "manakh_district", label: "حي المناخ" },
      { value: "zohour_district", label: "حي الزهور" },
      { value: "sharq_district", label: "حي الشرق" }
    ]
  },
  {
    value: "ismailia",
    label: "الإسماعيلية",
    cities: [
      { value: "ismailia_city", label: "الإسماعيلية" },
      { value: "el_tal_el_kabir", label: "التل الكبير" },
      { value: "qantara_sharq", label: "القنطرة شرق" },
      { value: "qantara_gharb", label: "القنطرة غرب" },
      { value: "fayed", label: "فايد" },
      { value: "abu_swier", label: "أبو صوير" },
      { value: "kasaseen", label: "القصاصين" }
    ]
  },
  {
    value: "suez",
    label: "السويس",
    cities: [
      { value: "suez_city", label: "السويس" },
      { value: "faisal_district", label: "حي الفيصل" },
      { value: "arbaeen_district", label: "حي الأربعين" },
      { value: "ganayen_district", label: "حي الجناين" },
      { value: "ataqah", label: "العتقة" }
    ]
  },
  {
    value: "north_sinai",
    label: "شمال سيناء",
    cities: [
      { value: "arish", label: "العريش" },
      { value: "rafah", label: "رفح" },
      { value: "sheikh_zuweid", label: "الشيخ زويد" },
      { value: "bir_el_abd", label: "بئر العبد" },
      { value: "hasana", label: "حسنة" },
      { value: "nakhl", label: "نخل" }
    ]
  },
  {
    value: "south_sinai",
    label: "جنوب سيناء",
    cities: [
      { value: "tor", label: "الطور" },
      { value: "sharm_el_sheikh", label: "شرم الشيخ" },
      { value: "dahab", label: "دهب" },
      { value: "nuweiba", label: "نويبع" },
      { value: "taba", label: "طابا" },
      { value: "saint_catherine", label: "سانت كاترين" },
      { value: "ras_sedr", label: "رأس سدر" },
      { value: "abu_zenima", label: "أبو زنيمة" }
    ]
  },
  {
    value: "red_sea",
    label: "البحر الأحمر",
    cities: [
      { value: "hurghada", label: "الغردقة" },
      { value: "safaga", label: "سفاجا" },
      { value: "qusair", label: "القصير" },
      { value: "marsa_alam", label: "مرسى علم" },
      { value: "shalatin", label: "شلاتين" },
      { value: "halaib", label: "حلايب" },
      { value: "berenice", label: "برنيس" }
    ]
  },
  {
    value: "beni_suef",
    label: "بني سويف",
    cities: [
      { value: "beni_suef_city", label: "بني سويف" },
      { value: "new_beni_suef", label: "بني سويف الجديدة" },
      { value: "wasta", label: "الواسطى" },
      { value: "nasser", label: "ناصر" },
      { value: "ihnasya", label: "إهناسيا" },
      { value: "baba", label: "ببا" },
      { value: "fashn", label: "الفشن" },
      { value: "sumusta", label: "سمسطا" }
    ]
  },
  {
    value: "fayoum",
    label: "الفيوم",
    cities: [
      { value: "fayoum_city", label: "الفيوم" },
      { value: "tamiya", label: "طامية" },
      { value: "snouris", label: "سنورس" },
      { value: "itsa", label: "إطسا" },
      { value: "youssef_seddik", label: "يوسف الصديق" },
      { value: "abshoway", label: "أبشواي" }
    ]
  },
  {
    value: "minya",
    label: "المنيا",
    cities: [
      { value: "minya_city", label: "المنيا" },
      { value: "new_minya", label: "المنيا الجديدة" },
      { value: "samalout", label: "سمالوط" },
      { value: "matay", label: "مطاي" },
      { value: "beni_mazar", label: "بني مزار" },
      { value: "maghagha", label: "مغاغة" },
      { value: "abu_qurqas", label: "أبو قرقاص" },
      { value: "derr_mawas", label: "دير مواس" },
      { value: "malawi", label: "ملوي" },
      { value: "deir_mawas", label: "دير مواس" },
      { value: "adwa", label: "العدوة" }
    ]
  },
  {
    value: "asyut",
    label: "أسيوط",
    cities: [
      { value: "asyut_city", label: "أسيوط" },
      { value: "new_asyut", label: "أسيوط الجديدة" },
      { value: "dayrout", label: "ديروط" },
      { value: "qusiya", label: "القوصية" },
      { value: "manfalout", label: "منفلوط" },
      { value: "abu_tig", label: "أبوتيج" },
      { value: "sahel_selim", label: "ساحل سليم" },
      { value: "el_badari", label: "البداري" },
      { value: "el_ghanaim", label: "الغنايم" },
      { value: "sidfa", label: "صدفا" },
      { value: "el_fateh", label: "الفتح" },
      { value: "abnub", label: "أبنوب" },
      { value: "el_qusiya", label: "القوصية" }
    ]
  },
  {
    value: "sohag",
    label: "سوهاج",
    cities: [
      { value: "sohag_city", label: "سوهاج" },
      { value: "new_sohag", label: "سوهاج الجديدة" },
      { value: "akhmeem", label: "أخميم" },
      { value: "el_balyana", label: "البلينا" },
      { value: "el_maragha", label: "المراغة" },
      { value: "tahta", label: "طهطا" },
      { value: "girga", label: "جرجا" },
      { value: "juhayna", label: "جهينة" },
      { value: "dar_el_salam", label: "دار السلام" },
      { value: "sakolta", label: "ساقلته" },
      { value: "el_usairat", label: "العسيرات" },
      { value: "el_monsha", label: "المنشأة" },
      { value: "tema", label: "طما" }
    ]
  },
  {
    value: "qena",
    label: "قنا",
    cities: [
      { value: "qena_city", label: "قنا" },
      { value: "new_qena", label: "قنا الجديدة" },
      { value: "abu_tesht", label: "أبو تشت" },
      { value: "farshout", label: "فرشوط" },
      { value: "nag_hammadi", label: "نجع حمادي" },
      { value: "dishna", label: "دشنا" },
      { value: "qous", label: "قوص" },
      { value: "naqada", label: "نقادة" },
      { value: "el_waqf", label: "الوقف" },
      { value: "qift", label: "قفط" },
      { value: "el_balyana", label: "البلينا" }
    ]
  },
  {
    value: "luxor",
    label: "الأقصر",
    cities: [
      { value: "luxor_city", label: "الأقصر" },
      { value: "new_luxor", label: "الأقصر الجديدة" },
      { value: "esna", label: "إسنا" },
      { value: "armant", label: "أرمنت" },
      { value: "el_tod", label: "الطود" },
      { value: "el_qurna", label: "القرنة" },
      { value: "el_zeenya", label: "الزينية" }
    ]
  },
  {
    value: "aswan",
    label: "أسوان",
    cities: [
      { value: "aswan_city", label: "أسوان" },
      { value: "new_aswan", label: "أسوان الجديدة" },
      { value: "edfu", label: "إدفو" },
      { value: "kom_ombo", label: "كوم أمبو" },
      { value: "nasr_el_nuba", label: "نصر النوبة" },
      { value: "abu_simbel", label: "أبو سمبل" },
      { value: "daraw", label: "دراو" },
      { value: "el_sahel", label: "الساحل" },
      { value: "el_redisiya", label: "الرديسية" }
    ]
  },
  {
    value: "new_valley",
    label: "الوادي الجديد",
    cities: [
      { value: "kharga", label: "الخارجة" },
      { value: "new_kharga", label: "الخارجة الجديدة" },
      { value: "dakhla", label: "الداخلة" },
      { value: "mut", label: "موط" },
      { value: "farafra", label: "الفرافرة" },
      { value: "bahariya", label: "الواحات البحرية" },
      { value: "baris", label: "باريس" }
    ]
  },
  {
    value: "matrouh",
    label: "مطروح",
    cities: [
      { value: "marsa_matrouh", label: "مرسى مطروح" },
      { value: "new_alamein", label: "العلمين الجديدة" },
      { value: "alamein", label: "العلمين" },
      { value: "el_hamam", label: "الحمام" },
      { value: "dabaa", label: "الضبعة" },
      { value: "salloum", label: "السلوم" },
      { value: "siwa", label: "سيوة" },
      { value: "barani", label: "براني" }
    ]
  },
  {
    value: "overseas",
    label: "خارج مصر",
    cities: [
      { value: "saudi_arabia", label: "السعودية" },
      { value: "uae", label: "الإمارات" },
      { value: "kuwait", label: "الكويت" },
      { value: "qatar", label: "قطر" },
      { value: "bahrain", label: "البحرين" },
      { value: "oman", label: "عمان" },
      { value: "jordan", label: "الأردن" },
      { value: "lebanon", label: "لبنان" },
      { value: "syria", label: "سوريا" },
      { value: "iraq", label: "العراق" },
      { value: "libya", label: "ليبيا" },
      { value: "sudan", label: "السودان" },
      { value: "usa", label: "الولايات المتحدة" },
      { value: "canada", label: "كندا" },
      { value: "uk", label: "المملكة المتحدة" },
      { value: "germany", label: "ألمانيا" },
      { value: "france", label: "فرنسا" },
      { value: "italy", label: "إيطاليا" },
      { value: "spain", label: "إسبانيا" },
      { value: "australia", label: "أستراليا" },
      { value: "other", label: "أخرى" }
    ]
  }
];

// محافظات السعودية
const saudiRegions: Governorate[] = [
  {
    value: "riyadh",
    label: "الرياض",
    cities: [
      { value: "riyadh_city", label: "الرياض" },
      { value: "kharj", label: "الخرج" },
      { value: "dawadmi", label: "الدوادمي" },
      { value: "afif", label: "عفيف" },
      { value: "zulfi", label: "الزلفي" },
      { value: "majmaah", label: "المجمعة" },
      { value: "quwayiyah", label: "القويعية" },
      { value: "wadi_dawasir", label: "وادي الدواسر" }
    ]
  },
  {
    value: "makkah",
    label: "مكة المكرمة",
    cities: [
      { value: "makkah_city", label: "مكة المكرمة" },
      { value: "jeddah", label: "جدة" },
      { value: "taif", label: "الطائف" },
      { value: "rabigh", label: "رابغ" },
      { value: "khulais", label: "خليص" },
      { value: "qunfudhah", label: "القنفذة" },
      { value: "laith", label: "الليث" },
      { value: "jumum", label: "الجموم" }
    ]
  },
  {
    value: "madinah",
    label: "المدينة المنورة",
    cities: [
      { value: "madinah_city", label: "المدينة المنورة" },
      { value: "yanbu", label: "ينبع" },
      { value: "badr", label: "بدر" },
      { value: "khaybar", label: "خيبر" },
      { value: "ula", label: "العلا" },
      { value: "mahd_dhahab", label: "مهد الذهب" }
    ]
  },
  {
    value: "eastern",
    label: "الشرقية",
    cities: [
      { value: "dammam", label: "الدمام" },
      { value: "khobar", label: "الخبر" },
      { value: "dhahran", label: "الظهران" },
      { value: "jubail", label: "الجبيل" },
      { value: "qatif", label: "القطيف" },
      { value: "hafr_batin", label: "حفر الباطن" },
      { value: "khafji", label: "الخفجي" },
      { value: "ras_tanura", label: "رأس تنورة" }
    ]
  }
];

// محافظات الإمارات
const uaeEmirates: Governorate[] = [
  {
    value: "abu_dhabi",
    label: "أبوظبي",
    cities: [
      { value: "abu_dhabi_city", label: "أبوظبي" },
      { value: "al_ain", label: "العين" },
      { value: "zayed_city", label: "مدينة زايد" },
      { value: "liwa", label: "ليوا" },
      { value: "madinat_zayed", label: "مدينة زايد" }
    ]
  },
  {
    value: "dubai",
    label: "دبي",
    cities: [
      { value: "dubai_city", label: "دبي" },
      { value: "hatta", label: "حتا" }
    ]
  },
  {
    value: "sharjah",
    label: "الشارقة",
    cities: [
      { value: "sharjah_city", label: "الشارقة" },
      { value: "khor_fakkan", label: "خورفكان" },
      { value: "kalba", label: "كلباء" },
      { value: "dibba_sharjah", label: "دبا الشارقة" }
    ]
  },
  {
    value: "ajman",
    label: "عجمان",
    cities: [
      { value: "ajman_city", label: "عجمان" },
      { value: "masfout", label: "مصفوت" }
    ]
  },
  {
    value: "rak",
    label: "رأس الخيمة",
    cities: [
      { value: "rak_city", label: "رأس الخيمة" },
      { value: "dibba_rak", label: "دبا رأس الخيمة" }
    ]
  },
  {
    value: "fujairah",
    label: "الفجيرة",
    cities: [
      { value: "fujairah_city", label: "الفجيرة" },
      { value: "dibba_fujairah", label: "دبا الفجيرة" }
    ]
  },
  {
    value: "umm_quwain",
    label: "أم القيوين",
    cities: [
      { value: "umm_quwain_city", label: "أم القيوين" }
    ]
  }
];

// قائمة الدول مع بياناتها
export const countriesWithData: Country[] = [
  {
    value: "EG",
    label: "مصر",
    governorates: egyptGovernoratesAndCities
  },
  {
    value: "SA",
    label: "السعودية",
    governorates: saudiRegions
  },
  {
    value: "AE",
    label: "الإمارات العربية المتحدة",
    governorates: uaeEmirates
  },
  {
    value: "KW",
    label: "الكويت",
    governorates: [
      {
        value: "capital",
        label: "العاصمة",
        cities: [
          { value: "kuwait_city", label: "مدينة الكويت" },
          { value: "shuwaikh", label: "الشويخ" },
          { value: "dasman", label: "دسمان" },
          { value: "sharq", label: "شرق" },
          { value: "qibla", label: "قبلة" },
          { value: "mirqab", label: "مرقاب" }
        ]
      },
      {
        value: "hawalli",
        label: "حولي",
        cities: [
          { value: "hawalli_city", label: "حولي" },
          { value: "salmiya", label: "السالمية" },
          { value: "rumaithiya", label: "الرميثية" },
          { value: "bayan", label: "بيان" },
          { value: "mishref", label: "مشرف" },
          { value: "salwa", label: "سلوى" }
        ]
      },
      {
        value: "farwaniya",
        label: "الفروانية",
        cities: [
          { value: "farwaniya_city", label: "الفروانية" },
          { value: "jleeb_shuyoukh", label: "جليب الشيوخ" },
          { value: "khaitan", label: "خيطان" },
          { value: "abraq_khaitan", label: "أبرق خيطان" },
          { value: "andalous", label: "الأندلس" }
        ]
      }
    ]
  },
  {
    value: "QA",
    label: "قطر",
    governorates: [
      {
        value: "doha",
        label: "الدوحة",
        cities: [
          { value: "doha_city", label: "الدوحة" },
          { value: "west_bay", label: "الخليج الغربي" },
          { value: "old_doha", label: "الدوحة القديمة" },
          { value: "new_doha", label: "الدوحة الجديدة" }
        ]
      },
      {
        value: "rayyan",
        label: "الريان",
        cities: [
          { value: "rayyan_city", label: "الريان" },
          { value: "abu_hamour", label: "أبو هامور" },
          { value: "gharrafat_rayyan", label: "غرافة الريان" },
          { value: "muaither", label: "معيذر" }
        ]
      },
      {
        value: "wakra",
        label: "الوكرة",
        cities: [
          { value: "wakra_city", label: "الوكرة" },
          { value: "mesaieed", label: "مسيعيد" },
          { value: "al_wukair", label: "الوكير" }
        ]
      }
    ]
  },
  {
    value: "BH",
    label: "البحرين",
    governorates: [
      {
        value: "capital",
        label: "العاصمة",
        cities: [
          { value: "manama", label: "المنامة" },
          { value: "hoora", label: "الحورة" },
          { value: "gudaibiya", label: "القضيبية" },
          { value: "adliya", label: "العدلية" }
        ]
      },
      {
        value: "muharraq",
        label: "المحرق",
        cities: [
          { value: "muharraq_city", label: "المحرق" },
          { value: "busaiteen", label: "البسيتين" },
          { value: "hidd", label: "الحد" }
        ]
      }
    ]
  },
  { value: "JO", label: "الأردن" },
  { value: "LB", label: "لبنان" },
  { value: "SY", label: "سوريا" },
  { value: "IQ", label: "العراق" },
  { value: "OM", label: "عمان" },
  { value: "YE", label: "اليمن" },
  { value: "PS", label: "فلسطين" },
  { value: "LY", label: "ليبيا" },
  { value: "TN", label: "تونس" },
  { value: "DZ", label: "الجزائر" },
  { value: "MA", label: "المغرب" },
  { value: "SD", label: "السودان" },
  // يمكن إضافة باقي الدول هنا
  { value: "US", label: "الولايات المتحدة" },
  { value: "GB", label: "المملكة المتحدة" },
  { value: "FR", label: "فرنسا" },
  { value: "DE", label: "ألمانيا" },
  { value: "IT", label: "إيطاليا" },
  { value: "ES", label: "إسبانيا" },
  { value: "CA", label: "كندا" },
  { value: "AU", label: "أستراليا" }
];

// دالة للحصول على المحافظات حسب الدولة
export const getGovernoratesByCountry = (countryValue: string): Governorate[] => {
  const country = countriesWithData.find(c => c.value === countryValue);
  return country?.governorates || [];
};

// دالة للحصول على المدن حسب المحافظة
export const getCitiesByGovernorate = (countryValue: string, governorateValue: string): City[] => {
  const governorates = getGovernoratesByCountry(countryValue);
  const governorate = governorates.find(g => g.value === governorateValue);
  return governorate?.cities || [];
};
