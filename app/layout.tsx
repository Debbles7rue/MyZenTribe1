import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ToastProvider'
import SafeMediaWrapper from '@/components/SafeMediaWrapper'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MyZenTribe - Meditation • Community • Presence',
  description: 'Connect with your spiritual community',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SafeMediaWrapper>
          <ToastProvider>
            {children}
          </ToastProvider>
        </SafeMediaWrapper>
      </body>
    </html>
  )
}
