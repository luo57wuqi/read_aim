# Smart English Reader (AI-Powered) / 智能英语阅读助手

一个智能的、具备上下文感知的英语阅读助手。利用 Google Gemini AI 和“联想记忆法”技术，将静态文本转化为交互式的学习体验。

---

## 🏗 架构与逻辑关系 (Architecture & Logic)

本项目是一个基于 React 的**客户端单页应用 (SPA)**，没有后端服务器。它采用**集中式状态管理**模式（“本地优先”策略）。所有的逻辑核心都在 `App.tsx` 中。

### 1. 核心架构设计 (Core Architecture)

*   **控制器 (Controller) - `App.tsx`**: 
    *   **角色**: 应用的“大脑”。
    *   **职责**: 
        1.  持有所有核心状态：`articles`（文章库）、`savedItems`（单词库）、`viewMode`（视图模式）、`history`（历史记录）。
        2.  负责所有的数据持久化（读写 `localStorage`）。
        3.  分发回调函数给子组件（如 `onSave`, `onUpdate`）。
*   **服务层 (Service Layer) - `services/geminiService.ts`**: 
    *   **角色**: 无状态的工具人。
    *   **职责**: 单纯负责处理 API 通信。它接收文本，构造 Prompt（提示词），调用 Gemini API，并返回格式化好的 JSON 数据。它不知道任何关于“当前文章”或“用户设置”的信息，完全依赖传入的参数。
*   **UI 组件 (Pure Components)**: 
    *   **角色**: 视图层。
    *   **职责**: 如 `VocabularyCard` (单词卡) 或 `DraggableSheet` (悬浮窗)，它们只负责根据 `props` 渲染界面，并通过事件通知 `App.tsx` 进行数据变更。

### 2. 数据流向：单词的“一生” (Data Flow)

当用户在界面上点击一个单词时，数据是如何流转的？

1.  **交互触发**: 用户在 `App.tsx` 的阅读区域点击单词。
2.  **缓存优先策略 (Cache-First Strategy)**: 
    *   `App.tsx` 此时不会立刻调用 AI。它会先去 `savedItems` (本地单词库) 里查找。
    *   **如果存在**: 直接使用本地保存的数据（含用户编辑过的笔记和图片）。
    *   **如果不存在**: 调用 `geminiService.generateWordCard` 向 Google Gemini 请求数据。
3.  **渲染 (Rendering)**: 数据被放入 `wordCardStack` 状态数组中，触发 `DraggableSheet` 渲染出卡片。
4.  **修改与同步 (Edit & Sync)**: 
    *   用户在卡片上点击“编辑”，修改了助记图片。
    *   `VocabularyCard` 调用 `onUpdate` 回调。
    *   `App.tsx` 接收到新数据，**关键逻辑**：它会检查这个单词是否在 `savedItems` 中。如果是，它会立刻更新 `savedItems` 里的记录，并同步到 `localStorage`。这保证了即使你关闭卡片，下次打开时你的图片依然存在。

### 3. 文件职责映射图 (File Responsibilities)

| 文件路径 | 核心职责 |
| :--- | :--- |
| **`App.tsx`** | **核心入口**。逻辑中枢，状态容器。处理单词点击、数据保存、侧边栏开关、路由切换。 |
| **`services/geminiService.ts`** | **AI 接口**。定义了 Prompt 模板和 JSON Schema。负责把自然语言转为结构化 JSON。 |
| **`types.ts`** | **数据契约**。定义了所有核心数据结构 (`SavedItem`, `Article`)，确保全项目类型安全。 |
| **`components/VocabularyCard.tsx`** | **业务组件**。展示单词详情。包含播放音频、编辑笔记、上传图片的 UI 逻辑。 |
| **`components/DraggableSheet.tsx`** | **通用 UI**。实现了一个可拖拽、可叠加的模态框容器。 |
| **`components/ArticleLibrary.tsx`** | **业务组件**。文章列表管理。处理文本粘贴、分词预处理 (`processTextToArticle`)。 |
| **`components/SettingsView.tsx`** | **系统组件**。处理设置、**数据备份与恢复**（含全量备份和单词库独立导入）。 |

---

## 🌟 核心功能特性

### 1. 深度 AI 单词卡 (Deep Vocabulary Cards)
不同于简单的字典定义，我们生成的是符合“联想记忆法”的深度卡片：
- **核心含义内核**: 提炼单词最底层的抽象概念。
- **有意思发现**: 词根词缀分析、谐音梗、拼写记忆点。
- **视觉图**: AI 生成的画面描述，或用户上传的图片。

### 2. 智能数据策略 (Smart Data Strategy)
- **本地优先**: 极大地减少 API 调用消耗。已学过的单词直接从本地秒开，支持离线复习。
- **双重备份机制**:
  - **全量备份**: 导出所有文章、历史和单词。
  - **单词库独立导出**: 只导出单词数据。方便你在切换文章、甚至重置应用后，依然保留你积累的词汇库。**导入时采用合并策略**，不会覆盖现有数据。

### 3. 阅读体验优化
- **双卡片堆叠**: 支持同时查看“当前单词”和“上一个单词”，方便对比记忆。
- **交互式分词**: 点击单词查词，点击句子查翻译。
- **图片优化**: 导出 JSON 时，会自动剥离大型 Base64 图片（保留 URL），防止备份文件体积过大导致浏览器崩溃。

---

## 🚀 安装与运行

### 环境要求
1.  **Node.js** (v16+)
2.  **Google Gemini API Key**: 从 [Google AI Studio](https://aistudiocdn.com/ai.google.dev) 获取。

### 安装步骤

1.  **安装依赖**:
    ```bash
    npm install
    # 确保安装了最新的 SDK
    npm install @google/genai react react-dom
    ```

2.  **运行**:
    ```bash
    npm run dev
    # 或
    npx serve .
    ```

3.  **配置**:
    打开网页右上角的设置图标，输入你的 Gemini API Key 即可开始使用。

---

## 📄 License
MIT