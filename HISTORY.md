# Development History / 开发历史

## Phase 1: Core Foundation & AI Integration
**Goal**: Create a reader that uses Gemini to analyze words.
1.  **Project Structure**: Set up React + TypeScript.
2.  **Gemini Service**: Implemented `generateWordCard` with strict JSON Schema.
3.  **Text Processing**: Utilities to split text into sentences and interactive tokens.

## Phase 2: User Experience & Interactivity
**Goal**: Fluid reading experience.
1.  **Draggable Sheets**: Floating modals so definitions don't block text.
2.  **Sidebar**: Saved items collection.
3.  **TTS**: Native browser text-to-speech.

## Phase 3: Persistence & Library
**Goal**: Make it a usable app.
1.  **LocalStorage**: Persist Articles, Saved Words, and History.
2.  **Analytics**: Word frequency tracking and history logs.

## Phase 4: Customization & Multimedia
**Goal**: Personalization.
1.  **Edit Mode**: Modify AI definitions.
2.  **Image Support**: Upload local images (Base64) or paste URLs.

## Phase 5: Architecture Refinement & Robustness (Current)
**Goal**: Optimization, Bug Fixes, and Documentation.
1.  **Data Consistency Fix**: 
    - Fixed issue where editing a card (e.g., adding an image) didn't update the `SavedItems` list immediately. 
    - *Logic Change*: `App.tsx` now watches for updates and syncs them to the persistent store.
2.  **Smart Export**: 
    - Implemented logic to strip heavy Base64 images from JSON exports to keep backups small, while preserving URLs.
3.  **Documentation Overhaul**: 
    - Rewrote `README.md` to be bilingual.
    - Added specific architectural diagrams and logic flow descriptions to aid contributors.
