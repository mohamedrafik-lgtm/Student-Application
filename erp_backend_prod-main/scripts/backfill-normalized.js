const { PrismaClient } = require('@prisma/client');
function normalizeArabic(text) {
  if (!text) return '';
  let s = String(text);
  s = s.replace(/[\u064B-\u065F\u0670\u0640]/g, '');
  s = s.replace(/[أإآٱ]/g, 'ا');
  s = s.replace(/ؤ/g, 'ء');
  s = s.replace(/ئ/g, 'ء');
  s = s.replace(/ة/g, 'ه');
  s = s.replace(/ى/g, 'ي');
  s = s.replace(/\s+/g, ' ').trim();
  s = s.toLowerCase();
  return s;
}
const prisma = new PrismaClient();

async function main() {
  const trainees = await prisma.trainee.findMany({ select: { id: true, nameAr: true } });
  console.log('trainees:', trainees.length);
  let updated = 0;
  for (const t of trainees) {
    await prisma.trainee.update({
      where: { id: t.id },
      data: { normalizedName: normalizeArabic(t.nameAr) },
    });
    updated++;
  }
  console.log('updated:', updated);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
