
# 开发历史日志 (Development History)

## 第七阶段：UI 层次感与文档完善 (Phase 7: UI Hierarchy & Documentation)
**目标**: 提升视觉体验的精致度，并提供完善的用户指导。

1.  **UI 层次感重构 (Hierarchy)**:
    - 彻底重构了 `App.tsx` 中的主题逻辑。不再只是简单的背景色切换。
    - 引入了 **Background (背景)**、**Surface (纸张/层)**、**Elevation (阴影深度)** 的概念。
    - **改进点**:
        - 阅读区域现在看起来像是一张“悬浮”在背景上的纸，拥有更自然的阴影。
        - 侧边栏和顶部导航栏拥有了与主题匹配的半透明毛玻璃效果 (Backdrop Blur)。
        - 文字颜色分为“主要”、“次要”和“高亮”，在深色模式（Forest/Amethyst）下阅读更舒适，不再刺眼。
2.  **用户手册 (User Manual)**:
    - 将 `README.md` 重写为面向最终用户的操作手册。
    - 详细解释了阅读模式的交互逻辑（点击单词 vs 句子）、卡片编辑功能以及高级 API 配置方法。
3.  **交互细节**:
    - 优化了高亮颜色，使其在不同主题下都能保持清晰但柔和（例如在深色模式下使用低饱和度的黄/绿色）。

## 第六阶段：主题引擎与高级接口 (Phase 6: Themes & Advanced API)
**目标**: 提升个性化体验，增强对不同后端服务的兼容性。

1.  **主题引擎 (Theme Engine)**:
    - 在 `types.ts` 中定义了 `Theme` 类型。
    - 在 `App.tsx` 中实现了动态 CSS 类名切换逻辑，支持 5 种配色方案。
    - 更新 `Sidebar.tsx` 和 `VocabularyCard` 适配深色模式。
2.  **高级自定义 API 重构**:
    - 新增 `services/customApiService.ts`。
    - 不再局限于简单的 GET 请求。现在支持用户在设置面板中配置 HTTP Method, Headers, Body Template 和 JSON Response Path。这使得应用可以对接几乎任何返回 JSON 的 API。
3.  **图片性能优化**:
    - 新增 `utils/imageHelpers.ts`，引入 Canvas 压缩算法。
    - 上传图片时强制压缩为 JPEG (Quality 0.7, Max Width 800px)，防止 Base64 字符串过大导致 LocalStorage 溢出或浏览器卡顿。
    - 在导出设置中增加了“是否包含图片”的开关。

## 第五阶段：架构完善与数据健壮性 (Phase 5)
... (Previous history maintained)
