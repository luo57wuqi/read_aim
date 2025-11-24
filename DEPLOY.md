# Smart English Reader 本地部署指南

本文档将指导您如何在本地环境（Windows/Mac/Linux）完整运行 Smart English Reader，包括 React 前端和 Python 后端。

## 📋 1. 环境准备 (Prerequisites)

请确保您的电脑已安装以下软件：

1.  **Node.js** (版本 18 或更高)
    *   下载地址: [nodejs.org](https://nodejs.org/)
    *   验证: 终端输入 `node -v`
2.  **Python** (版本 3.8 或更高)
    *   下载地址: [python.org](https://www.python.org/)
    *   验证: 终端输入 `python --version`

---

## 🚀 2. 启动后端 (Backend Setup)

后端负责将文章和单词数据存储在本地 SQLite 数据库中。

1.  **进入后端目录**
    打开终端（Terminal / CMD），进入项目的 `backend` 文件夹（如果没有，请手动创建该文件夹并将 `app.py` 和 `requirements.txt` 放入）。
    ```bash
    cd backend
    ```

2.  **创建虚拟环境 (推荐)**
    为了不污染全局 Python 环境，建议创建虚拟环境。
    ```bash
    # Windows
    python -m venv venv
    .\venv\Scripts\activate

    # Mac/Linux
    python3 -m venv venv
    source venv/bin/activate
    ```

3.  **安装依赖**
    ```bash
    pip install -r requirements.txt
    ```

4.  **启动服务器**
    ```bash
    python app.py
    ```
    *成功提示: `Running on http://localhost:5000`*

---

## 💻 3. 启动前端 (Frontend Setup)

前端是您与之交互的网页界面。

1.  **进入项目根目录**
    打开一个新的终端窗口（保持后端的终端运行），确保在包含 `package.json` 的目录。

2.  **安装依赖**
    ```bash
    npm install
    ```

3.  **配置 API Key (可选)**
    如果您想在本地开发时默认使用某个 Gemini API Key，可以在根目录创建 `.env` 文件：
    ```env
    VITE_API_KEY=your_google_api_key_here
    ```
    *注意：您也可以直接在网页的“设置”中手动输入 Key。*

4.  **启动开发服务器**
    ```bash
    npm run dev
    ```
    *成功提示: `Local: http://localhost:5173`*

5.  **访问应用**
    打开浏览器访问 `http://localhost:5173`。

---

## 🔗 4. 连接前后端

1.  打开网页后，点击右上角的 **设置 (齿轮图标)**。
2.  点击 **"后端同步 (Server)"** 选项卡。
3.  确保 URL 为 `http://localhost:5000`。
4.  点击 **"Test"** 按钮。如果显示绿色成功信息，则连接正常。
5.  打开 **"启用服务器存储"** 开关。

现在，您添加的文章和单词都会保存到 `backend/english_reader.db` 文件中，永久存储！

---

## 📦 5. 生产环境构建 (Production Build)

如果您想将前端打包为静态文件（例如部署到 Nginx）：

```bash
npm run build
```

构建产物将生成在 `dist` 文件夹中。
