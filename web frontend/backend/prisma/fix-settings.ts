import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixSettings() {
  try {
    const defaultPositions = {
      idCardLogoPosition: { x: 20, y: 20 },
      idCardNamePosition: { x: 20, y: 80 },
      idCardPhotoPosition: { x: 220, y: 20 },
      idCardNationalIdPosition: { x: 20, y: 120 },
      idCardProgramPosition: { x: 20, y: 140 },
      idCardCenterNamePosition: { x: 20, y: 40 },
      idCardAdditionalTextPosition: { x: 20, y: 160 }
    };

    const settings = await prisma.systemSettings.findFirst();
    
    if (settings) {
      console.log('تحديث إعدادات بطاقة الهوية...');
      await prisma.systemSettings.update({
        where: { id: settings.id },
        data: defaultPositions
      });
      console.log('تم تحديث الإعدادات بنجاح.');
    } else {
      console.log('إنشاء إعدادات جديدة...');
      await prisma.systemSettings.create({
        data: {
          centerName: 'مركز تدريب طيبة',
          centerManagerName: 'مدير المركز',
          centerAddress: 'عنوان المركز',
          ...defaultPositions
        }
      });
      console.log('تم إنشاء الإعدادات بنجاح.');
    }
  } catch (error) {
    console.error('حدث خطأ أثناء تحديث الإعدادات:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSettings(); 