// 只用來做「登入」——這個 App 的實際資料（transactions 表）完全不透過
// anon key 存取，見 supabase-schema.sql 的說明：那張表開了 RLS 又沒設任何
// policy，所以就算 anon key 外流，也完全讀寫不到交易紀錄。
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;
