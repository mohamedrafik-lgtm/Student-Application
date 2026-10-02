'use client';

interface PrintLoadingProps {
  message?: string;
}

export default function PrintLoading({ message = 'جاري تحميل البيانات...' }: PrintLoadingProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div
          className="mx-auto mb-4"
          style={{
            width: 48,
            height: 48,
            border: '3px solid #e2e8f0',
            borderTopColor: '#1e3a5f',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ color: '#64748b', fontSize: 14 }}>{message}</p>
        <style jsx>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </div>
  );
}
