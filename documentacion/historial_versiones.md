# Historial de Versiones — Suite MISE (Apps Script)
**Suite Atelier · La Crêpe Parisienne · Grupo MYT**

Este documento recopila el versionamiento técnico y operativo del sistema de inventarios y pedidos diarios.

---

## 🚀 Versión 1.2.0 (Actual) — Sincronización Transaccional & Robustez en Bodega
*Fecha de liberación: 21 de Julio de 2026*

### ⚙️ Bodega (BDG) — Control de Carga y Edición
* **Solución de Timeout en onEdit (#27)**: Refactorización completa de la lógica de inyección de productos a **Batch 2D**. Se eliminó la escritura iterativa en bucle por días y sucursales en los Kardex, reduciendo el tiempo de ejecución en red de 25 segundos a menos de 1.5 segundos.
* **State-Locking Preventivo**: Modificación del trigger `onEdit` para desmarcar inmediatamente a `FALSE` los checkboxes confirmadores en `"➕ AGREGAR_MÚLTIPLES"` (celda `J3`) y `"✏️ EDITAR_PRODUCTOS"` (celda `I3`) antes de comenzar el procesamiento pesado, evitando ejecuciones duplicadas encoladas en caso de interrupción.
* **Manejo de Errores Robustecido**: Implementación de bloques `try-catch-finally` con alertas informativas en pantalla y toques visuales en rojo en caso de fallo, garantizando la liberación segura de los recursos (`lock.releaseLock()`) y la consistencia del catálogo para reintentos sin riesgos.
* **Limpiador Automático de Duplicados**: Incorporación de la función `eliminarDuplicadosCatalogo` al menú de `⚙️ Mise`. Identifica de forma inteligente registros redundantes en `MAESTRO` comparando Categoría + Nombre + Presentación, los elimina de forma atómica en todas las bases (Kardex e Historiales) y re-estructura el catálogo secuencialmente.
* **Protecciones Anti-Dummies (MAESTRO)**: Bloqueo de celdas nativas de Sheets en `MAESTRO` para evitar la edición accidental de columnas críticas y fórmulas de stock. Únicamente se permite la edición directa del usuario en las columnas de selección y límites de stock (`MÍN/MÁX`).
* **Contraseña en Setup**: Bloqueo de seguridad por contraseña (`LCP-ADMIN-2026`) en el restablecimiento destructivo del catálogo principal.

## 🌌 v1.3.7 Altair (Fix de Desfasamiento VLOOKUP en STOCK_BA y STOCK_BM) — 2026-08-02

### 🏬 Bodega (BDG)
* **Fix de Búsqueda de Stock (`STOCK_BA`)**: Al eliminar la Columna B (`ID_FAMILIA`), el nombre de producto en `MAESTRO` pasó de la Columna D (4) a la Columna C (3). La fórmula VLOOKUP en `STOCK_BA` buscaba `D6` en `KARDEX_BA!C:AD`, arrojando `#N/A` porque el nombre ahora vive en `C6`. Se corrigió para evaluar la letra exacta de la columna de producto (`C6`).
* **Sincronización Total de Índices**: Se actualizaron todos los punteros estáticos a arreglos de `data[i]` en `_ordenarYRenumerarTodo()` para usar las variables dinámicas de `map["CATEGORÍA"]`, `map["PRODUCTO"]`, `map["PRESENTACION"]` y `map["UNIDAD"]`.

## 🌌 v1.3.6 Altair (Dinamización de Carga y Edición Masiva en Bodega) — 2026-08-02

### 🏬 Bodega (BDG)
* **Dinamización de Carga Masiva (`procesarCargaMasiva`)**: Se actualizó el procesador en lote de `➕ AGREGAR_MÚLTIPLES` para escribir dinámicamente en las 13 columnas de `MAESTRO` usando `_getMaestroHeaderMap`, eliminando referencias hardcodeadas a `ID_FAMILIA`.
* **Dinamización de Edición Masiva (`crearHojaEdicionMasiva` & `procesarEdicionMasiva`)**: Se dinamizó la lectura y actualización en lote de `✏️ EDITAR_PRODUCTOS` utilizando el mapeo dinámico de encabezados.

## 🌌 v1.3.5 Altair (Mapeo Dinámico por Encabezados & Migración No-Destructiva) — 2026-08-01

### 🏬 Bodega (BDG)
* **Arquitectura Zero Hardcoded (`Header-Based Dynamic Mapping`)**: Se implementó `_getMaestroHeaderMap(sheet)` y `_colToLetter(col)`. El script inspecciona la Fila 3 en tiempo de ejecución para ubicar cada campo por su nombre (`"PRODUCTO"`, `"MÍN_BA"`, `"MÁX_BA"`, `"ACTIVO"`, `"SELECCIONAR"`). El código es 100% inmune a futuros cambios de posición de columnas.
* **Migración In-Situ No Destructiva de 14 a 13 Columnas**: Se creó `migrarEstructuraMaestro13Cols()`. Detecta si el catálogo en producción conserva la columna legacy `ID_FAMILIA` y la elimina atómicamente (`deleteColumn(2)`), **preservando el 100% de los productos, configuraciones MÍN/MÁX y saldos de la tienda**.
* **Dinamización Atómica de Kardex y Vistas**: Se actualizaron `_aplicarReglasMaestro()`, `_poblarKardex()`, `_buildVista()`, `_ordenarYRenumerarTodo()` y `protegerMaestroSeguro()`. Las fórmulas de semáforo y desprotección de celdas se construyen con letras y rangos calculados dinámicamente.

## 🌌 v1.3.4 Altair (Nomenclatura Oficial de Generaciones Estelares) — 2026-08-01

### 📱 Pedidos (PDA & PDM) y 🏬 Bodega (BDG)
* **Estándar Minimalista de Épocas (`Epoch System`)**: Se formalizó la hoja de ruta de generaciones mediante nombres de constelaciones únicas por cada versión `MAJOR`:
  - **Generación 1.x.x**: **Altair** *(Velocidad, Agilidad & Optimización Sub-segundo)*
  - **Generación 2.x.x**: **Atlas** *(Soporte Estructural, Robustez & Arquitectura)*
  - **Generación 3.x.x**: **Aethel** *(Sofisticación & Refinamiento Crystal)*
  - **Generación 4.x.x**: **Antares** *(Potencia Máxima & Ecosistema Multi-región)*
* **Visualización en Pantalla**: Diálogos `acercaDe()` actualizados a **`Mise — v1.3.4 Altair`**.

## 🚀 v1.3.3-FIX (Fix a Tabla de Resumen en Surtido Rápido) — 2026-08-01

### 📱 Pedidos (PDA & PDM)
* **Fix a Error `#ERROR!` en Resumen de Surtido Rápido**: Se separó la inyección de las etiquetas de texto de la Columna I (`setValues`) de las fórmulas de conteo de la Columna J (`setFormulas`). Esto evita que Google Sheets interprete los emojis y textos `✅ Completos`, `⚠️ Incompletos`, `❌ Inexistentes` y `🚨 Adiciones` como fórmulas no válidas.

## 🚀 v1.3.2-PERF (Estructuración de Menú & Purga de Latencia en Bodega BDG) — 2026-08-01

### 🏬 Bodega (BDG)
* **Reorganización Estructurada del Menú (`onOpen`)**: Se agruparon las 12 opciones dispersas en sub-menús limpios (`🛠️ Gestión de Productos` y `📊 Mantenimiento de Vistas`), dejando la raíz del menú enfocada en las operaciones semanales cotidianas.
* **Purga de Latencia en Red**: Se eliminaron las pausas innecesarias `SpreadsheetApp.flush()` en `_configurarSemana()` y `_protegerMaestroInterno()`, acelerando la asignación de permisos y fechas a milisegundos.

## 🚀 v1.3.1-PERF (Optimizaciones de Surtido Rápido & Menú Limpio) — 2026-08-01

### 📱 Pedidos (PDA & PDM)
* **Generación Instantánea de Surtido Rápido**: Se refactorizó la tabla de resumen (`RESUMEN SURTIDO` en Col I:J) en `_generarSurtidoRapidoInternal` para estampar los conteos en lote con una sola llamada `.setFormulas()`, acelerando la generación a **<0.5 segundos**.
* **Menú Operativo Protegido**: Se reorganizó `onOpen` creando la sección `🧪 Herramientas de Prueba` e introduciendo `🎲 Generar datos de prueba` en un sub-menú para prevenir ejecuciones accidentales por parte de los gerentes en producción.
* **Purga de Latencia Residual**: Se eliminó la llamada `SpreadsheetApp.flush()` restante en `_setupSync()`.

## 🚀 v1.3.0-PERF (Optimizaciones de Latencia, Dinamización & SemVer) — 2026-08-01

### 📱 Pedidos (PDA & PDM) y 🏬 Bodega (BDG) — Arquitectura & Staging
* **Dinamización Total de Entornos (`BODEGA_KEY` y `BODEGA_NOMBRE`)**: Se desacoplaron las claves fijas en favor de lecturas dinámicas desde `ScriptProperties` (`BODEGA_KEY` / `BODEGA_NOMBRE`). Duplicar scripts o crear tiendas nuevas ya no requiere editar el código `.gs`.
* **Depuración de Constantes Heredadas**: Se eliminaron las constantes inactivas de prototipos antiguos `SHEET_MOVIL` y `SHEET_LOG`, garantizando cero código muerto y máxima claridad en la arquitectura.
* **Eliminación Total de Hojas Temporales (`__temp__`)**: Se purgó por completo la rutina legacy que creaba y eliminaba la pestaña `__temp__` durante la reconstrucción del sistema en `BDG`, `PDA` y `PDM`. La pantalla ya no muestra pestañas parpadeantes y la ejecución es limpia e in-situ.
* **Fix a Error `#NAME?` en Encabezados**: Se separó la inyección de la Fila 1 (fórmula de banner en C1 con `setFormula`) de la Fila 3 (encabezados de columnas con `setValues`). Esto evita que Google Sheets interprete textos planos como `"PRODUCTO"` o `"CATEGORÍA"` como nombres de intervalos o fórmulas no válidas.
* **Optimización de Rendimiento en Bodega (`miseAuthBDG.gs`)**: Se aplicó la misma arquitectura de velocidad a `setupCompleto()` en Bodega, eliminando la creación/destrucción pesada de hojas temporales `__temp__`, protegiendo la pestaña `🗒 LOG` y purgando las pausas de `SpreadsheetApp.flush()`.
* **Purga de Latencia en Red (Eliminación de `flush` innecesarios)**: Se auditaron y eliminaron las llamadas redundantes a `SpreadsheetApp.flush()` en `sincronizarEstados()` y `repararSistemaTienda()`, eliminando los tiempos muertos de espera síncrona en los servidores de Google y haciendo que la sincronización responda de forma instantánea.
* **Optimización Ultra-Rápida Single Batch 2D**: Se refactorizó `setupCompleto()` y `_buildPedidoDiario()` para realizar la inyección de encabezados, banners, botones táctiles y fórmulas en un único bloque bidimensional (`setFormulas` en lote). Se eliminaron llamadas redundantes a `deleteSheet()` y `SpreadsheetApp.flush()`, reduciendo el tiempo de reconstrucción del sistema de 12 segundos a **<1.5 segundos**.
* **Protección de `_LOGS` en Setup Completo**: Se actualizó `systemSheetNames` en `setupCompleto()` para proteger la pestaña `_LOGS`. El historial de auditoría y registros de errores ya no se borra al restablecer destructivamente el sistema.
* **Sistema de Auditoría de Logs en Hoja Oculta (`_LOGS`)**: Se implementó una rutina silenciosa `registrarLog(accion, estado, detalle)` que registra en una pestaña oculta (`_LOGS`) cada ejecución del usuario (Reset, Surtido Rápido, Sincronización, Reparación) capturando fecha/hora, correo del ejecutor y mensajes de error en tiempo de ejecución (`try-catch`), con auto-limpieza al superar 500 filas para garantizar un lienzo 100% limpio en móviles.
* **Preservación de Infraestructura en Setup Completo**: Se corrigió `setupCompleto()` para que al purgar propiedades de la sesión no destruya las configuraciones de entorno (`BODEGA_URL_BA`, `BODEGA_URL_BM` y `ADMIN_PASSWORD`). La reconexión con Bodega y la contraseña permanecen intactas tras un restablecimiento completo.
* **Desacoplamiento Total de Entornos (`ScriptProperties`)**: Se eliminaron los fallbacks de URLs de producción pegados en código (`hardcoded`). Las URLs de conexión con Bodega (`BODEGA_URL_BA`/`BODEGA_URL_BM`) y la contraseña de administrador (`ADMIN_PASSWORD`) ahora dependen 100% de las Propiedades del Script de Google Apps Script. Esto permite clonar libros de trabajo para Staging o Pruebas (`[DEV]`) sin riesgo de alterar o escribir accidentalmente en las hojas de Producción.
* **Solución a Bug GH#26 (Surtido Rápido & Adiciones Fantasma)**:
  * **Reset Destructivo de Surtido Rápido**: Al reiniciar el pedido diario (`_resetearPedidoSilencioso`), la pestaña `🚚 SURTIDO RÁPIDO` ahora se elimina físicamente del libro (`ss.deleteSheet`) para erradicar cualquier residuo de formato o regla de formato condicional previa.
  * **Saneamiento del Estado Vacío**: Cuando no hay productos pedidos (`filtered.length === 0`), se limpian explícitamente las reglas condicionales y los fondos estáticos en Surtido Rápido, evitando que la hoja se pinte de amarillo sin productos.
  * **Reinicio de Banderas de Adición**: Se asegura la desactivación de las banderas `IS_ORDER_SORTED` e `IS_SURTIDO_ACTIVE` a `"false"`, impidiendo que los productos de un nuevo pedido se marquen falsamente como `🚨 ADICIÓN`.
* **Reconstrucción Limpia con Resguardo de Datos**: La función `repararSistemaTienda` fue potenciada para respaldar en memoria las cantidades capturadas por el usuario (`CANT. A PEDIR` y `RECIBIDA`), ejecutar una reconstrucción limpia completa de la pestaña (`_buildPedidoDiario`) destruyendo cualquier formato o color fantasma corrupto, re-inyectar las fórmulas desde Bodega y restaurar las cantidades capturadas del usuario.
* **Protección de Regla de Inactivos (Filas Grises)**: Envolviendo la búsqueda `VLOOKUP` con `IFERROR(..., "")` en la regla condicional de productos inactivos. Esto elimina los falsos positivos que pintaban filas activas de color gris por lentitud de carga de red o errores de referencia.
* **Corrección de Fórmulas Corruptas (#ERROR!)**: Se solucionó la sobreescritura accidental de fórmulas de producto y categoría en `PEDIDO DIARIO`. La función `repararSistemaTienda` ahora reconstruye automáticamente los punteros dinámicos hacia `_SYNC_BA` y `_SYNC_BM` (reestableciendo productos faltantes como los de la categoría JARCERÍA).
* **Protecciones Anti-Dummies (PDA & PDM)**: Se implementó la función `_protegerPedidoDiario`. Toda la pestaña `📋 PEDIDO DIARIO` queda completamente blindada y bloqueada contra ediciones directas o arrastres accidentales, dejando como únicos campos editables la celda `F` (**CANT. A PEDIR**) y los botones táctiles de la fila 2.
* **Fusión de Soluciones y Paridad de PRs**:
  * **Reset Diario Resiliente**: Integración de triggers de restablecimiento de pedido compatibles con dispositivos móviles y botones táctiles optimizados para reset/sincronización.
  * **Corrección de Historial Desalineado**: Solución del desfasamiento de columnas al utilizar la herramienta "Avanzar Semana" para trasladar inventarios.
  * **Emoji de Reset Móvil**: Estandarización de botones interactivos con el emoji de basurero (`🗑`) en la celda `B2` y su checkbox ejecutor silencioso en `C2`.
  * **Reparación No Destructiva**: Creación de la función `repararSistemaTienda` para restaurar formatos condicionales, visibilidad de inactivos y conexión sin borrar datos activos en tránsito.
  * **Contraseña en Setup**: Bloqueo de seguridad por contraseña (`LCP-ADMIN-2026`) en el restablecimiento destructivo de las hojas de las tiendas.

---

## 🚀 Versión 1.1.5 — Mejoras Visuales, Reubicación de Surtido y Actualización de Sucursales
*Fecha de liberación: 25 de Junio de 2026*

### 📱 Pedidos (PDA & PDM)
* **Reubicación de Surtido Rápido**: El checkbox para abrir la vista móvil de surtido fue movido de las columnas colapsadas a la zona visible en la celda `E2` (junto al emoji `🚚` en `D2`) para facilitar su uso a los pickers.
* **Alineación de Checkboxes**: Ajuste de triggers en `onEdit` para apuntar de forma estable a las celdas `J3` y `I3` en móviles.
* **Identidad Limpia**: Remoción de prefijos técnicos `"B-"` en las sucursales, unificándolas a `"Andares"` y `"Mercado"`.
* **Desactivación de Ordenamiento Manual**: Depreciación del menú de ordenación manual del pedido para simplificar el flujo diario.

### ⚙️ Bodega (BDG)
* **Escalamiento Dinámico del Formato Condicional**: Integración automática de `_aplicarFormatosCondicionalesMaestro` tras el proceso de ordenación en caliente. Ahora, las filas nuevas del catálogo más allá de la 134 conservan la colorimetría de selección y semáforos de stock.
* **Ordenación por Prioridad de Marca**: Modificación de `data.sort` para ordenar las categorías de acuerdo al orden de precedencia de la marca (**REFRIGERADOS** primero) en lugar de orden alfabético estándar.
* **Toasts Progresivos**: Añadidos mensajes emergentes indicando el inicio y fin de las funciones críticas (`agregarProducto`, `anularProducto`, `eliminarSeleccionadosMaestro`).

---

## 🚀 Versión 1.1.0 — Estabilidad de IMPORTRANGE & Fórmulas en Inglés
*Fecha de liberación: 3 de Junio de 2026*

* **Persistencia del Surtido**: Corrección de bug que eliminaba checkmarks y datos de cantidades recibidas en la hoja móvil de Surtido Rápido al reordenar la lista principal.
* **Estandarización de Idioma**: Estandarización total de fórmulas de ordenación y lógica al idioma **inglés con comas (`,`)** como separador de parámetros para evitar errores `#ERROR!` causados por la regionalización.
* **Recreación de Vistas**: Modificada la recreación de vistas móviles en bodega para reutilizar hojas existentes en lugar de eliminarlas y recrearlas, previniendo desconexiones aleatorias de `IMPORTRANGE` (`#REF!`).
* ** try-catch en onOpen**: Implementación de capturas de error silenciosas para evitar interrupciones de permisos en usuarios con rol de lectura.
