'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Book } from '@/lib/types'
import BookCard from '@/components/BookCard'

export default function Home() {
  const [books,       setBooks]       = useState<Book[]>([])
  const [loading,     setLoading]     = useState(true)
  const [taggingAll,  setTaggingAll]  = useState(false)
  const [tagResult,   setTagResult]   = useState<string | null>(null)
  const [search,      setSearch]      = useState('')
  const [genreFilter, setGenreFilter] = useState('')
  const [ageFilter,   setAgeFilter]   = useState('')
  const [isbnInput,   setIsbnInput]   = useState('')
  const [adding,      setAdding]      = useState(false)
  const [addMsg,      setAddMsg]      = useState<string | null>(null)

  const fetchBooks = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search)      params.set('search', search)
    if (genreFilter) params.set('genre',  genreFilter)
    if (ageFilter)   params.set('age',    ageFilter)
    const res  = await fetch(`/api/books?${params}`)
    const data = await res.json()
    setBooks(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [search, genreFilter, ageFilter])

  useEffect(() => { fetchBooks() }, [fetchBooks])

  // Real-time subscription — updates UI instantly when tags are written
  useEffect(() => {
    const channel = supabase
      .channel('books-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'books' }, () => {
        fetchBooks()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchBooks])

  async function addBooks() {
    const isbns = isbnInput.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
    if (!isbns.length) return
    setAdding(true)
    setAddMsg(null)
    const res  = await fetch('/api/books', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ isbns }),
    })
    const data = await res.json()
    setAddMsg(`Added ${data.added} book${data.added === 1 ? '' : 's'} — ready to tag`)
    setIsbnInput('')
    setAdding(false)
    fetchBooks()
  }

  async function tagAllUntagged() {
    setTaggingAll(true)
    setTagResult(null)
    const res  = await fetch('/api/tag', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({}),
    })
    const data = await res.json()
    setTagResult(`Tagged ${data.tagged} book${data.tagged === 1 ? '' : 's'}${data.errors ? `, ${data.errors} error(s)` : ''}`)
    setTaggingAll(false)
    fetchBooks()
  }

  const untaggedCount = books.filter(b => b.needs_tagging).length
  const allGenres = [...new Set(books.flatMap(b => b.tag_genre || []))].sort()

  return (
    <div className="min-h-screen bg-[#fdf6ee]">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Bookstore Tagger</h1>
          <p className="text-sm text-stone-500">{books.length} books · {untaggedCount} untagged</p>
        </div>
        {untaggedCount > 0 && (
          <button
            onClick={tagAllUntagged}
            disabled={taggingAll}
            className="px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {taggingAll ? `Tagging ${untaggedCount} book${untaggedCount === 1 ? '' : 's'}…` : `Tag ${untaggedCount} untagged book${untaggedCount === 1 ? '' : 's'}`}
          </button>
        )}
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* Add books panel */}
        <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
          <h2 className="font-medium text-stone-800">Add books by ISBN</h2>
          <p className="text-sm text-stone-500">Paste one ISBN per line, or separate with commas. New shipment? Paste them all at once.</p>
          <textarea
            value={isbnInput}
            onChange={e => setIsbnInput(e.target.value)}
            placeholder={"978-0-00-871063-7\n978-0-670-08882-9\n978-1-8486-6792-1"}
            rows={4}
            className="w-full border border-stone-200 rounded-lg p-3 text-sm font-mono text-stone-800 placeholder-stone-300 focus:outline-none focus:border-brand-400 resize-none"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={addBooks}
              disabled={adding || !isbnInput.trim()}
              className="px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-lg hover:bg-stone-700 disabled:opacity-40 transition-colors"
            >
              {adding ? 'Adding…' : 'Add to inventory'}
            </button>
            {addMsg && <span className="text-sm text-green-700">{addMsg}</span>}
          </div>
        </div>

        {tagResult && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
            ✓ {tagResult}
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search title, author, ISBN…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] h-9 px-3 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none focus:border-brand-400"
          />
          <select
            value={genreFilter}
            onChange={e => setGenreFilter(e.target.value)}
            className="h-9 px-3 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none"
          >
            <option value="">All genres</option>
            {allGenres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select
            value={ageFilter}
            onChange={e => setAgeFilter(e.target.value)}
            className="h-9 px-3 border border-stone-200 rounded-lg text-sm bg-white focus:outline-none"
          >
            <option value="">All ages</option>
            <option>Children (under 8)</option>
            <option>Middle grade (8-12)</option>
            <option>Young adult (13-17)</option>
            <option>Adult (18+)</option>
            <option>All ages</option>
          </select>
        </div>

        {/* Book list */}
        {loading ? (
          <div className="text-center py-12 text-stone-400 text-sm">Loading…</div>
        ) : books.length === 0 ? (
          <div className="text-center py-12 text-stone-400 text-sm">
            No books yet — add some ISBNs above to get started
          </div>
        ) : (
          <div className="space-y-3">
            {books.map(book => (
              <BookCard key={book.isbn_13} book={book} onTagged={fetchBooks} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
