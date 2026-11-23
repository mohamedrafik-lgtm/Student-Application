import { AuthenticationCreds, AuthenticationState, SignalDataTypeMap, initAuthCreds, proto } from '@whiskeysockets/baileys';
import { PrismaClient } from '@prisma/client';

/**
 * Database Auth State - حفظ جلسات الواتساب في قاعدة البيانات
 * بديل محسن لنظام الملفات التقليدي
 */
export const useDatabaseAuthState = async (prisma: PrismaClient): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
  clearAll: () => Promise<void>;
}> => {
  
  // جلب بيانات الاعتماد من قاعدة البيانات
  const readData = async (key: string): Promise<any> => {
    try {
      const session = await prisma.whatsAppSession.findUnique({
        where: { key }
      });
      
      if (session?.data) {
        return JSON.parse(session.data);
      }
      return null;
    } catch (error) {
      console.error(`Error reading session key ${key}:`, error);
      return null;
    }
  };

  // حفظ بيانات في قاعدة البيانات
  const writeData = async (key: string, data: any): Promise<void> => {
    try {
      await prisma.whatsAppSession.upsert({
        where: { key },
        create: {
          key,
          data: JSON.stringify(data)
        },
        update: {
          data: JSON.stringify(data)
        }
      });
    } catch (error) {
      console.error(`Error writing session key ${key}:`, error);
      throw error;
    }
  };

  // حذف بيانات من قاعدة البيانات
  const removeData = async (key: string): Promise<void> => {
    try {
      await prisma.whatsAppSession.delete({
        where: { key }
      }).catch(() => {}); // تجاهل الخطأ إذا لم يكن موجود
    } catch (error) {
      console.error(`Error removing session key ${key}:`, error);
    }
  };

  // جلب أو إنشاء بيانات الاعتماد
  let creds: AuthenticationCreds = await readData('creds') || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type: keyof SignalDataTypeMap, ids: string[]) => {
          const data: { [id: string]: any } = {};
          
          for (const id of ids) {
            const key = `${type}-${id}`;
            const value = await readData(key);
            if (value) {
              data[id] = value;
            }
          }
          
          return data;
        },
        
        set: async (data: any) => {
          const tasks: Promise<void>[] = [];
          
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const key = `${category}-${id}`;
              
              if (value) {
                tasks.push(writeData(key, value));
              } else {
                tasks.push(removeData(key));
              }
            }
          }
          
          await Promise.all(tasks);
        }
      }
    },
    
    saveCreds: async () => {
      await writeData('creds', creds);
    },

    clearAll: async () => {
      try {
        // حذف جميع جلسات الواتساب من قاعدة البيانات
        await prisma.whatsAppSession.deleteMany({});
        console.log('✅ All WhatsApp sessions cleared from database');
      } catch (error) {
        console.error('❌ Error clearing sessions:', error);
        throw error;
      }
    }
  };
};
