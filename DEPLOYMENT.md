# Deployment Guide - History Links

## Vercel Deployment (Recommended)

This project uses NPM workspaces (monorepo structure). Follow these steps for successful deployment:

### Option 1: Using Vercel Dashboard (Easiest)

1. **Import Project** to Vercel from your GitHub repository
2. **Configure Build Settings**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `timeline-project` ⚠️ **IMPORTANT**
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

3. **Environment Variables**: None required (uses public Wikipedia API)

4. **Deploy**: Click "Deploy"

### Option 2: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to the timeline-project directory
cd timeline-project

# Deploy
vercel

# Or deploy to production
vercel --prod
```

### Option 3: Using vercel.json (Current Configuration)

The repository includes a `vercel.json` that configures the build process:

```json
{
  "buildCommand": "npm install && cd timeline-project && npm run build",
  "devCommand": "cd timeline-project && npm run dev",
  "installCommand": "npm install",
  "framework": null,
  "outputDirectory": "timeline-project/.next"
}
```

**With this configuration:**
- Deploy from the **root directory**
- Vercel will automatically use these settings
- No manual configuration needed

---

## Alternative Deployment Options

### Netlify

1. **Build Command**: `cd timeline-project && npm run build`
2. **Publish Directory**: `timeline-project/.next`
3. **Base Directory**: Leave blank or set to root

### Self-Hosted

```bash
# Install dependencies
npm install

# Build the project
cd timeline-project
npm run build

# Start production server
npm run start

# Server runs on http://localhost:3000
```

For production, use a process manager like PM2:
```bash
npm install -g pm2
pm2 start npm --name "timeline-game" -- start
```

---

## Troubleshooting

### Build Errors

**Error**: `Could not read package.json`
- **Solution**: Set Root Directory to `timeline-project` in Vercel settings

**Error**: `Cannot find module '@timeline/game-core'`
- **Solution**: Ensure `npm install` runs at root level first (installs workspace)

**Error**: `Module not found: Can't resolve 'react'`
- **Solution**: Verify all dependencies are installed with `npm install` at root

### Runtime Errors

**Wikipedia API not loading**
- The app uses public Wikipedia API (no auth required)
- If blocked, check CORS and network policies
- Wikipedia API endpoints:
  - `https://en.wikipedia.org/w/api.php` (main API)
  - `https://commons.wikimedia.org` (images)

---

## Performance Optimization

### Recommended Vercel Settings

- **Region**: Auto (or select closest to your users)
- **Node.js Version**: 18.x or higher
- **Enable Edge Functions**: No (uses standard serverless)

### Caching

The app currently makes fresh Wikipedia API calls. Future enhancements:
- Add caching layer (Redis/Vercel KV)
- Pre-fetch popular historical figures
- Implement service worker for offline support

---

## Post-Deployment Checklist

✅ App loads successfully
✅ Can search for historical figures
✅ Timeline displays correctly
✅ Score counter visible
✅ Win modal appears when targets connected
✅ "Play Again" generates new random targets
✅ Detail panel shows contemporary hints

---

## Support

For deployment issues:
- Check [Vercel Documentation](https://vercel.com/docs)
- Review build logs in Vercel dashboard
- Ensure Node.js version compatibility (18.x+)

For app issues:
- Check browser console for errors
- Verify Wikipedia API access
- Review network requests
