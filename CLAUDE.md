# CLAUDE.md - AI Assistant Guide for Timeline Game

## Project Overview

**Timeline Game** (aka "History Links") is a history-based educational game where players connect historical figures through their contemporaries to bridge gaps across time. The goal is to create an unbroken chain between two randomly assigned target figures using the fewest intermediate connections.

### Core Gameplay
- Players receive two target historical figures (e.g., Alexander the Great → Julius Caesar)
- Players search for and add intermediate figures who were contemporaries
- Each added figure increases the score by 1 point (golf scoring - lower is better)
- Progress bars show connections (green = progress toward targets, red = wrong direction)
- Win condition: Connect both targets with the lowest possible score

### Current Development Phase
**Phase 2-3** (according to ROADMAP.md):
- ✅ Foundation and project setup complete
- 🔄 Core game logic and mechanics in progress
- ⏳ Full Wikipedia integration and UX polish pending
- ⏳ Testing framework not yet implemented
- ⏳ Deployment (planned for Netlify)

---

## Repository Architecture

### Monorepo Structure (NPM Workspaces)

```
timeline-game/                    # Root workspace
├── game-core/                    # @timeline/game-core - Shared library
│   ├── index.ts                  # Barrel exports
│   ├── types/                    # Core type definitions
│   ├── services/                 # Business logic (WikipediaService)
│   └── components/               # Reusable React components
│       ├── Timeline.tsx          # Main timeline component (753 lines)
│       └── ui/                   # UI component library
│           ├── SearchBar.tsx
│           ├── SearchInput.tsx
│           └── DetailPanel.tsx
│
└── timeline-project/             # Main Next.js application
    ├── src/
    │   ├── app/                  # Next.js App Router
    │   │   ├── page.tsx          # Main entry point
    │   │   ├── layout.tsx        # Root layout
    │   │   └── globals.css       # Global styles + CSS variables
    │   ├── components/           # App-specific components
    │   ├── types/                # App-specific types
    │   └── data/                 # Static data
    │       └── historical-figures.json  # Initial dataset (unused)
    └── public/                   # Static assets
```

### Workspace Separation Philosophy
- **game-core**: Pure, reusable game logic and components (library)
- **timeline-project**: Application shell that consumes game-core
- **Why**: Enables code reuse, clear boundaries, potential for multiple apps

---

## Technology Stack

### Core Framework
- **Next.js 15.1.7** - React framework with App Router
- **React 19.0.0** - Latest React with concurrent features
- **TypeScript 5** - Strict mode enabled

### Styling
- **Tailwind CSS 3.4.1** - Utility-first CSS framework
- **CSS Variables** - Custom design system in `globals.css`
- **PostCSS** - CSS processing pipeline
- **Design Aesthetic**: Glassmorphism with glow effects and holographic styling

### State Management
- **React Hooks** - `useState`, `useEffect`, `useRef`, `useCallback`
- **No Redux/Zustand** - Simple prop drilling and local state
- **Pattern**: State lifted to nearest common ancestor

### Data & APIs
- **Wikipedia API** - MediaWiki API for historical figure data
- **Wikimedia Commons API** - For historical figure images
- **No Database Yet** - All data fetched dynamically from Wikipedia
- **Planned**: Cloudinary for image optimization, Supabase for user data

### Utilities
- **Lodash** - Used for debounce in search functionality
- **Native Fetch** - HTTP requests with CORS enabled

### Development Tools
- **ESLint** - Next.js TypeScript configuration
- **NPM Workspaces** - Monorepo management
- **Git** - Version control
- **No Testing Framework** - Planned but not implemented

---

## Key Files Reference

| File Path | Purpose | Lines |
|-----------|---------|-------|
| `/package.json` | Root workspace config with dev/build scripts | - |
| `/ROADMAP.md` | 6-phase development plan | - |
| `/Gameplay-loop.md` | Detailed gameplay mechanics documentation | - |
| `/game-core/index.ts` | Library barrel exports | - |
| `/game-core/components/Timeline.tsx` | Main timeline visualization | 753 |
| `/game-core/services/WikipediaService.ts` | Wikipedia API client | 395 |
| `/game-core/types/HistoricalFigure.ts` | Core type definitions | - |
| `/timeline-project/src/app/page.tsx` | Application entry point | - |
| `/timeline-project/src/app/layout.tsx` | Root layout with fonts | - |
| `/timeline-project/src/app/globals.css` | Design system & CSS variables | - |
| `/timeline-project/next.config.js` | Next.js configuration | - |
| `/timeline-project/tsconfig.json` | TypeScript config with workspace paths | - |

