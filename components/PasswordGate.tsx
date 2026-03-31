'use client'
import { useState, useEffect } from 'react'

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const saved = sessionStorage.getItem('basho_authed')
    if (saved === 'true') setAuthed(true)
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
    <div style={{
      minHeight: '100vh', background: '#0c0a09', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '16px'
    }}>
      <div style={{
        background: '#1c1917', borderRadius: '16px', padding: '32px',
        width: '100%', maxWidth: '320px', border: '1px solid #44403c'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🏠</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', margin: '0 0 4px' }}>場作りボード</h1>
        <p style={{ color: '#a8a29e', fontSize: '0.875rem', margin: '0 0 24px' }}>パスワードを入力してください</p>
        <input
          type="password"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="パスワード"
          autoFocus
          style={{
            width: '100%', background: '#292524', color: 'white',
            borderRadius: '12px', padding: '12px 16px', marginBottom: '16px',
            border: `1px solid ${error ? '#ef4444' : '#57534e'}`, outline: 'none',
            fontSize: '1rem', boxSizing: 'border-box'
          }}
        />
        <button
          onClick={handleSubmit}
          style={{
            width: '100%', background: '#7c3aed', color: 'white',
            borderRadius: '12px', padding: '12px', fontWeight: '600',
            border: 'none', cursor: 'pointer', fontSize: '1rem'
          }}
        >入る</button>
        {error && <p style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '12px', textAlign: 'center' }}>パスワードが違います</p>}
      </div>
    </div>
  )

  return <>{children}</>
}
