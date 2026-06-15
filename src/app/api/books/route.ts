import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/books — list all books with optional filters
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search    = searchParams.get('search')    || ''
  const genre     = searchParams.get('genre')     || ''
  const age       = searchParams.get('age')       || ''
  const series    = searchParams.get('series')    || ''
  const untagged  = searchParams.get('untagged')  === 'true'

  let query = supabase.from('books').select('*').order('created_at', { ascending: false })

  if (search)   query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%,isbn_13.ilike.%${search}%`)
  if (genre)    query = query.contains('tag_genre', [genre])
  if (age)      query = query.eq('age_suitability', age)
  if (series)   query = query.eq('series_name', series)
  if (untagged) query = query.eq('needs_tagging', true)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/books — add one or many ISBNs
export async function POST(req: NextRequest) {
  const body = await req.json()
  const isbns: string[] = Array.isArray(body.isbns) ? body.isbns : [body.isbn]

  const rows = isbns.map(isbn => ({
    isbn_13: isbn.replace(/[-\s]/g, ''),
    needs_tagging: true,
  }))

  const { data, error } = await supabase
    .from('books')
    .upsert(rows, { onConflict: 'isbn_13', ignoreDuplicates: false })
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ added: data?.length ?? 0, books: data })
}