---

## Development Workflow

### Initial Setup
```bash
# Install all workspace dependencies
npm install

# Start development server (runs timeline-project)
npm run dev
# Opens on http://localhost:3000

# Alternative: Direct workspace commands
cd timeline-project && npm run dev
```

### Available Commands (Root Level)
```bash
npm run dev      # Start Next.js dev server (timeline-project)
npm run build    # Build for production
npm run start    # Start production server
```

### timeline-project Commands
```bash
npm run dev      # Development server with hot reload
npm run build    # Production build to .next/
npm run start    # Serve production build
npm run lint     # Run ESLint checks
```

### Hot Reload Behavior
- Changes to `/game-core` automatically trigger Next.js rebuild
- Transpilation configured via `next.config.js` `transpilePackages`
- Custom webpack config resolves workspace aliases

---

## Critical Date Handling Convention

### BCE/CE (BC/AD) Date System
**CRITICAL**: The game uses negative numbers for BCE dates.

```typescript
// Correct date handling
birthYear: -384  // 384 BCE (Aristotle)
birthYear: -356  // 356 BCE (Alexander the Great)
birthYear: -100  // 100 BCE (Julius Caesar)
birthYear: 1452  // 1452 CE (Leonardo da Vinci)

// Timeline ordering (oldest to newest)
// -384 (older) < -100 (younger) < 1452 (much younger)
```

**Why**:
- Enables proper chronological sorting with standard comparisons
- `-384 < -100` correctly places Aristotle before Caesar
- Avoids complex logic for BCE/CE boundary crossing

**Implementation Location**: `game-core/services/WikipediaService.ts` handles BCE extraction from Wikipedia categories.

---

## Data Models

### Core Types (game-core/types/HistoricalFigure.ts)

```typescript
interface HistoricalFigure {
  id: string;                    // Unique identifier
  name: string;                  // Display name
  birthYear: number;             // Negative for BCE
  deathYear: number;             // Negative for BCE
  shortDescription: string;      // Brief biography
  imageUrl: string;              // Wikimedia Commons URL
  contemporaries: string[];      // Array of related figure IDs
}

interface TimelineNode {
  figure: HistoricalFigure;
  position: number;              // Calculated position (0-100%)
  isAbove: boolean;              // Alternating vertical display
}
```

### Wikipedia API Service

**Location**: `game-core/services/WikipediaService.ts`

**Key Methods**:
```typescript
WikipediaService.searchPerson(query: string)
  // Returns: SearchResult[] with title, description, thumbnail

WikipediaService.getPersonDetails(title: string)
  // Returns: HistoricalFigure | null
  // Extracts birth/death years from categories
  // Handles BCE dates, centuries, decades
  // Fetches best available image

WikipediaService.findContemporaries(figure: HistoricalFigure)
  // Returns: HistoricalFigure[]
  // Searches for overlapping lifetimes
  // Used for hints and validation

WikipediaService.getBestPersonImage(title: string)
  // Returns: string (image URL)
  // Prioritizes: portrait → photo → illustration
```

**Date Extraction Logic**:
- Parses categories like "384_BC_births", "1519_deaths"
- Handles century approximations ("4th-century_BC_births")
- Handles decade approximations ("350s_BC_births")
- Converts BCE to negative numbers automatically

---

## Component Architecture

### Client Components
All interactive components use `'use client'` directive (Next.js 15 requirement).

### Main Components

#### Timeline Component (`game-core/components/Timeline.tsx`)
**Purpose**: Main game visualization and interaction hub

**Key Features**:
- Dynamic timeline scaling based on figure date ranges
- Alternating above/below layout for figure nodes
- Progress bar visualization (green/red)
- Drag interaction tracking
- Search integration
- Detail panel display

**State Management**:
```typescript
const [figures, setFigures] = useState<HistoricalFigure[]>([]);
const [selectedFigure, setSelectedFigure] = useState<HistoricalFigure | null>(null);
const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
const [isSearching, setIsSearching] = useState(false);
```

**Key Props**:
```typescript
interface TimelineProps {
  figures: HistoricalFigure[];
  onFiguresChange?: (figures: HistoricalFigure[]) => void;
  onSelect?: (figure: HistoricalFigure) => void;
  onAddFigure?: (figure: HistoricalFigure) => void;
}
```

