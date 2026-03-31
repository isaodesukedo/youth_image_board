'use client'
import { useEffect, useState } from 'react'
import { supabase, Space } from '@/lib/supabase'
import PasswordGate from '@/components/PasswordGate'
import AddSpaceModal from '@/components/AddSpaceModal'
import { useRouter } from 'next/navigation'

const FLOOR_BG: Record<number, string> = { 1: '#4c1d95', 2: '#1e3a5f', 3: '#064e3b' }
const FLOOR_ACCENT: Record<number, string> = { 1: '#8b5cf6', 2: '#3b82f6', 3: '#10b981' }

export default function Home() {
  const [spaces, setSpaces] = useState<Space[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [addOpen, setAddOpen] = useState(false)
  const router = useRouter()

  const load = async () => {
    const { data: s } = await supabase.from('spaces').select('*').order('floor').order('created_at', { ascending: true })
    const { data: imgs } = await supabase.from('images').select('space_id')
    const c: Record<string, number> = {}
    imgs?.forEach(i => { c[i.space_id] = (c[i.space_id] || 0) + 1 })
    setSpaces(s || [])
    setCounts(c)
  }

  useEffect(() => { load() }, [])

  return (
    <PasswordGate>
      <main style={{ minHeight: '100vh', background: '#0c0a09', color: 'white', paddingBottom: '80px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '32px 16px' }}>

          {/* Header */}
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: '0 0 4px', letterSpacing: '-0.02em' }}>🏠 場作りボード</h1>
            <p style={{ color: '#a8a29e', fontSize: '0.875rem', margin: 0 }}>スペースをタップしてイメージを共創しよう</p>
          </div>

          {/* Floors */}
          {[1, 2, 3].map(floor => {
            const floorSpaces = spaces.filter(s => s.floor === floor)
            return (
              <div key={floor} style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ width: '8px', height: '24px', borderRadius: '4px', background: FLOOR_ACCENT[floor] }} />
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', margin: 0 }}>{floor}F</h2>
                  <span style={{ color: '#78716c', fontSize: '0.875rem' }}>{floorSpaces.length}スペース</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  {floorSpaces.map(space => (
                    <button
                      key={space.id}
                      onClick={() => router.push(`/space/${space.id}`)}
                      style={{
                        borderRadius: '12px', padding: '16px', textAlign: 'left', cursor: 'pointer',
                        background: space.color + '1a', border: `1px solid ${space.color}55`,
                        color: 'white', transition: 'transform 0.15s'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
                      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: space.color, marginBottom: '8px' }} />
                      <div style={{ fontWeight: '600', fontSize: '0.9rem', lineHeight: 1.3 }}>{space.name}</div>
                      {space.description && (
                        <div style={{ color: '#78716c', fontSize: '0.75rem', marginTop: '4px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{space.description}</div>
                      )}
                      <div style={{ color: space.color, fontSize: '0.75rem', marginTop: '8px' }}>
                        {counts[space.id] ? `📷 ${counts[space.id]}枚` : '画像なし'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Add space */}
          <button
            onClick={() => setAddOpen(true)}
            style={{
              width: '100%', background: 'transparent', border: '1px dashed #57534e',
              color: '#78716c', borderRadius: '12px', padding: '16px', cursor: 'pointer',
              fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            <span style={{ fontSize: '1.125rem' }}>＋</span> スペースを追加
          </button>
        </div>

        {addOpen && <AddSpaceModal onClose={() => setAddOpen(false)} onAdded={load} />}
      </main>
    </PasswordGate>
  )
}
