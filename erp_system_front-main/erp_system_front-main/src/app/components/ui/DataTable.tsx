'use client';

import { ReactNode, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => ReactNode);
  cell?: (item: T) => ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  rowClassName?: string | ((item: T) => string);
  pagination?: boolean;
  itemsPerPage?: number;
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({
  data,
  columns,
  keyField,
  isLoading = false,
  emptyMessage = 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª Ù„Ù„Ø¹Ø±Ø¶',
  className,
  rowClassName,
  pagination = false,
  itemsPerPage = 10,
  onRowClick
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  // Pagination logic
  const totalPages = pagination ? Math.ceil(data.length / itemsPerPage) : 1;
  const paginatedData = pagination
    ? data.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : data;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
            <p className="text-sm text-slate-500">Ø¬Ø§Ø±ÙŠ ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª...</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className="w-full bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-8 flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-500">{emptyMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden", className)}>
      {/* Ø¹Ø±Ø¶ Ø§Ù„Ø¬Ø¯ÙˆÙ„ Ø¹Ù„Ù‰ Ø§Ù„Ø´Ø§Ø´Ø§Øª Ø§Ù„ÙƒØ¨ÙŠØ±Ø© */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={cn(
                    "px-4 py-3 text-right text-sm font-medium text-slate-700",
                    column.className
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {paginatedData.map((item) => {
              const key = String(item[keyField]);
              const rowClass = typeof rowClassName === 'function' ? rowClassName(item) : rowClassName;
              
              return (
                <tr
                  key={key}
                  className={cn(
                    "hover:bg-slate-50 transition-colors",
                    onRowClick && "cursor-pointer",
                    rowClass
                  )}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                >
                  {columns.map((column, index) => {
                    let cellContent: ReactNode;
                    
                    if (column.cell) {
                      cellContent = column.cell(item);
                    } else if (typeof column.accessor === 'function') {
                      cellContent = column.accessor(item);
                    } else {
                      cellContent = item[column.accessor] as ReactNode;
                    }
                    
                    return (
                      <td
                        key={`${key}-${index}`}
                        className={cn("px-4 py-3 text-sm text-slate-900", column.className)}
                      >
                        {cellContent}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Ø¹Ø±Ø¶ Ø§Ù„Ø¨Ø·Ø§Ù‚Ø§Øª Ø¹Ù„Ù‰ Ø§Ù„Ù‡ÙˆØ§ØªÙ */}
      <div className="md:hidden divide-y divide-slate-200">
        {paginatedData.map((item) => {
          const key = String(item[keyField]);
          const rowClass = typeof rowClassName === 'function' ? rowClassName(item) : rowClassName;
          
          // Ø¬Ù…Ø¹ Ø§Ù„Ù…Ø­ØªÙˆÙ‰ Ù…Ù† Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø£Ø¹Ù…Ø¯Ø©
          const firstColumnContent = (() => {
            const column = columns[0];
            if (column.cell) {
              return column.cell(item);
            } else if (typeof column.accessor === 'function') {
              return column.accessor(item);
            } else {
              return item[column.accessor] as ReactNode;
            }
          })();

          const otherColumns = columns.slice(1).filter(col =>
            !col.className?.includes('hidden') || col.className?.includes('md:table-cell')
          );

          const actionsColumn = columns[columns.length - 1];
          const actionsContent = (() => {
            if (actionsColumn.cell) {
              return actionsColumn.cell(item);
            } else if (typeof actionsColumn.accessor === 'function') {
              return actionsColumn.accessor(item);
            } else {
              return item[actionsColumn.accessor] as ReactNode;
            }
          })();
          
          return (
            <div
              key={key}
              className={cn(
                "p-4 hover:bg-slate-50 transition-colors",
                onRowClick && "cursor-pointer",
                rowClass
              )}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
            >
              {/* Ø§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ© - Ù…Ù† Ø§Ù„Ø¹Ù…ÙˆØ¯ Ø§Ù„Ø£ÙˆÙ„ */}
              <div className="mb-3">
                {firstColumnContent}
              </div>

              {/* Ø§Ù„Ø£Ø¹Ù…Ø¯Ø© Ø§Ù„Ø£Ø®Ø±Ù‰ - ÙÙ‚Ø· Ø§Ù„ØªÙŠ Ù„ÙŠØ³Øª Ù…Ø®ÙÙŠØ© Ø¨Ø´ÙƒÙ„ Ø¯Ø§Ø¦Ù… */}
              {otherColumns.length > 0 && otherColumns.some((col, idx) => idx < otherColumns.length - 1) && (
                <div className="grid grid-cols-2 gap-2 mb-3 pb-3 border-t pt-3">
                  {otherColumns.slice(0, -1).map((column, index) => {
                    let cellContent: ReactNode;
                    
                    if (column.cell) {
                      cellContent = column.cell(item);
                    } else if (typeof column.accessor === 'function') {
                      cellContent = column.accessor(item);
                    } else {
                      cellContent = item[column.accessor] as ReactNode;
                    }
                    
                    return (
                      <div key={`${key}-other-${index}`} className="text-xs">
                        <div className="text-slate-600 font-medium mb-0.5">
                          {column.header}
                        </div>
                        <div className="text-slate-900">
                          {cellContent}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª - Ù…Ù† Ø§Ù„Ø¹Ù…ÙˆØ¯ Ø§Ù„Ø£Ø®ÙŠØ± */}
              <div className="border-t pt-3">
                {actionsContent}
              </div>
            </div>
          );
        })}
      </div>

      {pagination && totalPages > 1 && (
        <div className="bg-white px-4 py-3 border-t border-slate-200">
          {/* Ø¹Ø±Ø¶ Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„Ù†ØªØ§Ø¦Ø¬ */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-center sm:text-right">
              <p className="text-sm text-slate-700">
                Ø¹Ø±Ø¶ <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> Ø¥Ù„Ù‰{' '}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, data.length)}
                </span>{' '}
                Ù…Ù† <span className="font-medium">{data.length}</span> Ù†ØªÙŠØ¬Ø©
              </p>
            </div>

            {/* Ø£Ø²Ø±Ø§Ø± Ø§Ù„ØªÙ†Ù‚Ù„ */}
            <div className="flex justify-center">
              <nav className="relative z-0 inline-flex rounded-md shadow-sm" aria-label="Pagination">
                {/* Ø²Ø± Ø§Ù„Ø³Ø§Ø¨Ù‚ */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-200 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="sr-only">Ø§Ù„Ø³Ø§Ø¨Ù‚</span>
                  <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
                </button>

                {/* Ø£Ø±Ù‚Ø§Ù… Ø§Ù„ØµÙØ­Ø§Øª - ØªØ­Ø³ÙŠÙ† Ù„Ù„Ù‡ÙˆØ§ØªÙ */}
                {totalPages <= 7 ? (
                  // Ø¹Ø±Ø¶ Ø¬Ù…ÙŠØ¹ Ø§Ù„ØµÙØ­Ø§Øª Ø¥Ø°Ø§ ÙƒØ§Ù†Øª Ù‚Ù„ÙŠÙ„Ø©
                  Array.from({ length: totalPages }).map((_, index) => {
                    const page = index + 1;
                    const isActive = page === currentPage;

                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={cn(
                          "relative inline-flex items-center px-3 py-2 border text-sm font-medium transition-colors",
                          isActive
                            ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                            : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                        )}
                      >
                        {page}
                      </button>
                    );
                  })
                ) : (
                  // Ø¹Ø±Ø¶ Ù…Ø®ØªØµØ± Ù„Ù„ØµÙØ­Ø§Øª Ø§Ù„ÙƒØ«ÙŠØ±Ø©
                  <>
                    {/* Ø§Ù„ØµÙØ­Ø© Ø§Ù„Ø£ÙˆÙ„Ù‰ */}
                    <button
                      onClick={() => handlePageChange(1)}
                      className={cn(
                        "relative inline-flex items-center px-3 py-2 border text-sm font-medium transition-colors",
                        currentPage === 1
                          ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      1
                    </button>

                    {/* Ù†Ù‚Ø§Ø· Ø¥Ø°Ø§ ÙƒØ§Ù†Øª Ø§Ù„ØµÙØ­Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ© Ø¨Ø¹ÙŠØ¯Ø© Ø¹Ù† Ø§Ù„Ø¨Ø¯Ø§ÙŠØ© */}
                    {currentPage > 3 && (
                      <span className="relative inline-flex items-center px-3 py-2 border border-slate-200 bg-white text-sm font-medium text-slate-500">
                        ...
                      </span>
                    )}

                    {/* Ø§Ù„ØµÙØ­Ø§Øª Ø§Ù„Ù…Ø­ÙŠØ·Ø© Ø¨Ø§Ù„ØµÙØ­Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ© */}
                    {Array.from({ length: 3 }).map((_, index) => {
                      const page = currentPage - 1 + index;
                      if (page <= 1 || page >= totalPages) return null;

                      const isActive = page === currentPage;

                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={cn(
                            "relative inline-flex items-center px-3 py-2 border text-sm font-medium transition-colors",
                            isActive
                              ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                              : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                          )}
                        >
                          {page}
                        </button>
                      );
                    })}

                    {/* Ù†Ù‚Ø§Ø· Ø¥Ø°Ø§ ÙƒØ§Ù†Øª Ø§Ù„ØµÙØ­Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ© Ø¨Ø¹ÙŠØ¯Ø© Ø¹Ù† Ø§Ù„Ù†Ù‡Ø§ÙŠØ© */}
                    {currentPage < totalPages - 2 && (
                      <span className="relative inline-flex items-center px-3 py-2 border border-slate-200 bg-white text-sm font-medium text-slate-500">
                        ...
                      </span>
                    )}

                    {/* Ø§Ù„ØµÙØ­Ø© Ø§Ù„Ø£Ø®ÙŠØ±Ø© */}
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      className={cn(
                        "relative inline-flex items-center px-3 py-2 border text-sm font-medium transition-colors",
                        currentPage === totalPages
                          ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      {totalPages}
                    </button>
                  </>
                )}

                {/* Ø²Ø± Ø§Ù„ØªØ§Ù„ÙŠ */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-200 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="sr-only">Ø§Ù„ØªØ§Ù„ÙŠ</span>
                  <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 