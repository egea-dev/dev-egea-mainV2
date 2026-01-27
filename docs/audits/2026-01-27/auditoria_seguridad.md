# Informe de Auditoría de Seguridad - MainControl-Egea

## Resumen de Riesgos
Se han identificado vulnerabilidades de **Severidad Alta** en dependencias críticas y áreas de mejora en la configuración de la base de datos y el manejo de entradas en el frontend.

---

## Hallazgos Críticos

### 1. Dependencias Vulnerables (SCA)
- **React Router (`react-router-dom`)**:
    - **Vulnerabilidad**: XSS vía Open Redirects (GHSA-2w69-qvj).
    - **Severidad**: ⚠️ ALTA
    - **Recomendación**: Actualizar a `v7.0.0` o superior.
- **XLSX**:
    - **Vulnerabilidad**: Varios ReDoS y posibles ejecuciones remotas.
    - **Severidad**: ⚠️ ALTA
    - **Recomendación**: Evaluar migración a `exceljs` o asegurar versión parcheada.

### 2. Seguridad en Supabase (Auth & RLS)
- **Sesiones**: ✅ El proyecto ha migrado a sesiones independientes para MAIN y PRODUCTIVITY, evitando la reutilización de JWT entre diferentes backends.
- **Políticas RLS**: ❌ No se han encontrado definiciones de `CREATE POLICY` en el repositorio local. Esto sugiere que las políticas se gestionan directamente en el Dashboard de Supabase.
    - **Riesgo**: Falta de control de versiones sobre la seguridad de los datos. Si no hay políticas activas, la base de datos es vulnerable a accesos no autorizados mediante la `anon_key`.

### 3. Frontend (SAST)
- **Inyección XSS**:
    - Se detectó uso de `dangerouslySetInnerHTML` en `ShippingLabel.tsx`, `Roadmap.tsx` y `chart.tsx`.
    - **Evaluación**: Riesgo medio/bajo ya que se usa para inyectar CSS estático o configuraciones controladas. Sin embargo, no hay santificación activa de las entradas que alimentan estos estilos.

---

## Plan de Hardening (Propuesta)

1. **Actualización de Core**: Update inmediato de `react-router-dom` para mitigar el vector de ataque XSS.
2. **Auditoría de RLS Directa**: Se requiere que el usuario exporte las políticas actuales de Supabase para su revisión y versionado.
3. **Saneamiento de Entradas**: Implementar `dompurify` en los componentes que generen etiquetas o documentos PDF/HTML dinámicos.
4. **Variables de Entorno**: ✅ El archivo `.env.example` es correcto y no expone secretos.

---

## Conclusión
El sistema es robusto en su arquitectura de red y manejo de sesiones, pero cojea en el mantenimiento de dependencias de terceros. La actualización de React Router es la prioridad #1.
