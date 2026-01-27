const XLSX_CDN_URL = "https://cdn.sheetjs.com/xlsx-0.20.2/package/xlsx.mjs"

export type XlsxModule = {
  read: (data: ArrayBuffer, opts: { type: "array"; cellDates?: boolean }) => {
    SheetNames: string[]
    Sheets: Record<string, unknown>
  }
  utils: {
    json_to_sheet: (data: Record<string, unknown>[]) => unknown
    book_new: () => unknown
    book_append_sheet: (workbook: unknown, worksheet: unknown, name: string) => void
    sheet_to_json: (sheet: unknown, opts: { header: number; defval: string; blankrows: boolean }) => unknown
  }
  writeFile: (workbook: unknown, fileName: string) => void
}

let cachedModule: Promise<XlsxModule> | null = null

export const loadXlsx = () => {
  if (!cachedModule) {
    cachedModule = import(/* @vite-ignore */ XLSX_CDN_URL).then(
      (module) => module as unknown as XlsxModule
    )
  }
  return cachedModule
}
