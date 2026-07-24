import React, { useState, useEffect, useMemo, useRef } from "react";
import { storage } from "./storage";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from "recharts";
import {
  BookOpen, PieChart as PieChartIcon, Target, Wallet, Plus, X, Check,
  Utensils, Car, ShoppingBag, Film, Heart, GraduationCap, Zap, Gift,
  Briefcase, TrendingUp, PiggyBank, Banknote, Landmark, CreditCard,
  Trash2, ChevronRight, ChevronLeft, Mic, Square, LineChart, Camera, Loader2, FileText,
  MessageCircle, Send, Bell, Folder, FolderOpen,
  Home, Plane, Dumbbell, Music, Gamepad2, PawPrint, Fuel, Wrench, Sparkles, Coffee, Baby, Umbrella,
} from "lucide-react";

/* ---------------------------------------------------------------------
   靜態設定：分類 / 帳戶
--------------------------------------------------------------------- */
const CATS = {
  food:        { label: "餐飲",     icon: Utensils,      type: "expense" },
  transport:   { label: "交通",     icon: Car,           type: "expense" },
  shopping:    { label: "購物",     icon: ShoppingBag,   type: "expense" },
  entertainment:{ label: "娛樂",    icon: Film,          type: "expense" },
  medical:     { label: "醫療",     icon: Heart,         type: "expense" },
  education:   { label: "教育",     icon: GraduationCap, type: "expense" },
  utilities:   { label: "居家水電", icon: Zap,           type: "expense" },
  creditcard:  { label: "信用卡",   icon: CreditCard,    type: "expense" },
  other:       { label: "其他",     icon: Gift,          type: "expense" },
  salary:      { label: "薪資",     icon: Briefcase,     type: "income" },
  bonus:       { label: "獎金",     icon: Gift,          type: "income" },
  invest:      { label: "投資",     icon: TrendingUp,    type: "income" },
  otherIncome: { label: "其他收入", icon: PiggyBank,     type: "income" },
};

const ACCOUNT_META = {
  cash:     { label: "現金",           icon: Banknote,   start: 8000,  group: "cash" },
  twbank:   { label: "台灣銀行",       icon: Landmark,   start: 20000, group: "bank" },
  ctbc:     { label: "中國信託",       icon: Landmark,   start: 15000, group: "bank" },
  hncb:     { label: "華南銀行",       icon: Landmark,   start: 10000, group: "bank" },
  pension:  { label: "L&C公積金",     icon: PiggyBank,  start: 8000,  group: "bank" },
  linepay:  { label: "Line Pay Money", icon: Wallet,     start: 2000,  group: "bank" },
  linebank: { label: "Line Bank",      icon: Landmark,   start: 5000,  group: "bank" },
};
const BANK_KEYS = Object.keys(ACCOUNT_META).filter((k) => ACCOUNT_META[k].group === "bank");

function generateSeedBudgets() {
  return [
    { category: "food",          limit: 9000 },
    { category: "transport",     limit: 3000 },
    { category: "shopping",      limit: 6000 },
    { category: "entertainment", limit: 2500 },
    { category: "medical",       limit: 2000 },
    { category: "education",     limit: 3000 },
    { category: "utilities",     limit: 3500 },
    { category: "other",         limit: 2000 },
  ];
}

const DONUT_COLORS = ["#B33A2E", "#A8843F", "#2F6F4E", "#2B3A4A", "#8C5E58", "#5C7A63", "#7A4A3A", "#4A5A6A"];

/* 自訂分類可挑選的圖示 */
const ICON_OPTIONS = [
  { key: "home", icon: Home }, { key: "plane", icon: Plane }, { key: "dumbbell", icon: Dumbbell },
  { key: "music", icon: Music }, { key: "gamepad", icon: Gamepad2 }, { key: "paw", icon: PawPrint },
  { key: "fuel", icon: Fuel }, { key: "wrench", icon: Wrench }, { key: "sparkles", icon: Sparkles },
  { key: "coffee", icon: Coffee }, { key: "baby", icon: Baby }, { key: "umbrella", icon: Umbrella },
  { key: "gift", icon: Gift }, { key: "wallet", icon: Wallet },
];
function iconByKey(key) {
  const found = ICON_OPTIONS.find((o) => o.key === key);
  return found ? found.icon : Gift;
}

/* 語音記帳：關鍵字 → 分類 對應表（依序比對，越前面優先權越高） */
const VOICE_KEYWORDS = [
  { category: "salary",       words: ["薪水", "薪資", "月薪", "入帳"] },
  { category: "bonus",        words: ["獎金", "紅利", "分紅"] },
  { category: "invest",       words: ["股息", "配息", "投資收益", "股票賺", "投資"] },
  { category: "food",         words: ["早餐", "午餐", "晚餐", "宵夜", "咖啡", "飲料", "便當", "吃飯", "餐廳", "小吃", "麥當勞", "星巴克", "手搖"] },
  { category: "transport",    words: ["計程車", "捷運", "公車", "加油", "停車", "高鐵", "火車", "uber", "小黃", "油錢"] },
  { category: "shopping",     words: ["買", "購物", "網購", "蝦皮", "衣服", "鞋子", "包包"] },
  { category: "entertainment",words: ["電影", "唱歌", "ktv", "遊戲", "展覽", "演唱會", "門票"] },
  { category: "medical",      words: ["看醫生", "藥局", "藥", "診所", "醫院", "牙醫", "掛號"] },
  { category: "education",    words: ["補習", "學費", "課程", "書", "文具"] },
  { category: "utilities",    words: ["電費", "水費", "瓦斯", "網路費", "房租", "電信費", "管理費"] },
];

function parseVoiceText(text) {
  const cleaned = text.trim();
  // 找出第一個數字（可含小數）作為金額
  const numMatch = cleaned.match(/\d+(\.\d+)?/);
  const amount = numMatch ? numMatch[0] : "";
  // 依關鍵字表比對分類
  let matched = null;
  for (const entry of VOICE_KEYWORDS) {
    if (entry.words.some((w) => cleaned.toLowerCase().includes(w.toLowerCase()))) {
      matched = entry.category;
      break;
    }
  }
  const type = matched ? CATS[matched].type : "expense";
  const category = matched || "other";
  return { amount, category, type, note: cleaned };
}

/* ---------------------------------------------------------------------
   工具函式
--------------------------------------------------------------------- */
function fmt(n) {
  return Math.round(n).toLocaleString("zh-Hant-TW");
}
function isoDaysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}
function monthKey(iso) {
  return iso.slice(0, 7);
}
function weekdayZh(iso) {
  const d = new Date(iso + "T00:00:00");
  return ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
}
function formatDateHeader(iso) {
  const d = new Date(iso + "T00:00:00");
  return `${d.getMonth() + 1}月${d.getDate()}日 星期${weekdayZh(iso)}`;
}
function monthLabel(key) {
  const [, m] = key.split("-");
  return `${parseInt(m, 10)}月`;
}

