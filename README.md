# History Links - Timeline Connection Game

A history-based educational game where players connect historical figures through their contemporaries to bridge gaps across time.

## 🎮 Game Concept

Connect two randomly selected historical figures by finding intermediate figures who lived during overlapping time periods. Each connection adds to your score (golf scoring - lower is better). Win by creating an unbroken chain between the targets!

## 📁 Project Structure

Standard Next.js application with organized library code:

```
timeline-game/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── page.tsx      # Main game page
│   │   ├── layout.tsx    # Root layout
│   │   └── globals.css   # Global styles + design system
│   └── lib/              # Game logic library
│       ├── components/   # React components
│       │   ├── Timeline.tsx
│       │   └── ui/       # UI component library
│       ├── services/     # Business logic
│       │   ├── WikipediaService.ts
│       │   └── TargetSelectionService.ts
│       ├── types/        # TypeScript type definitions
│       └── utils/        # Game logic utilities
│
├── public/               # Static assets
├── package.json          # Dependencies
├── next.config.js        # Next.js config
├── tailwind.config.ts    # Tailwind CSS config
├── tsconfig.json         # TypeScript config
└── vercel.json           # Vercel deployment config
```

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

The app will be available at `http://localhost:3000`

## 🛠️ Technology Stack

- **Framework**: Next.js 15.1.7 (App Router)
- **Language**: TypeScript 5 (Strict mode)
- **Styling**: Tailwind CSS 3.4.1 + CSS Variables
- **State**: React Hooks (no external state management)
- **Data**: Wikipedia API (MediaWiki + Wikimedia Commons)
- **Deployment**: Vercel (auto-detected)

## ✨ Features

- ✅ Random target selection from 58 curated historical figures
- ✅ Wikipedia API integration for dynamic data
- ✅ Chain connection algorithm (BFS pathfinding)
- ✅ Score tracking with golf scoring
- ✅ Win detection and victory modal
- ✅ Contemporary figure hints
- ✅ BCE/CE visual timeline divider
- ✅ Responsive glassmorphism UI design

## 📚 Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Complete AI assistant guide to the codebase
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment instructions for Vercel/Netlify
- **[ROADMAP.md](./ROADMAP.md)** - Development roadmap and phases
- **[Gameplay-loop.md](./Gameplay-loop.md)** - Detailed gameplay mechanics

## 🎯 Game Features

### Core Mechanics
- **Random Targets**: Each game starts with 2 random historical figures
- **Contemporary Search**: Add figures who lived during the same time period
- **Chain Building**: Create connections through overlapping lifetimes
- **Score System**: Golf scoring - fewer connections = better score
- **Win Condition**: Connect both targets with the shortest chain

### UI Features
- **Score Display**: Real-time score tracking (top right)
- **Timeline Visualization**: Dynamic timeline with zoom/pan
- **Search System**: Debounced Wikipedia search (bottom bar)
- **Detail Panels**: Click figures for biographical info and hints
- **Win Modal**: Victory screen with chain visualization
- **Play Again**: New random targets each game

## 🧩 Code Organization

### Library Structure (src/lib/)

Organized game logic that can be imported throughout the app:

**Exports**:
```typescript
import {
  // Components
  Timeline,
  SearchBar,
  ScoreDisplay,
  WinModal,
  DetailPanel,

  // Services
  WikipediaService,
  TargetSelectionService,

  // Utilities
  analyzeChain,
  areContemporaries,
  formatYear,

  // Types
  HistoricalFigure,
  TimelineNode
} from '@/lib';
```

### Import Patterns

```typescript
// Use @/lib for library imports
import { Timeline, WikipediaService } from '@/lib';

// Use @/app for app-specific imports
import styles from '@/app/styles.module.css';
```

## 🔧 Development

### Key Commands

```bash
# Development
npm run dev              # Start dev server with hot reload

# Production
npm run build            # Build for production
npm run start            # Start production server

# Quality checks
npm run lint             # Run ESLint
npx tsc --noEmit         # Type checking
```

### Development Workflow

1. Make changes in `src/lib/` or `src/app/`
2. Hot reload automatically updates the browser
3. Check console for TypeScript errors
4. Run `npm run lint` before committing

## 🚢 Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for detailed deployment instructions.

**Quick Deploy to Vercel:**
1. Import repository to Vercel
2. Deploy (Vercel auto-detects everything)
3. Done!

No configuration needed - standard Next.js project structure.

## 🎨 Design System

The game uses a custom design system with:
- **Glassmorphism** aesthetic with blur effects
- **Glow effects** on interactive elements
- **Holographic** borders and shadows
- **CSS Variables** for consistent theming (defined in `globals.css`)
- **Tailwind** utilities with custom extensions

**Colors**: Cyan-blue primary (#40B4E5), ivory background (#FFFFF0)

**Custom Animations**: Glow, fade-in, progress bars

## 📖 Learn More

- **Game Mechanics**: See [Gameplay-loop.md](./Gameplay-loop.md)
- **Development Guide**: See [CLAUDE.md](./CLAUDE.md)
- **Roadmap**: See [ROADMAP.md](./ROADMAP.md)
- **Next.js Docs**: https://nextjs.org/docs
- **Wikipedia API**: https://www.mediawiki.org/wiki/API:Main_page

## 🤝 Contributing

This is an educational project. Feel free to:
- Report issues
- Suggest historical figures to add
- Propose gameplay improvements
- Submit pull requests

## 📝 License

Educational project - see license file for details.

## 🎓 Educational Value

Learn history by discovering connections between:
- Ancient civilizations and modern leaders
- Scientists across different eras
- Artists and their contemporary influences
- Cultural exchanges through time

Every game is a new historical journey! 🌍⏳
