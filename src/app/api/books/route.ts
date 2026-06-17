import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'

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

    if (!isbns.length) return NextResponse.json({ added: 0, books: [], duplicates: [] })

    // Check which ISBNs already exist
    const { data: existing } = await supabase
      .from('books')
      .select('isbn_13')
      .in('isbn_13', isbns)

    const existingIsbns = new Set(existing?.map((b: {isbn_13: string}) => b.isbn_13) || [])
    const newIsbns      = isbns.filter(isbn => !existingIsbns.has(isbn))
    const duplicates    = isbns.filter(isbn => existingIsbns.has(isbn))

    let added = 0
    let books: unknown[] = []

    if (newIsbns.length) {
      const rows = newIsbns.map(isbn => ({ isbn_13: isbn, needs_tagging: true }))
      const { data, error } = await supabase
        .from('books')
        .insert(rows)
        .select()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      added = data?.length ?? 0
      books = data ?? []
    }

    return NextResponse.json({ added, books, duplicates })
  } catch (e) {
    console.error('POST error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}