#### SearchBar Component (`game-core/components/ui/SearchBar.tsx`)
**Purpose**: Orchestrates search with debouncing

**Features**:
- 500ms debounce on Wikipedia API calls
- Displays autocomplete results
- Handles selection and figure addition
- Loading states

#### SearchInput Component (`game-core/components/ui/SearchInput.tsx`)
**Purpose**: Input field with suggestions dropdown

**Features**:
- Keyboard navigation (Arrow keys, Enter, Escape)
- Click-outside detection
- Thumbnail display in results
- Accessible ARIA attributes

#### DetailPanel Component (`game-core/components/ui/DetailPanel.tsx`)
**Purpose**: Side panel showing detailed figure information

**Features**:
- Slide-in animation
- Full biography display
- Large image display
- Contemporary hints
- Close button

---

## Styling System

### Design Tokens (globals.css)

```css
:root {
  /* Core Colors */
  --color-primary: #40B4E5;           /* Cyan-blue */
  --color-primary-bright: #5CCFFF;    /* Bright cyan */
  --background: #FFFFF0;              /* Ivory */
  --foreground: #2C3E50;              /* Dark blue-gray */

  /* Effect Colors */
  --timeline-glow: rgba(64, 180, 229, 0.6);
  --card-glow: rgba(92, 207, 255, 0.4);
  --holo-ring: rgba(92, 207, 255, 0.8);
}
```

### Custom Tailwind Extensions (tailwind.config.ts)

**Custom Colors**: Mapped to CSS variables
```javascript
colors: {
  primary: 'var(--color-primary)',
  'primary-bright': 'var(--color-primary-bright)',
}
```

**Custom Shadows**: Glow effects
```javascript
boxShadow: {
  'glow': '0 0 20px var(--card-glow)',
  'holo': '0 0 15px var(--holo-ring)',
  'timeline': '0 0 30px var(--timeline-glow)',
}
```

**Custom Animations**:
```javascript
animation: {
  'glow': 'glow 3s ease-in-out infinite',
  'fadeIn': 'fadeIn 0.3s ease-out',
  'progressBar': 'progressBar 1s ease-out',
}
```

### Visual Design Patterns

**Glassmorphism Cards**:
```css
.timeline-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.18);
}
```

**Profile Bubbles (Nodes)**:
```css
.timeline-node {
  border-radius: 50%;
  border: 3px solid var(--color-primary);
  box-shadow: 0 0 15px var(--holo-ring);
  transition: all 0.3s ease;
}
```

**Progress Bars**:
- Green: `.bg-green-500` - Progress toward connection
- Red: `.bg-red-500` - Wrong direction
- Animated with `progressBar` keyframe

---

## Code Conventions & Patterns

### File Naming
- **Components**: `PascalCase.tsx` (e.g., `Timeline.tsx`)
- **Services**: `PascalCase.ts` (e.g., `WikipediaService.ts`)
- **Types**: `PascalCase.ts` (e.g., `HistoricalFigure.ts`)
- **Config**: `lowercase.config.ext` (e.g., `next.config.js`)
- **Data**: `kebab-case.json` (e.g., `historical-figures.json`)

### Code Naming
- **Components**: `PascalCase`
- **Functions**: `camelCase`
- **CSS Classes**: `kebab-case`
- **CSS Variables**: `--kebab-case`
- **Constants**: `UPPER_SNAKE_CASE` (in Timeline component)

### Import Organization Pattern
```typescript
// 1. React/Next.js
import { useState, useEffect } from 'react';
import type { Metadata } from 'next';

// 2. Third-party libraries
import debounce from 'lodash/debounce';

// 3. Workspace imports
import { Timeline, HistoricalFigure } from '@timeline/game-core';

// 4. Local relative imports
import { SearchInput } from './ui/SearchInput';

// 5. Type-only imports (sometimes separate)
import type { SearchResult } from '../types';
```

