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

### 📱 Pedidos (PDA & PDM) — Operación Resiliente
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
