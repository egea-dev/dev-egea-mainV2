import { useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { upsertTask } from "@/lib/upsert-task"
import { supabase } from "@/integrations/supabase/client"
import { mapRowToTemplateData } from "@/lib/template-import"
import { format } from "date-fns"
import { loadXlsx } from "@/lib/xlsx-loader"

type RawCell = string | number | boolean | Date | null | undefined
type NormalizedPayload = Record<string, unknown>

interface DataImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  screenId: string | null
  templateFields: Array<{ name: string; label: string; type: string }>
  onImported: () => void
}

interface WorkbookSheet {
  name: string
  matrix: RawCell[][]
}

interface FieldMapping {
  fieldName: string
  columnKey: string | null
}

const DEFAULT_HEADER_ROW = 1
const DEFAULT_DATA_START_ROW = 2
const DEFAULT_DATA_START_COLUMN = 1

const ensureColumnLabel = (value: unknown, index: number) => {
  const raw = value !== undefined && value !== null ? String(value).trim() : ""
  if (raw) return raw
  return `Columna ${index + 1}`
}

const generateColumnKey = (index: number) => `col_${index + 1}`

const MS_PER_DAY = 86_400_000
const EXCEL_EPOCH_OFFSET = 25_569
const DATE_FIELD_HINTS = ["fecha", "date", "inicio", "fin", "entrega", "start", "end"]
const PURE_DIGITS_REGEX = /^\d+$/

const isLikelyDateString = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (PURE_DIGITS_REGEX.test(trimmed)) return false
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return true
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(trimmed)) return true
  if (/\bGMT\b/i.test(trimmed)) return true
  if (/[a-z]{3,}/i.test(trimmed) && /\d{4}/.test(trimmed)) return true
  if (/T\d{2}:\d{2}/.test(trimmed)) return true
  return false
}

const parseExcelSerialDate = (value: number): string | null => {
  if (!Number.isFinite(value)) return null
  if (value < 10_000 || value > 60_000) return null
  const msFromUnixEpoch = Math.round((value - EXCEL_EPOCH_OFFSET) * MS_PER_DAY)
  const date = new Date(msFromUnixEpoch)
  if (Number.isNaN(date.getTime())) return null
  return format(date, "yyyy-MM-dd")
}

const parseToSimpleDate = (value: unknown): string | null => {
  if (value === null || value === undefined) return null

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return format(value, "yyyy-MM-dd")
  }

  if (typeof value === "number") {
    return parseExcelSerialDate(value)
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return null
    if (PURE_DIGITS_REGEX.test(trimmed)) {
      const numeric = Number(trimmed)
      const excelDate = parseExcelSerialDate(numeric)
      if (excelDate) return excelDate
      return null
    }
    const parsed = new Date(trimmed)
    if (!Number.isNaN(parsed.getTime())) {
      return format(parsed, "yyyy-MM-dd")
    }
  }

  return null
}

const getStringField = (record: Record<string, unknown>, key: string): string | null => {
  const value = record[key]
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

const normalizeImportedPayload = (
  payload: Record<string, unknown>,
  templateFields: Array<{ name: string; label: string; type: string }>
): NormalizedPayload => {
  const normalized: NormalizedPayload = {}
  const templateDateFields = new Set<string>()

  templateFields.forEach((field) => {
    if (field.type !== "date") return
    if (field.name) templateDateFields.add(field.name.toLowerCase())
    if (field.label) templateDateFields.add(field.label.toLowerCase())
  })

  for (const [key, value] of Object.entries(payload)) {
    const lowerKey = key.toLowerCase()
    const shouldAttemptParse =
      templateDateFields.has(lowerKey) ||
      DATE_FIELD_HINTS.some((hint) => lowerKey.includes(hint)) ||
      value instanceof Date

    if (shouldAttemptParse) {
      const parsed = parseToSimpleDate(value)
      if (parsed) {
        normalized[key] = parsed
        continue
      }
    } else if (typeof value === "string" && isLikelyDateString(value)) {
      const parsed = parseToSimpleDate(value)
      if (parsed) {
        normalized[key] = parsed
        continue
      }
    }

    if (typeof value === "string") {
      normalized[key] = value.trim()
      continue
    }

    if (value instanceof Date) {
      normalized[key] = format(value, "yyyy-MM-dd")
      continue
    }

    normalized[key] = value
  }

  return normalized
}

const getFirstValidDate = (payload: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const formatted = parseToSimpleDate(payload[key])
    if (formatted) {
      return formatted
    }
  }
  return null
}

