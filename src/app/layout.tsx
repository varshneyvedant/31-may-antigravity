import Providers from '@/components/Providers';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import NextAuthProvider from '@/components/NextAuthProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'VEI ERP - Copper Factory ERP',
  description: 'Internal tracking system for copper manufacturing',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NextAuthProvider>
          <Providers>
          <div className="flex min-h-screen bg-[#121212]">
            <Sidebar />
            <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto h-screen">
              {children}
            </main>
          </div>
        </Providers>
        </NextAuthProvider>
      </body>
    </html>
  );
}
