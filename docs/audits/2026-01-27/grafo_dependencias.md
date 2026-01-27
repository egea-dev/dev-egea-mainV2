# Análisis de Dependencias y Arquitectura

## Estructura del Proyecto
El proyecto sigue una estructura modular clara:
- `src/pages`: Vistas principales.
- `src/components`: Componentes UI y de negocio.
- `src/hooks`: Lógica de estado y llamadas a API.
- `src/lib`: Utilidades core y configuración de clientes (Supabase).
- `src/integrations`: Configuración específica de Supabase.

## Resultados del Análisis (Madge)
Se han analizado 55 archivos partiendo de `src/main.tsx`.
- **Ciclos Detectados**: 0 (Ninguno).
- **Grafo de Capas**:
    1. **Capa Externa**: Pages (`src/pages/*`)
    2. **Capa Intermedia**: Business Components (`src/components/commercial/*`, etc.)
    3. **Capa Interna (UI)**: UI Primitives (`src/components/ui/*`)
    4. **Capa Lógica**: Hooks (`src/hooks/*`)
    5. **Capa Base**: Supabase Client / Utils (`src/lib/*`, `src/integrations/*`)

## Hallazgos Técnicos
- El sistema utiliza un **fetch interceptor** en `src/integrations/supabase/client.ts` para compartir el token de autenticación de la base de datos `MAIN` con la de `PRODUCTIVITY`.
- Las dependencias están bien desacopladas, lo que facilita el mantenimiento y la escalabilidad.
