import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'SitWell｜久坐健康助手',
  description: '用科学节奏中断久坐，跟随 3 秒收紧、3 秒放松的动画进行盆底肌练习。',
  openGraph: {
    title: 'SitWell｜久坐健康助手',
    description: '坐一会，也要动一动。久坐提醒与趣味盆底肌节律训练。',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'SitWell 久坐健康助手' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SitWell｜久坐健康助手',
    description: '坐一会，也要动一动。久坐提醒与趣味盆底肌节律训练。',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
