import { AuditLog } from '@/app/dashboard/audit-logs/page';
import { FilterOptions } from '@/app/components/AuditLogFilters';
import { isToday, isYesterday, isWithinInterval, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export function filterAuditLogs(logs: AuditLog[], filters: FilterOptions): AuditLog[] {
  // Ensure logs is an array before using filter
  if (!logs || !Array.isArray(logs)) {
    console.error('logs is not an array:', logs);
    return [];
  }
  
  return logs.filter(log => {
    // فلتر البحث النصي
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const searchableText = [
        log.user?.name || '',
        log.user?.email || '',
        log.action || '',
        log.entity || '',
        log.details?.message || '',
        JSON.stringify(log.details || {}),
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(searchTerm)) {
        return false;
      }
    }

    // فلتر نوع الإجراء
    if (filters.actions.length > 0 && !log.action) {
      return false; // Exclude logs with no action when filtering by action
    }
    if (filters.actions.length > 0 && log.action && !filters.actions.includes(log.action)) {
      return false;
    }

    // فلتر نوع الكيان
    if (filters.entities.length > 0 && !log.entity) {
      return false; // Exclude logs with no entity when filtering by entity
    }
    if (filters.entities.length > 0 && log.entity && !filters.entities.includes(log.entity)) {
      return false;
    }

    // فلتر المستخدم
    if (filters.users.length > 0 && !log.user?.name) {
      return false; // Exclude logs with no user when filtering by user
    }
    if (filters.users.length > 0 && log.user?.name && !filters.users.includes(log.user.name)) {
      return false;
    }

    // فلتر التاريخ
    if (filters.quickDate || filters.dateRange.start || filters.dateRange.end) {
      // Skip date filtering if the log doesn't have a createdAt date
      if (!log.createdAt) {
        return filters.quickDate === ''; // Only include logs with missing dates if no specific date filter is applied
      }

      // Try to parse the date safely
      let logDate;
      try {
        logDate = parseISO(log.createdAt);
        // Skip date filtering if the date is invalid
        if (isNaN(logDate.getTime())) {
          return filters.quickDate === ''; // Only include logs with invalid dates if no specific date filter is applied
        }
      } catch (error) {
        return filters.quickDate === ''; // Only include logs with dates that cause errors if no specific date filter is applied
      }
      
      // فلتر التاريخ السريع
      if (filters.quickDate) {
        try {
          switch (filters.quickDate) {
            case 'today':
              if (!isToday(logDate)) return false;
              break;
            case 'yesterday':
              if (!isYesterday(logDate)) return false;
              break;
            case 'week':
              const weekStart = startOfWeek(new Date(), { weekStartsOn: 6 }); // السبت
              const weekEnd = endOfWeek(new Date(), { weekStartsOn: 6 });
              if (!isWithinInterval(logDate, { start: weekStart, end: weekEnd })) return false;
              break;
            case 'month':
              const monthStart = startOfMonth(new Date());
              const monthEnd = endOfMonth(new Date());
              if (!isWithinInterval(logDate, { start: monthStart, end: monthEnd })) return false;
              break;
          }
        } catch (error) {
          console.error('Error in date filtering:', error);
          return false; // Exclude logs with dates that cause errors in filtering
        }
      }

      // فلتر نطاق التاريخ المخصص
      if (filters.dateRange.start || filters.dateRange.end) {
        try {
          const startDate = filters.dateRange.start ? parseISO(filters.dateRange.start) : null;
          const endDate = filters.dateRange.end ? parseISO(filters.dateRange.end + 'T23:59:59') : null;
          
          if (startDate && logDate < startDate) return false;
          if (endDate && logDate > endDate) return false;
        } catch (error) {
          console.error('Error in date range filtering:', error);
          return false; // Exclude logs with dates that cause errors in range filtering
        }
      }
    }

    return true;
  });
}

// دالة لحساب إحصائيات السجلات المفلترة
export function getFilteredStats(logs: AuditLog[], filters: FilterOptions) {
  // Ensure logs is an array before processing
  if (!logs || !Array.isArray(logs)) {
    return {
      total: 0,
      creates: 0,
      updates: 0,
      deletes: 0,
      logins: 0,
      originalTotal: 0,
    };
  }
  
  const filteredLogs = filterAuditLogs(logs, filters);
  
  return {
    total: filteredLogs.length,
    creates: filteredLogs.filter(log => log.action === 'CREATE').length,
    updates: filteredLogs.filter(log => log.action === 'UPDATE').length,
    deletes: filteredLogs.filter(log => log.action === 'DELETE').length,
    logins: filteredLogs.filter(log => log.action && log.action.includes('LOGIN')).length,
    originalTotal: logs.length,
  };
}

// دالة لترتيب السجلات
export function sortAuditLogs(logs: AuditLog[], sortBy: 'date' | 'action' | 'user' | 'entity' = 'date', order: 'asc' | 'desc' = 'desc'): AuditLog[] {
  // Ensure logs is an array before sorting
  if (!logs || !Array.isArray(logs)) {
    return [];
  }
  
  return [...logs].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'date':
        // Handle missing createdAt fields for sorting
        if (!a.createdAt && !b.createdAt) comparison = 0;
        else if (!a.createdAt) comparison = 1; // Items without dates go last
        else if (!b.createdAt) comparison = -1;
        else comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'action':
        comparison = (a.action || '').localeCompare(b.action || '');
        break;
      case 'user':
        const userA = a.user?.name || '';
        const userB = b.user?.name || '';
        comparison = userA.localeCompare(userB);
        break;
      case 'entity':
        comparison = (a.entity || '').localeCompare(b.entity || '');
        break;
    }
    
    return order === 'asc' ? comparison : -comparison;
  });
} 