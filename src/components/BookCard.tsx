'use client'
import { useState } from 'react'
import { Book } from '@/lib/types'

const GENRE_COLORS: Record<string, string> = {
  'Literary Fiction':                   'bg-purple-100 text-purple-800',
  'Crime Fiction':                      'bg-red-100 text-red-800',
  'True Crime / Narrative Non-fiction': 'bg-orange-100 text-orange-800',
  'Non-fiction':                        'bg-orange-100 text-orange-800',
  'Wuxia / Martial Arts Fantasy':       'bg-green-100 text-green-800',
  'Fantasy':                            'bg-green-100 text-green-800',
  'Children\'s Fiction':                'bg-yellow-100 text-yellow-800',
  'Science Fiction':                    'bg-blue-100 text-blue-800',
}

function Badge({ text, color }: { text: string; color: string }) {
  return <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{text}</span>
}

export default function BookCard({ book, onTagged }: { book: Book; onTagged?: () => void }) {
  const [expanded, setExpanded]   = useState(false)
  const [similar,  setSimilar]    = useState<Book[]>([])
  const [loadingSim, setLoadingSim] = useState(false)
  const [tagging,  setTagging]    = useState(false)

  const genreColor = (g: string) => GENRE_COLORS[g] || 'bg-gray-100 text-gray-700'

  async function tagThis() {
    setTagging(true)
    await fetch('/api/tag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isbn: book.isbn_13 }),
    })
    setTagging(false)
    onTagged?.()
  }

  async function loadSimilar() {
    if (similar.length) { setSimilar([]); return }
    setLoadingSim(true)
    const res  = await fetch(`/api/search?isbn=${book.isbn_13}`)
    const data = await res.json()
    setSimilar(data)
    setLoadingSim(false)
  }

  return (
    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        className="w-full text-left p-4 flex gap-3 items-start hover:bg-stone-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="w-10 h-14 rounded bg-brand-100 flex items-center justify-center text-xl flex-shrink-0">
          📖
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-stone-900 leading-tight">
            {book.title || book.isbn_13}
          </div>
          <div className="text-sm text-stone-500 mt-0.5">
            {book.author}{book.translator ? ` · trans. ${book.translator}` : ''}
          </div>
          <div className="font-mono text-xs text-stone-400 mt-1">{book.isbn_13}</div>
          {book.needs_tagging ? (
            <span className="inline-block mt-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              Needs tagging
            </span>
          ) : (
            <div className="flex flex-wrap gap-1 mt-2">
              {book.tag_genre?.slice(0,2).map(g => (
                <Badge key={g} text={g} color={genreColor(g)} />
              ))}
              {book.tag_era && <Badge text={book.tag_era} color="bg-stone-100 text-stone-600" />}
              {book.age_suitability && <Badge text={book.age_suitability} color="bg-blue-50 text-blue-700" />}
            </div>
          )}
        </div>
        <span className={`text-stone-400 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-stone-100 p-4 space-y-4">

          {book.needs_tagging ? (
            <button
              onClick={tagThis}
              disabled={tagging}
              className="w-full py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors"
            >
              {tagging ? 'Tagging…' : 'Tag this book now'}
            </button>
          ) : (
            <>
              {/* DB fields */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  ['Publisher',         book.publisher],
                  ['Published',         book.publish_date],
                  ['Original publish',  book.original_publish_date],
                  ['Original language', book.original_language],
                  ['Author nationality',book.author_nationality],
                  ['Born in',           book.author_country_of_birth],
                  ['Author gender',     book.author_gender],
                  ['Pages',             book.pages?.toString()],
                  ['Series',            book.series_name ? `${book.series_name}${book.series_number ? ` #${book.series_number}` : ''}` : null],
                  ['Shelf',             book.shelf],
                ].filter(([,v]) => v).map(([label, value]) => (
                  <div key={label as string} className="bg-stone-50 rounded-lg p-2">
                    <div className="text-stone-400 text-[10px] uppercase tracking-wide">{label}</div>
                    <div className="text-stone-800 mt-0.5">{value}</div>
                  </div>
                ))}
              </div>

              {/* All tags */}
              <div className="space-y-2">
                {book.tag_genre?.length     && <div className="flex flex-wrap gap-1">{book.tag_genre.map(t    => <Badge key={t} text={t} color={genreColor(t)} />)}</div>}
                {book.tag_subgenre?.length  && <div className="flex flex-wrap gap-1">{book.tag_subgenre.map(t => <Badge key={t} text={t} color="bg-teal-50 text-teal-700" />)}</div>}
                {book.tag_plot?.length      && <div className="flex flex-wrap gap-1">{book.tag_plot.map(t     => <Badge key={t} text={t} color="bg-orange-50 text-orange-700" />)}</div>}
                {book.tag_awards?.length    && <div className="flex flex-wrap gap-1">{book.tag_awards.map(t   => <Badge key={t} text={'🏆 ' + t} color="bg-yellow-50 text-yellow-800" />)}</div>}
                {book.tag_author_bg?.length && <div className="flex flex-wrap gap-1">{book.tag_author_bg.map(t=> <Badge key={t} text={t} color="bg-blue-50 text-blue-700" />)}</div>}
                {(book.content_warnings?.length?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {book.content_warnings.map(t => <Badge key={t} text={'⚠ ' + t} color="bg-red-50 text-red-700" />)}
                  </div>
                )}
              </div>

              {/* Similar books */}
              <button
                onClick={loadSimilar}
                className="text-sm text-brand-600 underline hover:text-brand-700"
              >
                {loadingSim ? 'Finding similar books…' : similar.length ? 'Hide similar books' : 'Find similar books in my inventory'}
              </button>
              {similar.length > 0 && (
                <div className="space-y-1">
                  {similar.map((s: Book & { _overlap?: string[] }) => (
                    <div key={s.isbn_13} className="flex items-start gap-2 p-2 bg-stone-50 rounded-lg text-xs">
                      <div className="flex-1">
                        <div className="font-medium text-stone-800">{s.title}</div>
                        <div className="text-stone-500">{s.author}</div>
                        {s._overlap?.length && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {s._overlap.map(o => <Badge key={o} text={o} color="bg-white text-stone-600" />)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