### Component Structure Template
```typescript
'use client'; // If client-side interactivity needed

// Imports
import { useState, useEffect } from 'react';
import { OtherComponent } from './OtherComponent';

// Types/Interfaces
interface ComponentProps {
  data: string;
  onAction?: () => void;
}

// Component
export default function Component({ data, onAction }: ComponentProps) {
  // State hooks
  const [state, setState] = useState<Type>(initialValue);

  // Ref hooks
  const ref = useRef<HTMLDivElement>(null);

  // Effect hooks
  useEffect(() => {
    // Effect logic
    return () => {
      // Cleanup
    };
  }, [dependencies]);

  // Event handlers
  const handleAction = useCallback(() => {
    // Handler logic
  }, [dependencies]);

  // Render helpers (optional)
  const HelperComponent = ({ prop }: HelperProps) => (
    <div>{prop}</div>
  );

  // Main render
  return (
    <div className="component-class">
      {/* JSX */}
    </div>
  );
}
```

### TypeScript Conventions
- **Strict mode**: Enabled in `tsconfig.json`
- **Interfaces over types**: For object shapes (mostly)
- **Type annotations**: All function parameters
- **Return types**: Inferred (rarely explicit)
- **Optional chaining**: Use `?.` extensively
- **Nullish coalescing**: Use `??` for defaults

### Async Patterns
```typescript
// Parallel requests with Promise.all
const [fig1, fig2] = await Promise.all([
  WikipediaService.getPersonDetails('Name1'),
  WikipediaService.getPersonDetails('Name2')
]);

// Try-finally for loading states
try {
  setIsLoading(true);
  await doWork();
} catch (error) {
  console.error('❌ Error:', error);
} finally {
  setIsLoading(false);
}
```

### Logging Convention (With Emojis)
```typescript
console.log('🚀 Starting search...');     // Initiation
console.log('✅ Success:', data);          // Success
console.warn('⚠️ Warning:', message);     // Warning
console.error('❌ Error:', error);         // Error
console.log('📊 Data:', data);             // Data inspection
console.log('🔍 Found results:', count);   // Search results
```

### CSS Class Patterns
```typescript
// Template literals with conditionals
className={`
  base-class another-class
  ${condition ? 'conditional-class' : ''}
  ${isActive ? 'active' : 'inactive'}
`}

// Mixing Tailwind and custom classes
className="timeline-card bg-white/95 backdrop-blur-lg hover:shadow-glow"
```

---

## Common Tasks

### Adding a New Historical Figure Manually
```typescript
const newFigure: HistoricalFigure = {
  id: crypto.randomUUID(),
  name: "Figure Name",
  birthYear: -123,  // Negative for BCE
  deathYear: 456,   // Positive for CE
  shortDescription: "Brief bio...",
  imageUrl: "https://...",
  contemporaries: []
};

setFigures(prev => [...prev, newFigure]);
```

### Searching for a Historical Figure
```typescript
// Via WikipediaService
const results = await WikipediaService.searchPerson("Julius Caesar");
// Returns: SearchResult[] with title, description, thumbnail

// Get full details
const figure = await WikipediaService.getPersonDetails(results[0].title);
// Returns: HistoricalFigure | null
```

### Determining Contemporaries
Two figures are contemporaries if their lifetimes overlap:
```typescript
function areContemporaries(fig1: HistoricalFigure, fig2: HistoricalFigure): boolean {
  return fig1.birthYear <= fig2.deathYear && fig2.birthYear <= fig1.deathYear;
}
```

### Adding a New UI Component
1. Create in `game-core/components/ui/` if reusable
2. Use `'use client'` if interactive
3. Export from `game-core/index.ts`
4. Import in app via `@timeline/game-core`

### Styling a New Component
```typescript
// 1. Use Tailwind utilities first
<div className="bg-white/95 backdrop-blur-lg rounded-lg shadow-glow p-4">

// 2. Add custom CSS class in globals.css if needed
.my-custom-component {
  /* Custom styles */
}

// 3. Use CSS variables for colors
background: var(--color-primary);
```

---

## Important Gotchas & Considerations

### 1. Date Handling Edge Cases
- **Uncertain dates**: Wikipedia categories may use centuries/decades
- **Missing dates**: Handle `null` gracefully
- **BCE/CE boundary**: Year 0 doesn't exist (1 BCE → 1 CE)
- **Negative numbers**: Always check BCE dates are negative

### 2. Wikipedia API Limitations
- **Rate limiting**: No caching implemented yet
- **Inconsistent data**: Not all figures have clear birth/death categories
- **Image availability**: Fallback to placeholder if no image
- **CORS**: Requests include `origin: '*'` header