export const DataImportDialog = ({ open, onOpenChange, screenId, templateFields, onImported }: DataImportDialogProps) => {
  const [fileName, setFileName] = useState<string | null>(null)
  const [workbookSheets, setWorkbookSheets] = useState<WorkbookSheet[]>([])
  const [selectedSheetIndex, setSelectedSheetIndex] = useState(0)
  const [headerRow, setHeaderRow] = useState(DEFAULT_HEADER_ROW)
  const [dataStartRow, setDataStartRow] = useState(DEFAULT_DATA_START_ROW)
  const [dataStartColumn, setDataStartColumn] = useState(DEFAULT_DATA_START_COLUMN)
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [clearBeforeImport, setClearBeforeImport] = useState(false)

  const resetState = () => {
    setFileName(null)
    setWorkbookSheets([])
    setSelectedSheetIndex(0)
    setHeaderRow(DEFAULT_HEADER_ROW)
    setDataStartRow(DEFAULT_DATA_START_ROW)
    setDataStartColumn(DEFAULT_DATA_START_COLUMN)
    setFieldMappings([])
    setLoading(false)
    setImporting(false)
    setClearBeforeImport(false)
  }

  const closeDialog = (value: boolean) => {
    if (!value) {
      resetState()
    }
    onOpenChange(value)
  }

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!screenId) {
      toast.error("Selecciona primero una pantalla en Gestión de Datos")
      return
    }

    setLoading(true)
    try {
      const { read, utils } = await loadXlsx()
      const buffer = await file.arrayBuffer()
      const workbook = read(buffer, { type: "array", cellDates: true })
      const sheets = workbook.SheetNames.map((name) => ({
        name,
        matrix: utils.sheet_to_json(workbook.Sheets[name], {
          header: 1,
          defval: "",
          blankrows: false
        }) as RawCell[][]
      }))

      if (!sheets.length) {
        toast.error("El archivo no contiene datos")
        setWorkbookSheets([])
        return
      }

      setFileName(file.name)
      setWorkbookSheets(sheets)
      setSelectedSheetIndex(0)
      setFieldMappings(
        templateFields.map((field) => ({
          fieldName: field.name,
          columnKey: null
        }))
      )
    } catch (error: unknown) {
      console.error("Error parsing workbook:", error)
      const message = error instanceof Error ? error.message : "desconocido"
      toast.error(`No se pudo procesar el archivo: ${message}`)
    } finally {
      setLoading(false)
    }
  }

  const currentSheet = workbookSheets[selectedSheetIndex]

  const columnDefinitions = useMemo(() => {
    if (!currentSheet) return []
    const matrix = currentSheet.matrix
    if (!matrix.length) return []

    const headerIndex = Math.max(headerRow - 1, 0)
    const startColumnIndex = Math.max(dataStartColumn - 1, 0)

    const headerValues = (matrix[headerIndex] ?? []) as RawCell[]
    const totalColumns = Math.max(headerValues.length, ...matrix.slice(headerIndex + 1).map((row) => row.length))

    return Array.from({ length: Math.max(totalColumns - startColumnIndex, 0) }, (_, offset) => {
      const columnIndex = startColumnIndex + offset
      const label = ensureColumnLabel(headerValues[columnIndex], columnIndex)
      const key = generateColumnKey(columnIndex)
      return { label, key, columnIndex }
    })
  }, [currentSheet, headerRow, dataStartColumn])

  const dataPreview = useMemo(() => {
    if (!currentSheet) return []
    const matrix = currentSheet.matrix
    if (!matrix.length) return []

    const startRowIndex = Math.max(dataStartRow - 1, 0)
    const previewRows = matrix.slice(startRowIndex, startRowIndex + 5)

    return previewRows.map((row) =>
      columnDefinitions.map((column) => String(row?.[column.columnIndex] ?? ""))
    )
  }, [currentSheet, dataStartRow, columnDefinitions])

  const handleMappingChange = (fieldName: string, columnKey: string | null) => {
    setFieldMappings((prev) =>
      prev.map((mapping) =>
        mapping.fieldName === fieldName ? { ...mapping, columnKey } : mapping
      )
    )
  }

  useEffect(() => {
    if (!columnDefinitions.length || !templateFields.length) return

    setFieldMappings((prev) => {
      let modified = false
      const next = prev.map((mapping) => {
        if (mapping.columnKey) return mapping
        const field = templateFields.find((f) => f.name === mapping.fieldName)
        if (!field) return mapping

        const normalizedLabel = (field.label || field.name).toLowerCase()
        const labelMatch = columnDefinitions.find((col) => col.label.toLowerCase() === normalizedLabel)
        if (labelMatch) {
          modified = true
          return { ...mapping, columnKey: labelMatch.key }
        }

        return mapping
      })

      return modified ? next : prev
    })
  }, [columnDefinitions, templateFields])

  const handleImport = async () => {
    if (!screenId) {
      toast.error("No hay pantalla seleccionada")
      return
    }

    if (!currentSheet) {
      toast.error("Selecciona un archivo válido")
      return
    }

    const activeMappings = fieldMappings.filter((mapping) => mapping.columnKey)
    if (!activeMappings.length) {
      toast.error("Asigna al menos una columna")
      return
    }

    setImporting(true)
    try {
      const matrix = currentSheet.matrix
      const headerIndex = Math.max(headerRow - 1, 0)
      const headerValues = matrix[headerIndex] ?? []
      const startRowIndex = Math.max(dataStartRow - 1, 0)

      if (clearBeforeImport) {
        const { error } = await supabase
          .from("screen_data")
          .delete()
          .eq("screen_id", screenId)

        if (error) {
          throw error
        }
      }

      const rows = matrix.slice(startRowIndex)
      for (const row of rows) {
        const rawRecord: Record<string, RawCell> = {}
        columnDefinitions.forEach((column) => {
          const value = row?.[column.columnIndex] ?? ""
          rawRecord[column.key] = value
          const headerLabel = ensureColumnLabel(headerValues[column.columnIndex], column.columnIndex)
          rawRecord[headerLabel] = value
        })

        const mappedPayload: Record<string, unknown> = {}
        activeMappings.forEach((mapping) => {
          const column = columnDefinitions.find((col) => col.key === mapping.columnKey)
          if (!column) return
          const headerLabel = ensureColumnLabel(headerValues[column.columnIndex], column.columnIndex)
          const value = rawRecord[column.key]
          mappedPayload[headerLabel] = value
          mappedPayload[mapping.fieldName] = value
        })

        const basePayload: Record<string, unknown> = templateFields.length
          ? mapRowToTemplateData(mappedPayload, templateFields)
          : mappedPayload

        const payload = normalizeImportedPayload(basePayload, templateFields)

        const hasValues = Object.values(payload).some((value) => {
          if (value === null || value === undefined) return false
          if (typeof value === 'number') return true
          return String(value).trim() !== ''
        })

        if (!hasValues) {
          continue
        }

        const location =
          getStringField(payload, "location") ??
          getStringField(payload, "direccion") ??
          getStringField(payload, "address") ??
          getStringField(payload, "site") ??
          null

        const startDate = getFirstValidDate(payload, ["start_date", "fecha_inicio", "fecha", "date"])
        const endDate = getFirstValidDate(payload, ["end_date", "fecha_fin", "fecha_entrega"])

        await upsertTask(supabase, {
          screenId,
          data: payload,
          state: "pendiente",
          status: "pendiente",
          startDate: startDate ?? null,
          endDate: endDate ?? null,
          location,
          locationMetadata: location ? { manual_label: location } : {},
          workSiteId: null,
          responsibleProfileId: null,
          assignedTo: null,
          assignedProfiles: [],
          assignedVehicles: []
        })
      }

      toast.success("Datos importados correctamente")
      resetState()
      onImported()
    } catch (error: unknown) {
      console.error("Error importing data:", error)
      const message = error instanceof Error ? error.message : "error desconocido"
      toast.error(`No se pudo importar: ${message}`)
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Importar datos a la pantalla seleccionada</DialogTitle>
          <DialogDescription>
            Ajusta filas y columnas para ignorar títulos o notas, asigna columnas a tus campos y crea nuevas tareas en la pantalla seleccionada.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Archivo</Label>
            <Input type="file" accept=".xls,.xlsx,.csv" disabled={loading || importing} onChange={handleFileChange} />
            {fileName && <p className="text-xs text-muted-foreground">Seleccionado: {fileName}</p>}
          </div>

          {workbookSheets.length > 1 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Hoja</Label>
              <Select value={String(selectedSheetIndex)} onValueChange={(value) => setSelectedSheetIndex(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workbookSheets.map((sheet, index) => (
                    <SelectItem key={sheet.name} value={String(index)}>
                      {sheet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {currentSheet && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Fila de encabezados</Label>
                <Input
                  type="number"
                  min={1}
                  value={headerRow}
                  onChange={(event) => setHeaderRow(Number(event.target.value) || DEFAULT_HEADER_ROW)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Primera fila de datos</Label>
                <Input
                  type="number"
                  min={1}
                  value={dataStartRow}
                  onChange={(event) => setDataStartRow(Number(event.target.value) || DEFAULT_DATA_START_ROW)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Primera columna de datos</Label>
                <Input
                  type="number"
                  min={1}
                  value={dataStartColumn}
                  onChange={(event) => setDataStartColumn(Number(event.target.value) || DEFAULT_DATA_START_COLUMN)}
                />
              </div>
            </div>
          )}

          {columnDefinitions.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Asignación de columnas</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {templateFields.map((field) => (
                  <div key={field.name} className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">{field.label || field.name}</p>
                    <Select
                      value={fieldMappings.find((mapping) => mapping.fieldName === field.name)?.columnKey || "none"}
                      onValueChange={(value) => handleMappingChange(field.name, value === "none" ? null : value)}
                      disabled={importing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar columna" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Omitir</SelectItem>
                        {columnDefinitions.map((column) => (
                          <SelectItem key={column.key} value={column.key}>
                            {column.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dataPreview.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Vista previa (primeras filas)</Label>
              <ScrollArea className="border rounded-md max-h-[240px]">
                <table className="w-full text-xs">
                  <thead className="bg-muted/60">
                    <tr>
                      {columnDefinitions.map((column) => (
                        <th key={column.key} className="px-2 py-1 text-left font-semibold">
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dataPreview.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-t">
                        {row.map((value, columnIndex) => (
                          <td key={columnIndex} className="px-2 py-1">
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={clearBeforeImport} onCheckedChange={(checked) => setClearBeforeImport(Boolean(checked))} disabled={importing} />
            Limpiar datos existentes de la pantalla antes de importar
          </label>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => closeDialog(false)} disabled={importing}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={
              importing ||
              loading ||
              !currentSheet ||
              columnDefinitions.length === 0
            }
          >
            {importing ? "Importando…" : "Importar datos seleccionados"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
