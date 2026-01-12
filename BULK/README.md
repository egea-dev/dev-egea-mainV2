# 📦 BULK - Archivos Archivados

Esta carpeta contiene archivos obsoletos, backups y código legacy que se mantienen por referencia histórica pero que ya no se utilizan en el proyecto activo.

## 📁 Estructura

### `old-pages/`
Páginas TSX obsoletas o de prueba que ya no se utilizan.

**Archivos**:
- `WorkdayPage.backup.tsx` - Backup de WorkdayPage
- `WorkdayPageTest.tsx` - Versión de prueba de WorkdayPage

### `old-components/`
Componentes obsoletos o de prueba.

**Archivos**:
- `DualConnectionTest.tsx` - Componente de prueba de conexión dual

### `old-migrations/`
Migraciones SQL antiguas que han sido consolidadas en los scripts finales.

**Estado**: Pendiente de mover las 103 migraciones antiguas aquí.

### `old-project/`
Proyecto antiguo `Productivity-cortinas-Supabase` completo.

**Contenido**: 37 archivos del proyecto anterior.

### `backups/`
Backups de configuración y datos.

### `config-archive/`
Archivos de configuración antiguos.

### `docs-archive/`
Documentación antigua o obsoleta.

### `sql-archive/`
Scripts SQL antiguos (67 archivos).

### `temp-files/`
Archivos temporales y referencias.

---

## ⚠️ Importante

> [!WARNING]
> **NO ELIMINAR ESTA CARPETA**
> 
> Los archivos en BULK se mantienen por:
> - Referencia histórica
> - Posible recuperación de código
> - Auditoría y trazabilidad
> - Backup de seguridad

---

## 🔄 Próximos Pasos

- [ ] Mover 103 migraciones SQL antiguas a `old-migrations/`
- [ ] Consolidar completamente `Productivity-cortinas-Supabase/` en `old-project/`
- [ ] Limpiar duplicados en `sql-archive/`
- [ ] Revisar y limpiar `temp-files/`

---

**Última actualización**: 12 de enero de 2026  
**Total de archivos archivados**: ~130+ archivos