### 3. Contemporary Detection
- **Current logic**: Simple lifetime overlap
- **Not implemented yet**: Historical interaction validation
- **Edge case**: Figures with identical lifespans

### 4. Component State Management
- **No global state**: All state in Timeline or page.tsx
- **Prop drilling**: Multiple levels of props
- **Future consideration**: Context API or state management library

### 5. Workspace Dependencies
- **Import from game-core**: Always use `@timeline/game-core` in timeline-project
- **Don't use relative paths**: Across workspace boundaries
- **Transpilation required**: `transpilePackages` in next.config.js

### 6. Next.js 15 Specific
- **App Router only**: No pages directory
- **Server components by default**: Must explicitly mark client components
- **React 19**: Use latest hooks and patterns

### 7. Performance Considerations
- **No virtualization**: Timeline may struggle with 100+ figures
- **No memoization**: Components re-render on every state change
- **API calls**: Not debounced except in search (500ms)
- **Image loading**: No lazy loading implemented

### 8. Missing Features (From ROADMAP)
- ❌ No testing framework
- ❌ No user authentication
- ❌ No score persistence
- ❌ No caching system
- ❌ No error boundaries
- ❌ No loading skeletons
- ❌ No accessibility audit

---

## Working with This Codebase as an AI Assistant

### When Reading Code
1. **Check BCE dates**: Verify negative numbers are handled correctly
2. **Follow imports**: Use `@timeline/game-core` for workspace imports
3. **Understand state flow**: State primarily in Timeline.tsx and page.tsx
4. **Check Wikipedia service**: API calls are in WikipediaService.ts

### When Writing Code
1. **Use TypeScript strictly**: Type all function parameters
2. **Follow naming conventions**: PascalCase for components, camelCase for functions
3. **Add 'use client'**: If component uses hooks or browser APIs
4. **Use Tailwind first**: Before writing custom CSS
5. **Log with emojis**: Follow existing logging convention
6. **Handle BCE dates**: Use negative numbers, check date logic
7. **Test with real figures**: Use Wikipedia data, not mock data

### When Fixing Bugs
1. **Check date calculations**: Most bugs likely in BCE/CE handling
2. **Verify contemporary logic**: Lifetime overlap calculation
3. **Console logs exist**: Use emoji logs for debugging
4. **Wikipedia data varies**: Handle missing/malformed data

### When Adding Features
1. **Check ROADMAP.md**: See planned features and phases
2. **Read Gameplay-loop.md**: Understand game mechanics
3. **Add to game-core if reusable**: Keep app-specific code in timeline-project
4. **Export from index.ts**: If adding to game-core
5. **Update this file**: Add new conventions/patterns to CLAUDE.md

### When Refactoring
1. **Don't break workspace imports**: Maintain `@timeline/game-core` structure
2. **Preserve date handling**: Don't change BCE negative number convention
3. **Keep components client-side**: Don't remove 'use client' without testing
4. **Maintain logging style**: Keep emoji convention

### Common Questions

**Q: Where do I add a new UI component?**
A: `game-core/components/ui/` if reusable, `timeline-project/src/components/` if app-specific

**Q: How do I fetch a historical figure?**
A: Use `WikipediaService.searchPerson()` then `WikipediaService.getPersonDetails()`

**Q: Where are the game rules defined?**
A: Read `Gameplay-loop.md` for detailed mechanics

**Q: How do I add custom styling?**
A: Use Tailwind utilities first, add CSS variables to `globals.css` if needed

**Q: Where is the scoring logic?**
A: Currently in Timeline.tsx, simple increment per figure added

**Q: How do I test changes?**
A: Run `npm run dev` and test in browser (no automated tests yet)

---

## Quick Reference: Project Commands

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)
cd timeline-project && npm run dev  # Alternative

# Build
npm run build            # Production build
npm run start            # Serve production build

# Linting
cd timeline-project && npm run lint

# Install dependencies
npm install              # Installs all workspaces

# Navigate workspaces
cd game-core             # Core library
cd timeline-project      # Main app
```

---

## Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Wikipedia API**: https://www.mediawiki.org/wiki/API:Main_page
- **TypeScript**: https://www.typescriptlang.org/docs

---

## Last Updated
This file should be updated whenever significant architectural changes are made to the codebase.

**Generated**: 2025-11-17
**Repository State**: Phase 2-3 development
**Next.js Version**: 15.1.7
**React Version**: 19.0.0
