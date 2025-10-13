# Importar Planillas a Plantillas

Este documento resume el flujo recomendado para convertir hojas de cálculo (Excel, Google Sheets exportado, CSV) en plantillas dentro de Egea Productivity.

## 1. Preparar la hoja de cálculo

1. **Fila de encabezados**: la primera fila debe contener los nombres de las columnas (ej. `Cliente`, `Dirección`, `Trabajo`, `Fecha`).
2. **Datos consistentes**: cada fila representa una “tarjeta” o registro que posteriormente podrá convertirse en tarea o plantilla.
3. **Tipos sugeridos**:
   - Texto libre → `Cliente`, `Descripción`, `Notas`.
   - Números → `Cantidad`, `Precio`.
   - Fecha → `Fecha programada`, `Entrega`.
4. **Google Sheets**: descarga el archivo desde `Archivo → Descargar → Microsoft Excel (.xlsx)` o usa la URL de exportación directa: `https://docs.google.com/spreadsheets/d/<ID>/export?format=xlsx`.

## 2. Lógica de importación (TypeScript)

Se añadió `src/lib/template-import.ts` con helpers para convertir archivos en objetos de plantilla:

```ts
import { parseTemplatesFromWorkbook } from '@/lib/template-import';

async function handleFile(file: File) {
  const templates = await parseTemplatesFromWorkbook(file, {
    defaultTemplateType: 'instalaciones', // opcional
    defaultCategory: 'Planilla de Carga'
  });

  for (const template of templates) {
    await supabase.from('templates').insert({
      name: template.name,
      template_type: template.template_type,
      category: template.category,
      fields: template.fields
    });
  }
}
```

`parseTemplatesFromWorkbook`:

- Lee cada hoja como una plantilla independiente.
- Deduce tipos (`text`, `number`, `date`) basándose en los valores de las columnas.
- Genera nombres de campo válidos (snake_case) a partir del encabezado.
- Devuelve también las filas originales (`rows`) por si se quieren crear tareas directamente.

## 3. Crear plantillas / tareas desde la importación

- **Crear plantillas**: insertar el objeto devuelto (`name`, `template_type`, `fields`) en la tabla `templates` o reutilizar `TemplateDialog` cargando `fields` pre-generados.
- **Crear tareas**: recorrer `rows` y mapear los valores contra `fields`; luego llamar al RPC `upsert_task` o insertar en `screen_data` con la estructura apropiada.

## 4. Flujo recomendado

1. Usuario selecciona un archivo (`<input type="file" accept=".xls,.xlsx,.csv">`).
2. Se llama a `parseTemplatesFromWorkbook`.
3. Mostrar una vista previa con campos detectados (permitir ajustes en UI si se requiere).
4. Guardar la plantilla en `templates` y, si se marca la opción, generar tareas (`upsert_task`) para una pantalla concreta.

## 5. Siguientes pasos sugeridos

- Definir un wizard en UI para validar los campos detectados antes de guardarlos.
- Añadir soporte para importar desde enlaces públicos de Google Sheets (descargando como CSV o XLSX en tiempo real).
- Registrar metadatos (`source`, `imported_at`, usuario que importó) para auditoría.

Con esta base, el equipo puede iterar sobre el proceso de importación sin perder tiempo en el parsing de archivos.
