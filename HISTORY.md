
# 开发历史日志 (Development History)

## 第八阶段：自定义大模型接入增强 (Phase 8: Custom AI Integration)
**目标**: 方便用户接入 OpenAI、DeepSeek 等第三方大模型，并明确接口规范。

1.  **大模型预设 (Presets)**:
    - 在“高级接口”设置中增加了 **"Load Preset"** 功能。
    - 内置了标准 OpenAI 格式的 Body Template (Prompt)，自动注入了所有必须的 JSON 字段要求。
2.  **数据契约文档 (Data Contract)**:
    - 在设置界面底部显式列出了 **"接口响应数据规范 (Required JSON Response)"**，列出了所有 10 个必须字段。
    - 在 README 中增加了接入其他大模型的详细教程。

## 第七阶段：UI 层次感与文档完善 (Phase 7: UI Hierarchy & Documentation)
**目标**: 提升视觉体验的精致度，并提供完善的用户指导。

1.  **UI 层次感重构 (Hierarchy)**:
    - 彻底重构了 `App.tsx` 中的主题逻辑。
    - 引入了 **Background (背景)**、**Surface (纸张/层)**、**Elevation (阴影深度)** 的概念。
    - **改进点**:
        - 阅读区域现在看起来像是一张“悬浮”在背景上的纸，拥有更自然的阴影。
        - 侧边栏和顶部导航栏拥有了与主题匹配的半透明毛玻璃效果 (Backdrop Blur)。
        - 增强了深色模式下的对比度和高亮显示。

2.  **用户手册与数据结构**:
    - 重写 `README.md`，新增“数据结构说明”章节，详细解释了 JSON 导出数据的格式 (`WordCardData`, `SavedItem`)，方便用户进行二次开发或数据分析。

## 第六阶段：主题引擎与高级接口 (Phase 6: Themes & Advanced API)
**目标**: 提升个性化体验，增强对不同后端服务的兼容性。

1.  **主题引擎 (Theme Engine)**:
    - 支持 5 种配色方案：默白、夜间、羊皮纸、森林、紫罗兰。
2.  **高级自定义 API**:
    - 支持配置 HTTP Method, Headers, Body Template 和 Response Mapping。
3.  **图片性能优化**:
    - 引入 Canvas 压缩算法，优化 Base64 存储。

## 第五阶段：架构完善与数据健壮性 (Phase 5)
... (Previous history maintained)