// Vercel Serverless Function：交易紀錄的雲端讀寫端點。
//
// GET 需要帶 App 登入後拿到的 Supabase session token（Authorization: Bearer
// <access_token>），驗證這個 token 屬於 OWNER_EMAIL 這個帳號才放行——App 本身
// 開啟時會自動帶上（見 src/App.jsx、src/LoginGate.jsx）。在這之前 GET 完全不
// 需要驗證，等於誰有網址就能看到所有交易紀錄，這裡補上去才是真正擋資料外洩
// 的地方（前端的登入畫面只是擋住看得到的畫面，擋不住直接打 API）。
//
// POST 需要帶正確的 X-Api-Secret 標頭才能新增交易——這是另一條路徑，
// 給 Lynn's Agents 的管帳助理做伺服器對伺服器呼叫用的，跟上面的 Google
// 登入無關，維持原樣不變。
//
// 部署後記得到 Vercel 專案設定 → Environment Variables，新增：
// SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY（從 Supabase 專案設定複製）
// PASSBOOK_API_SECRET（自己取一組夠長的隨機字串，Lynn's Agents 那邊要填一樣的值）
// OWNER_EMAIL（唯一允許登入查看帳本的 Google 帳號 email）

import { createClient } from "@supabase/supabase-js";

const VALID_TYPES = ["expense", "income"];

function getClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export default async function handler(req, res) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    res.status(500).json({ error: "伺服器尚未設定 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY" });
    return;
  }
  const supabase = getClient();

  if (req.method === "GET") {
    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user || userData.user.email !== process.env.OWNER_EMAIL) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const since = typeof req.query.since === "string" ? req.query.since : null;
    let query = supabase.from("transactions").select("*").order("created_at", { ascending: true });
    if (since) query = query.gt("created_at", since);

    const { data, error } = await query;
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(200).json({ transactions: data });
    return;
  }

  if (req.method === "POST") {
    const secret = req.headers["x-api-secret"];
    if (!secret || secret !== process.env.PASSBOOK_API_SECRET) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Bulk mode — { transactions: [...] } — only used by the one-time local
    // -> cloud migration UI (帳戶頁), source tagged "migration" instead of
    // "assistant" so it's distinguishable later if needed.
    if (Array.isArray(req.body?.transactions)) {
      const rows = [];
      for (const t of req.body.transactions) {
        if (!t.date || !t.type || !t.category || typeof t.amount !== "number" || !(t.amount > 0)) continue;
        if (!VALID_TYPES.includes(t.type)) continue;
        rows.push({
          date: t.date,
          type: t.type,
          category: t.category,
          amount: t.amount,
          account_id: t.accountId || "cash",
          note: t.note || null,
          project_id: t.projectId || null,
          source: "migration",
        });
      }
      if (rows.length === 0) {
        res.status(400).json({ error: "沒有任何有效的交易可以匯入" });
        return;
      }
      const { data, error } = await supabase.from("transactions").insert(rows).select();
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.status(201).json({ imported: data.length });
      return;
    }

    const { date, type, category, amount, accountId, note, projectId } = req.body || {};
    if (!date || !type || !category || typeof amount !== "number" || !(amount > 0)) {
      res.status(400).json({ error: "缺少必要欄位（date/type/category/amount）或格式不正確" });
      return;
    }
    if (!VALID_TYPES.includes(type)) {
      res.status(400).json({ error: "type 必須是 expense 或 income" });
      return;
    }

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        date,
        type,
        category,
        amount,
        account_id: accountId || "cash",
        note: note || null,
        project_id: projectId || null,
        source: "assistant",
      })
      .select()
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.status(201).json({ transaction: data });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
