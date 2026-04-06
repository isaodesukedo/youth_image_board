'use client'
import { useState, useEffect } from 'react'

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (sessionStorage.getItem('basho_authed') === 'true') setAuthed(true)
    setChecking(false)
  }, [])

  const handleSubmit = () => {
    if (input === process.env.NEXT_PUBLIC_SITE_PASSWORD) {
      sessionStorage.setItem('basho_authed', 'true')
      setAuthed(true)
    } else {
      setError(true)
      setTimeout(() => setError(false), 1500)
    }
  }

  if (checking) return null
  if (!authed) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 24, padding: 36, width: '100%', maxWidth: 340, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🏠</div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', margin: '0 0 6px' }}>内装デザインボード</h1>
        <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 28px' }}>みんなのイメージする内装を、写真でシェアしあおう！</p>
        <input
          type="password" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="パスワードを入力" autoFocus
          style={{
            width: '100%', background: '#f8fafc', color: '#1e293b', borderRadius: 14,
            padding: '14px 18px', marginBottom: 12,
            border: `2px solid ${error ? '#ef4444' : '#e2e8f0'}`,
            outline: 'none', fontSize: 16, boxSizing: 'border-box', fontFamily: 'inherit',
            textAlign: 'center', letterSpacing: '0.1em', transition: 'border-color 0.2s'
          }}
        />
        {error && <p style={{ color: '#ef4444', fontSize: 13, fontWeight: 600, margin: '0 0 12px' }}>パスワードが違います</p>}
        <button onClick={handleSubmit} style={{
          width: '100%', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
          color: 'white', borderRadius: 14, padding: '14px', fontWeight: 800,
          border: 'none', cursor: 'pointer', fontSize: 16, boxShadow: '0 4px 14px rgba(124,58,237,0.4)'
        }}>入る →</button>
      </div>
    </div>
  )
  return <>{children}</>
}
