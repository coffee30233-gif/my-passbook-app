/* ---------------------------------------------------------------------
   解析「交易紀錄整理」Excel 的「交易總覽」分頁
   讀的是 Excel 存檔時算好的值（不是公式），所以檔案要用 Excel 存過一次。
   各區塊用標題文字定位，不寫死列號，之後多幾檔股票或幾個月也讀得到。
--------------------------------------------------------------------- */

export const OVERVIEW_SHEET = "交易總覽";

const isBlank = (v) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v) => (isBlank(v) ? "" : String(v).trim());
const isoDate = (v) => (v instanceof Date && !Number.isNaN(v.getTime())
  ? `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`
  : str(v));

function firstCol(row) {
  return row.findIndex((v) => !isBlank(v));
}
function rowText(row) {
  const c = firstCol(row);
  return c < 0 ? "" : str(row[c]);
}
function findRow(rows, pred, from = 0) {
  for (let i = from; i < rows.length; i++) if (pred(rowText(rows[i]), rows[i])) return i;
  return -1;
}
// 從某列開始，讀到下一個空白列為止，並把每列切齊 startCol
function readBlock(rows, from, startCol) {
  const out = [];
  for (let i = from; i < rows.length; i++) {
    if (firstCol(rows[i]) < 0) break;
    out.push(rows[i].slice(startCol));
  }
  return out;
}

export async function parseStockOverviewFile(file) {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const ws = wb.Sheets[OVERVIEW_SHEET];
  if (!ws) throw new Error(`找不到「${OVERVIEW_SHEET}」分頁，請確認選的是交易紀錄整理的 Excel 檔`);
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true, blankrows: true });

  const titleIdx = findRow(rows, (t) => t !== "");
  const title = titleIdx >= 0 ? rowText(rows[titleIdx]) : "";
  const subtitle = titleIdx >= 0 && firstCol(rows[titleIdx + 1] || []) >= 0 ? rowText(rows[titleIdx + 1]) : "";

  // 1. 重點數字
  const summary = [];
  const sumHead = findRow(rows, (t) => t === "看這些數字");
  if (sumHead >= 0) {
    const c = firstCol(rows[sumHead]);
    for (const r of readBlock(rows, sumHead + 1, c)) {
      if (num(r[1]) === null) continue;
      summary.push({ label: str(r[0]), value: r[1], note: str(r.slice(2).find((v) => !isBlank(v))) });
    }
  }
  if (summary.length === 0) throw new Error("「交易總覽」裡讀不到數字，請先用 Excel 打開檔案、存檔一次再匯入");

  // 2. 每一檔股票已實現損益
  const stocks = [];
  const totals = {};
  const stockTitle = findRow(rows, (t) => t.startsWith("每一檔股票"));
  if (stockTitle >= 0) {
    const head = findRow(rows, (t) => t === "股票", stockTitle + 1);
    const c = firstCol(rows[head]);
    for (const r of readBlock(rows, head + 1, c)) {
      stocks.push({ name: str(r[0]), realized: num(r[1]) ?? 0, result: str(r[2]), shares: num(r[3]) ?? 0, status: str(r[4]) });
    }
    for (const [key, label] of [["net", "合計淨賺"], ["gain", "賺錢股票合計"], ["loss", "虧損股票合計"]]) {
      const i = findRow(rows, (t) => t === label, head);
      if (i >= 0) totals[key] = num(rows[i][firstCol(rows[i]) + 1]) ?? 0;
    }
  }

  // 3. 目前庫存
  const inventory = [];
  let inventoryTotal = null;
  const invTitle = findRow(rows, (t) => t.startsWith("目前庫存"));
  if (invTitle >= 0) {
    const head = findRow(rows, (t) => t === "股票", invTitle + 1);
    const c = firstCol(rows[head]);
    for (const r of readBlock(rows, head + 1, c)) {
      if (str(r[0]) === "庫存合計") {
        inventoryTotal = { shares: num(r[1]) ?? 0, cost: num(r[4]) ?? 0, value: num(r[6]) ?? 0, pl: num(r[7]) ?? 0 };
        continue;
      }
      inventory.push({
        name: str(r[0]), shares: num(r[1]) ?? 0, avgCost: num(r[2]) ?? 0, price: num(r[3]),
        cost: num(r[4]) ?? 0, quoteDate: isoDate(r[5]), value: num(r[6]), pl: num(r[7]),
      });
    }
  }

  // 4. 每月交易與核對明細
  const months = [];
  const monthTitle = findRow(rows, (t) => t.startsWith("每月交易"));
  if (monthTitle >= 0) {
    const head = findRow(rows, (t) => t === "月份", monthTitle + 1);
    const c = firstCol(rows[head]);
    for (let i = head + 1; i < rows.length; i++) {
      const r = rows[i].slice(c);
      if (!/^\d{4}-\d{2}$/.test(str(r[0]))) {
        if (firstCol(rows[i]) < 0) continue;
        break;
      }
      months.push({
        month: str(r[0]), status: str(r[1]), count: num(r[2]), buy: num(r[3]), sell: num(r[4]),
        net: num(r[5]), realized: num(r[6]), cumulative: num(r[7]),
      });
    }
  }

  // 5. 說明文字：庫存表之後、月表之前，以及月表之後的單欄文字
  const notes = [];
  const textOnly = (r) => r.filter((v) => !isBlank(v)).length === 1 && typeof r[firstCol(r)] === "string";
  const notesFrom = invTitle >= 0 ? invTitle + 1 : rows.length;
  for (let i = notesFrom; i < rows.length; i++) {
    if (i === monthTitle) continue;
    if (firstCol(rows[i]) >= 0 && textOnly(rows[i])) notes.push(rowText(rows[i]));
  }

  return {
    fileName: file.name,
    importedAt: new Date().toISOString(),
    title, subtitle, summary, stocks, totals, inventory, inventoryTotal, months, notes,
  };
}
