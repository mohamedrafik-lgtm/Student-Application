'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { XMarkIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { PDFViewer } from './pdf-viewer';
import { getImageUrl } from '@/lib/api';

interface PDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  title: string;
}

export function PDFModal({ isOpen, onClose, pdfUrl, title }: PDFModalProps) {
  const [fullUrl, setFullUrl] = useState<string>('');
  const [viewerError, setViewerError] = useState<boolean>(false);
  
  // Convertir la URL relativa a URL completa
  useEffect(() => {
    if (pdfUrl) {
      setFullUrl(getImageUrl(pdfUrl));
      setViewerError(false); // Resetear el error cuando cambia la URL
    }
  }, [pdfUrl]);
  
  // Función para manejar errores del visor PDF
  const handleViewerError = () => {
    console.error('Error al cargar el visor de PDF');
    setViewerError(true);
  };
  
  // Función para descargar el PDF
  const downloadPDF = () => {
    if (fullUrl) {
      const link = document.createElement('a');
      link.href = fullUrl;
      link.download = title + '.pdf';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  
  // Función para abrir el PDF en una nueva pestaña
  const openPdfInNewTab = () => {
    if (fullUrl) {
      window.open(fullUrl, '_blank');
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-full p-0 h-[90vh]">
        <DialogHeader className="p-4 border-b">
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
            <div className="flex items-center gap-2">
              <button 
                onClick={downloadPDF}
                className="p-1 rounded-full hover:bg-gray-200"
                title="تحميل الملف"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
              </button>
              <button 
                onClick={onClose}
                className="p-1 rounded-full hover:bg-gray-200"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </DialogHeader>
        <div className="p-4 overflow-auto h-[calc(90vh-70px)]">
          {viewerError ? (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-red-500 mb-4">حدث خطأ أثناء تحميل عارض PDF</p>
              <p className="text-gray-600 mb-6">يمكنك تحميل الملف ومشاهدته في متصفحك</p>
              <div className="flex gap-4">
                <button
                  onClick={downloadPDF}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                  <span>تحميل الملف</span>
                </button>
                <button
                  onClick={openPdfInNewTab}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  فتح في نافذة جديدة
                </button>
              </div>
            </div>
          ) : (
            fullUrl && <PDFViewer fileUrl={fullUrl} fileName={title + '.pdf'} onError={handleViewerError} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 