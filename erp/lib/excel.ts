/**
 * Umumiy Excel eksport yordamchisi.
 * Hisobotlar ekrandagi jadval strukturasi bilan bir xil ustunlar va sarlavhalardan foydalanadi.
 */
import * as XLSX from 'xlsx';

export type ExcelSheetOptions = {
  /** Birinchi qatorda sarlavha (ixtiyoriy) */
  title?: string;
  /** Ustun sarlavhalari (jadvaldagi kabi) */
  headers: string[];
  /** Ma'lumot qatorlari */
  rows: (string | number)[][];
  /** Ustun enlari (wch). Berilmasa, sarlavha uzunligi bo‘yicha hisoblanadi */
  colWidths?: number[];
};

/**
 * Yangi workbook yaratadi.
 */
export function createWorkbook(): XLSX.WorkBook {
  return XLSX.utils.book_new();
}

/**
 * Workbook ga yangi varaq qo‘shadi: sarlavha (ixtiyoriy) + ustunlar + ma'lumot.
 * Hisobot ekranda qanday ko‘rinsa, Excel da ham shu tartibda yoziladi.
 */
export function addSheet(
  wb: XLSX.WorkBook,
  sheetName: string,
  opts: ExcelSheetOptions
): void {
  const { title, headers, rows, colWidths } = opts;
  const sheetRows: (string | number)[][] = [];
  if (title) {
    sheetRows.push([title]);
  }
  sheetRows.push(headers);
  sheetRows.push(...rows);

  const ws = XLSX.utils.aoa_to_sheet(sheetRows);

  const numCols = Math.max(
    headers.length,
    ...rows.map((r) => r.length),
    title ? 1 : 0
  );
  if (!ws['!cols']) {
    ws['!cols'] = [];
  }
  for (let i = 0; i < numCols; i++) {
    const w = colWidths?.[i] ?? defaultColWidth(sheetRows, i);
    ws['!cols'][i] = { wch: Math.min(Math.max(w, 8), 60) };
  }

  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
}

function defaultColWidth(rows: (string | number)[][], colIndex: number): number {
  let max = 10;
  for (const row of rows) {
    const cell = row[colIndex];
    if (cell !== undefined && cell !== null) {
      const len = String(cell).length;
      if (len > max) max = len;
    }
  }
  return max + 1;
}

/**
 * Workbook ni fayl sifatida yuklab olishni ishga tushiradi.
 */
export function downloadWorkbook(wb: XLSX.WorkBook, filename: string): void {
  XLSX.writeFile(wb, filename);
}
