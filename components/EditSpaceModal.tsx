'use client'
import { useState } from 'react'
import { supabase, Space } from '@/lib/supabase'

const COLORS = ['#8b5cf6','#3b82f6','#10b981','#f59e0b','#ef4444','#06b6d4','#f97316','#ec4899','#a855f7','#14b8a6','#84cc16','#f43f5e']

export default function EditSpaceModal({ space, onClose, onSaved }: { space: Space; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(space.name)
  const [floor, setFloor] = useState(space.floor)
  const [desc, setDesc] = useState(space.description || '')
  const [color, setColor] = useState(space.color)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const inp: React.CSSProperties = {
    width: '100%', background: '#f1f5f9', color: '#1e293b',
    borderRadius: 12, padding: '10px 16px', border: '1.5px solid #e2e8f0',
    outline: 'none', fontSize: 14, boxSizing: 'border-box',
    fontFamily: 'inherit'
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setLoading(true)
    const { error } = await supabase.from('spaces')
      .update({ name: name.trim(), floor, description: desc || null, color })
      .eq('id', space.id)
    setLoading(false)
    if (error) { alert('保存失敗: ' + error.message); return }
    setSaved(true)
    onSaved()
    setTimeout(() => { setSaved(false); onClose() }, 800)
  }

  const handleDelete = async () => {
    if (!confirm(`「${space.name}」を削除しますか？`)) return
    await supabase.from('spaces').delete().eq('id', space.id)
    onSaved(); onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 420, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 -4px 24px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white' }}>
          <h2 style={{ fontWeight: 700, fontSize: 16, color: '#1e293b', margin: 0 }}>✏️ スペースを編集</h2>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', color: '#64748b', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ color: '#64748b', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>スペース名</label>
            <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="例：音楽スタジオ" />
          </div>
          <div>
            <label style={{ color: '#64748b', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>フロア</label>
            <select style={inp} value={floor} onChange={e => setFloor(Number(e.target.value))}>
              <option value={1}>1F</option>
              <option value={2}>2F</option>
              <option value={3}>3F</option>
            </select>
          </div>
          <div>
            <label style={{ color: '#64748b', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>用途・説明（編集できます）</label>
            <textarea style={{ ...inp, resize: 'none', lineHeight: 1.6 }} rows={5}
              value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="このスペースをどう使うか、どんな体験ができるかを書いてみましょう" />
          </div>
          <div>
            <label style={{ color: '#64748b', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8 }}>カラー</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} style={{
                  width: 32, height: 32, borderRadius: '50%', background: c, border: 'none',
                  cursor: 'pointer', outline: color === c ? `3px solid ${c}` : '2px solid transparent',
                  outlineOffset: 2, transform: color === c ? 'scale(1.15)' : 'scale(1)',
                  transition: 'transform 0.1s'
                }} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, paddingBottom: 4 }}>
            <button onClick={handleDelete} style={{ padding: '10px 14px', borderRadius: 12, background: '#fef2f2', color: '#ef4444', border: '1.5px solid #fecaca', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>削除</button>
            <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 12, background: '#f8fafc', color: '#64748b', border: '1.5px solid #e2e8f0', cursor: 'pointer', fontSize: 13 }}>キャンセル</button>
            <button onClick={handleSave} disabled={!name.trim() || loading}
              style={{ flex: 2, padding: 12, borderRadius: 12, background: saved ? '#10b981' : (loading ? '#94a3b8' : color), color: 'white', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, transition: 'background 0.2s' }}>
              {saved ? '✅ 保存完了！' : loading ? '保存中...' : '保存する'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
