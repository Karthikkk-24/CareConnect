import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'CareConnect — Hospital Management System',
  description:
    'Modern hospital and healthcare management platform with patient records, scheduling, billing, and more.',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const messages = await getMessages();

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <NextIntlClientProvider locale="en" messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
