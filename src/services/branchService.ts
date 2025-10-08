// SOLID Principles Applied:
// 1. Single Responsibility: This service only handles branch management
// 2. Open/Closed: Can be extended with new branch operations without modification
// 3. Dependency Inversion: Depends on abstractions (interfaces) not concretions

import AsyncStorage from '../utils/mockAsyncStorage';
import { 
  BranchType, 
  BranchInfo, 
  BranchSelectionState, 
  BranchValidationResponse 
} from '../types/auth';
import { 
  API_CONFIG, 
  getBranchConfig, 
  getAllBranches, 
  updateApiBaseUrl 
} from './apiConfig';

// مفاتيح التخزين المحلي
const STORAGE_KEYS = {
  SELECTED_BRANCH: 'selected_branch',
  BRANCH_SELECTION_TIME: 'branch_selection_time',
  LAST_BRANCH_VALIDATION: 'last_branch_validation',
};

export class BranchService {
  // الحصول على جميع الفروع المتاحة
  static getAllBranches(): BranchInfo[] {
    return getAllBranches();
  }

  // الحصول على معلومات فرع محدد
  static getBranchInfo(branch: BranchType): BranchInfo {
    return getBranchConfig(branch);
  }

  // حفظ الفرع المختار محلياً
  static async saveSelectedBranch(branch: BranchType): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_BRANCH, branch);
      await AsyncStorage.setItem(
        STORAGE_KEYS.BRANCH_SELECTION_TIME, 
        new Date().toISOString()
      );
      
      // تحديث BASE_URL فوراً بدون التحقق من الخادم
      this.setBranchUrl(branch);
      
      console.log('✅ Branch saved successfully:', branch);
    } catch (error) {
      console.error('❌ Failed to save branch:', error);
      throw new Error('فشل في حفظ اختيار الفرع');
    }
  }

  // الحصول على الفرع المحفوظ محلياً
  static async getSavedBranch(): Promise<BranchType | null> {
    try {
      const savedBranch = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_BRANCH);
      if (savedBranch && Object.values(BranchType).includes(savedBranch as BranchType)) {
        // تحديث BASE_URL عند استرجاع الفرع بدون التحقق من الخادم
        this.setBranchUrl(savedBranch as BranchType);
        return savedBranch as BranchType;
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to get saved branch:', error);
      return null;
    }
  }

  // مسح الفرع المحفوظ
  static async clearSavedBranch(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.SELECTED_BRANCH);
      await AsyncStorage.removeItem(STORAGE_KEYS.BRANCH_SELECTION_TIME);
      await AsyncStorage.removeItem(STORAGE_KEYS.LAST_BRANCH_VALIDATION);
      
      // إعادة تعيين BASE_URL
      API_CONFIG.BASE_URL = '';
      
      console.log('✅ Branch data cleared successfully');
    } catch (error) {
      console.error('❌ Failed to clear branch data:', error);
      throw new Error('فشل في مسح بيانات الفرع');
    }
  }

  // تحديث BASE_URL للفرع المحدد بدون التحقق من الخادم
  static setBranchUrl(branch: BranchType): void {
    updateApiBaseUrl(branch);
    console.log('✅ Branch URL updated:', branch, 'URL:', API_CONFIG.BASE_URL);
  }

  // التحقق من حالة الفرع المحفوظ
  static async getBranchSelectionState(): Promise<BranchSelectionState> {
    try {
      const selectedBranch = await this.getSavedBranch();
      const selectionTime = await AsyncStorage.getItem(STORAGE_KEYS.BRANCH_SELECTION_TIME);
      const lastValidation = await AsyncStorage.getItem(STORAGE_KEYS.LAST_BRANCH_VALIDATION);

      return {
        selectedBranch,
        isLoading: false,
        lastSelected: selectionTime ? new Date(selectionTime) : undefined,
      };
    } catch (error) {
      console.error('❌ Failed to get branch selection state:', error);
      return {
        selectedBranch: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'فشل في الحصول على حالة الفرع',
      };
    }
  }


  // إعادة تعيين الفرع (للتغيير)
  static async resetBranch(): Promise<void> {
    await this.clearSavedBranch();
  }

  // الحصول على معلومات الفرع الحالي
  static getCurrentBranchInfo(): BranchInfo | null {
    const currentUrl = API_CONFIG.BASE_URL;
    if (!currentUrl) {
      return null;
    }

    // البحث عن الفرع الذي يطابق URL الحالي
    const branches = this.getAllBranches();
    const currentBranch = branches.find(branch => branch.apiUrl === currentUrl);
    
    return currentBranch || null;
  }

  // التحقق من وجود فرع محفوظ
  static async hasSavedBranch(): Promise<boolean> {
    const savedBranch = await this.getSavedBranch();
    return savedBranch !== null;
  }

  // الحصول على آخر وقت تم فيه اختيار فرع
  static async getLastSelectionTime(): Promise<Date | null> {
    try {
      const timeString = await AsyncStorage.getItem(STORAGE_KEYS.BRANCH_SELECTION_TIME);
      return timeString ? new Date(timeString) : null;
    } catch (error) {
      console.error('❌ Failed to get last selection time:', error);
      return null;
    }
  }
}

// Export a default instance for easier usage
export const branchService = new BranchService();
