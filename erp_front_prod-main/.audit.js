const fs = require('fs');
const path = require('path');
const m = require('./node_modules/mysql2/promise');

/* ---------- 1) فحص الـ endpoints ---------- */
const root = path.join(__dirname, 'backend', 'src');
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.controller.ts')) files.push(p);
  }
})(root);

const MUT = /^\s*@(Delete|Post|Patch|Put)\(/;
const unguarded = [];
let guardedCount = 0;

for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (!MUT.test(lines[i])) continue;
    const deco = lines[i].trim();
    // ابحث في الـ 12 سطراً التالية عن @RequirePermission أو @RequireMultiple
    let has = false;
    for (let j = i; j < Math.min(i + 12, lines.length); j++) {
      if (/@RequirePermission|@RequireMultiple|@RequireRole|@Roles\(/.test(lines[j])) {
        has = true;
        break;
      }
      // توقف عند بداية method body التالي (سطر ينتهي بـ ") {")
      if (j > i && /\)\s*\{\s*$/.test(lines[j]) && !/^\s*@/.test(lines[j])) break;
    }
    if (has) guardedCount++;
    else {
      unguarded.push({
        file: path.relative(root, f).replace(/\\/g, '/'),
        line: i + 1,
        deco,
      });
    }
  }
}

console.log('=== ENDPOINTS WITHOUT @RequirePermission ===');
console.log(`guarded=${guardedCount} unguarded=${unguarded.length}`);
for (const u of unguarded) console.log(`${u.file}:${u.line}  ${u.deco}`);

/* ---------- 2) فحص البيانات ---------- */
(async () => {
  const c = await m.createConnection({ host: '127.0.0.1', user: 'root', password: '', database: 'erp_system' });
  const [tabs] = await c.query(
    "SELECT table_name AS t FROM information_schema.tables WHERE table_schema='erp_system'",
  );
  const names = tabs.map((x) => x.t);
  const pick = (re) => names.find((n) => re.test(n));

  const T = {
    attendance: pick(/^attendance$/i),
    trainee: pick(/^trainee$/i),
    auth: pick(/trainee_?auth/i),
    audit: pick(/audit/i),
    session: pick(/^scheduled_?session$/i),
    distAssign: pick(/^distribution_?assignment$/i),
  };
  console.log('\n=== TABLE NAMES ===', JSON.stringify(T));

  const q = async (label, sql) => {
    try {
      const [r] = await c.query(sql);
      const v = Object.values(r[0] || {})[0];
      console.log(`${label}: ${v}`);
    } catch (e) {
      console.log(`${label}: ERR ${e.message}`);
    }
  };

  console.log('\n=== DATA ANOMALIES ===');
  await q('إجمالي سجلات الحضور', `SELECT COUNT(*) FROM \`${T.attendance}\``);
  await q(
    "سجلات حضور منشورة تلقائياً (Auto-Spread)",
    `SELECT COUNT(*) FROM \`${T.attendance}\` WHERE notes LIKE '%النشر تلقائياً%'`,
  );
  await q(
    "منها حالات حضور (PRESENT/LATE/EXCUSED)",
    `SELECT COUNT(*) FROM \`${T.attendance}\` WHERE notes LIKE '%النشر تلقائياً%' AND status <> 'ABSENT'`,
  );
  await q('عدد المتدربين', `SELECT COUNT(*) FROM \`${T.trainee}\``);
  await q('حسابات المنصة', `SELECT COUNT(*) FROM \`${T.auth}\``);
  await q('حسابات بدون كلمة مرور', `SELECT COUNT(*) FROM \`${T.auth}\` WHERE password IS NULL`);
  await q('سجلات التدقيق (Audit)', `SELECT COUNT(*) FROM \`${T.audit}\``);
  await q('المحاضرات المجدولة', `SELECT COUNT(*) FROM \`${T.session}\``);
  if (T.distAssign) {
    await q(
      'متدربون بلا توزيع',
      `SELECT COUNT(*) FROM \`${T.trainee}\` t WHERE NOT EXISTS (SELECT 1 FROM \`${T.distAssign}\` d WHERE d.traineeId = t.id)`,
    );
  }

  console.log('\n=== TOP 8 TABLES BY SIZE ===');
  const [sizes] = await c.query(
    `SELECT table_name AS t, table_rows AS r,
            ROUND((data_length + index_length)/1024/1024, 1) AS mb
       FROM information_schema.tables
      WHERE table_schema='erp_system'
      ORDER BY (data_length + index_length) DESC LIMIT 8`,
  );
  for (const s of sizes) console.log(`${s.t}: ~${s.r} rows, ${s.mb} MB`);

  await c.end();
})().catch((e) => {
  console.error('DB FAILED', e.message);
  process.exit(1);
});