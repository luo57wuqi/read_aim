# Development History: Smart English Reader

This document summarizes the iterative development process of the Smart English Reader, detailing how features were implemented step-by-step.

## Phase 1: Core Foundation & AI Integration
**Goal**: Create a reader that uses Gemini to analyze words.

1.  **Project Structure**: Set up a React application with TypeScript and Tailwind CSS.
2.  **Gemini Service**: Implemented `generateWordCard` using the `@google/genai` SDK.
    - Defined a strict `JSON Schema` for the AI response to ensure consistent data (Word, Phonetic, Mnemonic Analysis, Core Logic).
3.  **Vocabulary Card UI**: Designed the card component to display the specific "Associative Memory" fields (Core Logic, Visual Prompt).
4.  **Text Processing**: Created utilities (`Intl.Segmenter`) to split raw text into interactive sentences and word tokens.

## Phase 2: User Experience & Interactivity
**Goal**: Make the reading experience fluid and non-intrusive.

1.  **Draggable Sheets**: Implemented a floating modal system (`DraggableSheet.tsx`) so definitions don't block the text.
2.  **Interactive Text**: Added logic to handle clicks on words vs. sentences.
3.  **Sidebar Collection**: Created a sidebar to store "Saved Items" with quick access to translations.
4.  **Speech Synthesis**: Integrated the browser's native Web Speech API for audio pronunciation.

## Phase 3: Persistence & Library Management
**Goal**: Turn the prototype into a usable app with memory.

1.  **LocalStorage Layer**: Implemented persistence hooks to save Articles, Saved Words, and History locally.
2.  **Article Library**: Built a view to manage multiple articles, paste new text, and delete old ones.
3.  **Analytics (StatsView)**: Added charts/tables to track:
    - Total words learned.
    - Global word frequency.
    - Learning history log.

## Phase 4: Customization & Multimedia
**Goal**: Allow users to personalize their learning materials.

1.  **Edit Mode**: Enabled editing of AI-generated cards (modifying mnemonics, translations).
2.  **Image Handling**:
    - Added support for pasting Image URLs.
    - Added support for uploading local images (converted to Base64 for local storage).

## Phase 5: Advanced Data Management & Optimization (Current)
**Goal**: Robustness, Backups, and Offline capabilities.

1.  **Settings Module**: Created a dedicated settings modal.
2.  **Data Source Configuration**:
    - **Local First Logic**: The app now checks `SavedItems` *before* calling the API, saving tokens and speeding up UI.
    - **Custom API**: Added support for external dictionary endpoints.
3.  **JSON Import/Export**:
    - Implemented full state backup.
    - **Optimization**: Added logic to strip large Base64 images during export to prevent massive file sizes ("Memory efficient export").
4.  **Multi-Card Stack**:
    - Refactored the single `activeCard` state into a `cardStack`.
    - Implemented a visual "Previous Card" rendering logic with offset positioning.
    - Added "Back" navigation logic to the card header.
5.  **Contextual Stats**: Updated the History view to show how many times a word appears in the *currently active article*.

## Future Roadmap Ideas
- [ ] Cloud Sync (Firebase/Supabase).
- [ ] Spaced Repetition System (SRS) quiz mode.
- [ ] PDF parsing support.
