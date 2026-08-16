# 📦 Changelog Público y Operativo — Suite MISE
**La Crêpe Parisienne · Grupo MYT**

Este documento contiene el historial de actualizaciones de Suite MISE redactado en **lenguaje operativo y de beneficio directo para tiendas y gerencias**, libre de jerga técnica.

---

## Versión 1.6.5 Altair - Suite Unificada Powerhouse de Catálogo y Picking (Agosto 2026) [ACTUAL]
* ⚡ **Centro de Mando Powerhouse**: Nueva ventana integral para administrar todos los insumos de bodega en un solo lugar.
  * 🖐️ **Secuencia de Picking**: Reordena rutas de surtido por arrastre o número directo.
  * ➕ **Alta en Lote Sin Hojas Temporales**: Agrega insumos nuevos al catálogo directamente desde una tabla dinámica sin crear pestañas extras que ensucien el archivo.
  * 📝 **Edición Rápida en Caliente**: Modifica nombres, unidades y límites de stock (mínimos y máximos por tienda) de forma inmediata.
  * 🧹 **Detector de Duplicados**: Identifica productos repetidos al instante para mantener un catálogo limpio y confiable.
* 🧪 **Herramientas Experimentales**: Reorganización de menús para separar las funciones operativas de las herramientas de prueba.

---

## Versión 1.6.4 Altair - Descuento Ultrarrápido de Hoy y Auto-Acomodo de Picking Remoto (Agosto 2026)
* 🚚 **Descuento de Inventario Instantáneo**: El proceso de surtido y descuento de mercancía ahora procesa exclusivamente el día en curso en menos de 1 segundo, asegurando que entregas múltiples del mismo producto se sumen de forma íntegra y evitando alterar días pasados.
* 🖐️ **Reacomodo de Picking 100% Automático en Tiendas**: Al modificar y guardar el orden de picking desde la ventana de bodega, la lista de pedidos en las tiendas (Andares y Mercado) se reordena físicamente al instante, manteniendo sus colores y formatos intactos sin necesidad de que el personal de tienda ejecute ninguna acción manual.

---

## Versión 1.6.2 Altair - Auto-Avance Semanal Silencioso y Modal PC (Agosto 2026)
* ⚡ **Registro Rápido desde PC**: Ventana modal (`Ctrl + Shift + F` o desde el menú `⚡ Registro rápido`) con buscador autocomplete instantáneo para capturar Entradas (+) y Salidas (-) sin hacer scroll por 130+ filas.
* 📅 **Auto-Avance de Semana**: El sistema detecta automáticamente los lunes y avanza la semana operativa transprimiendo los saldos y archivando los consumos sin ventanas emergentes.
* 🟢 **Badge de Estado**: Indicador visual en tiempo real en la cabecera del inventario (`🟢 SEMANA XX ACTUALIZADA`).

---

## Versión 1.5.0 Altair - Quiosco de Picking & Categorías Dinámicas (Agosto 2026)
* 🛡️ **Restauración de Sistema**: Se restauró la versión 1.5.0 estable original del código de Bodega para asegurar la operabilidad 100% libre de errores.

---

## Versión 1.6.3c Altair Hotfix - Corrección en Diagnóstico de Inventario (Agosto 2026)
* 🛠️ **Diagnóstico Definitivo Sin Interrupciones**: Corrección en la reordenación del inventario para procesar la lista sin colisionar con las columnas de caducidad eliminadas.

---

## Versión 1.6.3b Altair Hotfix - Permisividad Global de Categorías (Agosto 2026)
* 🛠️ **Diagnóstico y Carga Masiva Sin Interrupciones**: Homologación en el sistema para permitir cualquier nombre de categoría personalizada en diagnósticos, ediciones masivas y alta de productos.

---

## Versión 1.6.3a Altair Hotfix - Estabilidad en Diagnóstico de Inventario (Agosto 2026)
* 🩺 **Diagnóstico Sin Errores**: Corrección en la herramienta de autorreparación para validar correctamente categorías personalizadas sin mostrar pantallas de interrupción.

---

## Versión 1.6.3 Altair - Eliminación Definitiva de Columnas Obsoletas (Agosto 2026)
* 🧹 **Diseño de Inventario Más Limpio y Compacto**: Eliminación física permanente de las columnas de Caducidad y Lote en las hojas de inventario de Bodega (`KARDEX`), permitiendo que el semáforo visual de stock quede pegado inmediatamente al nombre y unidad del producto sin huecos horizontales.

---

