const m = require('./node_modules/mysql2/promise');

const ATT = 'attendance';
const TRA = 'trainee';
const SES = 'scheduled_sessions';
const SLOT = 'schedule_slots';
const CONT = 'training_contents';

(async () => {
  const c = await m.createConnection({ host: '127.0.0.1', user: 'root', password: '', database: 'erp_system' });

  console.log('=== السجلات الستة PRESENT ===');
  const [pres] = await c.query(
    `SELECT a.id, a.traineeId, a.sessionId, a.status, a.notes, a.createdAt,
            t.nameAr, s.date, sl.contentId, sl.classroomId, sl.dayOfWeek, sl.distributionRoomId
       FROM \`${ATT}\` a
       JOIN \`${TRA}\` t ON t.id = a.traineeId
       JOIN \`${SES}\` s ON s.id = a.sessionId
       JOIN \`${SLOT}\` sl ON sl.id = s.scheduleSlotId
      WHERE a.status = 'PRESENT'
      ORDER BY s.date DESC`,
  );
  for (const r of pres) {
    console.log(
      `#${r.id} | ${r.nameAr} | ${new Date(r.date).toISOString().slice(0, 10)} | day=${r.dayOfWeek} | content=${r.contentId} | room=${r.distributionRoomId} | notes=${r.notes}`,
    );
  }

  console.log('\n=== هل كانت هناك حصص أخرى نفس اليوم لنفس المتدرب؟ ===');
  for (const r of pres) {
    const [others] = await c.query(
      `SELECT sl.id AS slotId, sl.contentId, sl.distributionRoomId,
              (SELECT a2.status FROM \`${ATT}\` a2
                 JOIN \`${SES}\` s2 ON s2.id = a2.sessionId
                WHERE s2.scheduleSlotId = sl.id AND a2.traineeId = ?
                LIMIT 1) AS status
         FROM \`${SLOT}\` sl
        WHERE sl.classroomId = ? AND sl.dayOfWeek = ? AND sl.contentId <> ?`,
      [r.traineeId, r.classroomId, r.dayOfWeek, r.contentId],
    );
    console.log(`المتدرب ${r.nameAr} (${new Date(r.date).toISOString().slice(0, 10)}): ${others.length} حصة أخرى`);
    for (const o of others) {
      console.log(`   slot=${o.slotId} content=${o.contentId} room=${o.distributionRoomId} حالته=${o.status || 'لا سجل'}`);
    }
  }

  console.log('\n=== السجلات الثلاثة المنشورة تلقائياً ===');
  const [spread] = await c.query(
    `SELECT a.id, a.traineeId, a.status, a.notes, a.createdAt, t.nameAr, s.date, sl.contentId
       FROM \`${ATT}\` a
       JOIN \`${TRA}\` t ON t.id = a.traineeId
       JOIN \`${SES}\` s ON s.id = a.sessionId
       JOIN \`${SLOT}\` sl ON sl.id = s.scheduleSlotId
      WHERE a.notes LIKE '%النشر تلقائياً%'`,
  );
  for (const r of spread) {
    console.log(`#${r.id} | ${r.nameAr} | ${new Date(r.date).toISOString().slice(0, 10)} | content=${r.contentId} | ${r.status} | ${r.notes}`);
  }

  console.log('\n=== بنية trainee_sessions ===');
  const [c1] = await c.query(
    "SELECT column_name AS c, data_type AS t FROM information_schema.columns WHERE table_schema='erp_system' AND table_name='trainee_sessions' ORDER BY ordinal_position",
  );
  console.log(c1.map((x) => `${x.c}:${x.t}`).join(' , '));

  console.log('\n=== بنية training_content_attendance ===');
  const [c2] = await c.query(
    "SELECT column_name AS c, data_type AS t FROM information_schema.columns WHERE table_schema='erp_system' AND table_name='training_content_attendance' ORDER BY ordinal_position",
  );
  console.log(c2.map((x) => `${x.c}:${x.t}`).join(' , '));

  console.log('\n=== عيّنة من trainee_sessions ===');
  const [ts] = await c.query('SELECT * FROM `trainee_sessions` LIMIT 3');
  console.log(JSON.stringify(ts, null, 1).slice(0, 1200));

  console.log('\n=== عيّنة من training_content_attendance ===');
  const [tca] = await c.query('SELECT * FROM `training_content_attendance` LIMIT 5');
  console.log(JSON.stringify(tca, null, 1).slice(0, 1200));

  await c.end();
})().catch((e) => {
  console.error('FAILED', e.message);
  process.exit(1);
});