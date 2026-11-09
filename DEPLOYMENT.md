# Deployment Guide - History Links

## Vercel Deployment (Recommended)

This is a standard Next.js project. Vercel will auto-detect all settings.

### Option 1: Using Vercel Dashboard (Easiest)

1. **Import Project** to Vercel from your GitHub repository
2. **Deploy**: That's it! Vercel auto-detects:
   - Framework: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

3. **Environment Variables**: none are required; the game uses the public Wikipedia and Wikidata APIs. Analytics is optional (see below).

### Option 2: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project root
vercel

# Or deploy to production
vercel --prod
```

### Configuration

No `vercel.json` is needed; Vercel's Next.js auto-detection handles the build.

---

## Daily puzzle schedule

Each date has three daily puzzles with the same number, one per style, generated a year ahead from the committed roster. Puzzle #1 is 2026-11-07.

- `src/lib/data/daily-schedule.json`: Hard (`/daily/<n>`).
- `src/lib/data/daily-easy.json`: Easy (`/daily/<n>/easy`).
- `src/lib/data/daily-medium.json`: Medium (`/daily/<n>/medium`).

The files are read only on the server, so they add nothing to the client bundle.

**Extending them.** CI's `dailySchedule.test.ts` and `styleSchedule.test.ts` fail once fewer than 30 puzzles remain after today. To extend:

1. Run `CAPTURE_DAILY=1 npx vitest run src/lib/services/daily.capture.test.ts --silent=false`. It is offline and takes about 15 seconds. It appends Hard days until the Hard schedule reaches a year past today (`DAILY_DAYS` changes the horizon), then gives Easy and Medium one puzzle for every Hard puzzle.
2. Check that each diff only adds lines at the end of `entries` (the previous last line just gains a comma). Published puzzles must never change.
3. Commit the three files and deploy.

**Rebuilding the roster** does not break published Easy and Medium puzzles. Each entry records the roster revision it was built from (`rev`). The checks that need the whole roster run only for entries built from the current roster.

**Starting over** (only before launch, when no puzzle has been played): delete the three files and run the command with `DAILY_FROM=YYYY-MM-DD`, which becomes puzzle #1.

---

## Analytics (PostHog)

Analytics is off unless `NEXT_PUBLIC_POSTHOG_KEY` is set at build time. Without it the SDK is never loaded and no request is made, so local development and tests stay offline.

| Variable | Required | Value |
|---|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | To turn analytics on | The PostHog project API key (`phc_...`) |
| `NEXT_PUBLIC_POSTHOG_HOST` | No | Ingestion host; defaults to `https://us.i.posthog.com` (use `https://eu.i.posthog.com` for an EU project) |

Set both in Vercel for Production and Preview, then redeploy: `NEXT_PUBLIC_` values are compiled into the client bundle.

Players stay anonymous: no person profiles, no autocapture, no session recording. A `?ref=<code>` parameter on the first visit is kept as the `referrer_code` property for later streamer and challenge links.

### Events

| Event | When | Properties |
|---|---|---|
| `$pageview` | Page load | PostHog defaults, plus `referrer_code` when present |
| `game_started` | A free-play round is dealt, or a daily attempt (scored or practice) begins; not when one resumes | Hard: `par`, `narrowest_step`, `years_apart`, `gap_century`, `target_a`, `target_b`. Easy and Medium: `target_a`, `target_b`, `people` (people between the targets) |
| `figure_added` | A name is submitted in Hard | `accepted`; when rejected, `reason` (`not_found`, `not_a_person`, `no_dates`, `network`, `duplicate`); when accepted, `overlaps`, `extends_chain`, `miss_years`, `from_hint` |
| `hint_taken` | A Hard wild card is shown | `costs_stroke` |
| `game_completed` | The chain connects (Hard) or every slot is filled (Easy, Medium) | Hard: `strokes`, `par`, `result` (strokes minus par), `hints`, `clutch_badges`, `long_bridge_badges`, `duration_seconds`. Easy: `checks`, `people`, `duration_seconds`. Medium: `misses` (wrong guesses), `reveals`, `people`, `duration_seconds` |
| `game_abandoned` | New Game in Hard free play before the chain connects (leaving a daily only pauses it) | Same as Hard's `game_completed`, with no badges |

Every round event also carries:

