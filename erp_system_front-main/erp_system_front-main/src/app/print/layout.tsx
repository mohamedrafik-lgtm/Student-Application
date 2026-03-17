import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "طباعة التقرير",
  description: "صفحة طباعة التقارير",
};

// layout منفصل خاص بصفحات الطباعة - بدون sidebar أو navbar
export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="print-only-layout">
      {children}
    </div>
  );
}
