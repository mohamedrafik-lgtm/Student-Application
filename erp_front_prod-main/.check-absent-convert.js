const m = require('./node_modules/mysql2/promise');

const ATT = 'attendance';
const TRA = 'trainee';
const SES = 'scheduled_sessions';
const SLOT = 'schedule_slots';
const CONT = 'training_contents';

(async () => {
  const c = await m.createConnection({ host: '127.0.0.1', user: 'root', password: '', database: 'erp_system' });

  const q1 = async (label, sql) => {
    try {
      const [r] = await c.query(sql);
      console.log(`${label}: ${Object.values(r[0])[0]}`);
    } catch (e) {
      console.log(`${label}: ERR ${e.message}`);
    }
  };

  console.log('=== الأوسمة ===');
  await q1('إجمالي سجلات الحضور', `SELECT COUNT(*) FROM \`${ATT}\``);
  await q1('منشور تلقائياً', `SELECT COUNT(*) FROM \`${ATT}\` WHERE notes LIKE '%النشر تلقائياً%'`);
  await q1('  → تحويل من غياب', `SELECT COUNT(*) FROM \`${ATT}\` WHERE notes LIKE '%تحديث من غياب%'`);
  await q1('توحيد تلقائي', `SELECT COUNT(*) FROM \`${ATT}\` WHERE notes LIKE '%التوحيد تلقائياً%'`);
  await q1('عبر الكود', `SELECT COUNT(*) FROM \`${ATT}\` WHERE notes = 'تسجيل حضور عبر الكود'`);
  await q1('غياب تلقائي (cron)', `SELECT COUNT(*) FROM \`${ATT}\` WHERE notes LIKE '%تم التسجيل تلقائياً%'`);
  await q1('توزيع الحالات', `SELECT CONCAT(status, '=', COUNT(*)) FROM \`${ATT}\` GROUP BY status LIMIT 1`);
  const [st] = await c.query(`SELECT status, COUNT(*) c FROM \`${ATT}\` GROUP BY status`);
  console.log('الحالات:', st.map((r) => `${r.status}=${r.c}`).join(' , '));

  console.log('\n=== عيّنة تحويل غياب → حضور ===');
  const [conv] = await c.query(
    `SELECT a.id, a.status, a.notes, a.updatedAt, t.nameAr, s.date, ct.name AS contentName
       FROM \`${ATT}\` a
       JOIN \`${TRA}\` t ON t.id = a.traineeId
       JOIN \`${SES}\` s ON s.id = a.sessionId
       JOIN \`${SLOT}\` sl ON sl.id = s.scheduleSlotId
       JOIN \`${CONT}\` ct ON ct.id = sl.contentId
      WHERE a.notes LIKE '%تحديث من غياب%' OR a.notes LIKE '%تحديث غياب سابق%'
      ORDER BY a.updatedAt DESC LIMIT 10`,
  );
  if (!conv.length) console.log('(لا توجد سجلات تحويل غياب→حضور في قاعدة البيانات حالياً)');
  for (const r of conv) {
    console.log(`#${r.id} | ${r.nameAr} | ${new Date(r.date).toISOString().slice(0, 10)} | ${r.contentName} | ${r.status}`);
  }

  console.log('\n=== سجلات مُحدَّثة لاحقاً إلى حضور ===');
  await q1(
    'عددها',
    `SELECT COUNT(*) FROM \`${ATT}\` WHERE updatedBy IS NOT NULL AND status <> 'ABSENT'`,
  );
  await q1(
    'عدد سجلات الغياب التي عُدِّلت',
    `SELECT COUNT(*) FROM \`${ATT}\` WHERE updatedBy IS NOT NULL AND status = 'ABSENT'`,
  );

  console.log('\n=== محاضرات مصدرها النشر التلقائي فقط ===');
  await q1(
    'عددها',
    `SELECT COUNT(*) FROM \`${SES}\` s WHERE NOT EXISTS (
        SELECT 1 FROM \`${ATT}\` a WHERE a.sessionId = s.id
          AND a.notes NOT LIKE '%النشر تلقائياً%' AND a.notes NOT LIKE '%التوحيد تلقائياً%')`,
  );

  console.log('\n=== أنظمة حضور أخرى؟ ===');
  for (const t of ['trainee_sessions', 'training_content_attendance']) {
    await q1(`عدد صفوف ${t}`, `SELECT COUNT(*) FROM \`${t}\``);
  }

  console.log('\n=== أكبر تاريخ/أحدث 5 سجلات غياب تلقائي ===');
  const [cron] = await c.query(
    `SELECT a.createdAt, a.status, t.nameAr, s.date
       FROM \`${ATT}\` a
       JOIN \`${TRA}\` t ON t.id = a.traineeId
       JOIN \`${SES}\` s ON s.id = a.sessionId
      WHERE a.notes LIKE '%تم التسجيل تلقائياً%'
      ORDER BY a.createdAt DESC LIMIT 5`,
  );
  for (const r of cron) {
    console.log(`${new Date(r.createdAt).toISOString().slice(0, 16)} | محاضرة ${new Date(r.date).toISOString().slice(0, 10)} | ${r.nameAr}`);
  }

  await c.end();
})().catch((e) => {
  console.error('FAILED', e.message);
  process.exit(1);
});