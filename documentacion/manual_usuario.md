# Manual de Usuario Operativo
**Suite MISE v1.0 (Lanzamiento Oficial) — Atelier · La Crêpe Parisienne**
*(Sustituye a la serie de prototipos de prueba v0.5.3)*

---

## 1. Manual para el Supervisor (Hojas de Pedidos: Pedidos Andares / Pedidos Mercado)

### Paso 1: Conectar / Inicializar el libro (Solo la primera vez)
1. Abre tu hoja de **Pedidos Andares** o **Pedidos Mercado** correspondiente a tu tienda.
2. En el menú superior de tu Google Sheets, busca la pestaña **⚙️ Mise**.
3. Haz clic en **🚀 Setup completo**. (Esto eliminará hojas temporales y creará la estructura limpia del pedido diario).
4. Si sale la advertencia `⚠️ CONECTAR BDG` en la celda J4, ve al menú **⚙️ Mise** → **🔗 Configurar conexión** y pega el enlace completo de la hoja de cálculo de Bodega.

### Paso 2: Generar y Levantar el Pedido Diario
1. Asegúrate de que las cantidades de la columna **CANT. A PEDIR (Columna F)** estén vacías al iniciar el día. Si no lo están, marca la casilla **Resetear** en la fila 2 (Celda F2).
2. Recorre tu tienda. En la columna **CANT. A PEDIR (F)** escribe la cantidad de insumos que necesitas. Al ingresar un número, la fila se pintará automáticamente de amarillo claro (`⏳ PENDIENTE`).
3. Una vez ingresadas todas tus cantidades, marca la casilla **Ordenar** en la fila 2 (Celda D2). Tu pedido se organizará automáticamente agrupando todos los insumos por su categoría de almacenamiento (los de refrigerados juntos, desechables juntos, etc.), y los productos pedidos aparecerán arriba de cada categoría.
4. Listo, la Bodega ahora puede visualizar tu pedido de forma remota.

### Paso 3: Sincronizar y Recibir el Pedido (Cuando el Surtidor entrega)
1. Cuando el bodeguero llegue con la entrega, él ingresará los datos en **CANT. RECIBIDA (Columna G)**.
2. Si recibes la cantidad exacta solicitada, la fila se pintará de **verde**. Si recibes menos o nada, se pintará de **naranja claro**.
3. Si olvidaste pedir un producto y lo necesitas de última hora, escríbelo en la lista. Al haber ordenado el pedido previamente, el sistema detectará esta inserción tardía y pintará la fila entera de **Naranja Brillante** con la etiqueta `🚨 ADICIÓN` para avisar de inmediato a Bodega.
4. Al final de la entrega, presiona la casilla **Sincronizar** (Celda H2) para actualizar la visibilidad de insumos desactivados y refrescar los saldos.

---

## 2. Manual para el Administrador de Bodega y Picker (Bodega: BDG)

### Paso 1: Configurar la Semana de Inventario (Cada Lunes)
1. Abre tu hoja de **Bodegas**.
2. Ve a la pestaña de tu Kardex correspondiente (ej: `KARDEX_BA`).
3. En la celda `D4`, ingresa el lunes correspondiente al inicio de semana. (O usa la casilla **Avanzar Sem.** en la celda `K4` para calcularlo automáticamente y enviar el histórico de inventario a las hojas de `HISTORIAL`).

### Paso 2: Desactivar / Activar Productos por Lote
1. Abre la pestaña **MAESTRO**.
2. En la columna **SELECCIONAR (Columna I)**, marca las casillas de los productos que deseas desactivar o activar. Al marcar una casilla, la fila entera se pintará de azul claro (`#E3F2FD`) para confirmar la selección.
3. Dirígete a la parte superior congelada (Fila 2):
   * Para desactivar (dar de baja): Marca el checkbox de **Desactivar** (Celda D2). Esto pondrá "NO" en la columna ACTIVO y ocultará de inmediato las filas correspondientes en los Kardex de Andares y Mercado.
   * Para activar: Marca el checkbox de **Activar** (Celda F2).
   * Para desmarcar las casillas sin aplicar cambios: Marca **Limpiar Sel.** (Celda H2).

### Paso 3: Uso del Editor Masivo de Productos (`✏️ EDITAR_PRODUCTOS`)
Si necesitas cambiar nombres, unidades, familias o stocks mínimos/máximos de varios productos a la vez:
1. En **MAESTRO**, selecciona los productos a editar marcando su casilla en la columna **SELECCIONAR (Columna I)**.
2. Ve al menú superior **⚙️ Mise** → **📝 Editar productos seleccionados**.
3. El script creará una pestaña temporal llamada **✏️ EDITAR_PRODUCTOS** y vaciará allí los datos de los productos elegidos.
4. Modifica libremente los textos (Nombres, Presentación, Mín/Máx).
   * *Nota:* La primera columna (No) está protegida y no debes editarla ya que sirve de índice.
5. Cuando termines, marca la casilla **Confirmar Edición** (Celda E3).
6. El sistema actualizará de golpe y de forma instantánea el catálogo maestro, los registros diarios de Kardex de ambas bodegas y las hojas de historiales. Finalmente, borrará la hoja temporal.

### Paso 4: Carga Masiva de Nuevos Productos (`➕ AGREGAR_MÚLTIPLES`)
Para dar de alta de 5 a 50 productos nuevos de golpe:
1. Ve al menú superior **⚙️ Mise** → **➕ Carga masiva de productos**.
2. Se creará una hoja temporal llamada **➕ AGREGAR_MÚLTIPLES**.
3. Llena la información de los productos en las columnas correspondientes (Producto, Presentación, Unidad y opcionalmente Familia). Usa el dropdown de unidades en la columna E.
4. Marca la casilla **Confirmar Carga** (Celda E3). El sistema registrará consecutivamente los nuevos productos en todas las bases del libro (Maestro, Kardex e Historiales) asignándoles números consecutivos, y eliminará la hoja temporal automáticamente.
