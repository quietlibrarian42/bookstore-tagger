import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'

import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Fetch book metadata from Google Books API (free, no key needed for basic use)
async function fetchMetadata(isbn: string) {
  const clean = isbn.replace(/[-\s]/g, '')
  try {
	const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${clean}&key=${process.env.GOOGLE_BOOKS_API_KEY}`)    
	const data = await res.json()
    console.log(`Google Books response for ${clean}:`, JSON.stringify(data).slice(0, 200))
    if (!data.items?.length) return null
    const info = data.items[0].volumeInfo
    return {
      title:         info.title,
      authors:       info.authors,
      publisher:     info.publisher,
      publishedDate: info.publishedDate,
      description:   info.description,
      pageCount:     info.pageCount,
      categories:    info.categories,
      language:      info.language,
    }
  } catch (e) {
    console.error(`fetchMetadata error for ${clean}:`, e)
    return null
  }
}
// Ask Claude to generate structured tags from the metadata
async function generateTags(isbn: string, meta: Record<string, unknown>) {
  const prompt = `You are a professional librarian and book curator tagging books for an independent bookstore.

Given the following book metadata, return a JSON object with tags. Be precise, thorough, and think about what a bookstore customer would want to filter by.

Book metadata:
ISBN: ${isbn}
${JSON.stringify(meta, null, 2)}

Return ONLY a valid JSON object with these exact fields (no markdown, no explanation):
{
  "title": "full title",
  "author": "primary author full name",
  "translator": "translator name or null",
  "illustrator": "illustrator name or null",
  "publisher": "publisher name",
  "publish_date": "publication date of this edition (year or full date)",
  "original_publish_date": "very first publication date of this work in any language",
  "original_language": "language the book was originally written in (e.g. English, Japanese, French)",
  "pages": number or null,
  "author_nationality": "country the author is most associated with",
  "author_country_of_birth": "country where author was born",
  "author_gender": "Male / Female / Non-binary / Unknown",
  "series_name": "name of book series or null",
  "series_number": number or null,
  "tag_genre": ["array", "of", "genres", "can", "be", "multiple e.g. Literary Fiction and Crime Fiction"],
  "tag_subgenre": ["array", "of", "subgenres"],
  "tag_era": "decade the book was written e.g. 2020s, 1950s",
  "tag_awards": ["array of awards won or shortlisted for, with year if known"],
  "tag_plot": ["array of plot descriptors e.g. Female lead, Happy ending, Non-linear, Dark themes, Based on true events, Food & cooking, Murder, Friendship, Coming-of-age, Class mobility etc — be generous, include 6-10 descriptors"],
  "tag_author_bg": ["array e.g. Female, Japanese, Contemporary, Debut author"],
"content_warnings": ["Select ONLY from this fixed list, and ONLY if strongly present in the book. Return an empty array for most books. The list: Sexual content, Graphic violence, Death of a child, Child abuse, Sexual abuse, Domestic violence, Suicide, Self-harm, Drug use, Eating disorders, Racism, Animal cruelty. DO NOT invent new warnings. DO NOT include plot elements like betrayal, war, imprisonment, or death of adults. A content warning means a sensitive reader or parent needs to know before picking up the book."],
"age_suitability": "one of: Children (under 8) | Middle grade (8-12) | Young adult (13-17) | Adult (18+) | All ages. Use Adult (18+) ONLY for books with explicit sexual content, extreme graphic violence, or very heavy themes like addiction or abuse. Classic literary novels, adventure stories, mysteries and general literary fiction should typically be Young adult (13-17) or lower unless explicitly adult in content."}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return JSON.parse(text.replace(/```json|```/g, '').trim())
}

// POST /api/tag — tag all untagged books, or a specific ISBN
export async function POST(req: NextRequest) {
  const body = await req.json()
  const specificIsbn = body.isbn || null

  // Fetch books that need tagging
  let query = supabase.from('books').select('*').eq('needs_tagging', true)
  if (specificIsbn) query = query.eq('isbn_13', specificIsbn.replace(/[-\s]/g, ''))
  const { data: books, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!books?.length) return NextResponse.json({ message: 'No books to tag', tagged: 0 })

  const results = []
  const errors  = []

for (const book of books) {
    try {
      // 1. Fetch metadata from Google Books
      const meta = await fetchMetadata(book.isbn_13)
      if (!meta) {
        errors.push({ isbn: book.isbn_13, error: 'No metadata found' })
        continue
      }

      // 2. Write basic metadata immediately
      await supabase
        .from('books')
        .update({
          title:        meta.title || null,
          author:       meta.authors?.[0] || null,
          publisher:    meta.publisher || null,
          publish_date: meta.publishedDate || null,
          pages:        meta.pageCount || null,
          raw_metadata: meta,
        })
        .eq('isbn_13', book.isbn_13)

      // 3. Generate tags via Claude
      let tags = null
      try {
        tags = await generateTags(book.isbn_13, meta)
      } catch (claudeError: unknown) {
        const msg = claudeError instanceof Error ? claudeError.message : JSON.stringify(claudeError)
        console.error(`Claude error for ${book.isbn_13}:`, msg)
        errors.push({ isbn: book.isbn_13, error: `Claude failed: ${msg}` })
        results.push({ isbn: book.isbn_13, title: meta.title })
        continue
      }

      // 4. Write Claude tags
      const { error: updateError } = await supabase
        .from('books')
        .update({
          ...tags,
          needs_tagging: false,
          tagged_at:     new Date().toISOString(),
        })
        .eq('isbn_13', book.isbn_13)

      if (updateError) {
        errors.push({ isbn: book.isbn_13, error: updateError.message })
      } else {
        results.push({ isbn: book.isbn_13, title: tags.title })
      }

      await new Promise(r => setTimeout(r, 500))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : JSON.stringify(e)
      console.error(`Error tagging ${book.isbn_13}:`, msg)
      errors.push({ isbn: book.isbn_13, error: msg })
    }
  }

  return NextResponse.json({
    tagged: results.length,
    errors: errors.length,
    results,
    errors_detail: errors,
  })
}
