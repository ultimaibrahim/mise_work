# PRD Detallado (Product Requirements Document)
**Suite MISE v1.0 (Lanzamiento Oficial) — Atelier · La Crêpe Parisienne**

---

## 1. Propósito General del Sistema
La suite **MISE v1.0** (que consolida y reemplaza la serie de prototipos de prueba v0.5.3) es un ecosistema operativo diseñado para digitalizar y automatizar por completo el flujo de inventario, control de stock y el ciclo diario de abastecimiento de las sucursales de La Crêpe Parisienne (Andares y Mercado). 

Antes de MISE, no existía ningún sistema ni control estructurado: las solicitudes se hacían en papeles mojados o a través de mensajes de WhatsApp que se traspapelaban, provocando errores al surtir e incertidumbre sobre las existencias reales. MISE elimina por completo estas fricciones operativas eliminando los errores de dedo al levantar pedidos, ordenando automáticamente los insumos según el recorrido de la bodega física, y asegurando tiempos de respuesta instantáneos sin trabar las computadoras o tablets del personal.

---

## 2. Arquitectura de Datos y Componentes
El sistema se compone de tres libros independientes de Google Sheets interconectados:
1. **Bodegas (BDG):** El libro maestro que reside en el servidor o cuenta de bodega. Controla el catálogo unificado, las entradas/salidas diarias de insumos y los saldos reales de stock.
2. **Pedidos Andares (PDA):** Libro operativo de la sucursal Andares para realizar pedidos diarios.
3. **Pedidos Mercado (PDM):** Libro operativo de la sucursal Mercado para realizar pedidos diarios.

```
                  ┌──────────────────────────────┐
                  │          [Bodegas]           │
                  │   - MAESTRO (Catálogo)       │
                  │   - KARDEX_BA / KARDEX_BM    │
                  │   - VISTA_MOVIL_BA / _BM     │
                  └──────────────┬───────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼ (IMPORTRANGE en tiempo real)  ▼
      ┌────────────────────┐          ┌────────────────────┐
      │ [Pedidos Andares]  │          │ [Pedidos Mercado]  │
      │   - _SYNC_BA       │          │   - _SYNC_BM       │
      │   - PEDIDO DIARIO  │          │   - PEDIDO DIARIO  │
      └────────────────────┘          └────────────────────┘
```

### Hojas Internas y Estructura en Bodega (`Bodegas`):
* **`MAESTRO`:** Registro maestro del catálogo de insumos. Columnas:
  * `No`: Identificador único y correlativo incremental.
  * `ID_FAMILIA`: Código de categoría e insumo (ej: `REF-001`, `FYV-002`).
  * `CATEGORÍA`: Nombre descriptivo de la categoría.
  * `PRODUCTO`: Nombre legible.
  * `PRESENTACION`: Detalle del empaque (ej: `BOL 500 g`).
  * `UNIDAD`: Medida operativa (`kg`, `lt`, `pza`, etc.).
  * `ACTIVO`: Control de estado (`SÍ` o `NO`).
  * `MÍN_BA` / `MÁX_BA` / `STOCK_BA`: Niveles de control de stock y saldos actuales de Andares.
  * `MÍN_BM` / `MÁX_BM` / `STOCK_BM`: Niveles de control de stock y saldos actuales de Mercado.
  * `SELECCIONAR`: Casilla de verificación para acciones en lote.
* **`KARDEX_BA` y `KARDEX_BM`:** Hojas de movimientos semanales. El bodeguero captura Entradas (`ENT`) y Salidas (`SAL`) para cada día de la semana. Los saldos se calculan automáticamente (`SLD = Saldo Anterior + ENT - SAL`). Poseen semáforos dinámicos de caducidad por fórmula vinculados a la fecha de vencimiento ingresada en el lote.
* **`VISTA_MOVIL_BA` y `VISTA_MOVIL_BM`:** Pestañas de solo lectura optimizadas. Contienen el consolidado de datos requeridos por las sucursales, incluyendo el saldo actual y el estado de activación. Es la fuente origen del `IMPORTRANGE` hacia los libros de pedidos.
* **`CADUCIDADES`:** Consolidado dinámico que muestra las fechas de vencimiento de lotes en ambas bodegas y calcula automáticamente qué sucursal posee el lote de vencimiento más cercano mediante fórmulas lógicas.

### Hojas Internas y Estructura en Pedidos (`Pedidos Andares` / `Pedidos Mercado`):
* **`📋 PEDIDO DIARIO`:** Interfaz principal para el supervisor y el bodeguero surtidor. Columnas:
  * `No` (Columna A): Valor estático (conserva el orden absoluto del catálogo, oculta).
  * `CATEGORÍA` (Columna B): Prefijo de traducción para ordenamiento.
  * `PRODUCTO` (Columna C) / `UNIDAD` (Columna D) / `SALDO TEÓRICO` (Columna E): Cargados dinámicamente desde la hoja de sincronización.
  * `CANT. A PEDIR` (Columna F): Celda editable (supervisor ingresa lo necesario).
  * `DIFERENCIA` (Columna G): Fórmula automática (`Recibido - Pedido`).
  * `CANT. RECIBIDA` (Columna H, oculta): Celda editable (bodeguero captura al entregar).
  * `ESTADO` (Columna I, oculta): Fórmula dinámica que calcula el estatus (`✅ COMPLETO`, `⚠️ PARCIAL`, `⏳ PENDIENTE` o `🚫 INACTIVO`).
  * `ALERTAS SURTIDO` (Columna J, oculta): Columna inteligente para alertar si falta stock o si es una adición fuera de horario (`🚨 ADICIÓN`).
