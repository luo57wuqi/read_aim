# Smart English Reader (AI-Powered) / 智能英语阅读助手

An intelligent, context-aware English reading assistant. It transforms static text into an interactive learning experience using Google's Gemini AI and "Associative Memory" techniques.

一个智能的、具备上下文感知的英语阅读助手。利用 Google Gemini AI 和“联想记忆法”技术，将静态文本转化为交互式的学习体验。

---

## 🏗 Architecture & Logic / 架构与逻辑关系

This project is a **Client-Side Single Page Application (SPA)** built with React. It follows a **Centralized State Management** pattern ("Local-First").

本项目是一个基于 React 的**客户端单页应用 (SPA)**。它采用**集中式状态管理**模式（“本地优先”策略）。

### 1. Core Architecture / 核心架构
*   **Controller (`App.tsx`)**: 
    *   Acts as the "Brain" of the application. It holds all state (`articles`, `savedItems`, `history`, `viewMode`).
    *   Only `App.tsx` interacts with `localStorage`. Child components trigger updates via callbacks.
    *   **控制器**: 应用的“大脑”。持有所有状态。只有它负责与本地存储交互，子组件通过回调函数触发更新。
*   **Service Layer (`services/geminiService.ts`)**: 
    *   Pure functions that handle API communication. It does not hold state.
    *   **服务层**: 处理 API 通信的纯函数，不保存状态。
*   **UI Components**: 
    *   Purely presentational (mostly). They receive data via props and emit events.
    *   **UI 组件**: 主要负责展示，通过 props 接收数据并发出事件。

### 2. Data Flow: "The Lifecycle of a Word" / 数据流：单词的生命周期

When a user interacts with a word, the following logic chain triggers:

当用户与单词交互时，触发以下逻辑链：

1.  **Interaction (交互)**: User clicks a tokenized word in `App.tsx`.
2.  **Check Cache (查缓存)**: 
    *   `fetchCardData` first checks `savedItems` (Local Dictionary).
    *   If found → Returns local data instantly (Offline ready).
    *   If not found → Calls `geminiService` (AI Generation).
3.  **Visualization (展示)**: Data is pushed to `wordCardStack` state, rendering a `DraggableSheet`.
4.  **Modification (修改)**: 
    *   User edits the card (e.g., adds an image).
    *   `VocabularyCard` calls `onUpdate`.
    *   **Crucial Step**: `App.tsx` detects if this word is already in `savedItems`. If yes, it updates the persistent storage immediately.
5.  **Persistence (持久化)**: `useEffect` hooks in `App.tsx` automatically sync state changes to `localStorage`.

### 3. File Responsibilities / 文件职责说明

| File | Responsibility (CN) | Responsibility (EN) |
| :--- | :--- | :--- |
| `App.tsx` | **核心入口**。管理所有状态、路由逻辑、数据持久化和组件协调。 | **Core Entry**. Manages all state, routing logic, persistence, and orchestration. |
| `services/geminiService.ts` | **AI 接口层**。处理 Prompt 工程、API 调用和 JSON 格式化。 | **AI Interface**. Handles Prompt Engineering, API calls, and JSON formatting. |
| `types.ts` | **类型定义**。定义了 Article, WordCardData, SavedItem 等核心数据结构。 | **Type Definitions**. Defines core data structures like Article, WordCardData, etc. |
| `components/VocabularyCard.tsx` | **单词卡片**。展示单词详情、处理编辑模式、图片上传逻辑。 | **Word Card**. Displays details, handles edit mode, and image upload logic. |
| `components/DraggableSheet.tsx` | **悬浮窗容器**。处理拖拽逻辑、层级叠加 (z-index) 和定位。 | **Floating Container**. Handles dragging logic, stacking (z-index), and positioning. |
| `components/ArticleLibrary.tsx` | **文章库**。管理文章列表、导入文本、分词处理。 | **Library**. Manages article list, text import, and tokenization. |
| `components/StatsView.tsx` | **数据分析**。统计词频、历史记录、计算当前文章的单词覆盖率。 | **Analytics**. Tracks frequency, history, and calculates word coverage. |
| `components/SettingsView.tsx` | **设置与备份**。管理 API Key、导出/导入 JSON 备份 (含图片优化逻辑)。 | **Settings**. Manages API Keys, JSON Backup/Restore (with image optimization). |

---

## 🌟 Key Features / 核心功能

### 1. AI-Driven Vocabulary Cards (AI 驱动的单词卡)
Instead of simple definitions, the app generates detailed cards with:
不仅是简单的定义，应用生成包含以下内容的详细卡片：
- **Core Logic (核心含义内核)**: The abstract concept behind the word.
- **Mnemonic Analysis (有意思发现)**: Roots, spelling tricks, or sound associations.
- **Visual Prompts (图)**: Descriptions or user-uploaded images.

### 2. Intelligent Data Strategy (智能数据策略)
- **Local-First**: Always prioritizes your local database over AI requests to save tokens and work offline.
  - **本地优先**: 总是优先使用本地数据库而非 AI 请求，以节省 Token 并支持离线。
- **Smart Export**: When exporting backups, Base64 images are stripped (unless they are URLs) to keep files lightweight.
  - **智能导出**: 备份时自动剥离 Base64 图片（保留 URL），保持文件轻量。

### 3. Reading Interface (阅读界面)
- **Interactive Tokenization**: Click any word to split sentences and analyze context.
- **Stacking UI**: View "Current" and "Previous" cards side-by-side.
- **Translation**: Batch translate paragraphs using Gemini.

---

## 🚀 Setup & Deployment / 安装与部署

### Prerequisites / 前置要求
1.  **Node.js** (v16+)
2.  **Google Gemini API Key**: Get one from [Google AI Studio](https://aistudiocdn.com/ai.google.dev).

### Installation / 安装步骤

1.  **Clone the repository / 克隆仓库**:
    ```bash
    git clone <repository-url>
    cd smart-english-reader
    ```

2.  **Install Dependencies / 安装依赖**:
    ```bash
    npm install
    npm install @google/genai react react-dom
    ```

3.  **Configuration / 配置**:
    *   Create a `.env` file or enter your API Key in the App Settings UI.
    *   创建 `.env` 文件，或者直接在应用设置界面输入 API Key。

### Running Locally / 本地运行

```bash
npm run dev
# OR / 或
npx serve .
```

---

## 📄 License
MIT
