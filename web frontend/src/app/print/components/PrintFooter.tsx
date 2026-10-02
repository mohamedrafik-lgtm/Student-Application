'use client';

interface SignatureItem {
  title: string;
  name?: string;
}

interface PrintFooterProps {
  settings?: any;
  signatures?: SignatureItem[];
  note?: string;
}

export default function PrintFooter({ settings, signatures, note }: PrintFooterProps) {
  return (
    <div className="print-footer">
      {signatures && signatures.length > 0 && (
        <div className="signatures">
          {signatures.map((sig, index) => (
            <div key={index} className="signature">
              <div className="signature-line"></div>
              <div className="signature-title">{sig.title}</div>
              {sig.name && <div className="signature-name">{sig.name}</div>}
            </div>
          ))}
        </div>
      )}
      {note && <p style={{ marginBottom: 8 }}>{note}</p>}
      {settings?.centerName && (
        <p>{settings.centerName} - جميع الحقوق محفوظة © {new Date().getFullYear()}</p>
      )}
    </div>
  );
}
