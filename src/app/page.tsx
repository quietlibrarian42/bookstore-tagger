'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Book } from '@/lib/types'
import BookCard from '@/components/BookCard'

export default function Home() {
  const [books,       setBooks]       = useState<Book[]>([])
  const [loading,     setLoading]     = useState(true)
  const [taggingAll,  setTaggingAll]  = useState(false)
  const [tagProgress, setTagProgress] = useState(0)
  const [tagTotal,    setTagTotal]    = useState(0)
  const [tagResult,   setTagResult]   = useState<string | null>(null)
  const [search,      setSearch]      = useState('')
  const [genreFilter, setGenreFilter] = useState('')
  const [ageFilter,   setAgeFilter]   = useState('')
  const [isbnInput,   setIsbnInput]   = useState('')
  const [adding,      setAdding]      = useState(false)
  const [addMsg,      setAddMsg]      = useState<string | null>(null)
  const pauseRealtime = useRef(false)

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

  // Real-time subscription — paused during bulk tagging
  useEffect(() => {
    const channel = supabase
      .channel('books-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'books' }, () => {
        if (!pauseRealtime.current) fetchBooks()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchBooks])

  async function addBooks() {
const allIsbns = isbnInput.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
    const isbns = allIsbns.slice(0, 100)
    if (allIsbns.length > 100) {
      setAddMsg(`Note: only the first 100 of ${allIsbns.length} ISBNs will be added`)
      await new Promise(r => setTimeout(r, 1500))
    }    
	if (!isbns.length) return
    setAdding(true)
    setAddMsg(null)
    const res  = await fetch('/api/books', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ isbns }),
    })
    const data = await res.json()
    const count = data.added ?? 0
    const dupeCount = data.duplicates?.length ?? 0
    let msg = `Added ${count} book${count === 1 ? '' : 's'} — ready to tag`
    if (dupeCount > 0) {
      msg += ` · ${dupeCount} already in inventory: ${data.duplicates.join(', ')}`
    }
    setAddMsg(prev => allIsbns.length > 100 ? `${msg} (${allIsbns.length - 100} skipped)` : msg)
    setIsbnInput('')
    setAdding(false)
    fetchBooks()
  }

  async function tagAllUntagged() {
    const untagged = books.filter(b => b.needs_tagging)
    if (!untagged.length) return

    // Pause real-time updates during tagging
    pauseRealtime.current = true
    setTaggingAll(true)
    setTagResult(null)
    setTagProgress(0)
    setTagTotal(untagged.length)

    let tagged = 0
    let errors = 0

    // Tag one book at a time so we can update the progress bar
    for (const book of untagged) {
      try {
        const res = await fetch('/api/tag', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ isbn: book.isbn_13 }),
        })
        const data = await res.json()
        if (data.tagged > 0) tagged++
        else errors++
      } catch {
        errors++
      }
      setTagProgress(p => p + 1)
    }

    // All done — resume real-time, do one final refresh
    pauseRealtime.current = false
    setTaggingAll(false)
    setTagResult(`Tagged ${tagged} book${tagged === 1 ? '' : 's'}${errors ? `, ${errors} error(s)` : ''}`)
    fetchBooks()
  }

  const untaggedCount = books.filter(b => b.needs_tagging).length
  const allGenres = [...new Set(books.flatMap(b => b.tag_genre || []))].sort()
  const progressPct = tagTotal > 0 ? Math.round((tagProgress / tagTotal) * 100) : 0

  return (
    <div className="min-h-screen bg-[#fdf6ee]">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Bookstore Tagger</h1>
          <p className="text-sm text-stone-500">{books.length} books · {untaggedCount} untagged</p>
        </div>
        {untaggedCount > 0 && !taggingAll && (
          <button
            onClick={tagAllUntagged}
            className="px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors"
          >
            Tag {untaggedCount} untagged book{untaggedCount === 1 ? '' : 's'}
          </button>
        )}
      </header>

      {taggingAll && (
        <div style={{position:'fixed',inset:0,background:'rgba(10,8,5,0.85)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50}}>
          <div style={{background:'#1C1510',borderRadius:16,padding:'2rem',width:320,textAlign:'center',border:'0.5px solid #3A2E22'}}>

            {/* Book */}
            <div style={{width:240,height:160,margin:'0 auto 1.5rem',position:'relative'}}>
              <svg style={{position:'absolute',top:0,left:0,width:240,height:160,overflow:'visible'}} viewBox="0 0 240 160" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="120" cy="155" rx="100" ry="5" fill="#000" opacity="0.4"/>
                <rect x="8"  y="14" width="107" height="128" rx="2" fill="#D8C898" stroke="#9A8660" strokeWidth="0.5"/>
                <rect x="10" y="16" width="103" height="124" rx="1" fill="#EDE0C0"/>
                <path d="M20 36 Q35 33 50 36 Q65 39 80 36 Q92 33 104 35"       fill="none" stroke="#8B6F3A" strokeWidth="1.2" opacity="0.55" strokeLinecap="round"/>
                <path d="M20 48 Q40 45 58 48 Q74 51 90 48 Q98 46 104 47"       fill="none" stroke="#8B6F3A" strokeWidth="1"   opacity="0.45" strokeLinecap="round"/>
                <path d="M20 60 Q32 57 48 60 Q66 63 84 60 Q96 58 104 59"       fill="none" stroke="#8B6F3A" strokeWidth="1.3" opacity="0.5"  strokeLinecap="round"/>
                <path d="M20 72 Q38 69 55 72 Q70 75 85 72 Q94 70 100 71"       fill="none" stroke="#8B6F3A" strokeWidth="0.9" opacity="0.4"  strokeLinecap="round"/>
                <path d="M20 84 Q36 81 52 84 Q68 87 86 84 Q96 82 104 83"       fill="none" stroke="#8B6F3A" strokeWidth="1.1" opacity="0.5"  strokeLinecap="round"/>
                <path d="M20 96 Q34 93 50 96 Q67 99 82 96 Q93 94 104 95"       fill="none" stroke="#8B6F3A" strokeWidth="1"   opacity="0.42" strokeLinecap="round"/>
                <path d="M20 108 Q40 105 58 108 Q76 111 92 108 Q99 106 104 107" fill="none" stroke="#8B6F3A" strokeWidth="1.2" opacity="0.48" strokeLinecap="round"/>
                <path d="M20 120 Q33 117 47 120 Q63 123 78 120 Q90 118 100 119" fill="none" stroke="#8B6F3A" strokeWidth="0.9" opacity="0.38" strokeLinecap="round"/>
                <path d="M20 132 Q36 129 52 132 Q66 135 80 132 Q90 130 98 131" fill="none" stroke="#8B6F3A" strokeWidth="1"   opacity="0.43" strokeLinecap="round"/>
                <rect x="125" y="14" width="107" height="128" rx="2" fill="#D8C898" stroke="#9A8660" strokeWidth="0.5"/>
                <rect x="127" y="16" width="103" height="124" rx="1" fill="#EDE0C0"/>
                <path d="M137 36 Q154 33 172 36 Q188 39 204 36 Q216 33 228 35"      fill="none" stroke="#8B6F3A" strokeWidth="1.2" opacity="0.55" strokeLinecap="round"/>
                <path d="M137 48 Q156 45 174 48 Q190 51 206 48 Q218 46 228 47"      fill="none" stroke="#8B6F3A" strokeWidth="1"   opacity="0.45" strokeLinecap="round"/>
                <path d="M137 60 Q152 57 168 60 Q186 63 202 60 Q216 58 228 59"      fill="none" stroke="#8B6F3A" strokeWidth="1.3" opacity="0.5"  strokeLinecap="round"/>
                <path d="M137 72 Q155 69 170 72 Q186 75 200 72 Q212 70 224 71"      fill="none" stroke="#8B6F3A" strokeWidth="0.9" opacity="0.4"  strokeLinecap="round"/>
                <path d="M137 84 Q153 81 168 84 Q185 87 202 84 Q214 82 228 83"      fill="none" stroke="#8B6F3A" strokeWidth="1.1" opacity="0.5"  strokeLinecap="round"/>
                <path d="M137 96 Q150 93 166 96 Q183 99 198 96 Q212 94 228 95"      fill="none" stroke="#8B6F3A" strokeWidth="1"   opacity="0.42" strokeLinecap="round"/>
                <path d="M137 108 Q155 105 172 108 Q190 111 206 108 Q218 106 228 107" fill="none" stroke="#8B6F3A" strokeWidth="1.2" opacity="0.48" strokeLinecap="round"/>
                <path d="M137 120 Q152 117 167 120 Q182 123 196 120 Q210 118 224 119" fill="none" stroke="#8B6F3A" strokeWidth="0.9" opacity="0.38" strokeLinecap="round"/>
                <path d="M137 132 Q154 129 170 132 Q186 135 200 132 Q212 130 222 131" fill="none" stroke="#8B6F3A" strokeWidth="1"   opacity="0.43" strokeLinecap="round"/>
                <rect x="113" y="10" width="14" height="136" rx="1" fill="#4A3020"/>
                <rect x="116" y="12" width="8"  height="132" rx="1" fill="#2E1C0E"/>
                <line x1="8"   y1="14" x2="8"   y2="142" stroke="#7A6840" strokeWidth="2"/>
                <line x1="232" y1="14" x2="232" y2="142" stroke="#7A6840" strokeWidth="2"/>
              </svg>

              {/* Flip animation layer */}
              <style>{`
                @keyframes flipPage {
                  0%   { transform: perspective(400px) rotateY(0deg);    opacity: 1; }
                  50%  { transform: perspective(400px) rotateY(-90deg);  opacity: 0.8; }
                  100% { transform: perspective(400px) rotateY(-180deg); opacity: 0; }
                }
                .page-flip-anim {
                  position: absolute;
                  right: 5px;
                  top: 14px;
                  width: 103px;
                  height: 124px;
                  background: #EDE0C0;
                  border: 0.5px solid #C4AA78;
                  border-radius: 0 3px 3px 0;
                  transform-origin: left center;
                  animation: flipPage 0.6s ease-in-out forwards;
                  overflow: hidden;
                  pointer-events: none;
                }
              `}</style>

              {[...Array(tagProgress)].map((_, i) => (
                <div key={i} className="page-flip-anim" style={{animationDelay: `${i * 0.01}s`}}>
                  <svg width="103" height="124" viewBox="0 0 103 124" xmlns="http://www.w3.org/2000/svg">
                    {[18,30,42,54,66,78,90,102].map((y, j) => {
                      const w = [80,95,70,90,60,88,75,85][j]
                      return <path key={y} d={`M8 ${y} Q${8+w*0.25} ${y-3} ${8+w*0.5} ${y} Q${8+w*0.75} ${y+3} ${8+w} ${y}`} fill="none" stroke="#8B6F3A" strokeWidth="1.1" opacity="0.5" strokeLinecap="round"/>
                    })}
                  </svg>
                </div>
              ))}
            </div>

            <div style={{fontSize:15,fontWeight:500,color:'#E8DCC8',marginBottom:4,fontFamily:'Georgia, serif'}}>Tagging your books…</div>
            <div style={{fontSize:13,color:'#8A7A68',marginBottom:'1.25rem'}}>{tagProgress} of {tagTotal} done</div>
            <div style={{height:7,background:'#2C2218',borderRadius:20,overflow:'hidden',marginBottom:8,border:'0.5px solid #3A2E22'}}>
              <div style={{height:'100%',borderRadius:20,background:'#9B7D52',width:`${progressPct}%`,transition:'width 0.4s ease'}}/>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#6A5A48'}}>
              <span>{progressPct}% complete</span>
              <span>{tagTotal - tagProgress} remaining</span>
            </div>
          </div>
        </div>
      )}

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