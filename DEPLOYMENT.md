# Cloudflare Pages Functions 部署检查清单

## 问题诊断

如果遇到 `Network error: Cannot reach /api/feishu/state` 错误，请按以下步骤检查：

### 1. 检查 Functions 目录结构

确保 `functions` 目录在项目根目录，结构如下：
```
functions/
  api/
    feishu/
      state.ts
      health.ts
```

### 2. 检查 Functions 文件格式

每个 Function 文件必须：
- 导出 `onRequest` 函数
- 接收 `context` 参数，包含 `request` 和 `env`
- 返回 `Response` 对象

示例：
```typescript
export const onRequest = async (context: { request: Request; env: Env }) => {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
```

### 3. 检查 Cloudflare Pages 部署配置

1. 登录 Cloudflare Dashboard
2. 进入 Pages 项目
3. 检查部署日志，确认 Functions 是否被识别
4. 查看部署详情，确认 `functions` 目录是否被包含

### 4. 测试 Functions 是否部署

在浏览器中访问：
- `https://your-domain.pages.dev/api/feishu/health`
- 应该返回 `{"ok": true, "message": "Feishu sync function is deployed and working", ...}`

### 5. 常见问题

**问题 1：Functions 没有被识别**
- 确保 `functions` 目录在项目根目录
- 确保文件使用 `.ts` 扩展名
- 确保导出 `onRequest` 函数

**问题 2：404 错误**
- 检查路由路径是否正确（`/api/feishu/state`）
- 检查 Functions 是否在最新部署中被包含
- 尝试重新部署项目

**问题 3：本地开发无法访问**
- 使用 `npm run dev:cf` 而不是 `npm run dev`
- 或者直接使用部署后的版本

### 6. 重新部署

如果 Functions 没有被正确部署，尝试：
1. 删除旧的部署
2. 重新推送代码到 GitHub
3. 等待 Cloudflare Pages 自动重新部署
4. 检查新的部署日志

### 7. 联系支持

如果问题仍然存在：
1. 检查 Cloudflare Pages 控制面板中的 Functions 标签
2. 查看部署日志中的错误信息
3. 确认项目设置中的构建命令和输出目录正确

