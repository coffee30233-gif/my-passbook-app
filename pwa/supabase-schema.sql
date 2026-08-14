-- 我的存摺 — 雲端交易紀錄
-- 貼到 Supabase SQL Editor 執行一次即可。
--
-- 這個 App 主要還是用本機儲存（localStorage），這張表只是一個「雲端信箱」——
-- 外部服務（例如 Lynn's Agents 的管帳助理）新增的交易先進到這裡，
-- App 開啟時會主動拉取、併入本機資料（見 src/App.jsx）。
-- 不是完整帳本的雲端備份，投資組合/預算/目標這些目前還是只存在本機。

create table if not exists transactions (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  type        text not null check (type in ('expense', 'income')),
  category    text not null,
  amount      numeric not null check (amount > 0),
  account_id  text not null default 'cash',
  note        text,
  project_id  text,
  -- 這筆是從哪裡新增的（'assistant' = 管帳助理透過 API 寫入，
  -- 'migration' = 舊資料搬遷腳本寫入）——方便之後追查來源，App 本身不使用這個欄位。
  source      text not null default 'manual',
  created_at  timestamptz not null default now()
);

create index if not exists transactions_created_at_idx on transactions (created_at);

-- 只有伺服器端的 service role key（api/transactions.js 裡用的那把）會碰這張表，
-- service role 本來就會略過 RLS——這裡開啟純粹是防禦性設定，
-- 避免萬一 anon/public key 不小心外流時，還是完全連不動這張表。
alter table transactions enable row level security;
