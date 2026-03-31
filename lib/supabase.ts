import { createClient } from '@supabase/supabase-js'

export type Space = {
  id: string
  name: string
  floor: number
  description: string | null
  color: string
  created_at: string
}

export type ImageItem = {
  id: string
  space_id: string
  storage_path: string
  public_url: string
  title: string | null
  reason: string | null
  experience: string | null
  author_name: string
  created_at: string
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)
