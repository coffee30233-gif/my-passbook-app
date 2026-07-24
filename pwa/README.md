# 我的存摺 —— 部署成 iPhone 可用的 PWA

這個資料夾是一個完整的網頁 App 專案，部署到網路上之後，
就可以在 iPhone 的 Safari 打開，加到主畫面，變成一個看起來很像 App 的圖示。

不需要 Mac、不需要 Xcode、不需要 Apple 開發者帳號。

---

## 你會用到的東西

- 一個 **GitHub** 帳號（免費，用來放程式碼）
- 一個 **Vercel** 帳號（免費，用來部署網站，可以直接用 GitHub 帳號登入）
- 一個 **Anthropic API 金鑰**（只有在你想繼續使用「AI 辨識帳單」「財務小幫手」這兩個功能時才需要）

---

## 步驟一：把程式碼放到 GitHub（不需要用終端機）

1. 到 [github.com](https://github.com) 註冊/登入
2. 右上角「+」→「New repository」，取個名字（例如 `my-passbook-app`），設為 Public 或 Private 都可以，建立
3. 進到這個新的 repository 頁面，點「uploading an existing file」
4. 把這整個資料夾裡的所有檔案和子資料夾**直接拖進去**上傳（`src/`、`public/`、`api/`、`package.json`、`vite.config.js`、`index.html`、`.gitignore` 全部都要）
5. 最下面點「Commit changes」

## 步驟二：用 Vercel 部署

1. 到 [vercel.com](https://vercel.com)，選擇用 GitHub 帳號登入
2. 「Add New」→「Project」，選擇你剛剛建立的 repository，點「Import」
3. Vercel 會自動偵測這是一個 Vite 專案，設定基本上不用改，直接點「Deploy」
4. 等 1-2 分鐘，部署完成後會給你一個網址，例如 `my-passbook-app.vercel.app`

## 步驟三（選用）：設定 AI 功能的金鑰

如果你想繼續使用「AI 辨識帳單」和「財務小幫手」：

1. 到 [console.anthropic.com](https://console.anthropic.com) 申請一組 API 金鑰
2. 回到 Vercel，進入你的專案 →「Settings」→「Environment Variables」
3. 新增一筆：Name 填 `ANTHROPIC_API_KEY`，Value 貼上你的金鑰，Save
4. 回到「Deployments」分頁，把最新的部署重新 Deploy 一次（讓新的環境變數生效）

如果不設定這組金鑰，App 其他功能都正常，只有這兩個 AI 功能會顯示連線失敗的訊息。

## 步驟四：在 iPhone 上加到主畫面

1. 用 iPhone 的 **Safari**（一定要用 Safari，不能用 Chrome）打開 Vercel 給你的網址
2. 點下方分享按鈕（方形加箭頭的圖示）
3. 往下捲，點「加入主畫面」
4. 確認名稱，點「新增」

桌面上就會出現一個圖示，點開是全螢幕的，看起來很像原生 App。

---

## 關於資料

原本在 Claude.ai 裡的資料是存在 `window.storage`（只在對話環境裡存在）。
這個專案已經把它換成瀏覽器的 `localStorage`（在 `src/storage.js`），
資料會存在使用者自己的手機/瀏覽器裡，換手機或清除瀏覽器資料會不見，
之後如果想要跨裝置同步，需要另外做帳號系統 + 雲端資料庫，這是更大的一步，需要的話可以再討論。

## 檔案結構

```
├── index.html          網頁進入頁面（iOS 相關 meta 標籤都在這）
├── vite.config.js       建置設定，包含 PWA 外掛
├── package.json          套件清單
├── src/
│   ├── main.jsx          React 進入點
│   ├── App.jsx           整個 App 的邏輯與畫面（就是原本的記帳 App）
│   └── storage.js        本機資料儲存（localStorage）
├── api/
│   └── claude.js         安全代理 Anthropic API 的伺服器端函式
└── public/icons/         App 圖示
```
