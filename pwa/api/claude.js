// Vercel Serverless Function：安全地代理呼叫 Anthropic API。
// 前端只會打到 /api/claude，真正的 API 金鑰只存在這裡（伺服器端的環境變數），
// 不會出現在瀏覽器看得到的任何程式碼裡。
//
// 部署後記得到 Vercel 專案設定 → Environment Variables，
// 新增一個 ANTHROPIC_API_KEY，值是你自己在 console.anthropic.com 申請的 API 金鑰。

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "伺服器尚未設定 ANTHROPIC_API_KEY，請到 Vercel 專案設定裡新增這個環境變數" });
    return;
  }

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    const data = await anthropicRes.json();
    res.status(anthropicRes.status).json(data);
  } catch (e) {
    res.status(500).json({ error: "呼叫 Anthropic API 時發生錯誤", detail: String(e) });
  }
}
