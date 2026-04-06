'use client'
import { useState, useEffect } from 'react'

const ADMIN_PASSWORD = '54321'

export default function AdminPasswordGate({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('admin_authed') === 'true') { onSuccess() }
  }, [])

  const handleSubmit = () => {
    if (input === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_authed', 'true')
      onSuccess()
    } else {
      setError(true)
      setTimeout(() => setError(false), 1500)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onCancel}>
      <div style={{ background: 'white', borderRadius: 20, padding: 28, width: '100%', maxWidth: 320, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 32, marginBottom: 8, textAlign: 'center' }}>🔐</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', textAlign: 'center', margin: '0 0 6px' }}>管理者モード</h2>
        <p style={{ color: '#64748b', fontSize: 13, textAlign: 'center', margin: '0 0 20px' }}>管理者パスワードを入力してください</p>
        <input
          type="password" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="管理者パスワード" autoFocus
          style={{ width: '100%', background: '#f8fafc', color: '#1e293b', borderRadius: 12, padding: '12px 16px', marginBottom: 12, border: `2px solid ${error ? '#ef4444' : '#e2e8f0'}`, outline: 'none', fontSize: 16, boxSizing: 'border-box', fontFamily: 'inherit', textAlign: 'center', letterSpacing: '0.1em' }}
        />
        {error && <p style={{ color: '#ef4444', fontSize: 13, fontWeight: 600, margin: '0 0 12px', textAlign: 'center' }}>パスワードが違います</p>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: 12, borderRadius: 12, background: '#f1f5f9', color: '#64748b', border: 'none', cursor: 'pointer', fontSize: 14 }}>キャンセル</button>
          <button onClick={handleSubmit} style={{ flex: 2, padding: 12, borderRadius: 12, background: '#7c3aed', color: 'white', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>確認</button>
        </div>
      </div>
    </div>
  )
}
