'use client';

/**
 * Shared print styles component - provides consistent Tiba design identity across all print pages.
 * Usage: <PrintStyles /> at the top of any print page
 */
export default function PrintStyles() {
  return (
    <style jsx global>{`
      * { box-sizing: border-box; }
      
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        overflow-x: hidden;
      }
      
      .print-only-layout {
        margin: 0 !important;
        padding: 0 !important;
      }
      
      @media print {
        body { 
          font-family: 'Cairo', 'Arial', sans-serif !important;
          direction: rtl !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .no-print { display: none !important; }
        .print-button { display: none !important; }
        @page { 
          size: A4;
          margin: 15mm;
        }
      }
      
      /* ===== Print Container ===== */
      .print-container {
        max-width: 210mm;
        margin: 0 auto;
        padding: 20px;
        background: white;
        min-height: 297mm;
        font-family: 'Cairo', 'Arial', sans-serif;
        direction: rtl;
      }
      
      /* ===== Header ===== */
      .print-header {
        text-align: center;
        border-bottom: 3px solid #1e3a5f;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      
      .print-header .logo {
        width: 90px;
        height: 90px;
        margin: 0 auto 12px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid #e2e8f0;
      }
      
      .print-header .logo-placeholder {
        width: 90px;
        height: 90px;
        margin: 0 auto 12px;
        background: #f1f5f9;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 36px;
        color: #1e3a5f;
        border: 2px solid #e2e8f0;
      }
      
      .print-header .org-name {
        font-size: 22px;
        font-weight: bold;
        color: #1e3a5f;
        margin: 8px 0;
      }
      
      .print-header .report-title {
        font-size: 20px;
        font-weight: bold;
        color: #1e3a5f;
        margin: 12px 0;
      }
      
      .print-header .report-subtitle {
        font-size: 16px;
        color: #64748b;
        margin: 8px 0;
      }
      
      .print-header .report-date {
        font-size: 13px;
        color: #94a3b8;
        margin-top: 10px;
      }
      
      /* ===== Section ===== */
      .print-section {
        margin: 24px 0;
        page-break-inside: avoid;
      }
      
      .print-section-title {
        font-size: 16px;
        font-weight: bold;
        color: #1e3a5f;
        margin-bottom: 12px;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 6px;
      }
      
      /* ===== Info Grid ===== */
      .print-info-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin: 12px 0;
      }
      
      .print-info-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
      .print-info-grid.cols-4 { grid-template-columns: repeat(4, 1fr); }
      
      .print-info-item {
        padding: 10px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
      }
      
      .print-info-label {
        font-size: 11px;
        color: #64748b;
        margin-bottom: 4px;
      }
      
      .print-info-value {
        font-size: 13px;
        font-weight: bold;
        color: #1e293b;
      }
      
      /* ===== Summary Cards ===== */
      .print-summary-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
        margin: 16px 0;
      }
      
      .print-summary-card {
        text-align: center;
        padding: 14px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
      }
      
      .print-summary-value {
        font-size: 20px;
        font-weight: bold;
        color: #1e3a5f;
        margin-bottom: 4px;
      }
      
      .print-summary-label {
        font-size: 11px;
        color: #64748b;
      }
      
      /* ===== Data Table ===== */
      .print-table {
        width: 100%;
        border-collapse: collapse;
        margin: 16px 0;
        font-size: 11px;
      }
      
      .print-table th,
      .print-table td {
        border: 1px solid #e2e8f0;
        padding: 8px 6px;
        text-align: right;
      }
      
      .print-table th {
        background: #f1f5f9;
        font-weight: bold;
        font-size: 12px;
        color: #1e3a5f;
      }
      
      .print-table tr:nth-child(even) {
        background: #f8fafc;
      }
      
      .print-table .row-num {
        text-align: center;
        width: 40px;
        color: #64748b;
      }
      
      /* ===== Status Badges ===== */
      .print-badge {
        display: inline-block;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: bold;
        border: 1px solid;
      }
      
      .print-badge.success {
        background: #dcfce7;
        color: #166534;
        border-color: #bbf7d0;
      }
      
      .print-badge.warning {
        background: #fef9c3;
        color: #854d0e;
        border-color: #fde68a;
      }
      
      .print-badge.danger {
        background: #fee2e2;
        color: #991b1b;
        border-color: #fecaca;
      }
      
      .print-badge.info {
        background: #dbeafe;
        color: #1e40af;
        border-color: #bfdbfe;
      }
      
      .print-badge.neutral {
        background: #f1f5f9;
        color: #475569;
        border-color: #cbd5e1;
      }
      
      /* ===== Footer ===== */
      .print-footer {
        text-align: center;
        border-top: 2px solid #e2e8f0;
        padding-top: 16px;
        margin-top: 40px;
        font-size: 11px;
        color: #64748b;
      }
      
      .print-footer .signatures {
        display: flex;
        justify-content: space-around;
        margin-top: 60px;
        margin-bottom: 20px;
      }
      
      .print-footer .signature {
        text-align: center;
      }
      
      .print-footer .signature-line {
        border-top: 2px solid #1e293b;
        width: 160px;
        margin: 0 auto 10px;
      }
      
      .print-footer .signature-title {
        font-weight: bold;
        font-size: 13px;
        color: #1e293b;
      }
      
      .print-footer .signature-name {
        font-size: 12px;
        color: #64748b;
        margin-top: 4px;
      }
      
      /* ===== Progress Bar ===== */
      .print-progress {
        width: 100%;
        height: 18px;
        background: #f1f5f9;
        border-radius: 9px;
        overflow: hidden;
        margin: 8px 0;
      }
      
      .print-progress-fill {
        height: 100%;
        background: #1e3a5f;
        border-radius: 9px;
        transition: width 0.3s ease;
      }
      
      /* ===== Print Button ===== */
      .print-action-button {
        position: fixed;
        top: 20px;
        left: 20px;
        z-index: 1000;
        background: #1e3a5f;
        color: white;
        border: none;
        border-radius: 10px;
        padding: 10px 20px;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(30, 58, 95, 0.3);
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s ease;
        font-family: 'Cairo', 'Arial', sans-serif;
      }
      
      .print-action-button:hover {
        background: #2d5a8e;
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(30, 58, 95, 0.4);
      }
      
      .print-action-button svg {
        width: 18px;
        height: 18px;
      }
      
      /* ===== Enrollment/Certificate Specific ===== */
      .print-enrollment-container {
        max-width: 210mm;
        margin: 0 auto;
        padding: 40px;
        background: white;
        min-height: 297mm;
      }
      
      .print-content-centered {
        font-size: 18px;
        line-height: 2.2;
        color: #1e293b;
        text-align: center;
        margin: 40px 0;
      }
    `}</style>
  );
}
