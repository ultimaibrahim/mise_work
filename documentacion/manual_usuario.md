# Manual de Usuario Operativo — Suite MISE v5.4.1
**Suite Atelier · La Crêpe Parisienne**
*(Sustituye a todas las versiones anteriores de la serie de pruebas v0.5.x y v1.0)*

---

## 1. Manual para el Supervisor (Hojas de Pedidos: Pedidos Andares / Pedidos Mercado)

### Paso 1: Conectar / Inicializar el libro (Solo la primera vez)
1. Abre tu hoja de **Pedidos Andares** o **Pedidos Mercado** correspondiente a tu tienda.
2. En el menú superior de tu Google Sheets, busca la pestaña **⚙️ Mise**.
3. Haz clic en **🚀 Setup completo**. (Esto creará la estructura limpia del pedido diario, inyectando formatos condicionales y fórmulas base).
4. Si sale la advertencia `⚠️ CONECTAR BDG` en la celda J4, ve al menú **⚙️ Mise** → **🔗 Configurar conexión con Bodega** y pega el enlace completo de la hoja de cálculo de Bodega.

### Paso 2: Generar y Levantar el Pedido Diario
1. Asegúrate de que las cantidades de la columna **CANT. A PEDIR (Columna F)** estén vacías al iniciar el día. Si no lo están, puedes usar la opción **Resetear** (se autolimpia por la noche).
2. **Filtrado por Categorías (Mobile-First):** La columna B ("CATEGORÍA") está visible y cuenta con un filtro automático nativo de Google Sheets. Puedes presionar el icono de filtro en la celda B3 para aislar una sola categoría (ej. refrigerados, lácteos, abarrotes) y rellenar tu pedido por secciones de forma organizada en tu móvil o PC.
3. Ingresa las cantidades en la columna **CANT. A PEDIR (F)**. Admite hasta **4 decimales** (ej. `1.125`) para evitar cualquier redondeo y asegurar la máxima precisión.
4. Una vez ingresadas todas las cantidades, marca la casilla **⚙️ Ordenar** en la fila 2 (Celda D2). Tu pedido se organizará automáticamente agrupando todos los insumos por su categoría de almacenamiento y subirá los productos pedidos al principio de cada grupo.
5. **Simulación de Prueba:** Si deseas realizar pruebas rápidas del flujo, puedes ir al menú **⚙️ Mise** → **🎲 Generar datos de prueba**. Esto rellenará de manera aleatoria cantidades (enteras y con decimales) y estados de recibo para varios productos del catálogo.

### Paso 3: Sincronización y Vista de Surtido Rápido
1. Para comenzar el surtido o la recepción móvil de mercancía, marca la casilla **🚚 Surtido** en la fila 2 (Celda L2). Esto abrirá o generará automáticamente la pestaña `"🚚 SURTIDO RÁPIDO"`.
2. **Características de la Vista de Surtido Rápido:**
   - **Columnas Ocultas:** Se ocultan las columnas de control A (No) y B (Categoría) para dar una vista despejada.
   - **Inmovilización del Producto:** La columna de **PRODUCTO** (Columna C) está congelada. Al desplazarte horizontalmente hacia la derecha en la app de Sheets de tu móvil, la descripción del insumo permanecerá fija en pantalla, permitiendo registrar las entradas sin perder de vista qué estás surtiendo.
   - **Fórmulas y Dashboard (Tiempo Real):** En las columnas I y J, dispones de una tarjeta de resumen que cuenta automáticamente los productos de la lista en tiempo real:
     - **✅ Completos:** Checkbox marcado en la columna F.
     - **⚠️ Incompletos:** Cantidad recibida mayor a 0 pero menor a la pedida (y checkboxes desmarcados).
     - **❌ Inexistentes:** Checkbox marcado en la columna G.
     - **🚨 Adiciones:** Productos agregados de último minuto marcados con alerta.
   - **Coloreado Dinámico de Filas:** La fila entera de cada insumo cambia automáticamente de color en tiempo real al marcar su estado: Verde para completos, Rojo para inexistentes, Naranja claro para entregas parciales y Naranja brillante para adiciones pendientes.
   - **Detección de Adiciones Tárdiás (`🚨 ADICIÓN`):** Si agregas un producto al pedido diario después de ordenar la lista o de haber generado la vista de surtido rápido, el sistema lo marcará en automático en naranja brillante con la leyenda `🚨 ADICIÓN` para alertar inmediatamente al surtidor de bodega.
   - **Override del Estado:** Si un producto marcado como adición es finalmente surtido o marcado con algún estado en la entrega, su fondo naranja se sobrescribe y cambia al color del estado final (verde o naranja-amarillo suave) indicando que ya fue resuelto.

---

## 2. Manual para el Administrador de Bodega y Picker (Bodega: BDG)

### Paso 1: Cargar Inventarios con Soporte de 4 Decimales
1. Abre tu hoja de **Bodegas**.
2. En las pestañas de **KARDEX**, registra las entradas y salidas de producto. La base de datos y la exportación a históricos de consumo soportan **hasta 4 decimales** (formato `"0.####"`), permitiendo introducir valores de peso exactos como `1,125 kg` de fruta sin que el sistema los redondee a `1,13 kg`.

### Paso 2: Desactivar / Activar Productos por Lote
1. Abre la pestaña **MAESTRO**.
2. En la columna **SELECCIONAR (Columna J)**, marca las casillas de los productos que deseas desactivar o activar. Al marcar una casilla, la fila entera se pintará de azul claro para confirmar la selección.
3. Dirígete a la parte superior congelada (Fila 2):
   - **Desactivar:** Marca el checkbox de **Desactivar** (Celda D2). Esto pondrá "NO" en la columna ACTIVO y los ocultará de inmediato en los Kardex e Hojas de Pedidos.
   - **Activar:** Marca el checkbox de **Activar** (Celda F2).
   - **Eliminar:** Marca el checkbox de **Eliminar Sel.** (Celda H2) para borrarlos definitivamente de todas las bases e históricos.
   - **Limpiar Selección:** Marca **Limpiar Sel.** (Celda J2).

### Paso 3: Altas y Ediciones Automatizadas con Ordenamiento
1. Utiliza el editor masivo (**⚙️ Mise** → **📝 Editar productos seleccionados**) o la carga masiva (**⚙️ Mise** → **➕ Carga masiva de productos**).
2. Al confirmar la carga o edición masiva, el sistema ordenará automáticamente por categoría (de la 1 a la 7) y alfabéticamente por nombre de producto de forma instantánea, manteniendo el catálogo indexado, re-numerado y limpio.
