import { loadXlsx } from './xlsx-loader'

type FieldType = 'text' | 'number' | 'date'

type RawCell = string | number | boolean | Date | null | undefined

export interface TemplateFieldDefinition {
  name: string
  label: string
  type: FieldType
}

export interface ImportedTemplate {
  name: string
  template_type: string
  category?: string | null
  fields: TemplateFieldDefinition[]
  rows: Record<string, RawCell>[]
  metadata: {
    sheetName: string
    source?: string
  }
}

export interface ParseTemplateOptions {
  defaultTemplateType?: string
  defaultCategory?: string
  sheetNameAsType?: boolean
}

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

const inferFieldType = (values: RawCell[]): FieldType => {
  const sample = values.find((value) => {
    if (value === null || value === undefined) return false
    const text = String(value).trim()
    return text !== ''
  })

  if (!sample) return 'text'

  const value = String(sample).trim()

  if (!Number.isNaN(Number(value)) && value !== '') {
    return 'number'
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isNaN(Date.parse(value))) {
    return 'date'
  }

  return 'text'
}

const parseSheet = (
  sheet: unknown,
  sheetName: string,
  options: ParseTemplateOptions,
  utils: { sheet_to_json: (sheet: unknown, opts: { header: number; defval: string; blankrows: boolean }) => unknown }
): ImportedTemplate => {
  const matrix = utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    blankrows: false
  }) as RawCell[][]

  if (!matrix.length) {
    return {
      name: sheetName,
      template_type:
        (options.sheetNameAsType ? slugify(sheetName) : options.defaultTemplateType) || 'general',
      category: options.defaultCategory || null,
      fields: [],
      rows: [],
      metadata: { sheetName }
    }
  }

  const headerRow = matrix[0] ?? []
  const bodyRows = matrix.slice(1)
  const columnCount = Math.max(headerRow.length, ...bodyRows.map((row) => row.length))

  const usedSlugs = new Set<string>()

  const fields: TemplateFieldDefinition[] = Array.from({ length: columnCount }).map((_, columnIndex) => {
    const rawHeader = headerRow[columnIndex]
    const baseLabel = (() => {
      const label = rawHeader !== undefined && rawHeader !== null ? String(rawHeader).trim() : ''
      if (label) return label
      return `Columna ${columnIndex + 1}`
    })()

    const baseSlug = (() => {
      const slug = slugify(baseLabel)
      if (slug) return slug
      return `columna_${columnIndex + 1}`
    })()

    let finalSlug = baseSlug
    let suffix = 1
    while (usedSlugs.has(finalSlug)) {
      finalSlug = `${baseSlug}_${suffix++}`
    }
    usedSlugs.add(finalSlug)

    const columnValues = bodyRows.map((row) => (row ? row[columnIndex] : undefined)) as RawCell[]

    return {
      name: finalSlug,
      label: baseLabel,
      type: inferFieldType(columnValues)
    }
  })

  const rows = bodyRows.map((row) => {
    const entry: Record<string, RawCell> = {}
    fields.forEach((field, columnIndex) => {
      const value = row?.[columnIndex] ?? ''
      entry[field.name] = value
      entry[field.label] = value
    })
    return entry
  })

  return {
    name: sheetName,
    template_type:
      (options.sheetNameAsType ? slugify(sheetName) : options.defaultTemplateType) || 'general',
    category: options.defaultCategory || null,
    fields,
    rows,
    metadata: {
      sheetName
    }
  }
}

export const parseTemplatesFromWorkbook = async (
  file: File | ArrayBuffer,
  options: ParseTemplateOptions = {}
): Promise<ImportedTemplate[]> => {
  const { read, utils } = await loadXlsx()
  const buffer = file instanceof File ? await file.arrayBuffer() : file
  const workbook = read(buffer, { type: 'array', cellDates: true })

  return workbook.SheetNames.map((sheetName) =>
    parseSheet(workbook.Sheets[sheetName], sheetName, options, utils)
  )
}

export const parseTemplatesFromUrl = async (
  url: string,
  options: ParseTemplateOptions = {}
): Promise<ImportedTemplate[]> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`No se pudo descargar el archivo desde ${url}`)
  }
  const buffer = await response.arrayBuffer()
  return parseTemplatesFromWorkbook(buffer, options)
}

export const mapRowToTemplateData = (
  row: Record<string, unknown>,
  fields: TemplateFieldDefinition[]
): Record<string, unknown> => {
  const payload: Record<string, unknown> = {}

  fields.forEach((field) => {
    const raw = row[field.label] ?? row[field.name]
    if (raw === null || raw === undefined) return

    if (field.type === 'number') {
      const parsed = Number(raw)
      if (!Number.isNaN(parsed)) {
        payload[field.name] = parsed
      }
    } else if (field.type === 'date') {
      const dateValue = new Date(raw as Date | string | number)
      if (!Number.isNaN(dateValue.getTime())) {
        payload[field.name] = dateValue.toISOString().split('T')[0]
      }
    } else {
      const value = String(raw).trim()
      if (value) {
        payload[field.name] = value
      }
    }
  })

  return payload
}
