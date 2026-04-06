import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '場作りボード | ユースセンター',
  description: 'ユースセンターの内装デザインを写真でシェアしあって、実際のイメージをかためていく共創ツール',
  openGraph: {
    title: '場作りボード | ユースセンター',
    description: 'ユースセンターの内装デザインを写真でシェアしあって、実際のイメージをかためていく共創ツール',
    images: ['/og-image.jpg'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '場作りボード | ユースセンター',
    description: 'ユースセンターの内装デザインを写真でシェアしあって、実際のイメージをかためていく',
    images: ['/og-image.jpg'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        {/* キャッシュ制御 */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </head>
      <body style={{ margin: 0, background: '#f8fafc', color: '#1e293b', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
