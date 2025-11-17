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

3. **Environment Variables**: None required (uses public Wikipedia API)

### Option 2: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project root
vercel

# Or deploy to production
vercel --prod
```

### vercel.json Configuration

The repository includes a minimal `vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json"
}
```

Vercel's auto-detection handles everything automatically.

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
