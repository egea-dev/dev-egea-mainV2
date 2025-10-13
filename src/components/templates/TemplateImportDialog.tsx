import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { parseTemplatesFromWorkbook, ImportedTemplate, mapRowToTemplateData } from "@/lib/template-import"

type TemplateImportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => void
}

type TemplatePreview = ImportedTemplate & {
  selected: boolean
}

type ScreenOption = {
  id: string
  name: string
  screen_group: string | null
}

export const TemplateImportDialog = ({ open, onOpenChange, onImported }: TemplateImportDialogProps) => {
  const [fileName, setFileName] = useState<string | null>(null)
  const [previews, setPreviews] = useState<TemplatePreview[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importAsTemplates, setImportAsTemplates] = useState(true)
  const [createTasks, setCreateTasks] = useState(false)
  const [screens, setScreens] = useState<ScreenOption[]>([])
  const [selectedScreenId, setSelectedScreenId] = useState<string>("")

  const resetState = () => {
    setFileName(null)
    setPreviews([])
    setLoading(false)
    setImporting(false)
    setImportAsTemplates(true)
    setCreateTasks(false)
    setSelectedScreenId("")
  }

  const handleClose = (value: boolean) => {
    if (!value) {
      resetState()
    }
    onOpenChange(value)
  }

  useEffect(() => {
    if (!open) return

    const fetchScreens = async () => {
      const { data, error } = await supabase
        .from('screens')
        .select('id, name, screen_group')
        .eq('is_active', true)
        .order('name')

      if (error) {
        console.error('Error fetching screens:', error)
        toast.error('No se pudieron cargar las pantallas disponibles')
        return
      }

      setScreens(data as ScreenOption[])
    }

    fetchScreens()
  }, [open])

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)
    try {
      const parsed = await parseTemplatesFromWorkbook(file, {
        defaultTemplateType: 'instalaciones'
      })

      if (!parsed.length) {
        toast.error('No se encontraron datos en el archivo seleccionado')
        setPreviews([])
        return
      }

      setFileName(file.name)
      setPreviews(
        parsed.map((template) => ({
          ...template,
          selected: true
        }))
      )
    } catch (error: any) {
      console.error('Error parsing workbook:', error)
      toast.error(`Error al procesar el archivo: ${error?.message ?? 'desconocido'}`)
      setPreviews([])
    } finally {
      setLoading(false)
    }
  }

  const handleToggleTemplate = (index: number, checked: boolean) => {
    setPreviews((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, selected: checked } : item))
    )
  }

  const handleNameChange = (index: number, value: string) => {
    setPreviews((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, name: value } : item))
    )
  }

  const handleTypeChange = (index: number, value: string) => {
    setPreviews((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, template_type: value } : item))
    )
  }

  const getDateValue = (data: Record<string, any>, keys: string[]) => {
    for (const key of keys) {
      const raw = data[key]
      if (!raw) continue
      const date = new Date(raw)
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]
      }
    }
    return null
  }

  const handleImport = async () => {
    const selected = previews.filter((template) => template.selected)
    if (!selected.length) {
      toast.error('Selecciona al menos una hoja para importar')
      return
    }

    if (!importAsTemplates && !createTasks) {
      toast.error('Selecciona al menos una acción a realizar')
      return
    }

    if (createTasks && !selectedScreenId) {
      toast.error('Selecciona la pantalla destino para las tareas')
      return
    }

    setImporting(true)
    try {
      if (importAsTemplates) {
        for (const template of selected) {
          const { error } = await supabase.from('templates').insert({
            name: template.name || template.metadata.sheetName,
            template_type: template.template_type || 'general',
            category: template.category || null,
            fields: template.fields
          })

          if (error) {
            throw error
          }
        }
      }

      if (createTasks && selectedScreenId) {
        for (const template of selected) {
          for (const row of template.rows) {
            const dataPayload = mapRowToTemplateData(row, template.fields)

            const location =
              dataPayload.location ||
              dataPayload.direccion ||
              dataPayload.address ||
              dataPayload.site ||
              null

            const startDate = getDateValue(dataPayload, ['start_date', 'fecha_inicio', 'fecha', 'date'])
            const endDate = getDateValue(dataPayload, ['end_date', 'fecha_fin', 'fecha_entrega'])

            const { error } = await supabase.rpc('upsert_task', {
              p_screen_id: selectedScreenId,
              p_data: dataPayload,
              p_state: 'pendiente',
              p_status: 'pendiente',
              p_start_date: startDate,
              p_end_date: endDate,
              p_location: location,
              p_responsible_profile_id: null,
              p_assigned_to: null,
              p_assigned_profiles: [],
              p_assigned_vehicles: []
            })

            if (error) {
              throw error
            }
          }
        }
      }

      const successMessage = [
        importAsTemplates ? 'Plantillas importadas' : null,
        createTasks ? 'Tareas creadas' : null
      ]
        .filter(Boolean)
        .join(' y ')

      toast.success(successMessage || 'Operación completada')
      resetState()
      onImported()
    } catch (error: any) {
      console.error('Error importing templates:', error)
      toast.error(`No se pudo completar la importación: ${error?.message ?? 'error desconocido'}`)
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar desde hoja de cálculo</DialogTitle>
          <DialogDescription>
            Selecciona un archivo XLS, XLSX o CSV. Cada hoja se convertirá en una plantilla; opcionalmente
            puedes crear tareas en una pantalla específica.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Input type="file" accept=".xls,.xlsx,.csv" disabled={loading || importing} onChange={handleFileChange} />
            {fileName && <p className="text-xs text-muted-foreground">Archivo seleccionado: {fileName}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={importAsTemplates}
                onCheckedChange={(checked) => setImportAsTemplates(Boolean(checked))}
                disabled={importing}
              />
              Guardar como plantillas
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={createTasks}
                onCheckedChange={(checked) => setCreateTasks(Boolean(checked))}
                disabled={importing}
              />
              Crear tareas desde filas
            </label>
          </div>

          {createTasks && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Pantalla destino</label>
              <Select value={selectedScreenId} onValueChange={setSelectedScreenId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una pantalla" />
                </SelectTrigger>
                <SelectContent>
                  {screens.map((screen) => (
                    <SelectItem key={screen.id} value={screen.id}>
                      {screen.name}
                      {screen.screen_group ? ` · ${screen.screen_group}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Cada fila se convertirá en una tarea con estado “pendiente”. Podrás ajustar detalles más tarde.
              </p>
            </div>
          )}

          {loading && <p className="text-sm text-muted-foreground">Procesando archivo…</p>}

          {!loading && previews.length > 0 && (
            <ScrollArea className="max-h-[340px] border rounded-md">
              <div className="space-y-4 p-4">
                {previews.map((template, index) => (
                  <div key={`${template.metadata.sheetName}-${index}`} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={template.selected}
                        onCheckedChange={(checked) => handleToggleTemplate(index, Boolean(checked))}
                        className="mt-1"
                        disabled={importing}
                      />
                      <div className="flex-1 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Nombre de plantilla</label>
                            <Input
                              value={template.name}
                              onChange={(event) => handleNameChange(index, event.target.value)}
                              placeholder={template.metadata.sheetName}
                              disabled={importing}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">Tipo de plantilla</label>
                            <Input
                              value={template.template_type}
                              onChange={(event) => handleTypeChange(index, event.target.value)}
                              placeholder="instalaciones, tapicería, etc."
                              disabled={importing}
                            />
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground">
                          {template.fields.length} campos detectados · {template.rows.length} filas de datos
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {template.fields.map((field, fieldIndex) => (
                            <div
                              key={`${template.metadata.sheetName}-${field.name}-${fieldIndex}`}
                              className="rounded-md border px-2 py-1 text-xs"
                            >
                              <span className="font-medium">{field.label || field.name}</span>
                              <span className="text-muted-foreground"> · {field.type}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleClose(false)} disabled={importing}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={
              importing ||
              loading ||
              previews.every((template) => !template.selected)
            }
          >
            {importing ? 'Importando…' : 'Importar seleccionadas'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