- `style`: `easy`, `medium` or `hard`, how the round is played.
- `band`: for Hard, how far apart the pair is (`easy`, `medium` or `hard`, the band that chose it); null for Easy and Medium.
- `mode`: `free` or `daily`.
- `puzzle`: the daily puzzle's number, or null in free play.
- `scored`: true for a daily's scored attempt, false for practice, null in free play.

PostHog drops events from automated browsers, so headless test runs do not show up in the project.

### Insights to build

- **Completed sessions per week:** weekly count of `game_completed`.
- **Completion rate by style:** `game_completed` ÷ `game_started`, broken down by `style`.
- **Result against par by band:** median `result` from Hard `game_completed`, broken down by `band`. Compare with the tuning targets in `docs/research/2026-11-06-difficulty-balancing.md` (#82).
- **Easy and Medium scores:** median `checks` (Easy) and `misses` plus `reveals` (Medium) from `game_completed`, by `puzzle`.
- **Hint use in Hard:** `hint_taken` per Hard `game_started`.
- **Birdies by era:** share of `game_completed` with `result` < 0, broken down by `gap_century`.
- **Daily completions per puzzle:** `game_completed` where `mode` = `daily` and `scored` = true, broken down by `puzzle` and `style`.
- **Arrivals through daily links:** `$pageview` where the URL path starts with `/daily/`, broken down by path; combine with `referrer_code` for streamer links.

Reveal/share rate and viewer-to-player conversion need the share card and challenge links (#59).

---

## Alternative Deployment Options

### Netlify

1. **Build Command**: `npm run build`
2. **Publish Directory**: `.next`
3. **Base Directory**: Leave blank (deploy from root)

### Self-Hosted

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start production server
npm run start

# Server runs on http://localhost:3000
```

For production, use a process manager like PM2:
```bash
npm install -g pm2
cd /path/to/timeline-game
pm2 start npm --name "timeline-game" -- start
```

---

## Troubleshooting

### Build Errors

**Error**: `Failed to fetch font 'Geist'`
- **Solution**: Fixed in latest version (removed Google Fonts dependency)

**Error**: `Module not found: Can't resolve '@/lib'`
- **Solution**: Ensure TypeScript paths are configured (`@/*` maps to `./src/*`)

**Error**: `Module not found: Can't resolve 'react'`
- **Solution**: Run `npm install` to install all dependencies

### Runtime Errors

**Wikipedia API not loading**
- The app uses public Wikipedia API (no auth required)
- If blocked, check CORS and network policies
- Wikipedia API endpoints:
  - `https://en.wikipedia.org/w/api.php` (main API)
  - `https://commons.wikimedia.org` (images)

**Blank/unstyled page**
- Check that Tailwind CSS is scanning: `./src/lib/**/*.{js,ts,jsx,tsx}`
- Verify `globals.css` is imported in `src/app/layout.tsx`

---

## Performance Optimization

### Recommended Vercel Settings

- **Region**: Auto (or select closest to your users)
- **Node.js Version**: 18.x or higher (auto-detected)
- **Framework**: Next.js (auto-detected)

### Caching

The app currently makes fresh Wikipedia API calls. Future enhancements:
- Add caching layer (Redis/Vercel KV)
- Pre-fetch popular historical figures
- Implement service worker for offline support

---

## Post-Deployment Checklist

✅ App loads successfully
✅ Can search for historical figures
✅ Timeline displays correctly with glassmorphism styling
✅ Score counter visible (top right)
✅ Win modal appears when targets connected
✅ "Play Again" generates new random targets
✅ Detail panel shows contemporary hints
✅ All CSS styles are applied (check for glow effects)

---

## Development

### Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Run production build locally
npm run start
```

### Project Structure

```
timeline-game/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── page.tsx      # Main game page
│   │   ├── layout.tsx    # Root layout
│   │   └── globals.css   # Global styles
│   └── lib/              # Game logic library
│       ├── components/   # React components
│       ├── services/     # Wikipedia API
│       ├── types/        # TypeScript types
│       └── utils/        # Game utilities
├── public/               # Static assets
├── package.json          # Dependencies
├── next.config.js        # Next.js config
├── tailwind.config.ts    # Tailwind CSS config
└── tsconfig.json         # TypeScript config
```

---

## Support

For deployment issues:
- Check [Vercel Documentation](https://vercel.com/docs)
- Review build logs in Vercel dashboard
- Ensure Node.js version compatibility (18.x+)

For app issues:
- Check browser console for errors
- Verify Wikipedia API access
- Review network requests in DevTools
