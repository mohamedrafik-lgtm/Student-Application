import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedLocations() {
  console.log('🌍 بدء نقل بيانات المواقع الجغرافية الكاملة...');
  
  // مصر - جميع المحافظات
  const egypt = await prisma.country.upsert({
    where: { code: 'EG' },
    update: {},
    create: { code: 'EG', nameAr: 'مصر', nameEn: 'Egypt', isActive: true, order: 1 },
  });

  const egyptGovernorates = [
    { code: 'cairo', nameAr: 'القاهرة', cities: ['nasr_city|مدينة نصر', 'heliopolis|مصر الجديدة', 'maadi|المعادي', 'zamalek|الزمالك', 'downtown|وسط البلد', 'shubra|شبرا', 'abbasia|العباسية', 'helwan|حلوان', 'ain_shams|عين شمس', 'manshiet_nasser|منشية ناصر', 'new_cairo|القاهرة الجديدة', 'old_cairo|مصر القديمة', 'mokattam|المقطم'] },
    { code: 'giza', nameAr: 'الجيزة', cities: ['giza_city|مدينة الجيزة', '6th_october|مدينة 6 أكتوبر', 'sheikh_zayed|الشيخ زايد', 'haram|الهرم', 'faisal|فيصل', 'dokki|الدقي', 'mohandessin|المهندسين', 'agouza|العجوزة', 'imbaba|إمبابة', 'bulaq_dakrur|بولاق الدكرور', 'kit_kat|كيت كات', 'waraq|الوراق'] },
    { code: 'alexandria', nameAr: 'الإسكندرية', cities: ['alex_center|وسط الإسكندرية', 'montaza|المنتزة', 'king_mariout|برج العرب', 'borg_el_arab|برج العرب الجديدة', 'amreya|العامرية', 'dekheila|الدخيلة', 'max|العجمي', 'miami|ميامي', 'sidi_gaber|سيدي جابر', 'sporting|سبورتنج', 'san_stefano|سان ستيفانو', 'stanley|ستانلي'] },
    { code: 'qalyubia', nameAr: 'القليوبية', cities: ['benha|بنها', 'shibin_el_kanater|شبين القناطر', 'qaha|قها', 'kafr_shukr|كفر شكر', 'tukh|طوخ', 'khanka|الخانكة', 'khosous|الخصوص', 'obour_city|مدينة العبور', 'shoubra_el_kheima|شبرا الخيمة', 'qalyub|قليوب'] },
    { code: 'dakahlia', nameAr: 'الدقهلية', cities: ['mansoura|المنصورة', 'talk|طلخا', 'mit_ghamr|ميت غمر', 'dekernes|دكرنس', 'aga|أجا', 'manzala|المنزلة', 'sherbin|شربين', 'belqas|بلقاس', 'sinbillawein|السنبلاوين', 'nabaroh|نبروة', 'temi_el_amdid|تمي الأمديد'] },
    { code: 'gharbia', nameAr: 'الغربية', cities: ['tanta|طنطا', 'mahalla|المحلة الكبرى', 'kafr_el_zayat|كفر الزيات', 'zifta|زفتى', 'samanoud|السنطة', 'qutur|قطور', 'bassyoun|بسيون'] },
    { code: 'sharqia', nameAr: 'الشرقية', cities: ['zagazig|الزقازيق', '10th_ramadan|العاشر من رمضان', 'bilbeis|بلبيس', 'minya_qamh|منيا القمح', 'abu_kebir|أبو كبير', 'faqous|فاقوس', 'kafr_saqr|كفر صقر', 'awlad_saqr|أولاد صقر', 'deirb_negm|ديرب نجم', 'hehya|ههيا', 'mashtool_souq|مشتول السوق', 'san_el_hagar|صان الحجر'] },
    { code: 'beheira', nameAr: 'البحيرة', cities: ['damanhour|دمنهور', 'kafr_el_dawar|كفر الدوار', 'rashid|رشيد', 'edko|إدكو', 'abu_hummus|أبو حمص', 'delengat|الدلنجات', 'mahmoudiya|المحمودية', 'rahmaniya|الرحمانية', 'kom_hamada|كوم حمادة', 'itay_el_baroud|إيتاي البارود'] },
    { code: 'kafr_sheikh', nameAr: 'كفر الشيخ', cities: ['kafr_sheikh_city|كفر الشيخ', 'desouk|دسوق', 'fouh|فوه', 'metoubes|مطوبس', 'qallin|قلين', 'sidi_salem|سيدي سالم', 'hamoul|الحامول', 'baltim|بلطيم', 'burg_el_burulus|برج البرلس', 'riyadh_kafr_sheikh|الرياض', 'biyala|بيلا'] },
    { code: 'monufia', nameAr: 'المنوفية', cities: ['shibin_el_kom|شبين الكوم', 'menouf|منوف', 'sadat_city|مدينة السادات', 'ashmoun|أشمون', 'bagour|باجور', 'berket_el_sabaa|بركة السبع', 'tala|تلا', 'el_shouhada|الشهداء', 'quesna|قويسنا'] },
    { code: 'damietta', nameAr: 'دمياط', cities: ['damietta_city|دمياط', 'new_damietta|دمياط الجديدة', 'ras_el_bar|رأس البر', 'faraskour|فارسكور', 'zarqa|الزرقا', 'kafr_el_batikh|كفر البطيخ'] },
    { code: 'port_said', nameAr: 'بورسعيد', cities: ['port_said_city|بورسعيد', 'port_fouad|بور فؤاد', 'arab_district|الحي العربي', 'manakh_district|حي المناخ', 'zohour_district|حي الزهور', 'sharq_district|حي الشرق'] },
    { code: 'ismailia', nameAr: 'الإسماعيلية', cities: ['ismailia_city|الإسماعيلية', 'el_tal_el_kabir|التل الكبير', 'qantara_sharq|القنطرة شرق', 'qantara_gharb|القنطرة غرب', 'fayed|فايد', 'abu_swier|أبو صوير', 'kasaseen|القصاصين'] },
    { code: 'suez', nameAr: 'السويس', cities: ['suez_city|السويس', 'faisal_district|حي الفيصل', 'arbaeen_district|حي الأربعين', 'ganayen_district|حي الجناين', 'ataqah|العتقة'] },
    { code: 'north_sinai', nameAr: 'شمال سيناء', cities: ['arish|العريش', 'rafah|رفح', 'sheikh_zuweid|الشيخ زويد', 'bir_el_abd|بئر العبد', 'hasana|حسنة', 'nakhl|نخل'] },
    { code: 'south_sinai', nameAr: 'جنوب سيناء', cities: ['tor|الطور', 'sharm_el_sheikh|شرم الشيخ', 'dahab|دهب', 'nuweiba|نويبع', 'taba|طابا', 'saint_catherine|سانت كاترين', 'ras_sedr|رأس سدر', 'abu_zenima|أبو زنيمة'] },
    { code: 'red_sea', nameAr: 'البحر الأحمر', cities: ['hurghada|الغردقة', 'safaga|سفاجا', 'qusair|القصير', 'marsa_alam|مرسى علم', 'shalatin|شلاتين', 'halaib|حلايب', 'berenice|برنيس'] },
    { code: 'beni_suef', nameAr: 'بني سويف', cities: ['beni_suef_city|بني سويف', 'new_beni_suef|بني سويف الجديدة', 'wasta|الواسطى', 'nasser|ناصر', 'ihnasya|إهناسيا', 'baba|ببا', 'fashn|الفشن', 'sumusta|سمسطا'] },
    { code: 'fayoum', nameAr: 'الفيوم', cities: ['fayoum_city|الفيوم', 'tamiya|طامية', 'snouris|سنورس', 'itsa|إطسا', 'youssef_seddik|يوسف الصديق', 'abshoway|أبشواي'] },
    { code: 'minya', nameAr: 'المنيا', cities: ['minya_city|المنيا', 'new_minya|المنيا الجديدة', 'samalout|سمالوط', 'matay|مطاي', 'beni_mazar|بني مزار', 'maghagha|مغاغة', 'abu_qurqas|أبو قرقاص', 'derr_mawas|دير مواس', 'malawi|ملوي', 'adwa|العدوة'] },
    { code: 'asyut', nameAr: 'أسيوط', cities: ['asyut_city|أسيوط', 'new_asyut|أسيوط الجديدة', 'dayrout|ديروط', 'qusiya|القوصية', 'manfalout|منفلوط', 'abu_tig|أبوتيج', 'sahel_selim|ساحل سليم', 'el_badari|البداري', 'el_ghanaim|الغنايم', 'sidfa|صدفا', 'el_fateh|الفتح', 'abnub|أبنوب'] },
    { code: 'sohag', nameAr: 'سوهاج', cities: ['sohag_city|سوهاج', 'new_sohag|سوهاج الجديدة', 'akhmeem|أخميم', 'el_balyana|البلينا', 'el_maragha|المراغة', 'tahta|طهطا', 'girga|جرجا', 'juhayna|جهينة', 'dar_el_salam|دار السلام', 'sakolta|ساقلته', 'el_usairat|العسيرات', 'el_monsha|المنشأة', 'tema|طما'] },
    { code: 'qena', nameAr: 'قنا', cities: ['qena_city|قنا', 'new_qena|قنا الجديدة', 'abu_tesht|أبو تشت', 'farshout|فرشوط', 'nag_hammadi|نجع حمادي', 'dishna|دشنا', 'qous|قوص', 'naqada|نقادة', 'el_waqf|الوقف', 'qift|قفط'] },
    { code: 'luxor', nameAr: 'الأقصر', cities: ['luxor_city|الأقصر', 'new_luxor|الأقصر الجديدة', 'esna|إسنا', 'armant|أرمنت', 'el_tod|الطود', 'el_qurna|القرنة', 'el_zeenya|الزينية'] },
    { code: 'aswan', nameAr: 'أسوان', cities: ['aswan_city|أسوان', 'new_aswan|أسوان الجديدة', 'edfu|إدفو', 'kom_ombo|كوم أمبو', 'nasr_el_nuba|نصر النوبة', 'abu_simbel|أبو سمبل', 'daraw|دراو', 'el_sahel|الساحل', 'el_redisiya|الرديسية'] },
    { code: 'new_valley', nameAr: 'الوادي الجديد', cities: ['kharga|الخارجة', 'new_kharga|الخارجة الجديدة', 'dakhla|الداخلة', 'mut|موط', 'farafra|الفرافرة', 'bahariya|الواحات البحرية', 'baris|باريس'] },
    { code: 'matrouh', nameAr: 'مطروح', cities: ['marsa_matrouh|مرسى مطروح', 'new_alamein|العلمين الجديدة', 'alamein|العلمين', 'el_hamam|الحمام', 'dabaa|الضبعة', 'salloum|السلوم', 'siwa|سيوة', 'barani|براني'] },
    { code: 'overseas', nameAr: 'خارج مصر', cities: ['saudi_arabia|السعودية', 'uae|الإمارات', 'kuwait|الكويت', 'qatar|قطر', 'bahrain|البحرين', 'oman|عمان', 'jordan|الأردن', 'lebanon|لبنان', 'syria|سوريا', 'iraq|العراق', 'libya|ليبيا', 'sudan|السودان', 'usa|الولايات المتحدة', 'canada|كندا', 'uk|المملكة المتحدة', 'germany|ألمانيا', 'france|فرنسا', 'italy|إيطاليا', 'spain|إسبانيا', 'australia|أستراليا', 'other|أخرى'] },
  ];

  for (const govData of egyptGovernorates) {
    const gov = await prisma.governorate.upsert({
      where: { countryId_code: { countryId: egypt.id, code: govData.code } },
      update: {},
      create: { countryId: egypt.id, code: govData.code, nameAr: govData.nameAr, isActive: true, order: 0 },
    });
    
    for (const cityStr of govData.cities) {
      const [code, nameAr] = cityStr.split('|');
      await prisma.city.upsert({
        where: { governorateId_code: { governorateId: gov.id, code } },
        update: {},
        create: { governorateId: gov.id, code, nameAr, isActive: true, order: 0 },
      });
    }
  }

  // السعودية
  const saudi = await prisma.country.upsert({
    where: { code: 'SA' },
    update: {},
    create: { code: 'SA', nameAr: 'السعودية', nameEn: 'Saudi Arabia', isActive: true, order: 2 },
  });

  const saudiRegions = [
    { code: 'riyadh', nameAr: 'الرياض', cities: ['riyadh_city|الرياض', 'kharj|الخرج', 'dawadmi|الدوادمي', 'afif|عفيف', 'zulfi|الزلفي', 'majmaah|المجمعة', 'quwayiyah|القويعية', 'wadi_dawasir|وادي الدواسر'] },
    { code: 'makkah', nameAr: 'مكة المكرمة', cities: ['makkah_city|مكة المكرمة', 'jeddah|جدة', 'taif|الطائف', 'rabigh|رابغ', 'khulais|خليص', 'qunfudhah|القنفذة', 'laith|الليث', 'jumum|الجموم'] },
    { code: 'madinah', nameAr: 'المدينة المنورة', cities: ['madinah_city|المدينة المنورة', 'yanbu|ينبع', 'badr|بدر', 'khaybar|خيبر', 'ula|العلا', 'mahd_dhahab|مهد الذهب'] },
    { code: 'eastern', nameAr: 'الشرقية', cities: ['dammam|الدمام', 'khobar|الخبر', 'dhahran|الظهران', 'jubail|الجبيل', 'qatif|القطيف', 'hafr_batin|حفر الباطن', 'khafji|الخفجي', 'ras_tanura|رأس تنورة'] },
  ];

  for (const regData of saudiRegions) {
    const reg = await prisma.governorate.upsert({
      where: { countryId_code: { countryId: saudi.id, code: regData.code } },
      update: {},
      create: { countryId: saudi.id, code: regData.code, nameAr: regData.nameAr, isActive: true, order: 0 },
    });
    
    for (const cityStr of regData.cities) {
      const [code, nameAr] = cityStr.split('|');
      await prisma.city.upsert({
        where: { governorateId_code: { governorateId: reg.id, code } },
        update: {},
        create: { governorateId: reg.id, code, nameAr, isActive: true, order: 0 },
      });
    }
  }

  // الإمارات
  const uae = await prisma.country.upsert({
    where: { code: 'AE' },
    update: {},
    create: { code: 'AE', nameAr: 'الإمارات العربية المتحدة', nameEn: 'UAE', isActive: true, order: 3 },
  });

  const uaeEmirates = [
    { code: 'abu_dhabi', nameAr: 'أبوظبي', cities: ['abu_dhabi_city|أبوظبي', 'al_ain|العين', 'zayed_city|مدينة زايد', 'liwa|ليوا'] },
    { code: 'dubai', nameAr: 'دبي', cities: ['dubai_city|دبي', 'hatta|حتا'] },
    { code: 'sharjah', nameAr: 'الشارقة', cities: ['sharjah_city|الشارقة', 'khor_fakkan|خورفكان', 'kalba|كلباء', 'dibba_sharjah|دبا الشارقة'] },
    { code: 'ajman', nameAr: 'عجمان', cities: ['ajman_city|عجمان', 'masfout|مصفوت'] },
    { code: 'rak', nameAr: 'رأس الخيمة', cities: ['rak_city|رأس الخيمة', 'dibba_rak|دبا رأس الخيمة'] },
    { code: 'fujairah', nameAr: 'الفجيرة', cities: ['fujairah_city|الفجيرة', 'dibba_fujairah|دبا الفجيرة'] },
    { code: 'umm_quwain', nameAr: 'أم القيوين', cities: ['umm_quwain_city|أم القيوين'] },
  ];

  for (const emData of uaeEmirates) {
    const em = await prisma.governorate.upsert({
      where: { countryId_code: { countryId: uae.id, code: emData.code } },
      update: {},
      create: { countryId: uae.id, code: emData.code, nameAr: emData.nameAr, isActive: true, order: 0 },
    });
    
    for (const cityStr of emData.cities) {
      const [code, nameAr] = cityStr.split('|');
      await prisma.city.upsert({
        where: { governorateId_code: { governorateId: em.id, code } },
        update: {},
        create: { governorateId: em.id, code, nameAr, isActive: true, order: 0 },
      });
    }
  }

  // الكويت
  const kuwait = await prisma.country.upsert({
    where: { code: 'KW' },
    update: {},
    create: { code: 'KW', nameAr: 'الكويت', nameEn: 'Kuwait', isActive: true, order: 4 },
  });

  const kuwaitGov = [
    { code: 'capital', nameAr: 'العاصمة', cities: ['kuwait_city|مدينة الكويت', 'shuwaikh|الشويخ', 'dasman|دسمان', 'sharq|شرق', 'qibla|قبلة', 'mirqab|مرقاب'] },
    { code: 'hawalli', nameAr: 'حولي', cities: ['hawalli_city|حولي', 'salmiya|السالمية', 'rumaithiya|الرميثية', 'bayan|بيان', 'mishref|مشرف', 'salwa|سلوى'] },
    { code: 'farwaniya', nameAr: 'الفروانية', cities: ['farwaniya_city|الفروانية', 'jleeb_shuyoukh|جليب الشيوخ', 'khaitan|خيطان', 'abraq_khaitan|أبرق خيطان', 'andalous|الأندلس'] },
  ];

  for (const govData of kuwaitGov) {
    const gov = await prisma.governorate.upsert({
      where: { countryId_code: { countryId: kuwait.id, code: govData.code } },
      update: {},
      create: { countryId: kuwait.id, code: govData.code, nameAr: govData.nameAr, isActive: true, order: 0 },
    });
    
    for (const cityStr of govData.cities) {
      const [code, nameAr] = cityStr.split('|');
      await prisma.city.upsert({
        where: { governorateId_code: { governorateId: gov.id, code } },
        update: {},
        create: { governorateId: gov.id, code, nameAr, isActive: true, order: 0 },
      });
    }
  }

  // قطر
  const qatar = await prisma.country.upsert({
    where: { code: 'QA' },
    update: {},
    create: { code: 'QA', nameAr: 'قطر', nameEn: 'Qatar', isActive: true, order: 5 },
  });

  const qatarGov = [
    { code: 'doha', nameAr: 'الدوحة', cities: ['doha_city|الدوحة', 'west_bay|الخليج الغربي', 'old_doha|الدوحة القديمة', 'new_doha|الدوحة الجديدة'] },
    { code: 'rayyan', nameAr: 'الريان', cities: ['rayyan_city|الريان', 'abu_hamour|أبو هامور', 'gharrafat_rayyan|غرافة الريان', 'muaither|معيذر'] },
    { code: 'wakra', nameAr: 'الوكرة', cities: ['wakra_city|الوكرة', 'mesaieed|مسيعيد', 'al_wukair|الوكير'] },
  ];

  for (const govData of qatarGov) {
    const gov = await prisma.governorate.upsert({
      where: { countryId_code: { countryId: qatar.id, code: govData.code } },
      update: {},
      create: { countryId: qatar.id, code: govData.code, nameAr: govData.nameAr, isActive: true, order: 0 },
    });
    
    for (const cityStr of govData.cities) {
      const [code, nameAr] = cityStr.split('|');
      await prisma.city.upsert({
        where: { governorateId_code: { governorateId: gov.id, code } },
        update: {},
        create: { governorateId: gov.id, code, nameAr, isActive: true, order: 0 },
      });
    }
  }

  // البحرين
  const bahrain = await prisma.country.upsert({
    where: { code: 'BH' },
    update: {},
    create: { code: 'BH', nameAr: 'البحرين', nameEn: 'Bahrain', isActive: true, order: 6 },
  });

  const bahrainGov = [
    { code: 'capital', nameAr: 'العاصمة', cities: ['manama|المنامة', 'hoora|الحورة', 'gudaibiya|القضيبية', 'adliya|العدلية'] },
    { code: 'muharraq', nameAr: 'المحرق', cities: ['muharraq_city|المحرق', 'busaiteen|البسيتين', 'hidd|الحد'] },
  ];

  for (const govData of bahrainGov) {
    const gov = await prisma.governorate.upsert({
      where: { countryId_code: { countryId: bahrain.id, code: govData.code } },
      update: {},
      create: { countryId: bahrain.id, code: govData.code, nameAr: govData.nameAr, isActive: true, order: 0 },
    });
    
    for (const cityStr of govData.cities) {
      const [code, nameAr] = cityStr.split('|');
      await prisma.city.upsert({
        where: { governorateId_code: { governorateId: gov.id, code } },
        update: {},
        create: { governorateId: gov.id, code, nameAr, isActive: true, order: 0 },
      });
    }
  }

  // باقي الدول (بدون محافظات)
  const otherCountries = [
    { code: 'JO', nameAr: 'الأردن', order: 7 },
    { code: 'LB', nameAr: 'لبنان', order: 8 },
    { code: 'SY', nameAr: 'سوريا', order: 9 },
    { code: 'IQ', nameAr: 'العراق', order: 10 },
    { code: 'OM', nameAr: 'عمان', order: 11 },
    { code: 'YE', nameAr: 'اليمن', order: 12 },
    { code: 'PS', nameAr: 'فلسطين', order: 13 },
    { code: 'LY', nameAr: 'ليبيا', order: 14 },
    { code: 'TN', nameAr: 'تونس', order: 15 },
    { code: 'DZ', nameAr: 'الجزائر', order: 16 },
    { code: 'MA', nameAr: 'المغرب', order: 17 },
    { code: 'SD', nameAr: 'السودان', order: 18 },
    { code: 'US', nameAr: 'الولايات المتحدة', order: 19 },
    { code: 'GB', nameAr: 'المملكة المتحدة', order: 20 },
    { code: 'FR', nameAr: 'فرنسا', order: 21 },
    { code: 'DE', nameAr: 'ألمانيا', order: 22 },
    { code: 'IT', nameAr: 'إيطاليا', order: 23 },
    { code: 'ES', nameAr: 'إسبانيا', order: 24 },
    { code: 'CA', nameAr: 'كندا', order: 25 },
    { code: 'AU', nameAr: 'أستراليا', order: 26 },
  ];

  for (const country of otherCountries) {
    await prisma.country.upsert({
      where: { code: country.code },
      update: {},
      create: { code: country.code, nameAr: country.nameAr, isActive: true, order: country.order },
    });
  }

  console.log('🎉 تم نقل جميع البيانات الجغرافية بنجاح!');
  console.log('   - مصر: 17 محافظة كاملة');
  console.log('   - السعودية: 4 مناطق');
  console.log('   - الإمارات: 7 إمارات');
  console.log('   - الكويت، قطر، البحرين');
  console.log('   - 14 دولة إضافية');
}

if (require.main === module) {
  seedLocations()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}