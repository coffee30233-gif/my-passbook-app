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

這個專案的 AI 功能是接 **Google Gemini API**，免費額度足夠個人記帳這種低頻使用，長期使用基本上不用付錢（跟 Anthropic 的 API 不同，Gemini 免費額度是每天重置，不是一次用完就沒有）。

1. 到 [aistudio.google.com](https://aistudio.google.com) 用 Google 帳號登入，點「Get API key」→「Create API key」，**不需要綁信用卡**
2. 回到 Vercel，進入你的專案 →「Settings」→「Environment Variables」
3. 新增一筆：Name 填 `GEMINI_API_KEY`，Value 貼上你的金鑰，Save
4. 回到「Deployments」分頁，把最新的部署重新 Deploy 一次（讓新的環境變數生效）

免費額度大概是每天 250 次請求上下（依 Google 當時的方案而定），對個人記帳來說非常夠用。如果不設定這組金鑰，App 其他功能都正常，只有這兩個 AI 功能會顯示連線失敗的訊息，訊息裡會直接告訴你是缺金鑰還是其他原因。

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
資料會存在使用者自己的手機/瀏覽器裡，換手機或清除瀏覽器資料會不見。

**交易紀錄現在額外有一份雲端副本**（見下方「設定雲端交易同步」），讓外部服務
（例如 Lynn's Agents 的管帳助理）可以透過語音/文字幫你新增一筆交易，
App 開啟時會自動把雲端新增的交易拉回來、併入本機資料。投資組合、預算、
目標這些其他資料目前還是只存在本機，沒有雲端備份。

## 設定雲端交易同步（選用，只有想用外部助理記帳才需要）

1. 到 [supabase.com](https://supabase.com) 建立一個新專案（免費方案就夠用）
2. 進到專案的 SQL Editor，貼上 `supabase-schema.sql` 整份內容並執行一次
3. 到專案設定 → API，複製 **Project URL** 和 **service_role key**（注意不是 anon/public key）
4. 到 Vercel 專案設定 → Environment Variables，新增三筆：
   - `SUPABASE_URL`：剛剛複製的 Project URL
   - `SUPABASE_SERVICE_ROLE_KEY`：剛剛複製的 service_role key
   - `PASSBOOK_API_SECRET`：自己取一組夠長的隨機字串（例如用密碼產生器生一組），
     這把密鑰要跟呼叫這個 API 的外部服務（例如 Lynn's Agents）設定的值完全一樣
5. 回到「Deployments」分頁，重新 Deploy 一次

設定好、也做完下面「設定整站登入鎖」之後，登入狀態下手動記的每一筆帳（新增、刪除）都會自動同步，不需要手動搬遷。**在這之前就已經存在的本機交易不會自動補上雲端**——如果需要把那些舊資料也搬過去，直接呼叫 `POST /api/transactions`（帶 `X-Api-Secret` 標頭、body 是 `{"transactions":[...]}`）批次匯入即可。

## 設定整站登入鎖（推薦，避免任何人拿到網址就能看到你的帳本）

在做了「設定雲端交易同步」之後，這個 App 的網址本身沒有任何保護——誰都可以打開看到你的交易紀錄。加上這一步之後，只有你自己的 Google 帳號能登入看到帳本，其他人打開網址只會看到登入畫面。

1. 到 [supabase.com](https://supabase.com) 打開你在「設定雲端交易同步」建立的那個專案 → **Authentication → Providers**，開啟 **Google**
2. 這一步需要一組 Google OAuth Client ID / Secret。如果你已經在別的專案（例如 Lynn's Agents）設定過 Google 登入，可以直接沿用同一組：到 [Google Cloud Console](https://console.cloud.google.com) 找到那個 OAuth 用戶端 → 編輯 → 「已授權的重新導向 URI」新增一筆：
   `https://<你的專案 ref>.supabase.co/auth/v1/callback`
   （這個網址可以在 Supabase 的 Authentication → Providers → Google 設定頁面裡直接複製）
   把同一組 Client ID / Client Secret 貼到 Supabase 的 Google provider 設定裡，Save
3. 到 Supabase 專案設定 → **API**，複製 **Project URL** 和 **anon / public key**（注意：這次要複製的是 anon key，不是 service_role key，因為這組是要放進瀏覽器看得到的程式碼裡的）
4. 到 Vercel 專案設定 → Environment Variables，新增三筆：
   - `VITE_SUPABASE_URL`：剛剛複製的 Project URL（跟 `SUPABASE_URL` 是同一個值）
   - `VITE_SUPABASE_ANON_KEY`：剛剛複製的 anon key
   - `VITE_OWNER_EMAIL`：你自己登入時會用到的 Google 帳號 email
   再新增一筆伺服器端用的：
   - `OWNER_EMAIL`：跟 `VITE_OWNER_EMAIL` 填一模一樣的 email
5. 到 Supabase 的 Authentication → URL Configuration，把 **Site URL** 設成你的 Vercel 網址（例如 `https://my-passbook-app.vercel.app`）
6. 回到 Vercel「Deployments」分頁，重新 Deploy 一次
7. 打開 App，會先看到「使用 Google 帳號登入」的畫面，用你自己的 Google 帳號登入即可進入帳本。用別的帳號登入會顯示「未被授權」，不會看到任何資料

## 檔案結構

```
├── index.html                網頁進入頁面（iOS 相關 meta 標籤都在這）
├── vite.config.js             建置設定，包含 PWA 外掛
├── package.json                套件清單
├── supabase-schema.sql         雲端交易資料表的 SQL（貼到 Supabase SQL Editor 執行）
├── src/
│   ├── main.jsx                React 進入點
│   ├── App.jsx                 整個 App 的邏輯與畫面（就是原本的記帳 App）
│   ├── LoginGate.jsx            整站登入鎖（Google 登入，只放行 VITE_OWNER_EMAIL）
│   ├── supabaseClient.js        Supabase 用戶端（只用來登入，不碰交易資料表）
│   └── storage.js              本機資料儲存（localStorage）
├── api/
│   ├── gemini.js                安全代理 Google Gemini API 的伺服器端函式
│   └── transactions.js          交易紀錄的雲端讀寫端點（GET 需登入、POST 需要密鑰）
└── public/icons/                App 圖示
```
