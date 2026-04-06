import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '内装デザインボード',
  description: 'みんなで作るイメージボード',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body style={{ background: '#0c0a09', color: 'white', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  )
}
