# Historical Timeline Connection Game - Development Roadmap

## Project Overview
A competitive game where players connect historical figures across time by naming intermediate historical figures, creating a path through history. Players score points based on the efficiency of their connections.

## Data Management Strategy
We will implement a hybrid approach to data management:

1. **Initial Phase (JSON-based)**
   - Store 100-200 pre-processed historical figures in JSON files
   - Host data files in the GitHub repository
   - Implement data validation and processing scripts
   - Use GitHub Actions for periodic data updates

2. **Future Scale-up (Database)**
   - Transition to Supabase when needed for:
     - User accounts and scoring
     - Dynamic data updates
     - Advanced game features
     - Performance optimization
   - Maintain backward compatibility during transition

## Phase 1: Foundation Setup
1. **Project Initialization**
   - Set up React/Next.js project structure
   - Configure TypeScript
   - Set up basic styling framework (Tailwind CSS)
   - Initialize Git repository
   - Create basic project documentation
   - Configure Netlify deployment

2. **Data Structure Design**
   - Design historical figure data schema
   - Create initial JSON dataset (100-200 figures)
   - Implement data validation
   - Create Wikipedia data extraction scripts
   - Set up GitHub Actions for data updates

**Testing Milestone 1:**
- ✓ Project builds successfully
- ✓ JSON data loads correctly
- ✓ Basic data validation works
- ✓ Netlify deployment successful

## Phase 2: Core Game Logic
1. **Historical Figure Management**
   - Create API endpoints for historical figure data
   - Implement Wikipedia data extraction system
   - Design caching system for frequently accessed data
   - Create data sanitization and validation

2. **Timeline Logic**
   - Develop timeline visualization component
   - Implement year calculation system (including BC/AD handling)
   - Create timeline positioning algorithm
   - Build connection validation system

**Testing Milestone 2:**
- ✓ Historical figure data correctly loads
- ✓ Timeline displays correctly with proper scaling
- ✓ Year calculations work for both BC and AD dates

## Phase 3: Game Mechanics
1. **Game Flow Implementation**
   - Create player session management
   - Implement random historical figure assignment
   - Build connection validation logic
   - Develop scoring system
   - Create turn management system

2. **User Interface Development**
   - Design and implement main game interface
   - Create historical figure bubbles with info cards
   - Build timeline interaction system
   - Implement drag-and-drop or click-to-place mechanics

**Testing Milestone 3:**
- ✓ Game flow works end-to-end
- ✓ Scoring system functions correctly
- ✓ UI responds properly to user interactions

## Phase 4: Data Integration
1. **Wikipedia Integration**
   - Implement Wikipedia API connection
   - Create data extraction system for:
     - Basic biographical data
     - Life span dates
     - Historical figure images via Wikimedia Commons API
   - Build caching system for API responses
   - Store image URLs rather than actual images
   - Implement Cloudinary integration for image optimization

2. **Data Management**
   - Create admin interface for data management
   - Implement data validation and cleaning
   - Set up periodic data updates
   - Create backup systems
   - Design efficient JSON structure for storing:
     - Basic biographical data
     - Image URLs
     - Timeline connections
     - Historical co-existence hints

**Testing Milestone 4:**
- ✓ Wikipedia data fetches correctly
- ✓ Images load and optimize through Cloudinary
- ✓ Data updates work as expected
- ✓ JSON structure efficiently stores all required data

## Phase 4B: Enhanced Biographical Content (V2)
1. **LLM Integration**
   - Set up self-hosted Ollama or similar free LLM
   - Create prompt engineering system for:
     - Engaging biographical content
     - Historical co-existence hints
     - Achievement timelines
   - Implement content validation and moderation

2. **Content Management**
   - Create biography generation pipeline
   - Implement content review system
   - Set up periodic content refreshes
   - Create fallback system for LLM failures

**Testing Milestone 4B:**
- ✓ LLM generates appropriate biographical content
- ✓ Content includes relevant historical connections
- ✓ Generation pipeline works reliably
- ✓ Content is stored efficiently in JSON structure

## Phase 5: User Experience & Polish
1. **Visual Enhancement**
   - Implement animations for connections
   - Add visual feedback for valid/invalid moves
   - Create loading states and transitions
   - Polish UI elements

2. **Game Features**
   - Add difficulty levels
   - Implement hint system
   - Create tutorial mode
   - Add achievement system

**Testing Milestone 5:**
- ✓ Animations work smoothly
- ✓ Game is intuitive to new users
- ✓ All features function without bugs

## Phase 6: Deployment & Launch
1. **Performance Optimization**
   - Implement code splitting
   - Optimize database queries
   - Set up CDN for static assets
   - Configure caching strategies

2. **Deployment Setup**
   - Set up CI/CD pipeline
   - Configure production environment
   - Implement monitoring and logging
   - Create backup strategies

**Testing Milestone 6:**
- ✓ Application performs well under load
- ✓ Deployment process works smoothly
- ✓ Monitoring systems function correctly

## Future Enhancements
- Multiplayer support
- Additional game modes
- Mobile app version
- Social features (leaderboards, sharing)
- Extended historical figure database

## Technical Stack
- Frontend: Next.js + TypeScript
- Styling: Tailwind CSS
- Initial Data Storage: JSON + GitHub
- Future Database: Supabase (Free Tier)
- API: RESTful + GraphQL
- Hosting: Netlify (with possible migration to Vercel)
- Image Storage: Cloudinary Free Tier
- Content Generation: Self-hosted Ollama (V2)
- Image Pipeline: Wikimedia API → Cloudinary
- Content Storage: JSON + GitHub (with compression)

## Notes for Beginners
- Each phase builds upon the previous one
- Complex features are broken down into smaller, manageable tasks
- Testing is integrated throughout development
- Focus on getting core functionality working before adding advanced features
- Data management starts simple and scales as needed
- V2 features are clearly separated for gradual implementation
- Content generation can be manually reviewed initially 