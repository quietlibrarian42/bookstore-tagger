-- ============================================================
-- BOOKSTORE TAGGER — Supabase SQL Schema
-- Run this in Supabase → SQL Editor → New Query → Run
-- ============================================================

create table if not exists books (
  id                    uuid default gen_random_uuid() primary key,

  -- Core identifiers
  isbn_13               text unique not null,
  title                 text,
  author                text,
  translator            text,
  illustrator           text,
  publisher             text,
  publish_date          text,
  original_publish_date text,
  original_language     text,
  pages                 integer,

  -- Author background
  author_nationality      text,
  author_country_of_birth text,
  author_gender           text,

  -- Series
  series_name           text,
  series_number         integer,

  -- Tags (stored as arrays for multi-value filtering)
  tag_genre             text[],
  tag_subgenre          text[],
  tag_era               text,
  tag_awards            text[],
  tag_plot              text[],
  tag_author_bg         text[],

  -- Content & age
  content_warnings      text[],
  age_suitability       text,

  -- Store organisation
  shelf                 text,

  -- Pipeline control
  needs_tagging         boolean default true,
  tagged_at             timestamptz,
  raw_metadata          jsonb,

  -- Timestamps
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- Enable real-time updates
alter publication supabase_realtime add table books;

-- Auto-update updated_at on any row change
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger books_updated_at
  before update on books
  for each row execute function update_updated_at();

-- Indexes for fast filtering
create index if not exists idx_books_needs_tagging on books(needs_tagging);
create index if not exists idx_books_genre        on books using gin(tag_genre);
create index if not exists idx_books_plot         on books using gin(tag_plot);
create index if not exists idx_books_age          on books(age_suitability);
create index if not exists idx_books_series       on books(series_name);