/* 簡易可重現亂數種子產生器 */
function makeRng(seed) {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateSeedTransactions() {
  const rand = makeRng(42);
  const expenseCats = Object.keys(CATS).filter((k) => CATS[k].type === "expense");
  const ranges = {
    food: [80, 450], transport: [30, 300], shopping: [200, 2500],
    entertainment: [150, 1200], medical: [100, 1500], education: [300, 3000],
    utilities: [500, 2500], creditcard: [200, 1500], other: [50, 800],
  };
  const txs = [];
  let id = 1;
  for (let d = 149; d >= 0; d--) {
    const iso = isoDaysAgo(d);
    const day = new Date(iso + "T00:00:00").getDate();
    const month = new Date(iso + "T00:00:00").getMonth();

    if (day === 5) {
      txs.push({ id: id++, date: iso, type: "income", category: "salary", amount: 52000, accountId: "twbank", note: "月薪" });
    }
    if (day === 20 && month % 3 === 0) {
      txs.push({ id: id++, date: iso, type: "income", category: "bonus", amount: 8000, accountId: "twbank", note: "季獎金" });
    }
    if (rand() < 0.03) {
      txs.push({ id: id++, date: iso, type: "income", category: "invest", amount: Math.round(500 + rand() * 3000), accountId: "twbank", note: "投資收益" });
    }
    const numTx = rand() < 0.75 ? 1 : rand() < 0.55 ? 2 : 0;
    for (let t = 0; t < numTx; t++) {
      const cat = expenseCats[Math.floor(rand() * expenseCats.length)];
      const [lo, hi] = ranges[cat];
      const amount = Math.round(lo + rand() * (hi - lo));
      const accountId = rand() < 0.5 ? "cash" : BANK_KEYS[Math.floor(rand() * BANK_KEYS.length)];
      txs.push({ id: id++, date: iso, type: "expense", category: cat, amount, accountId, note: "" });
    }
  }
  return txs.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
}

const AI_EXPENSE_CATS = ["food", "transport", "shopping", "entertainment", "medical", "education", "utilities", "creditcard", "other"];
function normalizeAiCategory(cat) {
  return AI_EXPENSE_CATS.includes(cat) ? cat : "other";
}
function normalizeAiDate(dateStr) {
  if (typeof dateStr === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  return isoDaysAgo(0);
}

const STORAGE_KEY = "finance-passbook-v1";

function generateSeedHoldings() {
  return [
    { id: 1, symbol: "2330", name: "台積電",       shares: 10, avgCost: 850,  currentPrice: 1080 },
    { id: 2, symbol: "0050", name: "元大台灣50",   shares: 50, avgCost: 165,  currentPrice: 193 },
    { id: 3, symbol: "2882", name: "國泰金",       shares: 100, avgCost: 52,  currentPrice: 58 },
  ];
}

/* ---------------------------------------------------------------------
   主元件
--------------------------------------------------------------------- */
export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [customCategories, setCustomCategories] = useState([]);
  const [budgetLimits, setBudgetLimits] = useState([]);
  const [accountStartBalances, setAccountStartBalances] = useState({});
  const [activeTab, setActiveTab] = useState("ledger");
  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [stamped, setStamped] = useState(false);
  const [ledgerPage, setLedgerPage] = useState(0);

  const [showAcctForm, setShowAcctForm] = useState(false);
  const [editingAcctId, setEditingAcctId] = useState(null);
  const [acctStartInput, setAcctStartInput] = useState("");
  const [acctFormError, setAcctFormError] = useState("");

  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [editingBudgetCategory, setEditingBudgetCategory] = useState(null);
  const [newBudgetCategory, setNewBudgetCategory] = useState("");
  const [budgetLimitInput, setBudgetLimitInput] = useState("");
  const [budgetFormError, setBudgetFormError] = useState("");

  const [showCatForm, setShowCatForm] = useState(false);
  const [catLabel, setCatLabel] = useState("");
  const [catIconKey, setCatIconKey] = useState(ICON_OPTIONS[0].key);
  const [catFormError, setCatFormError] = useState("");

  const [showHoldingForm, setShowHoldingForm] = useState(false);
  const [editingHoldingId, setEditingHoldingId] = useState(null);
  const [hSymbol, setHSymbol] = useState("");
  const [hName, setHName] = useState("");
  const [hShares, setHShares] = useState("");
  const [hAvgCost, setHAvgCost] = useState("");
  const [hCurrentPrice, setHCurrentPrice] = useState("");
  const [holdingError, setHoldingError] = useState("");

  const [txType, setTxType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [accountId, setAccountId] = useState("cash");
  const [date, setDate] = useState(isoDaysAgo(0));
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState("");
  const [billPhotoUrl, setBillPhotoUrl] = useState(null);
  const [billFileType, setBillFileType] = useState("");
  const [billFileName, setBillFileName] = useState("");
  const [billMode, setBillMode] = useState(false);
  const [billSavedCount, setBillSavedCount] = useState(0);
  const billFileInputRef = useRef(null);
  const billCameraInputRef = useRef(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiCandidates, setAiCandidates] = useState(null);
  const [aiAccountId, setAiAccountId] = useState("cash");

  const [showAssistant, setShowAssistant] = useState(false);
  const [goals, setGoals] = useState([]);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [goalText, setGoalText] = useState("");
  const [goalTargetAmount, setGoalTargetAmount] = useState("");
  const [goalTargetDate, setGoalTargetDate] = useState("");
  const [goalFormError, setGoalFormError] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const chatScrollRef = useRef(null);

  const [projects, setProjects] = useState([]);
  const [showProjectsList, setShowProjectsList] = useState(false);
  const [projectDetailId, setProjectDetailId] = useState(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [projectBudget, setProjectBudget] = useState("");
  const [projectStartDate, setProjectStartDate] = useState("");
  const [projectEndDate, setProjectEndDate] = useState("");
  const [projectNote, setProjectNote] = useState("");
  const [projectFormError, setProjectFormError] = useState("");
  const [projectId, setProjectId] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const [voiceSupported, setVoiceSupported] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [voiceMsg, setVoiceMsg] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    setVoiceSupported(!!SR);
  }, []);

  /* 讀取持久化資料 */
  useEffect(() => {
    (async () => {
      try {
        const res = await storage.get(STORAGE_KEY);
        if (res && res.value) {
          const data = JSON.parse(res.value);
          setTransactions(Array.isArray(data.transactions) ? data.transactions : generateSeedTransactions());
          setHoldings(Array.isArray(data.holdings) ? data.holdings : generateSeedHoldings());
          setCustomCategories(Array.isArray(data.customCategories) ? data.customCategories : []);
          setBudgetLimits(Array.isArray(data.budgetLimits) ? data.budgetLimits : generateSeedBudgets());
          setAccountStartBalances(data.accountStartBalances && typeof data.accountStartBalances === "object" ? data.accountStartBalances : {});
          setGoals(Array.isArray(data.goals) ? data.goals : []);
          setChatMessages(Array.isArray(data.chatMessages) ? data.chatMessages : []);
          setProjects(Array.isArray(data.projects) ? data.projects : []);
        } else {
          setTransactions(generateSeedTransactions());
          setHoldings(generateSeedHoldings());
          setBudgetLimits(generateSeedBudgets());
        }
      } catch (e) {
        setTransactions(generateSeedTransactions());
        setHoldings(generateSeedHoldings());
        setBudgetLimits(generateSeedBudgets());
      }
      setLoaded(true);
    })();
  }, []);

  /* 寫入持久化資料 */
  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        await storage.set(STORAGE_KEY, JSON.stringify({ transactions, holdings, customCategories, budgetLimits, accountStartBalances, goals, chatMessages: chatMessages.slice(-40), projects }));
      } catch (e) {
        console.error("儲存失敗", e);
      }
    })();
  }, [transactions, holdings, customCategories, budgetLimits, accountStartBalances, goals, chatMessages, projects, loaded]);

  /* ------------------------- 衍生計算 ------------------------- */
  const ALL_CATS = useMemo(() => {
    const merged = { ...CATS };
    customCategories.forEach((c) => {
      merged[c.key] = { label: c.label, icon: iconByKey(c.iconKey), type: c.type };
    });
    return merged;
  }, [customCategories]);

  const accountBalances = useMemo(() => {
    const balances = {};
    Object.keys(ACCOUNT_META).forEach((id) => (balances[id] = accountStartBalances[id] !== undefined ? accountStartBalances[id] : ACCOUNT_META[id].start));
    transactions.forEach((t) => {
      const sign = t.type === "income" ? 1 : -1;
      balances[t.accountId] = (balances[t.accountId] || 0) + sign * t.amount;
    });
    return balances;
  }, [transactions, accountStartBalances]);

  const netWorth = useMemo(
    () => Object.keys(ACCOUNT_META).reduce((a, id) => a + (accountBalances[id] || 0), 0) + holdings.reduce((a, h) => a + h.shares * h.currentPrice, 0),
    [accountBalances, holdings]
  );

  const portfolioValue = useMemo(() => holdings.reduce((a, h) => a + h.shares * h.currentPrice, 0), [holdings]);
  const portfolioCost = useMemo(() => holdings.reduce((a, h) => a + h.shares * h.avgCost, 0), [holdings]);
  const portfolioPL = portfolioValue - portfolioCost;
  const portfolioPLPercent = portfolioCost > 0 ? Math.round((portfolioPL / portfolioCost) * 1000) / 10 : 0;

  const thisMonthKey = monthKey(isoDaysAgo(0));
  const monthTx = useMemo(
    () => transactions.filter((t) => monthKey(t.date) === thisMonthKey),
    [transactions, thisMonthKey]
  );
  const monthIncome = useMemo(
    () => monthTx.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0),
    [monthTx]
  );
  const monthExpense = useMemo(
    () => monthTx.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0),
    [monthTx]
  );
  const monthNet = monthIncome - monthExpense;
  const savingsRate = monthIncome > 0 ? Math.round((monthNet / monthIncome) * 100) : 0;

  const categoryBreakdown = useMemo(() => {
    const sums = {};
    monthTx.filter((t) => t.type === "expense").forEach((t) => {
      sums[t.category] = (sums[t.category] || 0) + t.amount;
    });
    return Object.entries(sums)
      .map(([cat, val]) => ({ cat, label: ALL_CATS[cat] ? ALL_CATS[cat].label : cat, value: val }))
      .sort((a, b) => b.value - a.value);
  }, [monthTx]);

  const monthlyTrend = useMemo(() => {
    const map = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      map[key] = { key, income: 0, expense: 0 };
    }
    transactions.forEach((t) => {
      const k = monthKey(t.date);
      if (map[k]) map[k][t.type] += t.amount;
    });
    return Object.values(map).map((m) => ({ ...m, name: monthLabel(m.key) }));
  }, [transactions]);

  const budgetsWithSpent = useMemo(() => {
    return budgetLimits.map((b) => {
      const spent = monthTx
        .filter((t) => t.type === "expense" && t.category === b.category)
        .reduce((a, t) => a + t.amount, 0);
      return { ...b, spent };
    });
  }, [monthTx, budgetLimits]);

  const projectsWithTotals = useMemo(() => {
    return projects.map((p) => {
      const txs = transactions.filter((t) => t.projectId === p.id);
      const totalExpense = txs.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
      const totalIncome = txs.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
      const catSums = {};
      txs.filter((t) => t.type === "expense").forEach((t) => {
        catSums[t.category] = (catSums[t.category] || 0) + t.amount;
      });
      const categoryBreakdown = Object.entries(catSums)
        .map(([cat, val]) => ({ cat, label: ALL_CATS[cat] ? ALL_CATS[cat].label : cat, value: val }))
        .sort((a, b) => b.value - a.value);
      return { ...p, totalExpense, totalIncome, net: totalIncome - totalExpense, count: txs.length, categoryBreakdown, txs: txs.sort((a, b) => b.date.localeCompare(a.date)) };
    });
  }, [projects, transactions, ALL_CATS]);

  const groupedTx = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      (map[t.date] = map[t.date] || []).push(t);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [transactions]);

  const DAYS_PER_PAGE = 8;
  const ledgerTotalPages = Math.max(1, Math.ceil(groupedTx.length / DAYS_PER_PAGE));
  const ledgerPageGroups = groupedTx.slice(ledgerPage * DAYS_PER_PAGE, ledgerPage * DAYS_PER_PAGE + DAYS_PER_PAGE);

  useEffect(() => {
    if (ledgerPage > ledgerTotalPages - 1) setLedgerPage(Math.max(0, ledgerTotalPages - 1));
  }, [ledgerTotalPages, ledgerPage]);

  useEffect(() => {
    if (showAssistant && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, showAssistant, chatLoading]);

  /* ------------------------- 事件處理 ------------------------- */
  function openAdd(type) {
    setTxType(type);
    setCategory(Object.keys(ALL_CATS).find((k) => ALL_CATS[k].type === type));
    setAmount("");
    setNote("");
    setDate(isoDaysAgo(0));
    setAccountId("cash");
    setFormError("");
    setProjectId("");
    setBillPhotoUrl(null);
    setBillFileType("");
    setBillFileName("");
    setBillMode(false);
    setBillSavedCount(0);
    setAiCandidates(null);
    setAiError("");
    setAiLoading(false);
    setShowAdd(true);
  }

  function handleBillPhotoChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setBillPhotoUrl(reader.result);
      setBillFileType(file.type || "");
      setBillFileName(file.name || "");
      setBillMode(true);
      setBillSavedCount(0);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function removeBillPhoto() {
    setBillPhotoUrl(null);
    setBillFileType("");
    setBillFileName("");
    setBillMode(false);
    setBillSavedCount(0);
    setAiCandidates(null);
    setAiError("");
  }

  async function handleAIRecognize() {
    if (!billPhotoUrl) return;
    setAiLoading(true);
    setAiError("");
    setAiCandidates(null);
    try {
      const match = billPhotoUrl.match(/^data:(.*);base64,(.*)$/);
      if (!match) throw new Error("檔案格式讀取失敗");
      const mediaType = match[1];
      const base64Data = match[2];
      const today = isoDaysAgo(0);
      const isPdf = mediaType === "application/pdf";
      const fileContentBlock = isPdf
        ? { type: "document", source: { type: "base64", media_type: mediaType, data: base64Data } }
        : { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } };

      const response = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: [
                fileContentBlock,
                {
                  type: "text",
                  text:
                    `這是一份信用卡帳單或收據，可能是照片，也可能是 PDF 電子檔。請仔細閱讀裡面每一筆消費明細，只回傳一個純 JSON 陣列，不要有任何說明文字、不要用 markdown code block（不要加 \`\`\`）。` +
                    `每筆資料格式為 {"date":"YYYY-MM-DD","merchant":"商家或項目名稱","amount":數字,"category":"分類"}。` +
                    `date 如果上面只有月/日沒有年份，請用今年，今天的日期是 ${today}。` +
                    `amount 只填數字，不要包含幣別符號或逗號。` +
                    `category 必須是以下其中一個英文字串：food（餐飲）、transport（交通）、shopping（購物）、entertainment（娛樂）、medical（醫療）、education（教育）、utilities（居家水電）、creditcard（信用卡相關費用如年費/利息）、other（其他）。` +
                    `如果內容看不清楚、無法辨識，或不是帳單/收據，請回傳空陣列 []。如果是多頁 PDF，請盡量列出每一頁的消費明細。`,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        let detail = "";
        try { detail = JSON.stringify(await response.json()).slice(0, 200); } catch (e2) { /* ignore */ }
        throw new Error(`API 回應錯誤（${response.status}）${detail ? "：" + detail : ""}`);
      }
      const data = await response.json();
      const textBlock = (data.content || []).find((b) => b.type === "text");
      if (!textBlock) throw new Error("沒有收到辨識結果");
      let cleaned = textBlock.text.trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) throw new Error("辨識結果格式不正確");
      if (parsed.length === 0) {
        setAiError("沒有在照片裡辨識到明確的消費項目，請確認照片清晰，或改用手動輸入");
        setAiCandidates([]);
      } else {
        const candidates = parsed.map((item, i) => ({
          id: Date.now() + i,
          date: normalizeAiDate(item.date),
          merchant: typeof item.merchant === "string" ? item.merchant.slice(0, 40) : "",
          amount: typeof item.amount === "number" && item.amount > 0 ? item.amount : "",
          category: normalizeAiCategory(item.category),
          included: true,
        }));
        setAiCandidates(candidates);
      }
    } catch (e) {
      setAiError(`AI 辨識失敗：${e.message || "未知錯誤"}`);
    } finally {
      setAiLoading(false);
    }
  }

  function updateAiCandidate(id, patch) {
    setAiCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function removeAiCandidate(id) {
    setAiCandidates((prev) => prev.filter((c) => c.id !== id));
  }

  function handleImportAiCandidates() {
    const toImport = (aiCandidates || []).filter((c) => c.included && parseFloat(c.amount) > 0);
    if (toImport.length === 0) {
      setAiError("請至少勾選一筆有效的項目");
      return;
    }
    const newTxs = toImport.map((c, i) => ({
      id: Date.now() + i,
      date: c.date,
      type: "expense",
      category: c.category,
      amount: parseFloat(c.amount),
      accountId: aiAccountId,
      note: c.merchant,
    }));
    setTransactions((prev) => [...newTxs, ...prev]);
    setLedgerPage(0);
    setAiCandidates(null);
    setBillPhotoUrl(null);
    setBillFileType("");
    setBillFileName("");
    setBillMode(false);
    setShowAdd(false);
  }

  function handleSave() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setFormError("請輸入正確的金額");
      return;
    }
    const newTx = { id: Date.now(), date, type: txType, category, amount: amt, accountId, note: note.trim(), projectId: projectId || null };
    setTransactions((prev) => [newTx, ...prev]);
    setLedgerPage(0);
    setStamped(true);
    if (billMode) {
      setBillSavedCount((c) => c + 1);
      setTimeout(() => {
        setStamped(false);
        setAmount("");
        setNote("");
      }, 420);
    } else {
      setTimeout(() => {
        setStamped(false);
        setShowAdd(false);
      }, 420);
    }
  }

  function startVoiceInput() {
    const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) {
      setVoiceMsg("此瀏覽器不支援語音輸入，請改用手動輸入");
      return;
    }
    if (isListening) return;
    setVoiceMsg("");
    const recognition = new SR();
    recognition.lang = "zh-TW";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceMsg("聽取中…請說出項目與金額，例如「午餐 120 元」");
    };
    recognition.onresult = (event) => {
      let text = "";
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setVoiceMsg(`辨識中：${text}`);
      if (event.results[event.results.length - 1].isFinal) {
        const parsed = parseVoiceText(text);
        setTxType(parsed.type);
        setCategory(parsed.category);
        if (parsed.amount) setAmount(parsed.amount);
        setNote(parsed.note);
        setVoiceMsg(`已辨識：「${text}」，請確認金額與分類後蓋章`);
      }
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setVoiceMsg("無法取得麥克風權限，請確認瀏覽器已允許使用麥克風");
      } else if (event.error === "no-speech") {
        setVoiceMsg("沒有聽到聲音，請再試一次");
      } else {
        setVoiceMsg("語音辨識發生問題，請改用手動輸入");
      }
    };
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      setIsListening(false);
      setVoiceMsg("語音辨識無法啟動，請改用手動輸入");
    }
  }

  function stopVoiceInput() {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsListening(false);
  }

  function handleDelete(id) {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    setExpandedId(null);
  }

  function openHoldingForm(holding) {
    if (holding) {
      setEditingHoldingId(holding.id);
      setHSymbol(holding.symbol);
      setHName(holding.name);
      setHShares(String(holding.shares));
      setHAvgCost(String(holding.avgCost));
      setHCurrentPrice(String(holding.currentPrice));
    } else {
      setEditingHoldingId(null);
      setHSymbol("");
      setHName("");
      setHShares("");
      setHAvgCost("");
      setHCurrentPrice("");
    }
    setHoldingError("");
    setShowHoldingForm(true);
  }

  function handleSaveHolding() {
    const shares = parseFloat(hShares);
    const avgCost = parseFloat(hAvgCost);
    const currentPrice = parseFloat(hCurrentPrice);
    if (!hName.trim() || !shares || shares <= 0 || !avgCost || avgCost <= 0 || !currentPrice || currentPrice <= 0) {
      setHoldingError("請完整填寫名稱、股數、成本與目前股價");
      return;
    }
    if (editingHoldingId) {
      setHoldings((prev) => prev.map((h) => (h.id === editingHoldingId ? { ...h, symbol: hSymbol.trim(), name: hName.trim(), shares, avgCost, currentPrice } : h)));
    } else {
      setHoldings((prev) => [...prev, { id: Date.now(), symbol: hSymbol.trim(), name: hName.trim(), shares, avgCost, currentPrice }]);
    }
    setShowHoldingForm(false);
  }

  function handleDeleteHolding() {
    setHoldings((prev) => prev.filter((h) => h.id !== editingHoldingId));
    setShowHoldingForm(false);
  }

  function handleSaveCategory() {
    if (!catLabel.trim()) {
      setCatFormError("請輸入分類名稱");
      return;
    }
    const key = `custom_${Date.now()}`;
    setCustomCategories((prev) => [...prev, { key, label: catLabel.trim(), iconKey: catIconKey, type: txType }]);
    setCategory(key);
    setShowCatForm(false);
  }

  function handleDeleteCategory(key) {
    setCustomCategories((prev) => prev.filter((c) => c.key !== key));
    setBudgetLimits((prev) => prev.filter((b) => b.category !== key));
    if (category === key) {
      const fallback = (txType === "expense" ? expenseCatKeys : incomeCatKeys).find((k) => k !== key);
      setCategory(fallback || "other");
    }
  }

  function openBudgetForm(cat, currentLimit) {
    setEditingBudgetCategory(cat);
    setBudgetLimitInput(String(currentLimit));
    setBudgetFormError("");
    setShowBudgetForm(true);
  }

  function openAddBudgetForm() {
    const unbudgeted = expenseCatKeys.filter((k) => !budgetLimits.some((b) => b.category === k));
    if (unbudgeted.length === 0) {
      setBudgetFormError("");
      setEditingBudgetCategory(null);
      setNewBudgetCategory("");
      setBudgetLimitInput("");
      setShowBudgetForm(true);
      return;
    }
    setEditingBudgetCategory(null);
    setNewBudgetCategory(unbudgeted[0]);
    setBudgetLimitInput("");
    setBudgetFormError("");
    setShowBudgetForm(true);
  }

  function handleSaveBudgetLimit() {
    const val = parseFloat(budgetLimitInput);
    if (!val || val <= 0) {
      setBudgetFormError("請輸入正確的預算金額");
      return;
    }
    if (editingBudgetCategory) {
      setBudgetLimits((prev) => prev.map((b) => (b.category === editingBudgetCategory ? { ...b, limit: val } : b)));
    } else {
      if (!newBudgetCategory) {
        setBudgetFormError("請先選擇分類");
        return;
      }
      setBudgetLimits((prev) => [...prev, { category: newBudgetCategory, limit: val }]);
    }
    setShowBudgetForm(false);
  }

  function handleDeleteBudget() {
    setBudgetLimits((prev) => prev.filter((b) => b.category !== editingBudgetCategory));
    setShowBudgetForm(false);
  }

  function openAcctForm(id) {
    setEditingAcctId(id);
    const current = accountStartBalances[id] !== undefined ? accountStartBalances[id] : ACCOUNT_META[id].start;
    setAcctStartInput(String(current));
    setAcctFormError("");
    setShowAcctForm(true);
  }

  function handleSaveAcctStart() {
    const val = parseFloat(acctStartInput);
    if (isNaN(val)) {
      setAcctFormError("請輸入正確的金額");
      return;
    }
    setAccountStartBalances((prev) => ({ ...prev, [editingAcctId]: val }));
    setShowAcctForm(false);
  }

  function openGoalForm(goal) {
    if (goal) {
      setEditingGoalId(goal.id);
      setGoalText(goal.text);
      setGoalTargetAmount(goal.targetAmount ? String(goal.targetAmount) : "");
      setGoalTargetDate(goal.targetDate || "");
    } else {
      setEditingGoalId(null);
      setGoalText("");
      setGoalTargetAmount("");
      setGoalTargetDate("");
    }
    setGoalFormError("");
    setShowGoalForm(true);
  }

  function handleSaveGoal() {
    if (!goalText.trim()) {
      setGoalFormError("請輸入你的目標內容");
      return;
    }
    const amt = goalTargetAmount ? parseFloat(goalTargetAmount) : null;
    if (editingGoalId) {
      setGoals((prev) => prev.map((g) => (g.id === editingGoalId ? { ...g, text: goalText.trim(), targetAmount: amt, targetDate: goalTargetDate || null } : g)));
    } else {
      setGoals((prev) => [...prev, { id: Date.now(), text: goalText.trim(), targetAmount: amt, targetDate: goalTargetDate || null }]);
    }
    setShowGoalForm(false);
  }

  function handleDeleteGoal() {
    setGoals((prev) => prev.filter((g) => g.id !== editingGoalId));
    setShowGoalForm(false);
  }

  function openProjectForm(proj) {
    if (proj) {
      setEditingProjectId(proj.id);
      setProjectName(proj.name);
      setProjectBudget(proj.budget ? String(proj.budget) : "");
      setProjectStartDate(proj.startDate || "");
      setProjectEndDate(proj.endDate || "");
      setProjectNote(proj.note || "");
    } else {
      setEditingProjectId(null);
      setProjectName("");
      setProjectBudget("");
      setProjectStartDate("");
      setProjectEndDate("");
      setProjectNote("");
    }
    setProjectFormError("");
    setShowProjectForm(true);
  }

  function handleSaveProject() {
    if (!projectName.trim()) {
      setProjectFormError("請輸入專案名稱");
      return;
    }
    const budget = projectBudget ? parseFloat(projectBudget) : null;
    if (editingProjectId) {
      setProjects((prev) => prev.map((p) => (p.id === editingProjectId ? { ...p, name: projectName.trim(), budget, startDate: projectStartDate || null, endDate: projectEndDate || null, note: projectNote.trim() } : p)));
    } else {
      setProjects((prev) => [...prev, { id: Date.now(), name: projectName.trim(), budget, startDate: projectStartDate || null, endDate: projectEndDate || null, note: projectNote.trim() }]);
    }
    setShowProjectForm(false);
  }

  function handleClearAllData() {
    setTransactions([]);
    setHoldings([]);
    setCustomCategories([]);
    setBudgetLimits([]);
    setAccountStartBalances(Object.fromEntries(Object.keys(ACCOUNT_META).map((id) => [id, 0])));
    setGoals([]);
    setChatMessages([]);
    setProjects([]);
    setLedgerPage(0);
    setActiveTab("ledger");
    setShowClearConfirm(false);
  }

  function handleDeleteProject() {
    setProjects((prev) => prev.filter((p) => p.id !== editingProjectId));
    setTransactions((prev) => prev.map((t) => (t.projectId === editingProjectId ? { ...t, projectId: null } : t)));
    setShowProjectForm(false);
    setProjectDetailId(null);
  }

  function buildFinancialContext() {
    const topCats = categoryBreakdown.slice(0, 5).map((c) => `${c.label} NT$${fmt(c.value)}`).join("、") || "本月尚無支出";
    const budgetLines = budgetsWithSpent.map((b) => {
      const meta = ALL_CATS[b.category] || { label: b.category };
      return `${meta.label} 預算 NT$${fmt(b.limit)}，已花 NT$${fmt(b.spent)}`;
    }).join("；") || "尚未設定預算";
    const goalLines = goals.map((g) => {
      const parts = [g.text];
      if (g.targetAmount) parts.push(`目標金額 NT$${fmt(g.targetAmount)}`);
      if (g.targetDate) parts.push(`目標日期 ${g.targetDate}`);
      return parts.join("，");
    }).join("\n") || "使用者目前沒有設定任何目標";
    const acctLines = Object.entries(ACCOUNT_META).map(([id, meta]) => `${meta.label} NT$${fmt(accountBalances[id] || 0)}`).join("、");

    return (
      `你是使用者記帳 App 裡的財務小幫手，用溫暖、實際、簡短口語的中文回覆，像朋友一樣給回饋和提醒，不要長篇大論，重點清楚就好，可以適時給具體建議或提醒風險，但不要用条列式的財經術語轟炸使用者。\n` +
      `以下是使用者目前的真實財務狀況，請根據這些數字給出有依據的回饋，不要編造沒有的數字：\n` +
      `本月收入 NT$${fmt(monthIncome)}，本月支出 NT$${fmt(monthExpense)}，本月結餘 NT$${fmt(monthNet)}，儲蓄率約 ${savingsRate}%。\n` +
      `本月支出前幾大分類：${topCats}。\n` +
      `預算狀況：${budgetLines}。\n` +
      `帳戶餘額：${acctLines}。總資產（含投資）約 NT$${fmt(netWorth)}。\n` +
      `投資組合：總市值 NT$${fmt(portfolioValue)}，總成本 NT$${fmt(portfolioCost)}，未實現損益 NT$${fmt(portfolioPL)}（${portfolioPLPercent}%）。\n` +
      `使用者設定的財務目標：\n${goalLines}`
    );
  }

  async function handleSendChat(presetText) {
    const text = (presetText !== undefined ? presetText : chatInput).trim();
    if (!text || chatLoading) return;
    const userMsg = { role: "user", text };
    const history = [...chatMessages, userMsg];
    setChatMessages(history);
    setChatInput("");
    setChatError("");
    setChatLoading(true);
    try {
      const response = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: buildFinancialContext(),
          messages: history.map((m) => ({ role: m.role, content: m.text })),
        }),
      });
      if (!response.ok) {
        let detail = "";
        try { detail = JSON.stringify(await response.json()).slice(0, 200); } catch (e2) { /* ignore */ }
        throw new Error(`API 回應錯誤（${response.status}）${detail ? "：" + detail : ""}`);
      }
      const data = await response.json();
      const textBlock = (data.content || []).find((b) => b.type === "text");
      const replyText = textBlock ? textBlock.text : "（沒有收到回覆內容）";
      setChatMessages((prev) => [...prev, { role: "assistant", text: replyText }]);
    } catch (e) {
      setChatError(`小幫手暫時連不上：${e.message || "未知錯誤"}`);
    } finally {
      setChatLoading(false);
    }
  }

  const expenseCatKeys = Object.keys(ALL_CATS).filter((k) => ALL_CATS[k].type === "expense");
  const incomeCatKeys = Object.keys(ALL_CATS).filter((k) => ALL_CATS[k].type === "income");

  const unbudgetedExpenseCats = expenseCatKeys.filter((k) => !budgetLimits.some((b) => b.category === k));

  if (!loaded) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 400, color: "#5b544c", fontFamily: "sans-serif" }}>
        帳本開啟中…
      </div>
    );
  }

  return (
    <div className="fp-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@500;700;900&family=Noto+Sans+TC:wght@400;500;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

        html, body {
          height: 100%;
          margin: 0;
          overscroll-behavior-y: none;
        }
        .fp-root {
          --paper: #EEE9DD;
          --paper-alt: #E4DECD;
          --ink: #262220;
          --ink-soft: #6b6259;
          --indigo: #2B3A4A;
          --indigo-soft: #3d4f63;
          --seal: #B33A2E;
          --seal-soft: #f0d9d6;
          --jade: #2F6F4E;
          --jade-soft: #d7e8dd;
          --brass: #A8843F;
          --brass-soft: #ece0c2;
          display: flex;
          justify-content: center;
          padding: 24px 12px;
          background: #d9d2bf;
          font-family: 'Noto Sans TC', sans-serif;
          color: var(--ink);
          box-sizing: border-box;
          min-height: 100vh;
          min-height: 100dvh;
        }
        .fp-root * { box-sizing: border-box; }
        .fp-phone {
          width: 100%;
          max-width: 402px;
          background: var(--paper);
          border-radius: 34px;
          border: 1px solid #c9c0a8;
          box-shadow: 0 30px 60px -20px rgba(38,34,32,0.45), 0 0 0 8px #cfc7ae;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 800px;
          position: relative;
        }
        @media (max-width: 480px) {
          .fp-root {
            padding: 0;
            background: var(--paper);
            min-height: 100vh;
            min-height: 100dvh;
          }
          .fp-phone {
            max-width: 100%;
            border-radius: 0;
            border: none;
            box-shadow: none;
            height: 100vh;
            height: 100dvh;
          }
        }
        .fp-mono { font-family: 'JetBrains Mono', monospace; }
        .fp-serif { font-family: 'Noto Serif TC', serif; }

        /* 封面 */
        .fp-cover {
          background: linear-gradient(160deg, var(--indigo) 0%, var(--indigo-soft) 100%);
          color: #EFE7D4;
          padding: calc(22px + env(safe-area-inset-top)) 20px 26px;
          position: relative;
        }
        .fp-cover-title {
          font-size: 13px;
          letter-spacing: 4px;
          color: var(--brass-soft);
          opacity: 0.85;
          margin-bottom: 2px;
        }
        .fp-cover-name {
          font-size: 24px;
          font-weight: 700;
        }
        .fp-cover-stats {
          display: flex;
          gap: 10px;
          margin-top: 18px;
        }
        .fp-stat {
          flex: 1;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(239,231,212,0.18);
          border-radius: 12px;
          padding: 10px 8px;
        }
        .fp-stat-label { font-size: 11px; opacity: 0.75; margin-bottom: 4px; }
        .fp-stat-value { font-size: 15px; font-weight: 600; }

        /* 打孔裝訂線 */
        .fp-perf {
          height: 14px;
          background: var(--paper);
          position: relative;
          margin-top: -1px;
        }
        .fp-perf svg { display: block; width: 100%; height: 100%; }

        .fp-body {
          flex: 1;
          overflow-y: auto;
          padding: 4px 0 calc(90px + env(safe-area-inset-bottom));
        }
        .fp-section-pad { padding: 16px 18px; }

        .fp-tx-date-header {
          font-size: 12px;
          color: var(--ink-soft);
          padding: 10px 18px 4px;
          font-weight: 500;
        }
        .fp-tx-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 18px;
          border-bottom: 1px dashed #d8d0ba;
          cursor: pointer;
        }
        .fp-tx-icon {
          width: 38px; height: 38px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          border: 1.5px solid currentColor;
        }
        .fp-tx-main { flex: 1; min-width: 0; }
        .fp-tx-label { font-size: 14.5px; font-weight: 500; }
        .fp-tx-note { font-size: 12px; color: var(--ink-soft); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .fp-tx-amount { font-size: 15px; font-weight: 600; white-space: nowrap; }
        .fp-tx-delete {
          display: flex; align-items: center; gap: 6px;
          color: var(--seal); font-size: 13px; padding: 8px 18px 12px;
          border-bottom: 1px dashed #d8d0ba;
        }
        .fp-pagination {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 18px 8px;
        }
        .fp-page-btn {
          display: flex; align-items: center; gap: 4px;
          background: #fff8ec; border: 1.5px solid #d8d0ba; border-radius: 16px;
          padding: 7px 14px; font-size: 12.5px; font-weight: 600; color: var(--indigo);
          cursor: pointer; font-family: 'Noto Sans TC', sans-serif;
        }
        .fp-page-btn:disabled { opacity: 0.35; cursor: default; }
        .fp-page-info { font-size: 12px; color: var(--ink-soft); font-family: 'JetBrains Mono', monospace; }

        /* Tab bar */
        .fp-tabbar {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          background: var(--paper);
          border-top: 1px solid #d8d0ba;
          display: flex;
          padding: 8px 6px calc(14px + env(safe-area-inset-bottom));
        }
        .fp-tab {
          flex: 1;
          display: flex; flex-direction: column; align-items: center; gap: 3px;
          background: none; border: none; cursor: pointer;
          color: var(--ink-soft);
          font-size: 10.5px;
          font-family: 'Noto Sans TC', sans-serif;
          padding: 4px 0;
        }
        .fp-tab.active { color: var(--indigo); font-weight: 700; }
        .fp-fab {
          position: absolute;
          bottom: calc(34px + env(safe-area-inset-bottom)); left: 50%; transform: translateX(-50%);
          width: 56px; height: 56px; border-radius: 50%;
          background: var(--seal);
          border: 4px solid var(--paper);
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 16px rgba(179,58,46,0.4);
          cursor: pointer;
        }

        /* 分析頁 */
        .fp-card {
          background: #fff8ec;
          border: 1px solid #e3d9bd;
          border-radius: 16px;
          padding: 14px 16px;
          margin-bottom: 14px;
        }
        .fp-card-title { font-size: 13px; font-weight: 700; color: var(--indigo); margin-bottom: 10px; }
        .fp-legend-row { display: flex; align-items: center; gap: 8px; font-size: 13px; padding: 4px 0; }
        .fp-legend-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
        .fp-legend-label { flex: 1; color: var(--ink); }
        .fp-legend-value { font-family: 'JetBrains Mono', monospace; color: var(--ink-soft); }

        /* 預算頁 */
        .fp-budget-row { margin-bottom: 14px; }
        .fp-budget-editable { cursor: pointer; }
        .fp-budget-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .fp-progress-track { height: 8px; border-radius: 4px; background: #e6ded0; overflow: hidden; }
        .fp-progress-fill { height: 100%; border-radius: 4px; transition: width 0.4s ease; }

        /* 帳戶頁 */
        .fp-account-row {
          display: flex; align-items: center; gap: 12px;
          background: #fff8ec; border: 1px solid #e3d9bd; border-radius: 14px;
          padding: 12px 14px; margin-bottom: 10px;
        }

        /* 新增交易 Sheet */
        .fp-overlay {
          position: absolute; inset: 0; background: rgba(38,34,32,0.5);
          display: flex; align-items: flex-end; z-index: 20;
        }
        .fp-sheet {
          width: 100%; background: var(--paper);
          border-radius: 24px 24px 0 0;
          padding: 18px 18px 24px;
          max-height: 88%; overflow-y: auto;
          animation: fp-slide-up 0.25s ease-out;
        }
        @keyframes fp-slide-up { from { transform: translateY(100%);} to { transform: translateY(0);} }
        .fp-segmented { display: flex; background: #e6ded0; border-radius: 12px; padding: 4px; margin-bottom: 16px; }
        .fp-segment-btn {
          flex: 1; text-align: center; padding: 8px 0; border-radius: 9px; border: none;
          background: none; font-weight: 600; font-size: 14px; cursor: pointer; color: var(--ink-soft);
          font-family: 'Noto Sans TC', sans-serif;
        }
        .fp-segment-btn.active-expense { background: var(--seal); color: #fff; }
        .fp-segment-btn.active-income { background: var(--jade); color: #fff; }
        .fp-amount-input {
          width: 100%; font-size: 30px; font-family: 'JetBrains Mono', monospace; font-weight: 700;
          border: none; background: none; outline: none; color: var(--ink); text-align: center; margin: 6px 0 18px;
        }
        .fp-field-label { font-size: 12px; color: var(--ink-soft); margin: 14px 0 8px; font-weight: 600; }
        .fp-cat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        .fp-cat-btn {
          display: flex; flex-direction: column; align-items: center; gap: 5px;
          padding: 10px 4px; border-radius: 12px; border: 1.5px solid transparent;
          background: #fff8ec; cursor: pointer; font-size: 11px; color: var(--ink);
          font-family: 'Noto Sans TC', sans-serif;
        }
        .fp-cat-btn.selected { border-color: var(--brass); background: var(--brass-soft); }
        .fp-cat-icon-circle {
          width: 34px; height: 34px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
        }
        .fp-acct-chip {
          padding: 8px 14px; border-radius: 20px; border: 1.5px solid #d8d0ba;
          background: #fff8ec; font-size: 13px; cursor: pointer; margin-right: 8px;
          font-family: 'Noto Sans TC', sans-serif;
        }
        .fp-acct-chip.selected { border-color: var(--indigo); background: var(--indigo); color: #fff; }
        .fp-input {
          width: 100%; padding: 10px 12px; border-radius: 10px; border: 1.5px solid #d8d0ba;
          background: #fff8ec; font-size: 14px; font-family: 'Noto Sans TC', sans-serif; color: var(--ink); outline: none;
        }
        .fp-save-btn {
          width: 100%; margin-top: 20px; padding: 14px 0; border-radius: 14px; border: none;
          background: var(--seal); color: #fff; font-weight: 700; font-size: 15px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: transform 0.15s ease;
          font-family: 'Noto Sans TC', sans-serif;
        }
        .fp-save-btn.stamped { transform: scale(0.92) rotate(-2deg); background: var(--jade); }
        .fp-close-btn { position: absolute; top: 16px; right: 16px; background: none; border: none; color: var(--ink-soft); cursor: pointer; }
        .fp-error { color: var(--seal); font-size: 12px; margin-top: -10px; margin-bottom: 10px; text-align: center; }
        .fp-ai-row { background: #fff8ec; border: 1px solid #e3d9bd; border-radius: 12px; padding: 10px; margin-bottom: 8px; }
        .fp-spin { animation: fp-spin-anim 0.9s linear infinite; }
        @keyframes fp-spin-anim { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .fp-voice-row { display: flex; justify-content: center; margin-top: 2px; }
        .fp-voice-btn {
          display: flex; align-items: center; gap: 7px;
          padding: 9px 20px; border-radius: 20px; border: 1.5px solid var(--indigo);
          background: #fff8ec; color: var(--indigo); font-weight: 600; font-size: 13px;
          cursor: pointer; font-family: 'Noto Sans TC', sans-serif;
        }
        .fp-voice-btn.listening {
          background: var(--seal); border-color: var(--seal); color: #fff;
          animation: fp-pulse 1.1s ease-in-out infinite;
        }
        @keyframes fp-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(179,58,46,0.45); }
          50% { box-shadow: 0 0 0 9px rgba(179,58,46,0); }
        }
        .fp-voice-msg {
          text-align: center; font-size: 12px; color: var(--ink-soft);
          margin-top: 8px; padding: 0 10px; line-height: 1.5;
        }
      `}</style>

      <div className="fp-phone">
        {/* ------------------------------------------------------------ */}
        {activeTab === "ledger" && (
          <>
            <div className="fp-cover">
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <div className="fp-cover-title fp-serif">帳　　本</div>
                  <div className="fp-cover-name fp-serif">我的存摺</div>
                </div>
                <button
                  onClick={() => { setProjectDetailId(null); setShowProjectsList(true); }}
                  style={{ display: "flex", alignItems: "center", gap: 5, border: "1.5px solid rgba(239,231,212,0.5)", background: "rgba(255,255,255,0.08)", color: "#EFE7D4", borderRadius: 16, padding: "6px 11px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "'Noto Sans TC', sans-serif", flexShrink: 0 }}
                ><FolderOpen size={14} /> 專案</button>
              </div>
              <div className="fp-cover-stats">
                <div className="fp-stat">
                  <div className="fp-stat-label">本月收入</div>
                  <div className="fp-stat-value fp-mono" style={{ color: "#bcd9c7" }}>+{fmt(monthIncome)}</div>
                </div>
                <div className="fp-stat">
                  <div className="fp-stat-label">本月支出</div>
                  <div className="fp-stat-value fp-mono" style={{ color: "#f0c3bd" }}>-{fmt(monthExpense)}</div>
                </div>
                <div className="fp-stat">
                  <div className="fp-stat-label">本月結餘</div>
                  <div className="fp-stat-value fp-mono">{monthNet >= 0 ? "+" : ""}{fmt(monthNet)}</div>
                </div>
              </div>
            </div>
            <div className="fp-perf">
              <svg viewBox="0 0 400 14" preserveAspectRatio="none">
                <line x1="0" y1="1" x2="400" y2="1" stroke="#c9bfa2" strokeWidth="1" strokeDasharray="6 5" />
                {Array.from({ length: 14 }).map((_, i) => (
                  <circle key={i} cx={14 + i * 28} cy="1" r="3.4" fill="#d9d2bf" stroke="#c2b89c" strokeWidth="0.6" />
                ))}
              </svg>
            </div>
            <div className="fp-body">
              {groupedTx.length === 0 && (
                <div style={{ padding: 32, textAlign: "center", color: "var(--ink-soft)" }}>還沒有任何記錄，點下方印章開始記帳吧</div>
              )}
              {ledgerPageGroups.map(([d, txs]) => (
                <div key={d}>
                  <div className="fp-tx-date-header">{formatDateHeader(d)}</div>
                  {txs.map((t) => {
                    const meta = ALL_CATS[t.category] || { label: t.category, icon: Gift, type: t.type };
                    const Icon = meta.icon;
                    const color = t.type === "income" ? "var(--jade)" : "var(--seal)";
                    const bg = t.type === "income" ? "var(--jade-soft)" : "var(--seal-soft)";
                    const isOpen = expandedId === t.id;
                    return (
                      <React.Fragment key={t.id}>
                        <div className="fp-tx-row" onClick={() => setExpandedId(isOpen ? null : t.id)}>
                          <div className="fp-tx-icon" style={{ color, background: bg }}>
                            <Icon size={17} />
                          </div>
                          <div className="fp-tx-main">
                            <div className="fp-tx-label">{meta.label}</div>
                            {t.note && <div className="fp-tx-note">{t.note}</div>}
                          </div>
                          <div className="fp-tx-amount fp-mono" style={{ color }}>
                            {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                          </div>
                        </div>
                        {isOpen && (
                          <div className="fp-tx-delete" onClick={() => handleDelete(t.id)}>
                            <Trash2 size={14} /> 刪除這筆記錄
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              ))}
              {groupedTx.length > 0 && (
                <div className="fp-pagination">
                  <button
                    className="fp-page-btn"
                    disabled={ledgerPage === 0}
                    onClick={() => setLedgerPage((p) => Math.max(0, p - 1))}
                  ><ChevronLeft size={15} /> 上一頁</button>
                  <span className="fp-page-info">第 {ledgerPage + 1} / {ledgerTotalPages} 頁</span>
                  <button
                    className="fp-page-btn"
                    disabled={ledgerPage >= ledgerTotalPages - 1}
                    onClick={() => setLedgerPage((p) => Math.min(ledgerTotalPages - 1, p + 1))}
                  >下一頁 <ChevronRight size={15} /></button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ------------------------------------------------------------ */}
        {activeTab === "analysis" && (
          <div className="fp-body" style={{ paddingTop: "calc(18px + env(safe-area-inset-top))" }}>
            <div className="fp-section-pad" style={{ paddingBottom: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div className="fp-serif" style={{ fontSize: 20, fontWeight: 700, color: "var(--indigo)" }}>財務分析</div>
                <button
                  onClick={() => setShowAssistant(true)}
                  style={{ display: "flex", alignItems: "center", gap: 6, border: "1.5px solid var(--seal)", background: "none", color: "var(--seal)", borderRadius: 16, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Noto Sans TC', sans-serif" }}
                ><Sparkles size={14} /> 財務小幫手</button>
              </div>

              <div className="fp-card">
                <div className="fp-card-title">本月總覽</div>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>收入</div>
                    <div className="fp-mono" style={{ color: "var(--jade)", fontWeight: 700 }}>{fmt(monthIncome)}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>支出</div>
                    <div className="fp-mono" style={{ color: "var(--seal)", fontWeight: 700 }}>{fmt(monthExpense)}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>儲蓄率</div>
                    <div className="fp-mono" style={{ color: "var(--indigo)", fontWeight: 700 }}>{savingsRate}%</div>
                  </div>
                </div>
              </div>

              <div className="fp-card">
                <div className="fp-card-title">本月支出分類</div>
                {categoryBreakdown.length === 0 ? (
                  <div style={{ color: "var(--ink-soft)", fontSize: 13 }}>本月尚無支出記錄</div>
                ) : (
                  <>
                    <div style={{ width: "100%", height: 170 }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={categoryBreakdown}
                            dataKey="value"
                            nameKey="label"
                            innerRadius={44}
                            outerRadius={70}
                            paddingAngle={2}
                          >
                            {categoryBreakdown.map((entry, i) => (
                              <Cell key={entry.cat} fill={DONUT_COLORS[i % DONUT_COLORS.length]} stroke="#fff8ec" strokeWidth={1.5} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v) => `NT$ ${fmt(v)}`} contentStyle={{ background: "#fff8ec", border: "1px solid #e3d9bd", borderRadius: 8, fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      {categoryBreakdown.map((c, i) => (
                        <div className="fp-legend-row" key={c.cat}>
                          <div className="fp-legend-dot" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                          <div className="fp-legend-label">{c.label}</div>
                          <div className="fp-legend-value">{Math.round((c.value / monthExpense) * 100)}% · {fmt(c.value)}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="fp-card">
                <div className="fp-card-title">近 6 個月收支趨勢</div>
                <div style={{ width: "100%", height: 190 }}>
                  <ResponsiveContainer>
                    <BarChart data={monthlyTrend} margin={{ left: -20, right: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e3d9bd" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b6259" }} axisLine={{ stroke: "#d8d0ba" }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#6b6259" }} axisLine={false} tickLine={false} width={44} />
                      <Tooltip formatter={(v) => `NT$ ${fmt(v)}`} contentStyle={{ background: "#fff8ec", border: "1px solid #e3d9bd", borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="income" name="收入" fill="#2F6F4E" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expense" name="支出" fill="#B33A2E" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: "#2F6F4E" }} />收入</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}><div style={{ width: 10, height: 10, borderRadius: 3, background: "#B33A2E" }} />支出</div>
                </div>
              </div>

              <div className="fp-card">
                <div className="fp-card-title">每月剩餘的錢</div>
                {(() => {
                  const netData = monthlyTrend.map((m) => ({ ...m, net: m.income - m.expense }));
                  return (
                    <>
                      <div style={{ width: "100%", height: 170 }}>
                        <ResponsiveContainer>
                          <BarChart data={netData} margin={{ left: -20, right: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e3d9bd" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b6259" }} axisLine={{ stroke: "#d8d0ba" }} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: "#6b6259" }} axisLine={false} tickLine={false} width={44} />
                            <Tooltip formatter={(v) => `NT$ ${fmt(v)}`} contentStyle={{ background: "#fff8ec", border: "1px solid #e3d9bd", borderRadius: 8, fontSize: 12 }} />
                            <ReferenceLine y={0} stroke="#c9bfa2" />
                            <Bar dataKey="net" name="結餘" radius={[4, 4, 4, 4]}>
                              {netData.map((entry, i) => (
                                <Cell key={entry.key} fill={entry.net >= 0 ? "#2F6F4E" : "#B33A2E"} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{ marginTop: 8 }}>
                        {netData.map((m) => (
                          <div className="fp-legend-row" key={m.key}>
                            <div className="fp-legend-label">{m.name}</div>
                            <div className="fp-legend-value fp-mono" style={{ color: m.net >= 0 ? "var(--jade)" : "var(--seal)", fontWeight: 700 }}>
                              {m.net >= 0 ? "+" : ""}{fmt(m.net)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="fp-card">
                <div className="fp-card-title">投資組合損益</div>
                {holdings.length === 0 ? (
                  <div style={{ color: "var(--ink-soft)", fontSize: 13 }}>尚未新增任何持股，可到「帳戶」頁新增</div>
                ) : (
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>總市值</div>
                      <div className="fp-mono" style={{ fontWeight: 700 }}>{fmt(portfolioValue)}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>總成本</div>
                      <div className="fp-mono" style={{ fontWeight: 700 }}>{fmt(portfolioCost)}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>未實現損益</div>
                      <div className="fp-mono" style={{ fontWeight: 700, color: portfolioPL >= 0 ? "var(--jade)" : "var(--seal)" }}>
                        {portfolioPL >= 0 ? "+" : ""}{fmt(portfolioPL)}（{portfolioPLPercent >= 0 ? "+" : ""}{portfolioPLPercent}%）
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {activeTab === "budget" && (
          <div className="fp-body" style={{ paddingTop: "calc(18px + env(safe-area-inset-top))" }}>
            <div className="fp-section-pad" style={{ paddingBottom: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div className="fp-serif" style={{ fontSize: 20, fontWeight: 700, color: "var(--indigo)" }}>預算控管</div>
                <button
                  onClick={openAddBudgetForm}
                  style={{ border: "1.5px solid var(--indigo)", background: "none", color: "var(--indigo)", borderRadius: 16, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Noto Sans TC', sans-serif" }}
                >+ 新增預算項目</button>
              </div>
              <div className="fp-card">
                <div className="fp-card-title">本月預算總覽</div>
                {(() => {
                  const totalLimit = budgetsWithSpent.reduce((a, b) => a + b.limit, 0);
                  const totalSpent = budgetsWithSpent.reduce((a, b) => a + b.spent, 0);
                  const pct = totalLimit > 0 ? Math.min(100, Math.round((totalSpent / totalLimit) * 100)) : 0;
                  const color = pct >= 100 ? "var(--seal)" : pct >= 80 ? "var(--brass)" : "var(--jade)";
                  return (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                        <span className="fp-mono">{fmt(totalSpent)} / {fmt(totalLimit)}</span>
                        <span className="fp-mono" style={{ color }}>{pct}%</span>
                      </div>
                      <div className="fp-progress-track"><div className="fp-progress-fill" style={{ width: `${pct}%`, background: color }} /></div>
                    </>
                  );
                })()}
              </div>

              {budgetsWithSpent.length === 0 && (
                <div style={{ color: "var(--ink-soft)", fontSize: 13, padding: "8px 2px" }}>還沒有設定任何預算項目</div>
              )}
              {budgetsWithSpent.map((b) => {
                const meta = ALL_CATS[b.category] || { label: b.category, icon: Gift };
                const Icon = meta.icon;
                const pct = Math.min(100, Math.round((b.spent / b.limit) * 100));
                const color = pct >= 100 ? "var(--seal)" : pct >= 80 ? "var(--brass)" : "var(--jade)";
                const remain = b.limit - b.spent;
                return (
                  <div className="fp-budget-row fp-budget-editable" key={b.category} onClick={() => openBudgetForm(b.category, b.limit)}>
                    <div className="fp-budget-top">
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div className="fp-tx-icon" style={{ width: 30, height: 30, color: "var(--indigo)", background: "var(--brass-soft)", border: "1.5px solid var(--brass)" }}>
                          <Icon size={14} />
                        </div>
                        <span style={{ fontSize: 13.5, fontWeight: 600 }}>{meta.label}</span>
                      </div>
                      <span className="fp-mono" style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{fmt(b.spent)} / {fmt(b.limit)}</span>
                    </div>
                    <div className="fp-progress-track"><div className="fp-progress-fill" style={{ width: `${pct}%`, background: color }} /></div>
                    <div style={{ fontSize: 11, color: remain >= 0 ? "var(--ink-soft)" : "var(--seal)", marginTop: 4 }}>
                      {remain >= 0 ? `剩餘 NT$ ${fmt(remain)}` : `已超支 NT$ ${fmt(-remain)}`}
                    </div>
                  </div>
                );
              })}
              <div style={{ fontSize: 11.5, color: "var(--ink-soft)", textAlign: "center", marginTop: 6 }}>點任一分類可調整預算金額</div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {activeTab === "accounts" && (
          <div className="fp-body" style={{ paddingTop: 0 }}>
            <div className="fp-cover" style={{ marginBottom: 16 }}>
              <div className="fp-cover-title fp-serif">總　資　產</div>
              <div className="fp-cover-name fp-serif fp-mono">NT$ {fmt(netWorth)}</div>
            </div>
            <div className="fp-section-pad" style={{ paddingTop: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--indigo)", margin: "0 0 10px" }}>現金</div>
              {Object.entries(ACCOUNT_META).filter(([, meta]) => meta.group === "cash").map(([id, meta]) => {
                const Icon = meta.icon;
                const bal = accountBalances[id];
                return (
                  <div className="fp-account-row" key={id} onClick={() => openAcctForm(id)} style={{ cursor: "pointer" }}>
                    <div className="fp-tx-icon" style={{ color: "var(--indigo)", background: "var(--brass-soft)", border: "1.5px solid var(--brass)" }}>
                      <Icon size={17} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{meta.label}</div>
                    </div>
                    <div className="fp-mono" style={{ fontWeight: 700, color: bal < 0 ? "var(--seal)" : "var(--ink)" }}>
                      NT$ {fmt(bal)}
                    </div>
                  </div>
                );
              })}

              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--indigo)", margin: "20px 0 10px" }}>銀行帳戶</div>
              {Object.entries(ACCOUNT_META).filter(([, meta]) => meta.group === "bank").map(([id, meta]) => {
                const Icon = meta.icon;
                const bal = accountBalances[id];
                return (
                  <div className="fp-account-row" key={id} onClick={() => openAcctForm(id)} style={{ cursor: "pointer" }}>
                    <div className="fp-tx-icon" style={{ color: "var(--indigo)", background: "var(--brass-soft)", border: "1.5px solid var(--brass)" }}>
                      <Icon size={17} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{meta.label}</div>
                    </div>
                    <div className="fp-mono" style={{ fontWeight: 700, color: bal < 0 ? "var(--seal)" : "var(--ink)" }}>
                      NT$ {fmt(bal)}
                    </div>
                  </div>
                );
              })}
              <div style={{ fontSize: 11.5, color: "var(--ink-soft)", textAlign: "center", marginTop: 6 }}>點任一帳戶可調整期初餘額</div>


              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "22px 0 10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 14, color: "var(--indigo)" }}>
                  <LineChart size={16} /> 投資組合
                </div>
                <button
                  onClick={() => openHoldingForm(null)}
                  style={{ border: "1.5px solid var(--indigo)", background: "none", color: "var(--indigo)", borderRadius: 16, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Noto Sans TC', sans-serif" }}
                >+ 新增持股</button>
              </div>

              {holdings.length > 0 && (
                <div className="fp-card" style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>股票總市值</div>
                      <div className="fp-mono" style={{ fontWeight: 700, fontSize: 16 }}>{fmt(portfolioValue)}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>總成本</div>
                      <div className="fp-mono" style={{ fontWeight: 700, fontSize: 16 }}>{fmt(portfolioCost)}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>損益</div>
                      <div className="fp-mono" style={{ fontWeight: 700, fontSize: 16, color: portfolioPL >= 0 ? "var(--jade)" : "var(--seal)" }}>
                        {portfolioPL >= 0 ? "+" : ""}{fmt(portfolioPL)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {holdings.length === 0 && (
                <div style={{ color: "var(--ink-soft)", fontSize: 13, padding: "8px 2px" }}>還沒有持股記錄</div>
              )}

              {holdings.map((h) => {
                const value = h.shares * h.currentPrice;
                const cost = h.shares * h.avgCost;
                const pl = value - cost;
                const plPct = cost > 0 ? Math.round((pl / cost) * 1000) / 10 : 0;
                return (
                  <div className="fp-account-row" key={h.id} onClick={() => openHoldingForm(h)} style={{ cursor: "pointer" }}>
                    <div className="fp-tx-icon" style={{ color: "var(--indigo)", background: "var(--brass-soft)", border: "1.5px solid var(--brass)" }}>
                      <LineChart size={16} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{h.name} <span style={{ color: "var(--ink-soft)", fontWeight: 400, fontSize: 12 }}>{h.symbol}</span></div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{h.shares} 股 · 均價 {fmt(h.avgCost)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="fp-mono" style={{ fontWeight: 700 }}>{fmt(value)}</div>
                      <div className="fp-mono" style={{ fontSize: 11.5, color: pl >= 0 ? "var(--jade)" : "var(--seal)" }}>
                        {pl >= 0 ? "+" : ""}{fmt(pl)}（{plPct >= 0 ? "+" : ""}{plPct}%）
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={() => setShowClearConfirm(true)}
                style={{ width: "100%", marginTop: 28, padding: "10px 0", borderRadius: 14, border: "1.5px solid #d8d0ba", background: "none", color: "var(--ink-soft)", fontWeight: 600, fontSize: 12.5, cursor: "pointer", fontFamily: "'Noto Sans TC', sans-serif" }}
              >清除所有資料，重新開始</button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        <div className="fp-tabbar">
          <button className={`fp-tab ${activeTab === "ledger" ? "active" : ""}`} onClick={() => setActiveTab("ledger")}>
            <BookOpen size={20} /> 明細
          </button>
          <button className={`fp-tab ${activeTab === "analysis" ? "active" : ""}`} onClick={() => setActiveTab("analysis")}>
            <PieChartIcon size={20} /> 分析
          </button>
          <div style={{ flex: 1 }} />
          <button className={`fp-tab ${activeTab === "budget" ? "active" : ""}`} onClick={() => setActiveTab("budget")}>
            <Target size={20} /> 預算
          </button>
          <button className={`fp-tab ${activeTab === "accounts" ? "active" : ""}`} onClick={() => setActiveTab("accounts")}>
            <Wallet size={20} /> 帳戶
          </button>
        </div>
        <div className="fp-fab" onClick={() => openAdd("expense")}>
          <Plus size={26} />
        </div>

        {/* ------------------------------------------------------------ */}
        {showAdd && (
          <div className="fp-overlay" onClick={() => setShowAdd(false)}>
            <div className="fp-sheet" onClick={(e) => e.stopPropagation()}>
              <button className="fp-close-btn" onClick={() => setShowAdd(false)}><X size={20} /></button>
              <div style={{ fontWeight: 700, fontSize: 16, textAlign: "center", marginBottom: 14 }} className="fp-serif">
                {billMode ? `帳單對照輸入中（已存 ${billSavedCount} 筆）` : "新增一筆記錄"}
              </div>

              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={billCameraInputRef}
                style={{ display: "none" }}
                onChange={handleBillPhotoChange}
              />
              <input
                type="file"
                accept="image/*,application/pdf"
                ref={billFileInputRef}
                style={{ display: "none" }}
                onChange={handleBillPhotoChange}
              />

              {billPhotoUrl ? (
                <div style={{ position: "relative", marginBottom: 14 }}>
                  {billFileType === "application/pdf" ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px", borderRadius: 12, border: "1.5px solid #d8d0ba", background: "#fff8ec" }}>
                      <FileText size={28} color="var(--indigo)" />
                      <div style={{ fontSize: 12.5, color: "var(--ink)", wordBreak: "break-all" }}>{billFileName || "帳單.pdf"}</div>
                    </div>
                  ) : (
                    <img src={billPhotoUrl} alt="帳單檔案" style={{ width: "100%", maxHeight: 170, objectFit: "contain", borderRadius: 12, border: "1.5px solid #d8d0ba", background: "#fff8ec" }} />
                  )}
                  <button
                    onClick={removeBillPhoto}
                    style={{ position: "absolute", top: 6, right: 6, background: "rgba(38,34,32,0.6)", color: "#fff", border: "none", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                  ><X size={14} /></button>

                  {aiCandidates === null && (
                    <>
                      <button
                        onClick={handleAIRecognize}
                        disabled={aiLoading}
                        style={{ width: "100%", marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 0", borderRadius: 14, border: "none", background: "var(--seal)", color: "#fff", fontWeight: 700, fontSize: 13, cursor: aiLoading ? "default" : "pointer", opacity: aiLoading ? 0.7 : 1, fontFamily: "'Noto Sans TC', sans-serif" }}
                      >
                        {aiLoading ? <Loader2 size={16} className="fp-spin" /> : <Sparkles size={16} />}
                        {aiLoading ? "AI 辨識中…" : "✨ AI 辨識帳單明細"}
                      </button>
                      <div style={{ fontSize: 11, color: "var(--ink-soft)", textAlign: "center", marginTop: 6 }}>或直接對照上面的帳單，往下手動輸入</div>
                    </>
                  )}

                  {aiError && <div className="fp-error" style={{ marginTop: 10 }}>{aiError}</div>}

                  {aiCandidates && aiCandidates.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div className="fp-field-label" style={{ marginTop: 0 }}>帳戶（套用到全部項目）</div>
                      <div style={{ display: "flex", flexWrap: "wrap" }}>
                        {Object.entries(ACCOUNT_META).map(([id, meta]) => (
                          <button key={id} className={`fp-acct-chip ${aiAccountId === id ? "selected" : ""}`} onClick={() => setAiAccountId(id)}>
                            {meta.label}
                          </button>
                        ))}
                      </div>

                      <div className="fp-field-label">辨識結果（可勾選、修改後再匯入）</div>
                      {aiCandidates.map((c) => (
                        <div key={c.id} className="fp-ai-row">
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <input type="checkbox" checked={c.included} onChange={(e) => updateAiCandidate(c.id, { included: e.target.checked })} style={{ width: 16, height: 16, flexShrink: 0 }} />
                            <input className="fp-input" style={{ flex: 1 }} value={c.merchant} placeholder="商家/項目" onChange={(e) => updateAiCandidate(c.id, { merchant: e.target.value })} />
                            <button onClick={() => removeAiCandidate(c.id)} style={{ background: "none", border: "none", color: "var(--seal)", cursor: "pointer", flexShrink: 0 }}><Trash2 size={15} /></button>
                          </div>
                          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                            <input type="date" className="fp-input" style={{ flex: 1, fontSize: 12.5 }} value={c.date} onChange={(e) => updateAiCandidate(c.id, { date: e.target.value })} />
                            <input className="fp-input fp-mono" style={{ width: 90, fontSize: 12.5 }} inputMode="decimal" value={c.amount} onChange={(e) => updateAiCandidate(c.id, { amount: e.target.value.replace(/[^0-9.]/g, "") })} />
                            <select className="fp-input" style={{ flex: 1, fontSize: 12.5 }} value={c.category} onChange={(e) => updateAiCandidate(c.id, { category: e.target.value })}>
                              {AI_EXPENSE_CATS.map((k) => (
                                <option key={k} value={k}>{CATS[k].label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}

                      <button className="fp-save-btn" onClick={handleImportAiCandidates} style={{ background: "var(--jade)" }}>
                        <Check size={18} /> 匯入已勾選的 {aiCandidates.filter((c) => c.included).length} 筆
                      </button>
                      <button
                        onClick={() => { setAiCandidates(null); setAiError(""); }}
                        style={{ width: "100%", marginTop: 10, padding: "10px 0", borderRadius: 14, border: "1.5px solid var(--indigo)", background: "none", color: "var(--indigo)", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "'Noto Sans TC', sans-serif" }}
                      >重新辨識 / 改用手動輸入</button>
                    </div>
                  )}

                  {!(aiCandidates && aiCandidates.length > 0) && (
                    <div style={{ fontSize: 11, color: "var(--ink-soft)", textAlign: "center", marginTop: 6 }}>對照上面的帳單，逐筆輸入下面的金額與分類，存一筆後可以馬上接著輸入下一筆</div>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                  <button
                    onClick={() => billCameraInputRef.current && billCameraInputRef.current.click()}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", borderRadius: 14, border: "1.5px dashed #c9bfa2", background: "#fff8ec", color: "var(--indigo)", fontWeight: 600, fontSize: 12.5, cursor: "pointer", fontFamily: "'Noto Sans TC', sans-serif" }}
                  ><Camera size={15} /> 拍照</button>
                  <button
                    onClick={() => billFileInputRef.current && billFileInputRef.current.click()}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", borderRadius: 14, border: "1.5px dashed #c9bfa2", background: "#fff8ec", color: "var(--indigo)", fontWeight: 600, fontSize: 12.5, cursor: "pointer", fontFamily: "'Noto Sans TC', sans-serif" }}
                  ><FileText size={15} /> 上傳電子檔（圖片/PDF）</button>
                </div>
              )}

              {!(aiCandidates && aiCandidates.length > 0) && (
              <>
              <div className="fp-segmented">
                <button
                  className={`fp-segment-btn ${txType === "expense" ? "active-expense" : ""}`}
                  onClick={() => { setTxType("expense"); setCategory(expenseCatKeys[0]); }}
                >支出</button>
                <button
                  className={`fp-segment-btn ${txType === "income" ? "active-income" : ""}`}
                  onClick={() => { setTxType("income"); setCategory(incomeCatKeys[0]); }}
                >收入</button>
              </div>

              <div className="fp-voice-row">
                <button
                  type="button"
                  className={`fp-voice-btn ${isListening ? "listening" : ""}`}
                  onClick={isListening ? stopVoiceInput : startVoiceInput}
                >
                  {isListening ? <Square size={15} /> : <Mic size={15} />}
                  {isListening ? "停止聽取" : "語音記帳"}
                </button>
              </div>
              {voiceMsg && <div className="fp-voice-msg">{voiceMsg}</div>}
              {!voiceSupported && (
                <div className="fp-voice-msg" style={{ color: "var(--seal)" }}>
                  這個瀏覽器不支援語音輸入，請直接手動輸入金額與分類
                </div>
              )}

              <input
                className="fp-amount-input"
                inputMode="decimal"
                placeholder="NT$ 0"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              />
              {formError && <div className="fp-error">{formError}</div>}

              <div className="fp-field-label">分類</div>
              <div className="fp-cat-grid">
                {(txType === "expense" ? expenseCatKeys : incomeCatKeys).map((k) => {
                  const meta = ALL_CATS[k];
                  const Icon = meta.icon;
                  const selected = category === k;
                  const isCustom = k.startsWith("custom_");
                  const color = txType === "income" ? "var(--jade)" : "var(--seal)";
                  const bg = txType === "income" ? "var(--jade-soft)" : "var(--seal-soft)";
                  return (
                    <button key={k} className={`fp-cat-btn ${selected ? "selected" : ""}`} onClick={() => setCategory(k)} style={{ position: "relative" }}>
                      {isCustom && (
                        <span
                          onClick={(e) => { e.stopPropagation(); handleDeleteCategory(k); }}
                          style={{ position: "absolute", top: 2, right: 4, color: "var(--seal)", fontSize: 13, lineHeight: 1, cursor: "pointer" }}
                        >×</span>
                      )}
                      <div className="fp-cat-icon-circle" style={{ color, background: bg }}><Icon size={16} /></div>
                      {meta.label}
                    </button>
                  );
                })}
                <button className="fp-cat-btn" style={{ borderStyle: "dashed", borderColor: "#c9bfa2" }} onClick={() => { setCatLabel(""); setCatIconKey(ICON_OPTIONS[0].key); setCatFormError(""); setShowCatForm(true); }}>
                  <div className="fp-cat-icon-circle" style={{ color: "var(--ink-soft)", background: "#e6ded0" }}><Plus size={16} /></div>
                  新增分類
                </button>
              </div>

              <div className="fp-field-label">帳戶</div>
              <div style={{ display: "flex", flexWrap: "wrap" }}>
                {Object.entries(ACCOUNT_META).map(([id, meta]) => (
                  <button key={id} className={`fp-acct-chip ${accountId === id ? "selected" : ""}`} onClick={() => setAccountId(id)}>
                    {meta.label}
                  </button>
                ))}
              </div>

              {projects.length > 0 && (
                <>
                  <div className="fp-field-label">專案（選填）</div>
                  <div style={{ display: "flex", flexWrap: "wrap" }}>
                    <button className={`fp-acct-chip ${!projectId ? "selected" : ""}`} onClick={() => setProjectId("")}>無</button>
                    {projects.map((p) => (
                      <button key={p.id} className={`fp-acct-chip ${projectId === p.id ? "selected" : ""}`} onClick={() => setProjectId(p.id)}>
                        {p.name}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <div className="fp-field-label">日期</div>
              <input type="date" className="fp-input" value={date} onChange={(e) => setDate(e.target.value)} />

              <div className="fp-field-label">備註（選填）</div>
              <input className="fp-input" placeholder="例如：和朋友聚餐" value={note} onChange={(e) => setNote(e.target.value)} />

              <button className={`fp-save-btn ${stamped ? "stamped" : ""}`} onClick={handleSave}>
                {stamped ? <Check size={18} /> : <ChevronRight size={18} />}
                {stamped ? "已蓋章記錄" : billMode ? "存這一筆，繼續下一筆" : "蓋章確認"}
              </button>
              {billMode && (
                <button
                  onClick={() => { setShowAdd(false); removeBillPhoto(); }}
                  style={{ width: "100%", marginTop: 10, padding: "10px 0", borderRadius: 14, border: "1.5px solid var(--indigo)", background: "none", color: "var(--indigo)", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "'Noto Sans TC', sans-serif" }}
                >完成帳單輸入</button>
              )}
              </>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {showHoldingForm && (
          <div className="fp-overlay" onClick={() => setShowHoldingForm(false)}>
            <div className="fp-sheet" onClick={(e) => e.stopPropagation()}>
              <button className="fp-close-btn" onClick={() => setShowHoldingForm(false)}><X size={20} /></button>
              <div style={{ fontWeight: 700, fontSize: 16, textAlign: "center", marginBottom: 14 }} className="fp-serif">
                {editingHoldingId ? "編輯持股" : "新增持股"}
              </div>

              <div className="fp-field-label">股票代號（選填）</div>
              <input className="fp-input" placeholder="例如：2330" value={hSymbol} onChange={(e) => setHSymbol(e.target.value)} />

              <div className="fp-field-label">股票名稱</div>
              <input className="fp-input" placeholder="例如：台積電" value={hName} onChange={(e) => setHName(e.target.value)} />

              <div className="fp-field-label">持有股數</div>
              <input className="fp-input" inputMode="decimal" placeholder="0" value={hShares} onChange={(e) => setHShares(e.target.value.replace(/[^0-9.]/g, ""))} />

              <div className="fp-field-label">平均成本（每股）</div>
              <input className="fp-input" inputMode="decimal" placeholder="0" value={hAvgCost} onChange={(e) => setHAvgCost(e.target.value.replace(/[^0-9.]/g, ""))} />

              <div className="fp-field-label">目前股價（每股）</div>
              <input className="fp-input" inputMode="decimal" placeholder="0" value={hCurrentPrice} onChange={(e) => setHCurrentPrice(e.target.value.replace(/[^0-9.]/g, ""))} />
              <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 6 }}>目前股價需自行查詢後更新，就像更新存摺一樣</div>

              {holdingError && <div className="fp-error" style={{ marginTop: 12 }}>{holdingError}</div>}

              <button className="fp-save-btn" onClick={handleSaveHolding} style={{ background: "var(--indigo)" }}>
                <Check size={18} /> {editingHoldingId ? "儲存變更" : "新增持股"}
              </button>
              {editingHoldingId && (
                <button
                  onClick={handleDeleteHolding}
                  style={{ width: "100%", marginTop: 10, padding: "10px 0", borderRadius: 14, border: "1.5px solid var(--seal)", background: "none", color: "var(--seal)", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "'Noto Sans TC', sans-serif" }}
                >
                  <Trash2 size={15} /> 刪除這筆持股
                </button>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {showCatForm && (
          <div className="fp-overlay" style={{ zIndex: 30 }} onClick={() => setShowCatForm(false)}>
            <div className="fp-sheet" onClick={(e) => e.stopPropagation()}>
              <button className="fp-close-btn" onClick={() => setShowCatForm(false)}><X size={20} /></button>
              <div style={{ fontWeight: 700, fontSize: 16, textAlign: "center", marginBottom: 14 }} className="fp-serif">
                新增{txType === "income" ? "收入" : "支出"}分類
              </div>

              <div className="fp-field-label">分類名稱</div>
              <input className="fp-input" placeholder="例如：寵物、旅遊" value={catLabel} onChange={(e) => setCatLabel(e.target.value)} />

              <div className="fp-field-label">選擇圖示</div>
              <div className="fp-cat-grid">
                {ICON_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const selected = catIconKey === opt.key;
                  const color = txType === "income" ? "var(--jade)" : "var(--seal)";
                  const bg = txType === "income" ? "var(--jade-soft)" : "var(--seal-soft)";
                  return (
                    <button key={opt.key} className={`fp-cat-btn ${selected ? "selected" : ""}`} onClick={() => setCatIconKey(opt.key)} style={{ padding: "10px 0" }}>
                      <div className="fp-cat-icon-circle" style={{ color, background: bg }}><Icon size={16} /></div>
                    </button>
                  );
                })}
              </div>

              {catFormError && <div className="fp-error" style={{ marginTop: 12 }}>{catFormError}</div>}

              <button className="fp-save-btn" onClick={handleSaveCategory} style={{ background: "var(--indigo)" }}>
                <Check size={18} /> 新增分類
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {showBudgetForm && (
          <div className="fp-overlay" onClick={() => setShowBudgetForm(false)}>
            <div className="fp-sheet" onClick={(e) => e.stopPropagation()}>
              <button className="fp-close-btn" onClick={() => setShowBudgetForm(false)}><X size={20} /></button>
              <div style={{ fontWeight: 700, fontSize: 16, textAlign: "center", marginBottom: 14 }} className="fp-serif">
                {editingBudgetCategory
                  ? `調整「${ALL_CATS[editingBudgetCategory] ? ALL_CATS[editingBudgetCategory].label : editingBudgetCategory}」預算`
                  : "新增預算項目"}
              </div>

              {!editingBudgetCategory && (
                unbudgetedExpenseCats.length === 0 ? (
                  <div style={{ color: "var(--ink-soft)", fontSize: 13, textAlign: "center", marginBottom: 10 }}>
                    所有支出分類都已經設定預算了，如果想新增分類，可以到「新增記錄」裡建立
                  </div>
                ) : (
                  <>
                    <div className="fp-field-label">選擇分類</div>
                    <div className="fp-cat-grid">
                      {unbudgetedExpenseCats.map((k) => {
                        const meta = ALL_CATS[k];
                        const Icon = meta.icon;
                        const selected = newBudgetCategory === k;
                        return (
                          <button key={k} className={`fp-cat-btn ${selected ? "selected" : ""}`} onClick={() => setNewBudgetCategory(k)}>
                            <div className="fp-cat-icon-circle" style={{ color: "var(--seal)", background: "var(--seal-soft)" }}><Icon size={16} /></div>
                            {meta.label}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )
              )}

              {(editingBudgetCategory || unbudgetedExpenseCats.length > 0) && (
                <>
                  <div className="fp-field-label">每月預算金額</div>
                  <input
                    className="fp-amount-input"
                    style={{ fontSize: 24, margin: "6px 0 6px" }}
                    inputMode="decimal"
                    placeholder="NT$ 0"
                    value={budgetLimitInput}
                    onChange={(e) => setBudgetLimitInput(e.target.value.replace(/[^0-9.]/g, ""))}
                  />
                  {budgetFormError && <div className="fp-error">{budgetFormError}</div>}
                  <button className="fp-save-btn" onClick={handleSaveBudgetLimit} style={{ background: "var(--indigo)" }}>
                    <Check size={18} /> {editingBudgetCategory ? "儲存預算" : "新增預算"}
                  </button>
                </>
              )}
              {editingBudgetCategory && (
                <button
                  onClick={handleDeleteBudget}
                  style={{ width: "100%", marginTop: 10, padding: "10px 0", borderRadius: 14, border: "1.5px solid var(--seal)", background: "none", color: "var(--seal)", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "'Noto Sans TC', sans-serif" }}
                >
                  <Trash2 size={15} /> 刪除這個預算項目
                </button>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {showAcctForm && (
          <div className="fp-overlay" onClick={() => setShowAcctForm(false)}>
            <div className="fp-sheet" onClick={(e) => e.stopPropagation()}>
              <button className="fp-close-btn" onClick={() => setShowAcctForm(false)}><X size={20} /></button>
              <div style={{ fontWeight: 700, fontSize: 16, textAlign: "center", marginBottom: 14 }} className="fp-serif">
                調整「{editingAcctId ? ACCOUNT_META[editingAcctId].label : ""}」期初餘額
              </div>
              <div className="fp-field-label">期初餘額</div>
              <input
                className="fp-amount-input"
                style={{ fontSize: 24, margin: "6px 0 6px" }}
                inputMode="decimal"
                placeholder="0"
                value={acctStartInput}
                onChange={(e) => setAcctStartInput(e.target.value.replace(/[^0-9.\-]/g, ""))}
              />
              <div style={{ fontSize: 11, color: "var(--ink-soft)", textAlign: "center", marginBottom: 6 }}>
                目前餘額 = 期初餘額 + 之後所有收支記錄加總
              </div>
              {acctFormError && <div className="fp-error">{acctFormError}</div>}
              <button className="fp-save-btn" onClick={handleSaveAcctStart} style={{ background: "var(--indigo)" }}>
                <Check size={18} /> 儲存期初餘額
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {showAssistant && (
          <div className="fp-overlay" onClick={() => setShowAssistant(false)}>
            <div className="fp-sheet" style={{ maxHeight: "92%" }} onClick={(e) => e.stopPropagation()}>
              <button className="fp-close-btn" onClick={() => setShowAssistant(false)}><X size={20} /></button>
              <div style={{ fontWeight: 700, fontSize: 16, textAlign: "center", marginBottom: 14 }} className="fp-serif">財務小幫手</div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--indigo)" }}>我的目標</div>
                <button
                  onClick={() => openGoalForm(null)}
                  style={{ border: "1.5px solid var(--indigo)", background: "none", color: "var(--indigo)", borderRadius: 16, padding: "4px 10px", fontSize: 11.5, fontWeight: 600, cursor: "pointer", fontFamily: "'Noto Sans TC', sans-serif" }}
                >+ 新增目標</button>
              </div>
              {goals.length === 0 ? (
                <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 12 }}>還沒有設定目標，跟小幫手說說你想達成什麼吧</div>
              ) : (
                <div style={{ marginBottom: 12 }}>
                  {goals.map((g) => (
                    <div key={g.id} onClick={() => openGoalForm(g)} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff8ec", border: "1px solid #e3d9bd", borderRadius: 10, padding: "8px 10px", marginBottom: 6, cursor: "pointer" }}>
                      <Bell size={14} color="var(--seal)" style={{ flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: 12.5 }}>
                        {g.text}
                        {(g.targetAmount || g.targetDate) && (
                          <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>
                            {g.targetAmount ? `NT$ ${fmt(g.targetAmount)}` : ""}{g.targetAmount && g.targetDate ? " · " : ""}{g.targetDate || ""}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--indigo)", marginBottom: 8 }}>跟小幫手聊聊</div>
              <div ref={chatScrollRef} style={{ height: 240, overflowY: "auto", background: "#fff8ec", border: "1px solid #e3d9bd", borderRadius: 12, padding: 10, marginBottom: 10 }}>
                {chatMessages.length === 0 && (
                  <div>
                    <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 10 }}>你可以問問小幫手，或直接告訴他你的財務目標。</div>
                    <button onClick={() => handleSendChat("幫我看看我這個月花得怎麼樣")} style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 6, padding: "8px 10px", borderRadius: 10, border: "1px solid #d8d0ba", background: "#fff", fontSize: 12, color: "var(--indigo)", cursor: "pointer", fontFamily: "'Noto Sans TC', sans-serif" }}>「幫我看看我這個月花得怎麼樣」</button>
                    <button onClick={() => handleSendChat("根據我的目標，給我一些建議和提醒")} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 10, border: "1px solid #d8d0ba", background: "#fff", fontSize: 12, color: "var(--indigo)", cursor: "pointer", fontFamily: "'Noto Sans TC', sans-serif" }}>「根據我的目標，給我一些建議和提醒」</button>
                  </div>
                )}
                {chatMessages.map((m, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 8 }}>
                    <div style={{
                      maxWidth: "80%", padding: "8px 12px", borderRadius: 14, fontSize: 12.5, lineHeight: 1.5, whiteSpace: "pre-wrap",
                      background: m.role === "user" ? "var(--indigo)" : "#fff",
                      color: m.role === "user" ? "#fff" : "var(--ink)",
                      border: m.role === "user" ? "none" : "1px solid #e3d9bd",
                    }}>{m.text}</div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ display: "flex", justifyContent: "flex-start" }}>
                    <div style={{ padding: "8px 12px", borderRadius: 14, background: "#fff", border: "1px solid #e3d9bd", color: "var(--ink-soft)", fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }}>
                      <Loader2 size={13} className="fp-spin" /> 小幫手思考中…
                    </div>
                  </div>
                )}
              </div>
              {chatError && <div className="fp-error" style={{ marginTop: -4 }}>{chatError}</div>}

              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="fp-input"
                  style={{ flex: 1 }}
                  placeholder="跟小幫手說說話…"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSendChat(); }}
                />
                <button
                  onClick={() => handleSendChat()}
                  disabled={chatLoading || !chatInput.trim()}
                  style={{ width: 44, height: 44, borderRadius: 12, border: "none", background: "var(--seal)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: chatLoading ? "default" : "pointer", opacity: chatLoading || !chatInput.trim() ? 0.6 : 1, flexShrink: 0 }}
                ><Send size={17} /></button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {showGoalForm && (
          <div className="fp-overlay" onClick={() => setShowGoalForm(false)}>
            <div className="fp-sheet" onClick={(e) => e.stopPropagation()}>
              <button className="fp-close-btn" onClick={() => setShowGoalForm(false)}><X size={20} /></button>
              <div style={{ fontWeight: 700, fontSize: 16, textAlign: "center", marginBottom: 14 }} className="fp-serif">
                {editingGoalId ? "編輯目標" : "新增目標"}
              </div>
              <div className="fp-field-label">你的目標</div>
              <input className="fp-input" placeholder="例如：半年內存到 10 萬元" value={goalText} onChange={(e) => setGoalText(e.target.value)} />
              <div className="fp-field-label">目標金額（選填）</div>
              <input className="fp-input" inputMode="decimal" placeholder="NT$ 0" value={goalTargetAmount} onChange={(e) => setGoalTargetAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
              <div className="fp-field-label">目標日期（選填）</div>
              <input type="date" className="fp-input" value={goalTargetDate} onChange={(e) => setGoalTargetDate(e.target.value)} />
              {goalFormError && <div className="fp-error" style={{ marginTop: 12 }}>{goalFormError}</div>}
              <button className="fp-save-btn" onClick={handleSaveGoal} style={{ background: "var(--indigo)" }}>
                <Check size={18} /> {editingGoalId ? "儲存變更" : "新增目標"}
              </button>
              {editingGoalId && (
                <button
                  onClick={handleDeleteGoal}
                  style={{ width: "100%", marginTop: 10, padding: "10px 0", borderRadius: 14, border: "1.5px solid var(--seal)", background: "none", color: "var(--seal)", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "'Noto Sans TC', sans-serif" }}
                >
                  <Trash2 size={15} /> 刪除這個目標
                </button>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {showProjectsList && (
          <div className="fp-overlay" onClick={() => setShowProjectsList(false)}>
            <div className="fp-sheet" style={{ maxHeight: "90%" }} onClick={(e) => e.stopPropagation()}>
              <button className="fp-close-btn" onClick={() => setShowProjectsList(false)}><X size={20} /></button>

              {projectDetailId === null ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }} className="fp-serif">專案</div>
                    <button
                      onClick={() => openProjectForm(null)}
                      style={{ border: "1.5px solid var(--indigo)", background: "none", color: "var(--indigo)", borderRadius: 16, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Noto Sans TC', sans-serif" }}
                    >+ 新增專案</button>
                  </div>

                  {projectsWithTotals.length === 0 && (
                    <div style={{ fontSize: 13, color: "var(--ink-soft)", textAlign: "center", padding: "20px 0" }}>
                      還沒有任何專案，像是旅行、裝潢這種橫跨多個分類的花費，可以建一個專案把它們集中起來看
                    </div>
                  )}
                  {projectsWithTotals.map((p) => (
                    <div key={p.id} onClick={() => setProjectDetailId(p.id)} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff8ec", border: "1px solid #e3d9bd", borderRadius: 12, padding: "12px 14px", marginBottom: 10, cursor: "pointer" }}>
                      <div className="fp-tx-icon" style={{ color: "var(--indigo)", background: "var(--brass-soft)", border: "1.5px solid var(--brass)" }}>
                        <Folder size={17} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                        <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{p.count} 筆記錄{p.startDate ? ` · ${p.startDate}${p.endDate ? ` ~ ${p.endDate}` : ""}` : ""}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div className="fp-mono" style={{ fontWeight: 700, color: "var(--seal)" }}>{fmt(p.totalExpense)}</div>
                        {p.budget ? <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>預算 {fmt(p.budget)}</div> : null}
                      </div>
                    </div>
                  ))}
                </>
              ) : (() => {
                const p = projectsWithTotals.find((x) => x.id === projectDetailId);
                if (!p) return null;
                const pct = p.budget ? Math.min(100, Math.round((p.totalExpense / p.budget) * 100)) : null;
                const pctColor = pct !== null ? (pct >= 100 ? "var(--seal)" : pct >= 80 ? "var(--brass)" : "var(--jade)") : "var(--jade)";
                return (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                      <button onClick={() => setProjectDetailId(null)} style={{ background: "none", border: "none", color: "var(--indigo)", cursor: "pointer", display: "flex", alignItems: "center" }}><ChevronLeft size={20} /></button>
                      <div style={{ fontWeight: 700, fontSize: 16, flex: 1 }} className="fp-serif">{p.name}</div>
                      <button onClick={() => openProjectForm(p)} style={{ border: "1.5px solid var(--indigo)", background: "none", color: "var(--indigo)", borderRadius: 16, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Noto Sans TC', sans-serif" }}>編輯</button>
                    </div>

                    <div className="fp-card">
                      <div style={{ display: "flex", gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>總支出</div>
                          <div className="fp-mono" style={{ fontWeight: 700, color: "var(--seal)" }}>{fmt(p.totalExpense)}</div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>總收入</div>
                          <div className="fp-mono" style={{ fontWeight: 700, color: "var(--jade)" }}>{fmt(p.totalIncome)}</div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>淨支出</div>
                          <div className="fp-mono" style={{ fontWeight: 700 }}>{fmt(-p.net)}</div>
                        </div>
                      </div>
                      {p.budget ? (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                            <span className="fp-mono">{fmt(p.totalExpense)} / {fmt(p.budget)}</span>
                            <span className="fp-mono" style={{ color: pctColor }}>{pct}%</span>
                          </div>
                          <div className="fp-progress-track"><div className="fp-progress-fill" style={{ width: `${pct}%`, background: pctColor }} /></div>
                        </div>
                      ) : null}
                    </div>

                    {p.categoryBreakdown.length > 0 && (
                      <div className="fp-card">
                        <div className="fp-card-title">分類明細</div>
                        {p.categoryBreakdown.map((c, i) => (
                          <div className="fp-legend-row" key={c.cat}>
                            <div className="fp-legend-dot" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                            <div className="fp-legend-label">{c.label}</div>
                            <div className="fp-legend-value">{fmt(c.value)}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="fp-field-label" style={{ marginTop: 4 }}>相關記錄</div>
                    {p.txs.length === 0 ? (
                      <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>還沒有記錄指定到這個專案，新增交易時可以在「專案」欄位選擇它</div>
                    ) : (
                      p.txs.map((t) => {
                        const meta = ALL_CATS[t.category] || { label: t.category, icon: Gift };
                        const Icon = meta.icon;
                        const color = t.type === "income" ? "var(--jade)" : "var(--seal)";
                        return (
                          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px dashed #d8d0ba" }}>
                            <Icon size={15} color={color} style={{ flexShrink: 0 }} />
                            <div style={{ flex: 1, fontSize: 12.5 }}>{meta.label}{t.note ? ` · ${t.note}` : ""}<div style={{ fontSize: 11, color: "var(--ink-soft)" }}>{t.date}</div></div>
                            <div className="fp-mono" style={{ fontSize: 12.5, color, fontWeight: 700 }}>{t.type === "income" ? "+" : "-"}{fmt(t.amount)}</div>
                          </div>
                        );
                      })
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {showProjectForm && (
          <div className="fp-overlay" onClick={() => setShowProjectForm(false)}>
            <div className="fp-sheet" onClick={(e) => e.stopPropagation()}>
              <button className="fp-close-btn" onClick={() => setShowProjectForm(false)}><X size={20} /></button>
              <div style={{ fontWeight: 700, fontSize: 16, textAlign: "center", marginBottom: 14 }} className="fp-serif">
                {editingProjectId ? "編輯專案" : "新增專案"}
              </div>
              <div className="fp-field-label">專案名稱</div>
              <input className="fp-input" placeholder="例如：日本旅行 2026" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
              <div className="fp-field-label">預算（選填）</div>
              <input className="fp-input" inputMode="decimal" placeholder="NT$ 0" value={projectBudget} onChange={(e) => setProjectBudget(e.target.value.replace(/[^0-9.]/g, ""))} />
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div className="fp-field-label">開始日期（選填）</div>
                  <input type="date" className="fp-input" value={projectStartDate} onChange={(e) => setProjectStartDate(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="fp-field-label">結束日期（選填）</div>
                  <input type="date" className="fp-input" value={projectEndDate} onChange={(e) => setProjectEndDate(e.target.value)} />
                </div>
              </div>
              <div className="fp-field-label">備註（選填）</div>
              <input className="fp-input" placeholder="例如：跟家人的年度旅行" value={projectNote} onChange={(e) => setProjectNote(e.target.value)} />
              {projectFormError && <div className="fp-error" style={{ marginTop: 12 }}>{projectFormError}</div>}
              <button className="fp-save-btn" onClick={handleSaveProject} style={{ background: "var(--indigo)" }}>
                <Check size={18} /> {editingProjectId ? "儲存變更" : "新增專案"}
              </button>
              {editingProjectId && (
                <button
                  onClick={handleDeleteProject}
                  style={{ width: "100%", marginTop: 10, padding: "10px 0", borderRadius: 14, border: "1.5px solid var(--seal)", background: "none", color: "var(--seal)", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "'Noto Sans TC', sans-serif" }}
                >
                  <Trash2 size={15} /> 刪除這個專案
                </button>
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {showClearConfirm && (
          <div className="fp-overlay" onClick={() => setShowClearConfirm(false)}>
            <div className="fp-sheet" onClick={(e) => e.stopPropagation()}>
              <button className="fp-close-btn" onClick={() => setShowClearConfirm(false)}><X size={20} /></button>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--seal-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Trash2 size={22} color="var(--seal)" />
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, textAlign: "center", marginBottom: 8 }} className="fp-serif">確定要清除所有資料嗎？</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-soft)", textAlign: "center", marginBottom: 20, lineHeight: 1.6 }}>
                明細、帳戶餘額、投資組合、預算、目標、跟小幫手的對話紀錄都會被清空，這個動作沒辦法復原。
              </div>
              <button
                onClick={handleClearAllData}
                style={{ width: "100%", padding: "12px 0", borderRadius: 14, border: "none", background: "var(--seal)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "'Noto Sans TC', sans-serif" }}
              >確定清除</button>
              <button
                onClick={() => setShowClearConfirm(false)}
                style={{ width: "100%", marginTop: 10, padding: "12px 0", borderRadius: 14, border: "1.5px solid #d8d0ba", background: "none", color: "var(--ink)", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "'Noto Sans TC', sans-serif" }}
              >取消</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
