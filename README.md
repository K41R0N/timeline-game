# History Links - Timeline Connection Game

A history-based educational game where players connect historical figures through their contemporaries to bridge gaps across time.

## 🎮 Game Concept

Connect two randomly selected historical figures by finding intermediate figures who lived during overlapping time periods. Each connection adds to your score (golf scoring - lower is better). Win by creating an unbroken chain between the targets!

## 📁 Project Structure

This is an **NPM workspace monorepo** with two packages:

```
timeline-game/
├── game-core/              # Shared game logic library
│   ├── components/         # Reusable React components
│   │   ├── Timeline.tsx    # Main timeline visualization
│   │   └── ui/            # UI component library
│   ├── services/          # Business logic
│   │   ├── WikipediaService.ts
│   │   └── TargetSelectionService.ts
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Game logic utilities
│   └── index.ts           # Barrel exports
│
├── timeline-project/       # Next.js application
│   ├── src/
│   │   └── app/           # Next.js App Router
│   │       ├── page.tsx   # Main game page
│   │       ├── layout.tsx # Root layout
│   │       └── globals.css # Styles + design system
│   ├── public/            # Static assets
│   └── [config files]     # Next.js, TypeScript, Tailwind
│
├── package.json           # Workspace root
├── vercel.json           # Vercel deployment config
└── DEPLOYMENT.md         # Deployment guide
```

## 🚀 Quick Start

```bash
# Install all workspace dependencies
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
- **Deployment**: Vercel (configured)

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
- **Score Display**: Real-time score tracking
- **Timeline Visualization**: Dynamic timeline with zoom/pan
- **Search System**: Debounced Wikipedia search
- **Detail Panels**: Click figures for biographical info and hints
- **Win Modal**: Victory screen with chain visualization
- **Play Again**: New random targets each game

## 🧩 Workspace Structure

### game-core (Library Package)
Pure, reusable game logic and components. No application-specific code.

**Purpose**: Can be imported by multiple apps or used standalone

**Exports**:
```typescript
import {
  Timeline,              // Main component
  SearchBar,             // UI components
  ScoreDisplay,
  WinModal,
  DetailPanel,
  WikipediaService,      // Services
  TargetSelectionService,
  analyzeChain,          // Utilities
  areContemporaries,
  HistoricalFigure,      // Types
  TimelineNode
} from '@timeline/game-core';
```

### timeline-project (Next.js App)
Application shell that consumes `game-core` and adds Next.js-specific features.

**Purpose**: Production-ready web application

## 🔧 Development

### Working with the Monorepo

```bash
# Install dependencies for all workspaces
npm install

# Run from root (uses workspace scripts)
npm run dev
npm run build

# Or work in specific workspace
cd timeline-project
npm run dev

cd game-core
# No dev command - library only
```

### Key Commands

```bash
# Development
npm run dev              # Start dev server

# Production
npm run build            # Build for production
npm run start            # Start production server

# Linting (in timeline-project)
cd timeline-project && npm run lint

# Type checking
cd timeline-project && npx tsc --noEmit
```

## 🚢 Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for detailed deployment instructions.

**Quick Deploy to Vercel:**
1. Set Root Directory to `timeline-project` in settings
2. Keep all other settings as auto-detected
3. Deploy!

Or use the included `vercel.json` configuration.

## 🎨 Design System

The game uses a custom design system with:
- **Glassmorphism** aesthetic with blur effects
- **Glow effects** on interactive elements
- **Holographic** borders and shadows
- **CSS Variables** for consistent theming
- **Tailwind** utilities with custom extensions

Colors: Cyan-blue primary (#40B4E5), ivory background (#FFFFF0)

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
