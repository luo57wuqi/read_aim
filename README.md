致敬：王振宇，王哥

# Smart English Reader 操作手册

欢迎使用 **Smart English Reader**！这是一款基于 AI 的智能英语阅读辅助工具，旨在通过“语境感知”和“联想记忆法”帮助您深度学习英语单词。

本手册将详细介绍如何使用该应用的各项功能，并提供数据结构的详细说明，方便您进行微调或二次开发。

---

## 🛠️ 本地部署与开发

如果您想在本地运行此项目（包含 Python 后端支持），请查看详细文档：
👉 **[点击查看本地部署指南 (DEPLOY.md)](DEPLOY.md)**

---

## 📚 1. 核心功能操作指南

### 1.1 阅读模式 (Reading Mode)

这是应用的主界面。您可以导入文章并开始沉浸式阅读。

*   **单词查询 (Look up Word)**:
    *   **操作**: 确保顶部工具栏的模式开关处于 **"Word"**。直接点击文章中的任何单词。
    *   **结果**: 系统会弹出一个悬浮按钮 **"Explain Word"**。点击它，AI 将会生成一张详细的“单词卡片”。
    *   **自动高亮**: 被点击的单词会变色，方便确认选中状态。

*   **句子翻译 (Translate Sentence)**:
    *   **操作**: 将顶部工具栏的模式开关切换至 **"Sentence"**。点击文章中的任意句子。
    *   **结果**: 系统会高亮整句，并弹出 **"Translate Sentence"** 按钮。点击后，AI 会提供结合上下文的精准翻译。

*   **交互模式 (Toggle Interactive)**:
    *   点击顶部的手指图标（Touch Icon）可以开启/关闭点击取词功能。关闭后，您可以像阅读普通网页一样选择复制文本。

### 1.2 单词卡片 (Vocabulary Cards)

这是本应用的核心学习单元。

*   **卡片结构**:
    *   **有记录意思**: 传统的字典释义。
    *   **有意思发现 [核心功能]**: AI 生成的联想记忆法（谐音、词根、拆分），帮助您“秒记”单词。
    *   **图 (Visual)**: 描述该单词的画面感。您可以**上传自己的图片**来强化记忆。
    *   **核心含义内核**: 单词最底层的抽象逻辑（如：heave -> 让高度升高）。
    *   **深度关联 (Deep Dive)**: 底部推荐的一个相关单词，点击可继续生成新卡片，形成“知识链”。

*   **编辑卡片**:
    *   点击卡片右上角的 **铅笔图标** 进入编辑模式。
    *   您可以修改记忆法、上传图片（支持自动压缩以节省空间），或修改例句。

### 1.3 文章库 (Library)

点击左上角的 **"Library"** 进入文章管理界面。

*   **导入文章**:
    *   点击 **"Paste / Import Article"**。
    *   您可以粘贴任何英文文本。点击 **"Save"** 后，系统会自动分句并排版。

---

## ⚙️ 2. 设置与自定义 (Settings)

点击顶部工具栏的 **齿轮图标** 打开设置面板。

### 2.1 主题设置 (Themes)
我们提供了 5 种精心调配的主题，以适应不同的阅读环境：
1.  **默白 (Light)**: 经典的白底黑字，适合日间工作。
2.  **夜间 (Dark)**: 深蓝灰色调，高对比度文字，适合夜间护眼。
3.  **羊皮纸 (Sepia)**: 暖黄色调，模拟纸质书，最为护眼。
4.  **森林 (Forest)**: 深绿色背景，低对比度，适合长时间沉浸阅读。
5.  **紫罗兰 (Amethyst)**: 优雅的深紫色调，提供独特的视觉体验。

### 2.2 数据备份与恢复
*   **导出单词本**: 仅导出您收藏的单词数据 (JSON 格式)，体积小。
*   **全量备份**: 包含文章、历史记录、设置和单词。
*   **包含图片**: 勾选后，备份文件将包含您上传的图片（文件体积会显著变大）。

