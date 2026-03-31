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
    <div style={{ minHeight: '100vh', background: '#0c0a09', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#1c1917', borderRadius: 16, padding: 32, width: '100%', maxWidth: 320, border: '1px solid #44403c' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🏠</div>
        <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 4 }}>場作りボード</h1>
        <p style={{ color: '#a8a29e', fontSize: 14, marginBottom: 24 }}>パスワードを入力してください</p>
        <input
          type="password" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="パスワード" autoFocus
          style={{ width: '100%', background: '#292524', color: 'white', borderRadius: 12, padding: '12px 16px', marginBottom: 16, border: `1px solid ${error ? '#ef4444' : '#57534e'}`, outline: 'none', fontSize: 16, boxSizing: 'border-box' }}
        />
        <button onClick={handleSubmit}
          style={{ width: '100%', background: '#7c3aed', color: 'white', borderRadius: 12, padding: 12, fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: 16 }}>
          入る
        </button>
        {error && <p style={{ color: '#ef4444', fontSize: 14, marginTop: 12, textAlign: 'center' }}>パスワードが違います</p>}
      </div>
    </div>
  )
  return <>{children}</>
}
