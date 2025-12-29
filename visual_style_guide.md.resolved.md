Guía de Estilo Visual (Design System)
Esta guía documenta los tokens de diseño y patrones visuales utilizados en la aplicación actual "Industrial CRM". El estilo se basa en una interfaz oscura (Dark UI) con alto contraste, construida principalmente con Tailwind CSS y valores arbitrarios específicos.

🎨 Paleta de Colores
Fondos (Backgrounds)
Token / Valor	Uso
bg-[#323438]	Superficie Principal: Tarjetas, contenedores de módulos, fondos de sección.
bg-[#1A1D1F]	Superficie Secundaria: Inputs, elementos de lista, filas de tablas, estados inactivos.
bg-[#0F1113]	Fondo Profundo: Elementos anidados, áreas de datos densos.
Bordes (Borders)
Token / Valor	Uso
border-[#45474A]	Borde Estándar: Separadores, bordes de tarjetas, inputs.
border-[#6E6F71]	Borde Activo/Focus: Inputs al hacer foco, elementos interactivos secundarios.
Texto (Typography)
Token / Valor	Uso
text-[#FFFFFF]	Títulos y Enfasis: Cabeceras, datos numéricos importantes, valores clave.
text-[#B5B8BA]	Cuerpo Principal: Texto de lectura, datos secundarios, descripciones.
text-[#8B8D90]	Texto Muted/Labels: Etiquetas de campos, metadatos, iconos inactivos.
text-[#6E6F71]	Texto Placeholder: Placeholders de inputs, "empty states".
Colores Semánticos (Status)
Mantienen una lógica de semáforo con variantes pastel/neón para modo oscuro.

🟢 Éxito / Pagado / Completado:
Base: #14CC7F (o emerald-500)
Fondo: bg-[#14CC7F]/10 o bg-emerald-900/20
Texto: text-[#14CC7F] o text-emerald-400
🔵 Informativo / Pte. Envío:
Base: indigo-500 (o blue-500)
Fondo: bg-indigo-500/10
Texto: text-indigo-400
🟠 Advertencia / En Proceso:
Base: amber-500
Fondo: bg-amber-500/10
Texto: text-amber-400
🔴 Error / Urgente / Cancelado:
Base: red-500
Fondo: bg-red-500/10
Texto: text-red-400
🧩 Componentes Base
1. Tarjetas (Cards / Containers)
El bloque constructivo principal de la interfaz.

.card {
  @apply bg-[#323438] rounded-2xl border border-[#45474A] shadow-lg;
}
/* Padding interior estándar: p-4 o p-6 */
2. Botones de Acción (Primary)
Botones principales (ej. "Nuevo Pedido", "Guardar").

.btn-primary {
  @apply bg-[#14CC7F] text-white rounded-xl shadow-lg hover:bg-[#11A366] transition-all hover:scale-105 active:scale-95;
}
3. Inputs de Formulario
Estilo de campos de texto y búsqueda.

.input-dark {
  @apply bg-[#1A1D1F] border border-[#45474A] rounded-lg text-white outline-none focus:ring-2 focus:ring-[#14CC7F];
}
/* Placeholder color: placeholder-[#6E6F71] */
4. Badges / Etiquetas de Estado
Píldoras para mostrar estados de pedidos.

.badge {
  @apply px-2.5 py-0.5 rounded-full text-xs font-semibold border;
}
/* Ejemplo Pagado: bg-[#14CC7F]/20 text-[#14CC7F] border-[#14CC7F]/40 */
5. Tipografía y Estructura
Fuente: Sans-serif estándar del sistema (ui-sans-serif, system-ui).
Títulos de Módulo: text-3xl font-bold text-[#FFFFFF] tracking-tight.
Subtítulos: text-[#8B8D90].
📐 Layout y Espaciado
Border Radius Global: rounded-xl (12px) para tarjetas internas, rounded-2xl (16px) para contenedores principales.
Gap Estándar: gap-4 (16px) o gap-6 (24px) entre módulos mayores.
Sombras: Uso sutil de shadow-lg en contenedores flotantes o principales para dar profundidad sobre el fondo oscuro.
💡 Iconografía
Se utiliza la librería Lucide React.

Tamaño estándar inline: w-4 h-4 o w-5 h-5.
Color por defecto: text-[#8B8D90] (inactivo) o coincidente con el color semántico (activo).