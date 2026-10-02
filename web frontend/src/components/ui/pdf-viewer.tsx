'use client';

import { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface PDFViewerProps {
  fileUrl: string;
  fileName?: string;
  onError?: () => void;
}

export function PDFViewer({ fileUrl, fileName = 'document.pdf', onError }: PDFViewerProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  // Manejar la carga del iframe
  const handleIframeLoad = () => {
    setLoading(false);
  };

  // Manejar errores del iframe
  const handleIframeError = () => {
    setError(true);
    setLoading(false);
    if (onError) {
      onError();
    }
  };

  // Función para descargar el PDF
  function downloadPDF(): void {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="flex flex-col items-center w-full">
      {/* Barra de herramientas */}
      <div className="w-full bg-gray-100 p-3 mb-4 rounded-md flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm">
            عرض ملف PDF
          </span>
        </div>
        
        <button
          onClick={downloadPDF}
          className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-sm hover:bg-blue-200"
          aria-label="تحميل الملف"
        >
          <ArrowDownTrayIcon className="h-4 w-4" />
          <span>تحميل</span>
        </button>
      </div>
      
      {/* Contenedor del documento */}
      <div className="border border-gray-300 rounded-md w-full overflow-hidden">
        {loading && (
          <div className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tiba-primary-600"></div>
          </div>
        )}
        
        {error ? (
          <div className="flex flex-col justify-center items-center h-96 text-center">
            <div className="text-red-500 mb-2">حدث خطأ أثناء تحميل الملف</div>
            <p className="text-gray-500 text-sm mb-4">يرجى تحميل الملف ومشاهدته في متصفحك</p>
            <a 
              href={fileUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              فتح الملف في نافذة جديدة
            </a>
          </div>
        ) : (
          <iframe 
            src={fileUrl}
            className="w-full h-[70vh]" 
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            style={{ display: loading ? 'none' : 'block' }}
          />
        )}
      </div>
    </div>
  );
} 