# AGENTS.md · Reglas y Conocimiento del Proyecto (Mise Work)

## 📌 Identidad y Alcance
Este repositorio (`mise_work`) corresponde a la suite de automatización de tiendas y bodegas de **La Crêpe Parisienne (Mise - Grupo MYT)** basada en Google Apps Script, HTML Dialogs y Hojas de Cálculo (BDG, PDA, PDM).

---

## 🛠️ Estructura del Repositorio y Scripts

```
mise_work/
├── scripts/
│   ├── miseAuthBDG.gs       # Core del backend Bodega General (BDG)
│   ├── miseAuthPDA.gs       # Backend Tienda Andares (PDA)
│   ├── miseAuthPDM.gs       # Backend Tienda Mercado (PDM)
│   └── PickingDialog.html   # Modal HTML desacoplado (Quiosco / Picking Powerhouse)
├── AGENTS.md                # Este archivo (Reglas automáticas de Antigravity)
└── README.md                # Documentación del proyecto
```

---

## 📐 Reglas de Arquitectura e Invariantes del Código

### 1. Sistema de Sincronización y Hojas (`_SYNC`)
- **Rango de Importación**: Todas las funciones de sincronización (`_setupSync()`, `repararSistemaTienda()`, `IMPORTRANGE`) DEBEN usar strictly el rango **`A4:L`** (12 columnas).
- **Columna L (`PICKING_BA` / `PICKING_BM`)**: Almacena el ranking custom de picking por bodega. Nunca debe ser cortada por un `A4:K`.

### 2. Constructor de Picking (`PickingDialog.html`)
- **Dimensiones del Dialog**: `setWidth(1050).setHeight(700)`.
- **Diseño Visual**: Estética *Crystal Squircle* con badges de posición oscuros (`#1`, `#2`), sin flechas nativas feas del navegador (`appearance: none`).
- **Navegación e Innovación**:
  - Salto directo tipeando número de posición.
  - Multi-drag en bloque atómico con SortableJS.
  - Vistas alternables: `📄 Lista Plana` y `📁 Por Categorías`.
  - Botones un-clic `🔝 Top` y `🔻 Bot`.
  - Preferencia de Zoom/Densidad (`100%`, `115%`, `130%`) persistida en `localStorage` bajo clave `mise_picking_zoom`.
### 3. Filosofía Mobile-First y Limitaciones de la App Móvil Nativa
- **Mobile-First Estricto (PDA / PDM)**: Las hojas de tienda están diseñadas para ser consumidas el 90%+ del tiempo desde teléfonos celulares.
- **Incompatibilidad del Motor Móvil de Google Sheets**: La app nativa de Google Sheets en iOS y Android **NO soporta ni ejecuta**:
  - `SpreadsheetApp.toast()` (notificaciones emergentes).
  - Menús personalizados creados por `onOpen()` (`ui.createMenu()`).
  - Diálogos HTML/Modales nativos (`Ui.alert()`, `showModalDialog()`).
- **Arquitectura de Interacción en Móvil**: Toda acción en tienda debe ser **100% transparente o activada por casillas físicas (checkboxes) en celdas visibles de la hoja**, sin depender jamás de menús o toasts de escritorio.

---

## 🔒 Protocolo de Aprobación de Versionamiento y Commits

1. **Parches y Hotfixes Iterativos**:
   - `x.x.1a`, `x.x.1b`: Usar sufijos de letra para pruebas locales.
   - **Queda estrictamente prohibido hacer `git commit` o `git push` a GitHub** sin confirmación explícita previa de Ibrahim.
2. **Funciones en Apps Script**:
   - Todo cambio en scripts `.gs` debe pasar por `check_syntax_all.js` para asegurar 0 errores de sintaxis antes de reportar completado.
3. **Compatibilidad con Google Sheets**:
   - Fórmulas inyectadas vía Apps Script (`.setFormula()`) siempre en **Inglés** y con parámetros separados por **comas (`,`)**.
4. **Preservación Inamovible de Changelogs Históricos**:
   - Queda estrictamente prohibido ultra-simplificar, resumir o borrar versiones/changelogs pasados en cualquier archivo markdown de documentación (`historial_versiones.md`, `CHANGELOG.md`, etc.). Toda la historia técnica y operativa debe conservarse intacta e incremental independientemente del tamaño del archivo.
5. **Doble Versionado Obligatorio (Técnico vs. Público/User-Friendly)**:
   - Al registrar cualquier actualización o incremento de versión, es **OBLIGATORIO mantener e incrementar dos changelogs paralelos**:
     - **Changelog Técnico Tradicional** (`CHANGELOG.md` / `about.js` / `historial_versiones.md`): Con jerga técnica completa, funciones, arquitectura, parámetros y variables.
     - **Changelog Público / Operativo** (`CHANGELOG_PUBLIC.md` / Trello Cards): Redactado en formato **Beneficio Operativo (User-Friendly)** libre de jerga de código (sin `onEdit`, `ScriptProperties`, `IMPORTRANGE`, `try-catch`, etc.), enfocado en el valor directo para tiendas, gerencias y dirección.

---

## 🎨 Identidad Visual y UI
- **Colores Primarios de Marca**:
  - Dark: `#3D5A47` (Verde Corporativo)
  - Accent: `#2E5D4B` / `#7A9E8A` (Sage)
  - Surface: `#FFFFFF` / BG: `#F5EFE6`
- **Componentes**: Bordes suaves (`border-radius: 10px - 14px`), tipografía moderna y micro-animaciones fluidas.
