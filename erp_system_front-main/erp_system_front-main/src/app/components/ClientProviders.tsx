'use client';

import { NextUIProvider } from "@nextui-org/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "react-hot-toast";
import { Toaster as SonnerToaster } from "sonner";
import { AuthProvider } from '@/lib/auth-context';

interface ClientProvidersProps {
  children: React.ReactNode;
}

export default function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <AuthProvider>
      <NextUIProvider>
        <NextThemesProvider attribute="class" defaultTheme="light">
          {children}
          <Toaster position="top-center" />
          <SonnerToaster 
            position="top-right" 
            expand={true}
            richColors
            closeButton
            toastOptions={{
              style: {
                fontFamily: 'inherit',
                fontSize: '14px',
              }
            }}
          />
        </NextThemesProvider>
      </NextUIProvider>
    </AuthProvider>
  );
}