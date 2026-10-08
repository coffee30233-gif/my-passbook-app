// Vercel Serverless Function：幫「投資組合」抓台股最新股價。
//
// GET /api/quotes?symbols=2330,0050,7887
// 需要帶 App 登入後的 Supabase session token（Authorization: Bearer <access_token>），
// 只有 OWNER_EMAIL 本人能用，避免這支 API 被別人拿去當免費代理。
//
// 資料來源（都是公開、免金鑰的）：
// 1. 證交所「基本市況報導」mis.twse.com.tw：上市（tse）、上櫃（otc）都查得到，盤中約 5 秒更新。
//    瀏覽器直接打會被 CORS 擋，所以要經過這裡轉一手。
// 2. 櫃買中心 OpenAPI tpex_esb_latest_statistics：興櫃股票（例如 7887 宇川精材），
//    MIS 查不到的代號才會來這裡找。
//
// 盤中有成交用最新成交價；還沒成交或收盤後沒有最新價時，依序退回最佳買價、昨收。

import { createClient } from "@supabase/supabase-js";

const SYMBOL_RE = /^[0-9A-Z]{4,6}$/;
const MAX_SYMBOLS = 30;

async function isOwnerToken(req) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return false;
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: userData } = await supabase.auth.getUser(token);
  return !!(userData?.user && userData.user.email === process.env.OWNER_EMAIL);
}

const toNum = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

function pickMisPrice(item) {
  const last = toNum(item.z) ?? toNum(item.trade?.z);
  if (last) return { price: last, kind: "成交價" };
  const bid = toNum(String(item.b || "").split("_").find((x) => toNum(x)));
  if (bid) return { price: bid, kind: "買價" };
  const prev = toNum(item.y);
  if (prev) return { price: prev, kind: "昨收" };
  return null;
}

export async function fetchMis(symbols) {
  const exCh = symbols.flatMap((s) => [`tse_${s}.tw`, `otc_${s}.tw`]).join("|");
  const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${encodeURIComponent(exCh)}&json=1&delay=0&_=${Date.now()}`;
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`MIS ${r.status}`);
  const data = await r.json();
  const out = {};
  for (const item of data.msgArray || []) {
    if (!item.c || out[item.c]) continue;
    const picked = pickMisPrice(item);
    if (!picked) continue;
    const d = item.d || "";
    out[item.c] = {
      symbol: item.c,
      name: item.n || "",
      price: picked.price,
      priceKind: picked.kind,
      prevClose: toNum(item.y),
      quotedAt: d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)} ${item.t || ""}`.trim() : "",
      market: item.ex === "otc" ? "上櫃" : "上市",
    };
  }
  return out;
}

export async function fetchEmerging(symbols) {
  const r = await fetch("https://www.tpex.org.tw/openapi/v1/tpex_esb_latest_statistics", {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) throw new Error(`TPEx ${r.status}`);
  const rows = await r.json();
  const wanted = new Set(symbols);
  const out = {};
  for (const row of rows) {
    const code = row.SecuritiesCompanyCode;
    if (!wanted.has(code)) continue;
    const latest = toNum(row.LatestPrice);
    const price = latest ?? toNum(row.Average) ?? toNum(row.PreviousAveragePrice);
    if (!price) continue;
    // 日期是民國年 1151007 → 2026-10-07
    const d = String(row.Date || "");
    const quotedAt = d.length === 7
      ? `${Number(d.slice(0, 3)) + 1911}-${d.slice(3, 5)}-${d.slice(5, 7)}`
      : "";
    out[code] = {
      symbol: code,
      name: row.CompanyName || "",
      price,
      priceKind: latest ? "成交價" : "均價",
      prevClose: toNum(row.PreviousAveragePrice),
      quotedAt,
      market: "興櫃",
    };
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!(await isOwnerToken(req))) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const symbols = [...new Set(String(req.query.symbols || "").toUpperCase().split(",").map((s) => s.trim()).filter((s) => SYMBOL_RE.test(s)))].slice(0, MAX_SYMBOLS);
  if (symbols.length === 0) {
    res.status(400).json({ error: "請提供股票代號，例如 ?symbols=2330,0050" });
    return;
  }

  const quotes = {};
  const errors = [];
  try {
    Object.assign(quotes, await fetchMis(symbols));
  } catch (e) {
    errors.push(`證交所報價失敗：${String(e.message || e)}`);
  }
  const missing = symbols.filter((s) => !quotes[s]);
  if (missing.length > 0) {
    try {
      Object.assign(quotes, await fetchEmerging(missing));
    } catch (e) {
      errors.push(`櫃買中心報價失敗：${String(e.message || e)}`);
    }
  }

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    quotes,
    notFound: symbols.filter((s) => !quotes[s]),
    errors,
    fetchedAt: new Date().toISOString(),
  });
}
