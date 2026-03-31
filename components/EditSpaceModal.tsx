'use client'
import { useState } from 'react'
import { supabase, Space } from '@/lib/supabase'

const COLORS = ['#8b5cf6','#3b82f6','#10b981','#f59e0b','#ef4444','#06b6d4','#f97316','#ec4899','#a855f7','#14b8a6']
const inp = { width: '100%', background: '#292524', color: 'white', borderRadius: 12, padding: '10px 16px', border: '1px solid #57534e', outline: 'none', fontSize: 14, boxSizing: 'border-box' as const }

export default function EditSpaceModal({ space, onClose, onSaved }: { space: Space; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(space.name)
  const [floor, setFloor] = useState(space.floor)
  const [desc, setDesc] = useState(space.description || '')
  const [color, setColor] = useState(space.color)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setLoading(true)
    await supabase.from('spaces').update({ name: name.trim(), floor, description: desc || null, color }).eq('id', space.id)
    setLoading(false)
    onSaved()
    onClose()
  }

  const handleDelete = async () => {
    if (!confirm(`「${space.name}」を削除しますか？`)) return
    await supabase.from('spaces').delete().eq('id', space.id)
    onSaved()
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#1c1917', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 400, border: '1px solid #44403c' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #292524', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontWeight: 500, fontSize: 16 }}>スペースを編集</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#a8a29e', fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <p style={{ color: '#a8a29e', fontSize: 12, marginBottom: 6 }}>スペース名</p>
            <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="例：音楽スタジオ" />
          </div>
          <div>
            <p style={{ color: '#a8a29e', fontSize: 12, marginBottom: 6 }}>フロア</p>
            <select style={inp} value={floor} onChange={e => setFloor(Number(e.target.value))}>
              <option value={1}>1F</option>
              <option value={2}>2F</option>
              <option value={3}>3F</option>
            </select>
          </div>
          <div>
            <p style={{ color: '#a8a29e', fontSize: 12, marginBottom: 6 }}>用途・説明</p>
            <textarea style={{ ...inp, resize: 'none' }} rows={3} value={desc} onChange={e => setDesc(e.target.value)} placeholder="このスペースをどう使うか（例：週末に音楽練習できる場所）" />
          </div>
          <div>
            <p style={{ color: '#a8a29e', fontSize: 12, marginBottom: 8 }}>カラー</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer', outline: color === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <button onClick={handleDelete} style={{ padding: '10px 16px', borderRadius: 12, background: 'transparent', color: '#ef4444', border: '1px solid #ef444455', cursor: 'pointer', fontSize: 14 }}>削除</button>
            <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 12, background: 'transparent', color: 'white', border: '1px solid #57534e', cursor: 'pointer', fontSize: 14 }}>キャンセル</button>
            <button onClick={handleSave} disabled={!name.trim() || loading} style={{ flex: 1, padding: 10, borderRadius: 12, background: '#7c3aed', color: 'white', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, opacity: !name.trim() ? 0.5 : 1 }}>
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
