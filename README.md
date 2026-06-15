# Bookstore Tagger

Tag your bookstore inventory automatically using ISBN lookup and AI.

---

## Setup — follow these steps in order

### Step 1 — Set up the database in Supabase

1. Go to your Supabase project at supabase.com
2. In the left sidebar click **SQL Editor**
3. Click **New Query**
4. Open the file `supabase_schema.sql` from this folder, copy all the text, paste it in, and click **Run**
5. You should see "Success" — your database tables are created

### Step 2 — Put this code on GitHub

1. Go to github.com and click the **+** icon → **New repository**
2. Name it `bookstore-tagger`, keep it Private, click **Create repository**
3. On your computer, open **Terminal** (Mac) or **Command Prompt** (Windows)
4. Run these commands one at a time (replace YOUR_GITHUB_USERNAME):

```
cd Desktop
git clone https://github.com/YOUR_GITHUB_USERNAME/bookstore-tagger.git
```

5. Copy all the files from this folder into the cloned folder
6. Then run:

```
cd bookstore-tagger
git add .
git commit -m "Initial commit"
git push
```

### Step 3 — Deploy on Vercel

1. Go to vercel.com and log in
2. Click **Add New** → **Project**
3. Find and select your `bookstore-tagger` repository, click **Import**
4. Before clicking Deploy, click **Environment Variables** and add these four:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL (from Supabase → Project Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon public key |
| `ANTHROPIC_API_KEY` | Your Anthropic API key (starts with sk-ant-) |

5. Click **Deploy** — wait about 2 minutes
6. Vercel gives you a live URL like `bookstore-tagger.vercel.app` — that's your app!

---

## Using the app

### Adding books
- Paste one or more ISBNs into the text box (one per line or comma-separated)
- Click **Add to inventory** — books are added instantly with `needs_tagging = true`

### Tagging books
- A button appears at the top showing how many books need tagging
- Click it to tag all untagged books at once
- Each book is looked up via Google Books API, then Claude generates all tags
- Tags appear in real time as each book is processed

### Browsing and filtering
- Search by title, author, or ISBN
- Filter by genre or age suitability
- Click any book to expand and see all tags
- Click **Find similar books** to see recommendations from your inventory

### Daily sync (optional)
To automatically tag new books every night, add a cron job in Vercel:
1. In your Vercel project go to **Settings → Cron Jobs**
2. Add a new cron job: path `/api/tag`, schedule `0 2 * * *` (runs at 2am daily)
3. Method: POST

---

## Adding the Shopify connection (later)

When you're ready to connect Shopify:
1. In your Shopify admin go to **Apps → Develop apps → Create an app**
2. Give it access to Products (read/write)
3. Add `SHOPIFY_STORE_URL` and `SHOPIFY_ACCESS_TOKEN` to your Vercel environment variables
4. Come back and ask for the Shopify sync code to be added

---

## File structure

```
bookstore/
├── supabase_schema.sql        ← Run this in Supabase first
├── src/
│   ├── app/
│   │   ├── page.tsx           ← Main UI
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── api/
│   │       ├── books/route.ts ← Add and list books
│   │       ├── tag/route.ts   ← Tagging pipeline
│   │       └── search/route.ts← Similar book recommendations
│   ├── components/
│   │   └── BookCard.tsx       ← Individual book display
│   └── lib/
│       ├── supabase.ts        ← Database client
│       └── types.ts           ← TypeScript types
└── .env.local.example         ← Copy to .env.local for local development
```