---

## 🔗 4. 自定义接入其他 AI 模型 (Custom API)

如果您想使用 **DeepSeek**、**OpenAI (GPT-4)** 或其他兼容 OpenAI 格式的接口，请按以下步骤操作：

1.  打开设置，切换到 **"高级接口 (Advanced API)"** 选项卡。
2.  **数据源选择**: 确保在“通用”页签中，数据源已切换为 **Custom API**。
3.  **使用预设**: 点击 **"Load Preset: OpenAI / Compatible"** 按钮。
    *   这会自动填入 Body Template 和 Response Mapping。
4.  **修改 URL**:
    *   OpenAI: `https://api.openai.com/v1/chat/completions`
    *   DeepSeek: `https://api.deepseek.com/chat/completions` (示例)
5.  **修改 Header**:
    *   找到 `Authorization` 字段，将 `Bearer YOUR_API_KEY_HERE` 替换为您真实的 API Key (例如 `Bearer sk-xxxxxxxx`)。

### 重要：接口响应数据规范
您的模型 **必须** 返回一段 JSON（不能包含 Markdown 代码块），且 JSON 对象必须包含以下 Keys，否则应用会报错：

| 字段 Key | 类型 | 说明 |
| :--- | :--- | :--- |
| `word` | String | 单词本身 |
| `phonetic` | String | 音标 |
| `translation` | String | 中文释义 |
| `recorded_meanings` | String | 详细字典含义 |
| `mnemonic_analysis` | String | **联想记忆法解析** (核心) |
| `core_logic` | String | 核心抽象逻辑 (简短) |
| `visual_image_prompt` | String | 画面描述 |
| `scenario_sentence_en` | String | 英文例句 |
| `scenario_sentence_cn` | String | 例句中文翻译 |

*如果您使用的是 DeepSeek 或 Claude，请务必在 Prompt (Body Template) 中明确要求它“Return valid JSON only”，不要输出任何思考过程或 Markdown 标记。*

---

## 📊 3. 数据结构说明 (Data Structure)

如果您需要微调代码或分析导出的 JSON 数据，请参考以下核心数据结构。

### 3.1 单词卡片 (`WordCardData`)
这是应用中最核心的数据单元，由 Gemini AI 生成或 Custom API 返回。

```json
{
  "word": "serendipity",
  "phonetic": "ˌsɛrənˈdɪpɪti",
  "translation": "n. 意外发现珍奇事物的本领；机缘凑巧",
  
  // 核心记忆法字段
  "recorded_meanings": "n. 意外发现珍奇事物的本领...",
  "mnemonic_analysis": "Seren (Serene 宁静的) + dip (浸泡) + ity...",
  "core_logic": "意外的美好",
  "visual_image_prompt": "一个人在海边捡贝壳...",
  
  // 用户自定义字段 (可选)
  "custom_image_base64": "data:image/jpeg;base64,...", 
  
  // 上下文例句
  "scenario_sentence_en": "The discovery of penicillin was pure serendipity.",
  "scenario_sentence_cn": "青霉素的发现纯属机缘巧合。",
  
  // 关联词推荐
  "related_word_suggestion": {
    "word": "fortune",
    "reason": "Both relate to luck..."
  }
}
```

### 3.2 收藏项 (`SavedItem`)
保存在侧边栏列表中的项目。

```json
{
  "id": "1710000000123",
  "type": "word", // 或 "sentence"
  "original": "serendipity",
  "translation": "机缘凑巧",
  "cardData": { ...WordCardData... }, // 如果是单词，这里包含完整卡片信息
  "timestamp": 1710000000123,
  
  // 来源回溯信息
  "sourceArticleId": "default-1",
  "sourceArticleTitle": "Serendipity in Science",
  "sourceContextSentence": "The concept of serendipity often...",
  "sourceSentenceIndex": 0
}
```

---
**License**: MIT