* **`_SYNC_BA` / `_SYNC_BM`:** Hoja oculta que importa en bruto la información de la bodega mediante la fórmula `=IMPORTRANGE()`. Es el puente de datos desacoplado.

---

## 3. Especificaciones Técnicas y Optimizaciones Clave

### A. Algoritmo de Sincronización e Inserción Dinámica de Productos Nuevos
Cuando se agrega un producto en Bodega, la sincronización se activa automáticamente o de forma manual.
1. Se recupera el total de filas que devuelve `_SYNC` (el origen de bodega).
2. Se compara con la cantidad de filas que existen físicamente en `📋 PEDIDO DIARIO`.
3. Si la bodega tiene más productos, se calcula la diferencia (`diff = syncCount - currentCount`).
4. Se realiza una inserción de filas físicas en bloque en `📋 PEDIDO DIARIO` utilizando `insertRowsAfter`.
5. Se inyectan en bloque las fórmulas de enlace relativas a la hoja `_SYNC` en las nuevas filas. Las filas nuevas se colorean de morado claro (`#E8EAF6`) para notificar la presencia de nuevos insumos.

### B. Mecanismo de Fuerza Bruta para Caché del `IMPORTRANGE`
Google Sheets cachea las respuestas de `IMPORTRANGE` durante un lapso de entre 5 y 30 minutos. Para saltar esta restricción y actualizar los datos en tiempo real al instante de surtir:
* El script recupera la fórmula original de la celda `A4` de la hoja de sincronización.
* Borra el contenido de la celda.
* Ejecuta un `SpreadsheetApp.flush()` para forzar el vaciado en caliente del motor de Sheets.
* Vuelve a escribir la fórmula de `IMPORTRANGE`.
* Vuelve a ejecutar `SpreadsheetApp.flush()`.
Esto obliga a Google a descargar inmediatamente los datos frescos del servidor remoto.

### C. Algoritmo de Ocultamiento de Productos Desactivados
Para evitar corromper los enlaces de fila o desfasar las cantidades ingresadas por el supervisor al cambiar de posición un producto:
* Los productos inactivos no se eliminan físicamente; se mantienen en la hoja de sincronización.
* Se implementa `_actualizarVisibilidadInactivos(sheet)`.
* El script muestra todo el rango de productos con `sheet.showRows()`.
* Lee en bloque la columna 9 (Estado).
* Recorre la columna en memoria y agrupa las filas consecutivas cuyo valor evaluado sea `"🚫 INACTIVO"`.
* Oculta de golpe las filas inactivas por rangos agrupados mediante `sheet.hideRows(start, count)`.
* Esto deja ocultos los insumos descontinuados de forma nativa e invisible para los operarios.

### D. Ordenamiento Multicriterio Dinámico
La función `ordenarPedido()` agrupa y organiza el pedido de la siguiente manera:
1. Agrupa por **Categoría** de insumo de forma alfabética (ej. todos los Refrigerados juntos, luego Lácteos, etc.).
2. Dentro de cada categoría, los **Productos Activos** se priorizan en la parte superior.
3. Dentro de los activos, se priorizan los **Productos Solicitados** (`Cantidad Pedida > 0`) descendente.
4. Los **Productos Inactivos** se relegan automáticamente a la parte inferior de cada categoría y se ocultan físicamente.

---

## 4. Arquitectura de Optimización: Operaciones Batch 2D
En Google Apps Script, interactuar individualmente con las celdas de Sheets (`setValue`, `setBackground`, etc.) consume muchos recursos de red. Cada llamada genera una solicitud HTTP que toma entre 50ms y 150ms.
Si editamos 100 productos de manera individual, esto representa 800 llamadas (~80 segundos de ejecución), provocando el bloqueo del script (Timeout).

El sistema se rediseñó para operar bajo la arquitectura **Batch 2D**:
1. **Paso 1:** Se lee toda la información del catálogo o del Kardex en una sola llamada usando `getValues()`, lo que crea una matriz bidimensional `[][]` en memoria RAM.
2. **Paso 2:** El procesamiento, validaciones y edición de los campos se ejecuta directamente sobre la matriz en memoria mediante ciclos rápidos (`for`). Esto toma **menos de 1 milisegundo**.
3. **Paso 3:** Se escribe la matriz modificada completa de golpe de regreso a la hoja usando `setValues(data)`.
*Esto reduce las llamadas de más de 800 peticiones individuales a exactamente 1 escritura rápida por hoja modificada.*

---

## 5. Indicadores Visuales de Formato Condicional (Identidad Premium)

| Estado | Significado | Estilo Visual | Fórmula / Activador |
| :--- | :--- | :--- | :--- |
| **🚨 ADICIÓN** | Insumo pedido de última hora tras ordenar el pedido | Fondo Naranja Brillante (`#FFD54F`) | `=$J4="🚨 ADICIÓN"` |
| **🚫 INACTIVO** | Insumo desactivado del catálogo en Bodega | Fondo Gris (`#EEEEEE`) + Texto Gris (`#9E9E9E`) en cursiva | `=$I4="🚫 INACTIVO"` |
| **✅ COMPLETO** | Cantidad Recibida es igual o mayor a la Pedida | Fondo Verde Institucional (`#B9F6CA`) | `=$I4="✅ COMPLETO"` |
| **⚠️ PARCIAL** | Cantidad Recibida es menor a la Pedida pero mayor a 0 | Fondo Naranja Pastel (`#FFE0B2`) | `=$I4="⚠️ PARCIAL"` |
| **⏳ PENDIENTE** | Insumo solicitado pero aún sin registrar recepción | Fondo Amarillo Claro (`#FFFDE7`) | `=$I4="⏳ PENDIENTE"` |
