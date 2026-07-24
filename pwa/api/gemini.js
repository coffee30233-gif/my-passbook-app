// Vercel Serverless Function：安全地代理呼叫 Google Gemini API。
// 前端只會打到 /api/gemini，真正的 API 金鑰只存在這裡（伺服器端的環境變數），
// 不會出現在瀏覽器看得到的任何程式碼裡。
//
// 部署後記得到 Vercel 專案設定 → Environment Variables，
// 新增一個 GEMINI_API_KEY，值是你自己在 aistudio.google.com 申請的 API 金鑰
// （申請免費、不需要綁信用卡）。

const MODEL = "gemini-3.6-flash";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "伺服器尚未設定 GEMINI_API_KEY，請到 Vercel 專案設定裡新增這個環境變數" });
    return;
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(req.body),
      }
    );

    const data = await geminiRes.json();
    res.status(geminiRes.status).json(data);
  } catch (e) {
    res.status(500).json({ error: "呼叫 Gemini API 時發生錯誤", detail: String(e) });
  }
}
