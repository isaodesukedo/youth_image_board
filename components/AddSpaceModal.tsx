'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const COLORS = ['#8b5cf6','#3b82f6','#10b981','#f59e0b','#ef4444','#06b6d4','#f97316','#ec4899','#a855f7','#14b8a6']

const s = {
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '16px' },
  modal: { background: '#1c1917', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: '400px', border: '1px solid #44403c' },
  header: { padding: '16px 20px', borderBottom: '1px solid #292524', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontWeight: 'bold', color: 'white', margin: 0 },
  closeBtn: { background: 'none', border: 'none', color: '#a8a29e', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1 },
  body: { padding: '20px', display: 'flex', flexDirection: 'column' as const, gap: '12px' },
  input: { width: '100%', background: '#292524', color: 'white', borderRadius: '12px', padding: '10px 16px', border: '1px solid #57534e', outline: 'none', fontSize: '0.875rem', boxSizing: 'border-box' as const },
  row: { display: 'flex', gap: '8px' },
  btn: (primary?: boolean) => ({
    flex: 1, padding: '12px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', fontSize: '0.875rem',
    background: primary ? '#7c3aed' : 'transparent', color: 'white',
    border: primary ? 'none' : '1px solid #57534e'
  })
}

export default function AddSpaceModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState('')
  const [floor, setFloor] = useState(1)
  const [desc, setDesc] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [loading, setLoading] = useState(false)

  const handleAdd = async () => {
    if (!name.trim()) return
    setLoading(true)
    await supabase.from('spaces').insert({ name: name.trim(), floor, description: desc || null, color })
    setLoading(false)
    onAdded()
    onClose()
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <h2 style={s.title}>スペースを追加</h2>
          <button style={s.closeBtn} onClick={onClose}>×</button>
        </div>
        <div style={s.body}>
          <input style={s.input} placeholder="スペース名（例：音楽スタジオ、工作スペース）" value={name} onChange={e => setName(e.target.value)} />
          <select style={s.input} value={floor} onChange={e => setFloor(Number(e.target.value))}>
            <option value={1}>1F</option>
            <option value={2}>2F</option>
            <option value={3}>3F</option>
          </select>
          <textarea style={{ ...s.input, resize: 'none' }} rows={2} placeholder="説明（任意）" value={desc} onChange={e => setDesc(e.target.value)} />
          <div>
            <p style={{ color: '#a8a29e', fontSize: '0.75rem', margin: '0 0 8px' }}>カラー</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} style={{
                  width: '28px', height: '28px', borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
                  outline: color === c ? `3px solid ${c}` : 'none', outlineOffset: '2px'
                }} />
              ))}
            </div>
          </div>
          <div style={s.row}>
            <button style={s.btn()} onClick={onClose}>キャンセル</button>
            <button style={s.btn(true)} onClick={handleAdd} disabled={!name.trim() || loading}>
              {loading ? '追加中...' : '追加する'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
