import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const genre  = searchParams.get('genre')  || ''
    const age    = searchParams.get('age')    || ''

    let query = supabase.from('books').select('*').order('created_at', { ascending: false })

    if (search) query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%,isbn_13.ilike.%${search}%`)
    if (age)    query = query.eq('age_suitability', age)

    const { data, error } = await query

    if (error) {
      console.error('Supabase GET error:', JSON.stringify(error))
      return NextResponse.json({ error: error.message, details: error }, { status: 500 })
    }

    const filtered = genre && data
      ? data.filter((b: {tag_genre?: string[]}) => b.tag_genre?.includes(genre))
      : data

    return NextResponse.json(filtered ?? [])
  } catch (e) {
    console.error('GET crash:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body  = await req.json()
    const raw: string[] = Array.isArray(body.isbns) ? body.isbns : [body.isbn]
    const isbns = raw.map(i => i.replace(/[-\s]/g, '')).filter(Boolean)

    if (!isbns.length) return NextResponse.json({ added: 0, books: [] })

    const rows = isbns.map(isbn => ({ isbn_13: isbn, needs_tagging: true }))

    const { data, error } = await supabase
      .from('books')
      .upsert(rows, { onConflict: 'isbn_13', ignoreDuplicates: false })
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ added: data?.length ?? 0, books: data ?? [] })
  } catch (e) {
    console.error('POST error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}