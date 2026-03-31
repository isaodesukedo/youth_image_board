import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '場作りボード',
  description: 'みんなで作るイメージボード',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, background: '#0c0a09', color: 'white', fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
