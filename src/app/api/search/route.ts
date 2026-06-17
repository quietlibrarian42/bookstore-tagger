import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { Book } from '@/lib/types'

// GET /api/search/similar?isbn=xxx — find similar books by tag overlap
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const isbn = searchParams.get('isbn')?.replace(/[-\s]/g, '')
  if (!isbn) return NextResponse.json({ error: 'isbn required' }, { status: 400 })

  // Fetch the source book
  const { data: source } = await supabase
    .from('books').select('*').eq('isbn_13', isbn).single()
  if (!source) return NextResponse.json({ error: 'Book not found' }, { status: 404 })

  // Fetch all other tagged books
  const { data: allBooks } = await supabase
    .from('books').select('*').eq('needs_tagging', false).neq('isbn_13', isbn)
  if (!allBooks?.length) return NextResponse.json([])

  // Score each book by tag overlap
  const scored = allBooks.map((b: Book) => {
    let score = 0
    const overlap: string[] = []

    // Genre match = 3 points each
    if (source.tag_genre && b.tag_genre) {
      source.tag_genre.forEach((g: string) => {
        if (b.tag_genre?.includes(g)) { score += 3; overlap.push(g) }
      })
    }
    // Subgenre match = 4 points each
    if (source.tag_subgenre && b.tag_subgenre) {
      source.tag_subgenre.forEach((s: string) => {
        if (b.tag_subgenre?.includes(s)) { score += 4; overlap.push(s) }
      })
    }
    // Plot tag match = 2 points each
    if (source.tag_plot && b.tag_plot) {
      source.tag_plot.forEach((p: string) => {
        if (b.tag_plot?.includes(p)) { score += 2; overlap.push(p) }
      })
    }
    // Same series = 10 points
    if (source.series_name && b.series_name === source.series_name) {
      score += 10; overlap.push(`Series: ${source.series_name}`)
    }
    // Same author nationality = 1 point
    if (source.author_nationality && b.author_nationality === source.author_nationality) {
      score += 1
    }
    // Same era = 1 point
    if (source.tag_era && b.tag_era === source.tag_era) {
      score += 1
    }

    return { ...b, _score: score, _overlap: [...new Set(overlap)] }
  })

  // Return top 5 by score
  const similar = scored
    .filter(b => b._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 5)

  return NextResponse.json(similar)
}
