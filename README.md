# Smart English Reader (AI-Powered)

An intelligent, context-aware English reading assistant designed to help advanced learners master vocabulary using **Associative Memory** techniques (联想记忆法). Powered by Google's Gemini AI, it transforms static text into an interactive learning experience.

## 🌟 Key Features

### 1. AI-Driven Vocabulary Cards
Instead of simple dictionary definitions, the app generates deep-dive vocabulary cards containing:
- **Core Logic (核心含义内核)**: The abstract concept behind the word.
- **Mnemonic Analysis (有意思发现)**: Breakdown of spelling, roots, or sound associations to aid memory.
- **Visual Prompts (图)**: Descriptions for mental imagery.
- **Contextual Examples**: Sentences relevant to the current article.

### 2. Intelligent Reading Interface
- **Interactive Tokenization**: Click any word to instantly generate a card.
- **Sentence Translation**: Toggle full-sentence translations powered by Gemini.
- **Card Stacking**: Navigate through a history of clicked words with a visual stack (Current & Previous cards).
- **Text-to-Speech**: Native browser audio integration for pronunciation.

### 3. Data Management & Persistence
- **Local-First Architecture**: All data (Articles, Saved Words, History) is persisted in the browser's `localStorage`.
- **JSON Import/Export**: Backup your entire library and collection to a JSON file.
  - *Smart Export*: Automatically strips heavy local image data to keep backup files lightweight.
- **Data Source Configuration**: Choose between:
  - **AI Mode**: Generate new content via Gemini.
  - **Local Only**: Offline mode using only your saved collection.
  - **Custom API**: Connect to your own backend endpoint.

### 4. Learning Analytics
- **Word Frequency**: Tracks how often you encounter words across different articles.
- **Context Jump**: Click a word in your history to jump back to the exact article and sentence where you first saw it.
- **Activity Log**: Chronological view of added, removed, and looked-up items.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS (via CDN for simplicity in this build)
- **AI Integration**: Google GenAI SDK (`@google/genai`)
- **Icons**: Heroicons (SVG)
- **State Management**: React Hooks + LocalStorage

---

## 🚀 Setup & Deployment

### Prerequisites
1.  **Node.js** (v16+ recommended)
2.  **Google Gemini API Key**: Get one from [Google AI Studio](https://aistudiocdn.com/ai.google.dev).

### Installation

1.  **Clone the repository** (or download source):
    ```bash
    git clone <repository-url>
    cd smart-english-reader
    ```

2.  **Install Dependencies**:
    *Note: The current `index.html` uses an Import Map for React and GenAI SDK. If running locally with a bundler like Vite:*
    ```bash
    npm install
    npm install @google/genai react react-dom
    ```

3.  **Environment Configuration**:
    Create a `.env` file in the root directory:
    ```env
    API_KEY=your_gemini_api_key_here
    ```
    *Alternatively, you can enter the API Key directly in the App Settings UI.*

### Running Locally

If using a bundler (Vite/Webpack):
```bash
npm run dev
```

If using the provided single-file structure (no bundler), you can serve the directory using a simple HTTP server:
```bash
npx serve .
```

---

## 📖 Usage Guide

1.  **Library**: Paste English text or import JSON articles to start reading.
2.  **Reading**: 
    - Click a **Word** to generate a mnemonic card.
    - Click a **Sentence** to translate it.
    - Toggle **"CN"** to translate the visible batch of sentences.
3.  **Settings**:
    - Click the **Cog Icon** to manage backups or change the AI Model (e.g., `gemini-2.5-flash`).
    - Use **"Local Only"** mode if you want to review saved words without internet.

---

## 📄 License
MIT