## Versión 1.6.2b Altair Hotfix - Restauración de Cuadrícula en Bodega (Agosto 2026)
* 📐 **Restauración Visual de Cuadrícula**: Se forzó la des-ocultación automática de las columnas F y G en las hojas de inventario al abrir la hoja (`onOpen`), eliminando el corte extraño de bordes en el KARDEX.

---

## Versión 1.6.2a Altair Hotfix - Corrección Visual de Badge e Inserción Automática (Agosto 2026)
* 🟢 **Corrección del Badge de Estado**: Ajuste visual en la Fila 2 para desplegar de forma inmediata el estado de la semana activa (`SEMANA ACTUALIZADA`) sin depender del botón de mantenimiento manual.
* ⚡ **Ejecución al Abrir**: El estado de la semana se verifica e inyecta automáticamente al abrir el archivo (`onOpen`).

---

## Versión 1.6.2 Altair - Auto-Avance Semanal y Captura Rápida en PC (Agosto 2026)
* ⚡ **Registro Rápido de Inventario en PC**: Nueva ventana emergente interactiva para buscar productos rápidamente por sus primeras letras (ej. "nut...") e ingresar entradas y salidas del día con un solo Enter, evitando hacer scroll manual por la lista de bodega.
* 📅 **Avance Semanal Automático**: Al iniciar un nuevo período el Lunes por la mañana, el sistema traslada automáticamente los saldos finales de domingo a iniciales, respalda el historial de movimientos y prepara la semana sin solicitar fechas o datos manuales.
* 🟢 **Indicador Visual de Estado Semanal**: Badge informativo en la parte superior del inventario que confirma el estado de la semana (`SEMANA ACTUALIZADA` vs `PENDIENTE DE CIERRE`).
* ⚡ **Sincronización en 1 Clic**: Nueva función consolidada en el menú principal para actualizar la fecha activa en ambas bodegas (Andares y Mercado) simultáneamente con un solo clic.

---

## Versión 1.6.1 Altair - Rendimiento y Optimización Mobile-First (Agosto 2026)
* 🚀 **Captura de Pedidos Más Rápida**: Se eliminaron procesos secundarios al tipear, logrando una experiencia más fluida en dispositivos móviles.
* 🔄 **Reconexión Automática Transparente**: El sistema detecta y repara automáticamente cualquier interrupción de enlace entre Tienda y Bodega en segundo plano, sin mostrar mensajes ni interrumpir tu trabajo.
* 🛡️ **Protección en Surtido Rápido**: Se añadió un mecanismo de respaldo para garantizar que tus datos se guarden de forma segura y el sistema se recupere automáticamente ante cualquier caída de señal.

---

## Versión 1.6.0 Altair - Quiosco de Picking y Sincronización Remota (Agosto 2026)
* 📋 **Organizador Visual de Recorrido (Quiosco)**: Nueva herramienta interactiva en Bodega para ordenar visualmente el recorrido físico de surtido mediante arrastrar y soltar, vistas por categorías y niveles de zoom ajustables.
* 🏷️ **Gestión de Categorías Globales**: Capacidad para crear, renombrar y reorganizar categorías de productos desde Bodega con actualización inmediata para todas las tiendas.
* 📦 **Control de Stock de Quiosco**: Vinculación de límites mínimos y máximos de inventario para reflejar automáticamente los parámetros operativos en los libros de las sucursales.
* ⚡ **Sincronización Remota Automática**: Al guardar el orden en Bodega, las hojas móviles de las tiendas reordenan automáticamente sus listas en tiempo real.

---

## Versión 1.4.0 Altair - Secuencia de Recorrido Dinámica (Agosto 2026)
* 📍 **Recorrido Personalizado por Tienda**: Integración de la secuencia de picking para organizar los productos respetando el trayecto físico de cada establecimiento.

---

## Versión 1.3.8 Altair - Motor Autorreparador y Navegación (Agosto 2026)
* 🛠️ **Diagnóstico y Reparación Un clic**: Herramienta de auto-diagnóstico en Bodega que detecta y corrige automáticamente errores en celdas o fórmulas sin afectar los datos capturados.
* 🗂️ **Menú de Administración Reorganizado**: Nueva distribución del menú principal agrupada por tipo de operación para facilitar la navegación.

---

## Versión 1.3.0 - Versión 1.3.7 Altair - Optimización de Velocidad y Datos (Agosto 2026)
* ⚡ **Velocidad y Respuesta**: Procesamiento optimizado de pedidos masivos en bloque para evitar demoras al abrir y guardar archivos de tienda.
* 🔒 **Seguridad y Respaldo de Información**: Protección de celdas con fórmulas clave y respaldo automático de cantidades ante reconstrucciones de hoja.
