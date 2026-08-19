# 📋 Roadmap Estratégico Semanal & Deuda Técnica
**La Crêpe Parisienne · Suite Mise & Étoile (Reseñas)**
*Semana del 17 al 23 de Agosto de 2026 · Ibrahim García*

---

## 🎯 Resumen Ejecutivo

Esta semana consolidaremos la estabilidad y el rendimiento de los dos pilares tecnológicos de la marca:
1. **Suite Mise (Bodegas y Pedidos Móviles)**: Transicionar de fórmulas volátiles en cascada hacia **cálculo puro en memoria (V8)** para resolver definitivamente el guardado pesado sin bloqueos de Apps Script.
2. **Étoile (Dashboard de Reseñas)**: Avanzar hacia la Época 4 (**Iklil**), mejorando la analítica semántica de reseñas, filtros de sucursales en tiempo real y velocidad de carga.

---

## 🏬 1. Suite MISE (Operaciones y Cadena de Suministro)

### 🔬 Auditoría y Diagnóstico de Deuda Técnica
* **Causa Raíz del Rendimiento en Bodega**:
  - `MAESTRO` y los `KARDEX` tienen más de **4,800 fórmulas individuales** (`VLOOKUP` anidados y `CHOOSE`). Cuando Apps Script modifica una celda, Google Sheets detiene la ejecución para evaluar miles de fórmulas, tardando >50s y generando deadlocks de cerrojos (`Lock Contention`).
* **Estado Actual**:
  - Restaurada la arquitectura monolítica transaccional y robusta (`v1.7.3 Altair`), garantizando que los datos lleguen intactos a `MAESTRO`, `KARDEX_BA`, `KARDEX_BM`, `VISTA_BA`, `VISTA_BM`, `PDA` y `PDM`.

### 🎫 Tickets Propuestos para la Semana (Mise)

| Ticket ID | Módulo | Título y Alcance | Prioridad | Impacto |
| :--- | :--- | :--- | :--- | :--- |
| **`MISE-101`** | **BDG Core** | **Calculadora de Stock en Memoria (V8 Memory Engine)**<br>Reemplazar los 600 `VLOOKUP` por strings y cálculos calculados directamente en JavaScript antes de escribir. Reduce el guardado a <3s de forma definitiva. | 🔴 Alta | ⚡ 90% más rápido |
| **`MISE-102`** | **Tiendas PDA/PDM** | **Normalización Tipográfica de Pedidos Diarios**<br>Blindar el formato visual (fuente, bordes, alineación) en la hoja `📋 PEDIDO DIARIO` de tiendas para evitar desajustes al insertar nuevos ítems. | 🟡 Media | 🎨 Estética visual |
| **`MISE-103`** | **Powerhouse UI** | **Buscador Rápido y Filtro por Categorías en Diálogo**<br>Añadir un input de búsqueda interactivo en la pestaña de edición y picking para filtrar insumos en tiempo real mientras se tipea. | 🟢 Baja | 🧑‍💻 UX Gerencial |
| **`MISE-104`** | **Sincronización** | **Webhook Endpoint en Tiendas (`doPost`)**<br>Permitir que Bodega notifique a Tiendas por HTTP (`UrlFetchApp.fetch`) en lugar de `SpreadsheetApp.openById`, reduciendo la latencia de push a 1s. | 🟡 Media | ⚡ Desacoplamiento |

---

## ⭐ 2. Étoile (Dashboard de Reseñas Google)

### 🔬 Auditoría y Diagnóstico Técnico
* **Estado de la Suite**:
  - Implementación Crystal Squircle con paleta verde corporativo (`#3D5A47`), dark mode nativo y soporte para fallback local (`public/data/YYYY/MM.json`).
* **Oportunidades de Mejora**:
  - Optimizar el bundle en React + TypeScript (`ts-reviews-lcp`) y enriquecer la experiencia móvil en 375px.
  - Implementar la Época 4 (**Iklil**): predicción de calificación, alertas tempranas de inconformidades y análisis de sentimientos de clientes por sucursal.

### 🎫 Tickets Propuestos para la Semana (Étoile)

| Ticket ID | Módulo | Título y Alcance | Prioridad | Impacto |
| :--- | :--- | :--- | :--- | :--- |
| **`ETOILE-201`** | **Analytics (Iklil)** | **Clasificador Semántico de Sentimientos por Sucursal**<br>Categorizar menciones clave (Servicio, Tiempo, Calidad, Sabor, Precio) y mostrar badges automáticos en cada card de reseña. | 🔴 Alta | 🧠 Inteligencia de Negocio |
| **`ETOILE-202`** | **UI / Mobile** | **Bottom Sheet de Filtros Rápidos en Móvil**<br>Rediseñar los filtros de mes y sucursal en pantallas menores a 400px usando un drawer táctil fluido inferior. | 🟡 Media | 📱 Mobile-First |
| **`ETOILE-203`** | **Data Engine** | **Caché IndexedDB / LocalStorage para Reseñas**<br>Persistir datos mensuales cargados para transiciones instantáneas entre meses sin re-descargas. | 🟢 Baja | ⚡ Carga instantánea |
| **`ETOILE-204`** | **Executive View** | **Tarjeta de Resumen Semanal para Dirección**<br>Módulo superior que muestra: *Sucursal con mayor crecimiento*, *Ticket promedio de calificación* y *Alertas de 1 estrella*. | 🟡 Media | 📊 Visión Ejecutiva |

---

## 🗓️ Calendario de Trabajo Sugerido

```
  Lunes 17       Martes 18       Miércoles 19     Jueves 20      Viernes 21
┌──────────────┬───────────────┬────────────────┬──────────────┬──────────────┐
│ MISE-101     │ MISE-102      │ ETOILE-201     │ ETOILE-202   │ ETOILE-204   │
│ (Motor V8 en │ (Ajuste Formato│ (Semántica     │ (Bottom Sheet│ (Executive   │
│ Memoria BDG) │ PDA / PDM)    │ Iklil Reseñas) │ Móvil)       │ Cards)       │
└──────────────┴───────────────┴────────────────┴──────────────┴──────────────┘
```

> [!NOTE]
> Todo el código de **Suite Mise** ha quedado **100% restaurado y validado sintácticamente** con Node VM (0 errores). Cuando regreses, podemos iniciar directamente con cualquiera de los tickets del roadmap.
