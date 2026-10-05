// Vercel Serverless Function：讓 Supabase 免費方案不要因為太久沒人用而自動暫停。
//
// Supabase 免費專案約一週沒有任何活動就會被暫停，記帳 App 如果一陣子沒開
// 就會中招。vercel.json 設定了每天一次的 Cron 呼叫這支，這裡對資料庫做一次
// 真正的輕量查詢（只算筆數、不回傳任何資料），讓專案算有在活動。
//
// 如果 Vercel 專案有設 CRON_SECRET 環境變數，Vercel 會在 Cron 呼叫時自動帶上
// Authorization: Bearer <secret>，這裡就會擋掉沒帶的請求；沒設的話這支維持
// 公開——它只會回 { ok: true }，沒有任何資料可洩漏，但設了可以避免被陌生人
// 拿來亂戳資料庫。

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers["authorization"] !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    res.status(500).json({ error: "伺服器尚未設定 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY" });
    return;
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await supabase.from("transactions").select("id", { count: "exact", head: true });
  if (error) {
    console.error("[keep-alive] Supabase query failed:", error.message);
    res.status(502).json({ error: error.message });
    return;
  }
  res.status(200).json({ ok: true });
}
