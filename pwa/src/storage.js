// 本機儲存層：介面模仿 Claude.ai 環境裡的 window.storage,
// 但實際上是用瀏覽器的 localStorage 存資料，所以只會存在使用者自己的手機/瀏覽器裡。
// 之後如果想換成雲端同步（例如自己的後端 + 帳號系統），只需要改這個檔案，
// App.jsx 完全不用動。

const PREFIX = "financeApp:";

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch (e) {
    return raw;
  }
}

export const storage = {
  async get(key) {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return null;
    return { key, value: raw, shared: false };
  },

  async set(key, value) {
    const strValue = typeof value === "string" ? value : JSON.stringify(value);
    localStorage.setItem(PREFIX + key, strValue);
    return { key, value: strValue, shared: false };
  },

  async delete(key) {
    const existed = localStorage.getItem(PREFIX + key) !== null;
    localStorage.removeItem(PREFIX + key);
    return { key, deleted: existed, shared: false };
  },

  async list(prefix = "") {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const fullKey = localStorage.key(i);
      if (fullKey && fullKey.startsWith(PREFIX + prefix)) {
        keys.push(fullKey.slice(PREFIX.length));
      }
    }
    return { keys, prefix, shared: false };
  },
};
