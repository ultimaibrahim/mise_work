/**
 * MISE — Pedidos Andares Script v1.1 (Lanzamiento Oficial)
 * Suite Atelier · La Crêpe Parisienne · Grupo MYT
 * (Reemplaza a los prototipos de la serie v0.5.0)
 *
 * INSTALAR EN: Pedidos Andares (Google Sheets de B-Andares)
 * 
 * CAMBIOS v1.0 (Derivado del prototipo v0.5.0):
 * 1. Reset automático por día nuevo en onOpen (limpia cantidades y estados).
 * 2. Reset de pedido vía checkbox en fila 2 (C2) — sin ui.alert(), 100% móvil.
 * 3. Inserción de columna J "ALERTAS SURTIDO" y aviso de conexión en J4.
 * 4. Categorización automática y ordenamiento in-situ agrupando por Categoría (B)
 *    con ítems activos prioritarios al principio de cada grupo.
 * 5. Sincronización robusta que añade productos nuevos al final con fondo morado.
 * 6. Detección de adiciones de última hora pintando la fila de naranja brillante (#FFD54F)
 *    mediante regla condicional ligada a "🚨 ADICIÓN" en Col J, autolimpiable al ordenar.
 *    La alerta se dispara SI Y SOLO SI el pedido ya fue ordenado previamente (flag IS_ORDER_SORTED).
 * 7. Botones de fila 2 alineados a partir de Columna C (visible) para evitar
 *    que se oculten cuando las columnas A y B están colapsadas.
 * 8. Autoconexión por defecto mediante URL de Bodega provista para evitar configuraciones manuales.
 * 9. FIX DE BUG DE BORRADO DE CANTIDADES Y BLOQUEO DE COLOR AMARILLO.
 */

// ── BODEGA ──────────────────────────────────────────────────────────────────
const BODEGA_KEY    = "BA";
const BODEGA_NOMBRE = "Andares";
const VISTA_MOVIL   = "VISTA_MOVIL_BA";
const SHEET_SYNC    = "_SYNC_BA";

// ── CONSTANTES ──────────────────────────────────────────────────────────────
const SHEET_PEDIDO   = "📋 PEDIDO DIARIO";
const SHEET_MOVIL    = "📊 VISTA_MÓVIL";
const SHEET_LOG      = "🗒 LOG";
const COL_CANT_PEDIR = 6;   // F — CANT. A PEDIR
const COL_RECIBIDA   = 8;   // H — CANT. RECIBIDA (oculta)
const COL_ESTADO     = 9;   // I — ESTADO (oculta)
const DATA_START_ROW = 4;
const NUM_COLS       = 10;

// Colores institucionales
const COLORS = {
  completo:    "#B9F6CA",
  parcial:     "#FFE0B2",
  pendiente:   "#FFFDE7",
  inexistente: "#FFCDD2", // Rojo para cuando es 0 recibido
  yellow:      "#FFFCD0",
  blue:        "#D0E8FF",
  neutral_a:   "#FAFAFA",
  neutral_b:   "#FFFFFF",
  logHeader:   "#3D5A47"
};

const ESTADO = {
  COMPLETO:  "✅ COMPLETO",
  PARCIAL:   "⚠️ PARCIAL",
  PENDIENTE: "⏳ PENDIENTE"
};

// ── MENÚ ────────────────────────────────────────────────────────────────────
function onOpen() {
  try {
    _checkAutoResetNuevoDia();
  } catch(e) {}
  try {
    _actualizarAvisoPedido();
  } catch(e) {}
  try {
    SpreadsheetApp.getUi()
      .createMenu("⚙️ Mise")
      .addItem("🚀 Setup completo", "setupCompleto")
      .addSeparator()
      .addItem(`🔗 Configurar conexión con ${BODEGA_NOMBRE}`, "configurarBodega")
      .addSeparator()
      .addItem("🚚 Surtido Rápido (móvil)",                "generarSurtidoRapido")
      .addSeparator()
      .addItem("🎲 Generar datos de prueba",               "generarDatosPrueba")
      .addSeparator()
      .addItem("ℹ️ Acerca de Mise",                        "acercaDe")
      .addToUi();
  } catch(e) {}
}

// ── AVISO DE CONEXIÓN / POBLAR DATOS ──────────────────────────────────────────
function _actualizarAvisoPedido() {
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const pedido  = ss.getSheetByName(SHEET_PEDIDO);
  let sync      = ss.getSheetByName(SHEET_SYNC);
  if (!pedido) return;
  
  let syncActivo = sync && sync.getLastRow() > 3 &&
    sync.getRange(4, 1).getValue() !== "" &&
    String(sync.getRange(4, 1).getValue()).indexOf("#") !== 0;

  // Autoconexión inicial con la URL por defecto si no está activo
  if (!syncActivo) {
    const props = PropertiesService.getScriptProperties();
    const propKey = `BODEGA_URL_${BODEGA_KEY}`;
    let url = props.getProperty(propKey);
    if (!url) {
      url = "https://docs.google.com/spreadsheets/d/1bQR0TJUqY9jmtapblMiGY-FKCAB6xfLz535BLRgC_IY/";
      props.setProperty(propKey, url);
    }
    try {
      _setupSync(url);
      sync = ss.getSheetByName(SHEET_SYNC);
      syncActivo = sync && sync.getLastRow() > 3 &&
        sync.getRange(4, 1).getValue() !== "" &&
        String(sync.getRange(4, 1).getValue()).indexOf("#") !== 0;
    } catch(err) {}
  }

  if (!syncActivo) {
    pedido.getRange("H4")
      .setValue("⚠️ CONECTAR BDG")
      .setFontColor("#C62828")
      .setFontSize(9)
      .setHorizontalAlignment("center")
      .setFontStyle("italic");
    _aplicarAnchosColumnas(pedido);
    return;
  }

  // Limpiar advertencia en H4
  pedido.getRange("H4").clearContent();

  const count  = sync.getLastRow() - 3; 
  if (count < 1) return;
  const DR     = DATA_START_ROW;
  const sRef   = "'" + SHEET_SYNC + "'";
  
  const existente = pedido.getRange(DR, 3).getValue(); 
  if (existente !== "" && existente !== null) {
    _aplicarAnchosColumnas(pedido); 
    return;
  }

  const colA = [], colC = [], colD = [], colE = [], colG = [], colH = [], colI = [], colJ = [];
  const colB = [];
  const bgs = [];
  
  for (let i = 0; i < count; i++) {
    const r  = DR + i;
    const sr = 4 + i;
    const bg = i % 2 === 0 ? COLORS.neutral_a : COLORS.neutral_b;

    colA.push([i + 1]);
    colB.push(['=' + sRef + '!B' + sr]);
    colC.push(['=' + sRef + '!C' + sr]);
    colD.push(['=' + sRef + '!D' + sr]);
    colE.push(['=IFERROR(' + sRef + '!E' + sr + '*1, 0) & IF(AND(' + sRef + '!J' + sr + '=0, ' + sRef + '!K' + sr + '=0), "", IF(' + sRef + '!E' + sr + '<' + sRef + '!J' + sr + ', " (-" & (' + sRef + '!J' + sr + '-' + sRef + '!E' + sr + ') & ")", IF(' + sRef + '!E' + sr + '>' + sRef + '!K' + sr + ', " (+" & (' + sRef + '!E' + sr + '-' + sRef + '!K' + sr + ') & ")", " (-)")))']);
    colG.push(['=IF(F' + r + '="", "", IFERROR(VLOOKUP(C' + r + ', \'🚚 SURTIDO RÁPIDO\'!C:E, 3, FALSE), 0) - F' + r + ')']);
    colH.push([""]);
    colI.push([""]);
    colJ.push([""]);

    const rowBg = Array(NUM_COLS).fill(bg);
    rowBg[COL_CANT_PEDIR - 1] = COLORS.yellow; // Col F
    rowBg[4]                  = COLORS.blue;   // Col E
    bgs.push(rowBg);
  }

  // Escribir en bloque
  pedido.getRange(DR, 1, count, NUM_COLS).clearContent();
  pedido.getRange(DR, 1, count, NUM_COLS).setBackgrounds(bgs);

  // Escribir valores y fórmulas por columnas separadas para evitar sobreescritura accidental
  pedido.getRange(DR, 1, count, 1).setValues(colA);
  pedido.getRange(DR, 2, count, 1).setFormulas(colB);
  pedido.getRange(DR, 3, count, 1).setFormulas(colC);
  pedido.getRange(DR, 4, count, 1).setFormulas(colD);
  pedido.getRange(DR, 5, count, 1).setFormulas(colE);
  pedido.getRange(DR, 7, count, 1).setFormulas(colG);
  pedido.getRange(DR, 8, count, 1).setValues(colH);
  pedido.getRange(DR, 9, count, 1).setValues(colI);
  pedido.getRange(DR, 10, count, 1).setValues(colJ);

  pedido.getRange(DR, 1, count, NUM_COLS)
    .setFontFamily("Calibri").setFontSize(10).setVerticalAlignment("middle");
  
  pedido.getRange(DR, 1, count, 1).setHorizontalAlignment("center"); 
  pedido.getRange(DR, 3, count, 1).setHorizontalAlignment("left");   
  pedido.getRange(DR, 4, count, 1).setHorizontalAlignment("center"); 
  pedido.getRange(DR, 5, count, 1).setHorizontalAlignment("right");  
  pedido.getRange(DR, 7, count, 1).setHorizontalAlignment("center"); 
  
  _aplicarAnchosColumnas(pedido);
  _aplicarFormatosCondicionales(pedido);
  
  // Mostrar Categoría (Col B) y ocultar No (Col A) para permitir filtrado móvil
  try {
    pedido.hideColumns(1);
    pedido.showColumns(2);
    let filter = pedido.getFilter();
    if (filter) filter.remove();
    pedido.getRange(3, 2, count + 1, 6).createFilter(); // B3:G (Headers Row 3 to last product Row)
  } catch(err) {}
}

function _aplicarAnchosColumnas(sheet) {
  sheet.setColumnWidth(1, 40);   // No
  sheet.setColumnWidth(2, 115);  // CATEGORÍA
  sheet.setColumnWidth(3, 210);  // PRODUCTO
  sheet.setColumnWidth(4, 65);   // UNIDAD
  sheet.setColumnWidth(5, 110);  // SALDO TEÓRICO
  sheet.setColumnWidth(6, 110);  // CANT. A PEDIR
  sheet.setColumnWidth(7, 100);  // DIFERENCIA
  sheet.setColumnWidth(8, 120);  // H - Surtido label
  sheet.setColumnWidth(9, 60);   // I - Checkbox
  sheet.setColumnWidth(10, 40);  // J - Alerta Adición (oculto)
}

function _getProductCount() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_PEDIDO);
  if (!sheet) return 131;
  const lastRow = sheet.getLastRow();
  if (lastRow < DATA_START_ROW) return 131;
  return lastRow - DATA_START_ROW + 1;
}

function invalidarCache() {
  PropertiesService.getScriptProperties().deleteProperty("PRODUCT_COUNT");
  SpreadsheetApp.getActive().toast("Caché invalidado. Listo para recalcular.", "⚙️ Mise", 4);
}

function onEdit(e) {
  if (!e) return;
  const sheet = e.range.getSheet();
  const name  = sheet.getName();
  const row = e.range.getRow();
  const col = e.range.getColumn();

  // A. Manejo de la pestaña de Surtido Rápido
  if (name === "🚚 SURTIDO RÁPIDO") {
    if (row < 4) return;

    const cantPedir = parseFloat(sheet.getRange(row, 4).getValue()) || 0;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const pSheet = ss.getSheetByName(SHEET_PEDIDO);
    if (!pSheet) return;

    // Obtener información del renglón actual
    const prodNo = sheet.getRange(row, 1).getValue();
    const prodName = sheet.getRange(row, 3).getValue();

    // Buscar la fila correspondiente en SHEET_PEDIDO buscando por "PRODUCTO" (Col C) o "No" (Col A)
    const lrP = pSheet.getLastRow();
    const pData = pSheet.getRange(DATA_START_ROW, 1, lrP - DATA_START_ROW + 1, 3).getValues();
    let rowInPedido = -1;
    for (let i = 0; i < pData.length; i++) {
      if (pData[i][0] === prodNo || String(pData[i][2]).trim() === String(prodName).trim()) {
        rowInPedido = DATA_START_ROW + i;
        break;
      }
    }

    if (rowInPedido === -1) {
      try { ss.toast("No se encontró el producto en el pedido diario.", "❌ Error", 4); } catch(err) {}
      return;
    }

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return;

    try {
      // 2. Columna F: ✅ COMPLETO
      if (col === 6) {
        const valCheck = e.range.getValue();
        if (valCheck === true) {
          sheet.getRange(row, 7).setValue(false); // Inexistente = false
          sheet.getRange(row, 5).setValue(cantPedir); // Recibida = cantPedir
          pSheet.getRange(rowInPedido, COL_RECIBIDA).setValue(cantPedir); // Sincronizar con pedido diario
          pSheet.getRange(rowInPedido, COL_ESTADO).setValue("COMPLETO");
        } else {
          sheet.getRange(row, 5).setValue("");
          pSheet.getRange(rowInPedido, COL_RECIBIDA).setValue("");
          pSheet.getRange(rowInPedido, COL_ESTADO).setValue("");
        }
      }
      // 3. Columna G: ❌ INEXISTENTE
      else if (col === 7) {
        const valCheck = e.range.getValue();
        if (valCheck === true) {
          sheet.getRange(row, 6).setValue(false); // Completo = false
          sheet.getRange(row, 5).setValue(0); // Recibida = 0
          pSheet.getRange(rowInPedido, COL_RECIBIDA).setValue(0); // Sincronizar con pedido diario
          pSheet.getRange(rowInPedido, COL_ESTADO).setValue("INEXISTENTE");
        } else {
          sheet.getRange(row, 5).setValue("");
          pSheet.getRange(rowInPedido, COL_RECIBIDA).setValue("");
          pSheet.getRange(rowInPedido, COL_ESTADO).setValue("");
        }
      }
      // 4. Columna E: CANT. RECIBIDA (Manual)
      else if (col === 5) {
        let valInput = e.range.getValue();
        if (valInput !== "") {
          if (typeof valInput === "string") {
            const cleanVal = valInput.replace(',', '.').trim();
            const num = Number(cleanVal);
            if (!isNaN(num) && num >= 0) {
              e.range.setValue(num);
              valInput = num;
            }
          }
          const checkVal = Number(valInput);
          if (isNaN(checkVal) || checkVal < 0) {
            e.range.clearContent();
            sheet.getRange(row, 6).setValue(false);
            sheet.getRange(row, 7).setValue(false);
            pSheet.getRange(rowInPedido, COL_RECIBIDA).setValue("");
            pSheet.getRange(rowInPedido, COL_ESTADO).setValue("");
            return;
          }

          pSheet.getRange(rowInPedido, COL_RECIBIDA).setValue(checkVal);

          if (checkVal === cantPedir) {
            sheet.getRange(row, 6).setValue(true);
            sheet.getRange(row, 7).setValue(false);
            pSheet.getRange(rowInPedido, COL_ESTADO).setValue("COMPLETO");
          } else if (checkVal === 0) {
            sheet.getRange(row, 6).setValue(false);
            sheet.getRange(row, 7).setValue(true);
            pSheet.getRange(rowInPedido, COL_ESTADO).setValue("INEXISTENTE");
          } else {
            sheet.getRange(row, 6).setValue(false);
            sheet.getRange(row, 7).setValue(false);
            pSheet.getRange(rowInPedido, COL_ESTADO).setValue("PARCIAL");
          }
        } else {
          // Si borran la celda
          sheet.getRange(row, 6).setValue(false);
          sheet.getRange(row, 7).setValue(false);
          pSheet.getRange(rowInPedido, COL_RECIBIDA).setValue("");
          pSheet.getRange(rowInPedido, COL_ESTADO).setValue("");
        }
      }
    } finally {
      lock.releaseLock();
    }
    return;
  }

  // B. Manejo de la pestaña de Pedido Diario
  if (name !== SHEET_PEDIDO) return;

  // 1. Botones Interactivos Móviles (Fila 2) en columnas visibles C-G
  if (row === 2) {
    if (col === 3) { // C2 - Resetear pedido
      if (e.range.getValue() === true) {
        e.range.setValue(false);
        _resetearPedidoSilencioso();
        try { SpreadsheetApp.getActive().toast("Pedido reseteado ✓", "⚙️ Mise", 3); } catch(err) {}
      }
      return;
    }
    if (col === 5) { // E2 - Surtido Rápido
      if (e.range.getValue() === true) {
        e.range.setValue(false);
        generarSurtidoRapido();
      }
    }
    return;
  }

  if (row < DATA_START_ROW) return;

  // 2. Validaciones rápidas de entrada (F)
  if (col === COL_CANT_PEDIR) {
    let val = e.range.getValue();

    // Si la celda está vacía o es null, limpiamos la alerta de adición y terminamos
    if (val === "" || val === null || val === undefined) {
      sheet.getRange(row, 10).clearContent();
      return;
    }

    if (Object.prototype.toString.call(val) === '[object Date]') {
      e.range.clearContent();
      sheet.getRange(row, 10).clearContent();
      try { SpreadsheetApp.getActive().toast("El valor debe ser un número positivo (no se permiten fechas).", "❌ Mise", 5); } catch(err) {}
      return;
    }

    if (typeof val === "string") {
      const cleanVal = val.replace(',', '.').trim();
      const num = Number(cleanVal);
      if (!isNaN(num)) {
        e.range.setValue(num);
        val = num;
      }
    }

    const checkVal = Number(val);
    if (isNaN(checkVal) || checkVal < 0) {
      e.range.clearContent();
      sheet.getRange(row, 10).clearContent();
      try { SpreadsheetApp.getActive().toast("El valor debe ser un número positivo.", "❌ Mise", 5); } catch(err) {}
      return;
    }

    if (checkVal === 0) {
      sheet.getRange(row, 10).clearContent();
    } else {
      // checkVal > 0
      const props = PropertiesService.getScriptProperties();
      const isSorted = props.getProperty("IS_ORDER_SORTED") === "true";
      const isSurtidoActive = props.getProperty("IS_SURTIDO_ACTIVE") === "true";
      if (isSorted || isSurtidoActive) {
        sheet.getRange(row, 10).setValue("🚨 ADICIÓN"); // Columna J
      }
    }
  }

  // Si existe la pestaña de Surtido Rápido, actualizarla en segundo plano silenciosamente
  try {
    const surtido = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("🚚 SURTIDO RÁPIDO");
    if (surtido) {
      generarSurtidoRapidoSilencioso();
    }
  } catch (err) {}
}

function sincronizarEstados() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_PEDIDO);
  const sync  = ss.getSheetByName(SHEET_SYNC);
  if (!sheet || !sync) return;

  // Forzar recálculo global re-escribiendo el IMPORTRANGE para romper caché
  const formula = sync.getRange(4, 1).getFormula();
  if (formula) {
    sync.getRange(4, 1).clearContent();
    try { SpreadsheetApp.flush(); } catch(e) {}
    sync.getRange(4, 1).setFormula(formula);
    try { SpreadsheetApp.flush(); } catch(e) {}
  } else {
    const props = PropertiesService.getScriptProperties();
    const url = props.getProperty(`BODEGA_URL_${BODEGA_KEY}`);
    if (url) {
      _setupSync(url);
    }
  }

  const syncCount = Math.max(0, sync.getLastRow() - 3);
  const currentCount = _getProductCount();

  if (syncCount > currentCount) {
    const diff = syncCount - currentCount;
    const DR = DATA_START_ROW;
    const sRef = "'" + SHEET_SYNC + "'";

    // Insertar nuevas filas al final de la tabla de pedidos
    const insertStartRow = DR + currentCount;
    sheet.insertRowsAfter(insertStartRow - 1, diff);

    const highlightColor = "#E8EAF6"; // Morado claro para avisar producto nuevo
    const newFormulas = [];
    const newBgs = [];

    for (let i = 0; i < diff; i++) {
      const r = insertStartRow + i;
      const sr = 4 + currentCount + i;
      const prodNo = currentCount + i + 1;

      newFormulas.push([
        prodNo,                                       // Col A (No)
        '=' + sRef + '!B' + sr,                       // Col B (CATEGORÍA)
        '=' + sRef + '!C' + sr,                       // Col C (PRODUCTO)
        '=' + sRef + '!D' + sr,                       // Col D (UNIDAD)
        '=IFERROR(' + sRef + '!E' + sr + '*1, 0) & IF(AND(' + sRef + '!J' + sr + '=0, ' + sRef + '!K' + sr + '=0), "", IF(' + sRef + '!E' + sr + '<' + sRef + '!J' + sr + ', " (-" & (' + sRef + '!J' + sr + '-' + sRef + '!E' + sr + ') & ")", IF(' + sRef + '!E' + sr + '>' + sRef + '!K' + sr + ', " (+" & (' + sRef + '!E' + sr + '-' + sRef + '!K' + sr + ') & ")", " (-)")))', // Col E (SALDO TEÓRICO)
        "",                                           // Col F (CANT. A PEDIR)
        '=IF(F' + r + '="", "", IFERROR(VLOOKUP(C' + r + ', \'🚚 SURTIDO RÁPIDO\'!C:E, 3, FALSE), 0) - F' + r + ')', // Col G (DIFERENCIA)
        "",                                           // Col H
        "",                                           // Col I
        ""                                            // Col J (ADICIÓN)
      ]);

      const rowBg = Array(NUM_COLS).fill(highlightColor);
      rowBg[COL_CANT_PEDIR - 1] = COLORS.yellow; // Col F
      rowBg[4]                  = COLORS.blue;   // Col E
      newBgs.push(rowBg);
    }

    // Escribir en bloque
    sheet.getRange(insertStartRow, 1, diff, NUM_COLS).setFormulas(newFormulas);
    sheet.getRange(insertStartRow, 1, diff, NUM_COLS).setBackgrounds(newBgs);

    sheet.getRange(insertStartRow, 1, diff, NUM_COLS)
      .setFontFamily("Calibri").setFontSize(10).setVerticalAlignment("middle");
    sheet.getRange(insertStartRow, 1, diff, 1).setHorizontalAlignment("center");
    sheet.getRange(insertStartRow, 3, diff, 1).setHorizontalAlignment("left");
    sheet.getRange(insertStartRow, 4, diff, 1).setHorizontalAlignment("center");
    sheet.getRange(insertStartRow, 5, diff, 1).setHorizontalAlignment("right");
    sheet.getRange(insertStartRow, 7, diff, 1).setHorizontalAlignment("center");

    _aplicarFormatosCondicionales(sheet);

    // Mostrar Categoría (Col B) y ocultar No (Col A) para permitir filtrado móvil
    try {
      sheet.hideColumns(1);
      sheet.hideColumns(10);
      sheet.showColumns(2);
      let filter = sheet.getFilter();
      if (filter) filter.remove();
      sheet.getRange(3, 2, syncCount + 1, 6).createFilter(); // B to G (6 columns)
    } catch(err) {}

    // Invalidar caché local e indicar el nuevo conteo de productos
    PropertiesService.getScriptProperties().setProperty("PRODUCT_COUNT", String(syncCount));

    try {
      SpreadsheetApp.getActive().toast(`Se agregaron ${diff} nuevos productos desde Bodega ✓`, "⚙️ Sincronizar", 5);
    } catch(e) {}
  } else {
    try {
      SpreadsheetApp.getActive().toast("Sincronización de stocks completada ✓", "⚙️ Sincronizar", 3);
    } catch(e) {}
  }
  _actualizarVisibilidadInactivos(sheet);
  
  // Actualizar Surtido Rápido silenciosamente si existe
  try {
    const surtido = ss.getSheetByName("🚚 SURTIDO RÁPIDO");
    if (surtido) {
      generarSurtidoRapidoSilencioso();
    }
  } catch (err) {}
}

function ordenarPedido() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_PEDIDO);
  if (!sheet) return;

  const count  = _getProductCount();
  if (count < 1) return;
  const range  = sheet.getRange(DATA_START_ROW, 1, count, NUM_COLS);
  const values = range.getValues();

  const sync = ss.getSheetByName(SHEET_SYNC);
  const syncValues = sync ? sync.getRange(4, 3, count, 7).getValues() : [];
  const activeMap = {};
  for (let i = 0; i < syncValues.length; i++) {
    const prodName = String(syncValues[i][0]).trim();
    const activo = String(syncValues[i][6]).trim();
    activeMap[prodName] = activo;
  }

  const items = [];
  for (let i = 0; i < values.length; i++) {
    items.push({
      vals: values[i]
    });
  }

  // Ordenar por Categoría (B) ascendente, activos primero, inactivos después, y luego por pedidos (F > 0)
  items.sort((a, b) => {
    const catA = String(a.vals[1] || "").trim();
    const catB = String(b.vals[1] || "").trim();
    if (catA !== catB) {
      return catA.localeCompare(catB);
    }
    const isInactiveA = (activeMap[String(a.vals[2]).trim()] === "NO") ? 1 : 0;
    const isInactiveB = (activeMap[String(b.vals[2]).trim()] === "NO") ? 1 : 0;
    if (isInactiveA !== isInactiveB) {
      return isInactiveA - isInactiveB;
    }
    const valA = parseFloat(a.vals[5]) || 0;
    const valB = parseFloat(b.vals[5]) || 0;
    const hasA = valA > 0 ? 1 : 0;
    const hasB = valB > 0 ? 1 : 0;
    if (hasA !== hasB) {
      return hasB - hasA;
    }
    const numA = parseInt(a.vals[0]) || 0;
    const numB = parseInt(b.vals[0]) || 0;
    return numA - numB;
  });

  const bgs = [];
  const cleanFonts = [];
  const outputData = [];

  const sRef = "'" + SHEET_SYNC + "'";
  for (let i = 0; i < items.length; i++) {
    const r = DATA_START_ROW + i;
    const prodNo = parseInt(items[i].vals[0]);
    const sr = prodNo ? prodNo + 3 : (4 + i);
    
    // Generar fondos estándar
    const bgRow = i % 2 === 0 ? COLORS.neutral_a : COLORS.neutral_b;
    const rowBg = Array(NUM_COLS).fill(bgRow);
    rowBg[4] = COLORS.blue;                    // Col E
    rowBg[COL_CANT_PEDIR - 1] = COLORS.yellow; // Col F
    bgs.push(rowBg);

    // Tipografía estándar limpia
    const rowFont = Array(NUM_COLS).fill("normal");
    rowFont[COL_CANT_PEDIR - 1] = "bold";
    cleanFonts.push(rowFont);

    // Generar fórmulas y valores limpios (Col G es DIFERENCIA con VLOOKUP)
    outputData.push([
      prodNo,                                       // Col A (No)
      '=' + sRef + '!B' + sr,                       // Col B (CATEGORÍA)
      '=' + sRef + '!C' + sr,                       // Col C (PRODUCTO)
      '=' + sRef + '!D' + sr,                       // Col D (UNIDAD)
      '=IFERROR(' + sRef + '!E' + sr + '*1, 0) & IF(AND(' + sRef + '!J' + sr + '=0, ' + sRef + '!K' + sr + '=0), "", IF(' + sRef + '!E' + sr + '<' + sRef + '!J' + sr + ', " (-" & (' + sRef + '!J' + sr + '-' + sRef + '!E' + sr + ') & ")", IF(' + sRef + '!E' + sr + '>' + sRef + '!K' + sr + ', " (+" & (' + sRef + '!E' + sr + '-' + sRef + '!K' + sr + ') & ")", " (-)")))', // Col E (SALDO TEÓRICO)
      items[i].vals[5],                             // Col F (CANT. A PEDIR)
      '=IF(F' + r + '="", "", IFERROR(VLOOKUP(C' + r + ', \'🚚 SURTIDO RÁPIDO\'!C:E, 3, FALSE), 0) - F' + r + ')', // Col G (DIFERENCIA)
      items[i].vals[7] === "" ? "" : items[i].vals[7], // Col H (CANT. RECIBIDA)
      items[i].vals[8] || "",                       // Col I (ESTADO)
      items[i].vals[9] || ""                        // Col J (ADICIÓN)
    ]);
  }

  // Escribir en bloque
  range.clearContent();
  sheet.getRange(DATA_START_ROW, 1, count, NUM_COLS).setFormulas(outputData);
  range.setBackgrounds(bgs);
  range.setFontWeights(cleanFonts);

  // Formatear
  sheet.getRange(DATA_START_ROW, 1, count, NUM_COLS)
    .setFontFamily("Calibri").setFontSize(10).setVerticalAlignment("middle");
  sheet.getRange(DATA_START_ROW, 1, count, 1).setHorizontalAlignment("center");
  sheet.getRange(DATA_START_ROW, 3, count, 1).setHorizontalAlignment("left");
  sheet.getRange(DATA_START_ROW, 4, count, 1).setHorizontalAlignment("center");
  sheet.getRange(DATA_START_ROW, 5, count, 1).setHorizontalAlignment("right");
  sheet.getRange(DATA_START_ROW, 7, count, 1).setHorizontalAlignment("center");

  _aplicarFormatosCondicionales(sheet);
  _actualizarVisibilidadInactivos(sheet);
  sheet.hideColumns(10);

  PropertiesService.getScriptProperties().setProperty("IS_ORDER_SORTED", "true");
  try {
    SpreadsheetApp.getActive().toast("Pedido ordenado por categorías ✓", "⚙️ Ordenar", 3);
  } catch(e) {}

  // Actualizar Surtido Rápido silenciosamente si existe
  try {
    const surtido = ss.getSheetByName("🚚 SURTIDO RÁPIDO");
    if (surtido) {
      generarSurtidoRapidoSilencioso();
    }
  } catch (err) {}
}

function configurarBodega() {
  const ui    = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();
  const propKey = `BODEGA_URL_${BODEGA_KEY}`;
  const urlActual = props.getProperty(propKey) || "https://docs.google.com/spreadsheets/d/1bQR0TJUqY9jmtapblMiGY-FKCAB6xfLz535BLRgC_IY/";
  const resp = ui.prompt(
    `🔗 Configurar ${BODEGA_NOMBRE}`,
    `Pega aquí la URL del archivo Bodegas:\n\n` +
    `URL configurada: ${urlActual.substring(0, 60)}…\n\n`,
    ui.ButtonSet.OK_CANCEL
  );
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  const url = resp.getResponseText().trim();
  if (!url || !url.includes("docs.google.com/spreadsheets")) {
    ui.alert("❌ URL inválida.");
    return;
  }
  props.setProperty(propKey, url);
  _setupSync(url);
}

function _setupSync(bodegaUrl) {
  const url = bodegaUrl || PropertiesService.getScriptProperties().getProperty(`BODEGA_URL_${BODEGA_KEY}`) || "https://docs.google.com/spreadsheets/d/1bQR0TJUqY9jmtapblMiGY-FKCAB6xfLz535BLRgC_IY/";
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let syncSheet = ss.getSheetByName(SHEET_SYNC);
  if (!syncSheet) {
    syncSheet = ss.insertSheet(SHEET_SYNC);
    syncSheet.hideSheet();
    syncSheet.getRange(1, 1).setValue(`⚙️ SINCRONIZACIÓN ${BODEGA_NOMBRE} — NO EDITAR`);
    syncSheet.getRange(3, 1, 1, 11).setValues([["No","CATEGORÍA","PRODUCTO","UNIDAD","SALDO","🚦","ENT_HOY","SAL_HOY","ACTIVO","MÍN","MÁX"]]);
  }
  const lastRow = Math.max(syncSheet.getLastRow(), 4);
  if (lastRow >= 4) syncSheet.getRange(4, 1, lastRow - 3, 11).clearContent();
  const formula = '=IMPORTRANGE("' + url + '", "'  + VISTA_MOVIL + '!A4:K")';
  syncSheet.getRange(4, 1).setFormula(formula);
  try { SpreadsheetApp.flush(); } catch(e) {}
}

function instalarTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === "sincronizarEstados") ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("sincronizarEstados").timeBased().everyMinutes(10).create();
  SpreadsheetApp.getUi().alert("✅ Trigger instalado", "Los estados se sincronizarán cada 10 minutos.", SpreadsheetApp.getUi().ButtonSet.OK);
}

function desinstalarTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => { if (t.getHandlerFunction() === "sincronizarEstados") ScriptApp.deleteTrigger(t); });
  SpreadsheetApp.getActive().toast("Trigger desinstalado.", "⚙️ Mise", 3);
}

function _resetearPedidoSilencioso() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_PEDIDO);
  if (!sheet) return;
  const count = _getProductCount();
  sheet.getRange(DATA_START_ROW, COL_CANT_PEDIR, count, 1).clearContent();
  sheet.getRange(DATA_START_ROW, COL_RECIBIDA, count, 2).clearContent(); // Limpiar Col H (Cant. Recibida) y Col I (Estado)
  sheet.getRange(DATA_START_ROW, 10, count, 1).clearContent(); // Limpiar Columna J (Adición)
  
  const bgs = [];
  for (let i = 0; i < count; i++) {
    const row = Array(NUM_COLS).fill(i % 2 === 0 ? COLORS.neutral_a : COLORS.neutral_b);
    row[COL_CANT_PEDIR - 1] = COLORS.yellow; // Col F
    row[4]                  = COLORS.blue;   // Col E
    bgs.push(row);
  }
  sheet.getRange(DATA_START_ROW, 1, count, NUM_COLS).setBackgrounds(bgs);

  // Limpiar la pestaña de Surtido Rápido si existe para reiniciar recepción sin romper fórmulas
  const surtido = ss.getSheetByName("🚚 SURTIDO RÁPIDO");
  if (surtido) {
    const lastRow = surtido.getLastRow();
    if (lastRow >= 4) {
      try {
        surtido.getRange(4, 1, lastRow - 3, surtido.getMaxColumns()).clearContent().clearDataValidations();
        const protections = surtido.getProtections(SpreadsheetApp.ProtectionType.RANGE);
        protections.forEach(p => { if (p.canEdit()) p.remove(); });
      } catch(e) {}
    }
  }

  // Re-aplicar formatos condicionales y visibilidad de inactivos
  _aplicarFormatosCondicionales(sheet);
  _actualizarVisibilidadInactivos(sheet);
  sheet.hideColumns(10); // Asegurar que Columna J esté oculta

  // Resetear los flags de ordenamiento y surtido activo
  PropertiesService.getScriptProperties().setProperty("IS_ORDER_SORTED", "false");
  PropertiesService.getScriptProperties().setProperty("IS_SURTIDO_ACTIVE", "false");
}

function _checkAutoResetNuevoDia() {
  try {
    const todayStr = _fmtDate(new Date());
    const props = PropertiesService.getScriptProperties();
    const lastReset = props.getProperty("LAST_AUTO_RESET_DATE");
    if (lastReset !== todayStr) {
      _resetearPedidoSilencioso();
      props.setProperty("LAST_AUTO_RESET_DATE", todayStr);
    }
  } catch(e) {}
}

function _fmtDate(date) {
  if (!date || isNaN(date)) return "—";
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

function avanzarSemanaInfo() {
  SpreadsheetApp.getUi().alert("📅 Avanzar semana","Esta función se ejecuta en el archivo principal Mise_Bodega.");
}

function setupCompleto() {
  const ui   = SpreadsheetApp.getUi();
  const resp = ui.alert("🚀 Setup completo","¿Deseas reconstruir la arquitectura desde cero?", ui.ButtonSet.YES_NO);
  if (resp !== ui.Button.YES) return;
  PropertiesService.getScriptProperties().deleteAllProperties();
  try { SpreadsheetApp.flush(); } catch(e) {}
  
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  // Forzar configuración regional de México para evitar errores de análisis de fórmula (Inglés + comas)
  try {
    ss.setSpreadsheetLocale('es_MX');
    SpreadsheetApp.flush();
  } catch(e) {}
  
  let temp = ss.getSheetByName("__temp__");
  if (!temp) {
    temp = ss.insertSheet("__temp__");
  } else {
    temp.clear();
  }
  
  // Hojas del sistema que queremos conservar
  const systemSheetNames = [SHEET_PEDIDO, SHEET_SYNC];
  ss.getSheets().forEach(s => {
    const name = s.getName();
    if (name !== "__temp__" && !systemSheetNames.includes(name)) {
      try { ss.deleteSheet(s); } catch(e) {}
    }
  });

  // Reutilizar o crear SHEET_PEDIDO
  let pedido = ss.getSheetByName(SHEET_PEDIDO);
  if (pedido) {
    pedido.clear();
    pedido.clearConditionalFormatRules();
    pedido.setHiddenGridlines(false);
    pedido.setFrozenRows(0);
    pedido.setFrozenColumns(0);
    try { pedido.showSheet(); } catch(e) {}
    const maxRows = pedido.getMaxRows();
    const maxCols = pedido.getMaxColumns();
    if (maxRows > 0 && maxCols > 0) {
      try { pedido.getRange(1, 1, maxRows, maxCols).breakAtMerge(); } catch(e) {}
      try { pedido.getRange(1, 1, maxRows, maxCols).writeDataValidation(null); } catch(e) {}
    }
  } else {
    pedido = ss.insertSheet(SHEET_PEDIDO);
  }

  _buildPedidoDiario(pedido);

  // Eliminar hoja temporal
  const t = ss.getSheetByName("__temp__");
  if (t) {
    try { ss.deleteSheet(t); } catch(e) {}
  }
}

function _buildPedidoDiario(sheet) {
  if (sheet.getMaxColumns() < NUM_COLS) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), Math.max(1, NUM_COLS - sheet.getMaxColumns()));
  }

  // Banner superior unificado sin merge
  sheet.getRange(1, 1, 1, NUM_COLS).clearContent().setBackground("#3D5A47");
  sheet.getRange("D1")
    .setValue("MISE — PEDIDO DIARIO · " + BODEGA_NOMBRE + "   |   La Crêpe Parisienne")
    .setFontColor("#FFFFFF").setFontWeight("bold").setFontSize(11).setFontFamily("Arial").setHorizontalAlignment("center").setVerticalAlignment("middle");
  sheet.setRowHeight(1, 30);

  // Fila 2: Botones y Fecha (Alineados a partir de Columna C que nunca se oculta)
  sheet.getRange(2, 1, 1, NUM_COLS).setBackground("#7A9E8A");
  sheet.getRange(2, 1, 1, NUM_COLS).clearContent();

  sheet.getRange("F2").setValue("FECHA:").setFontWeight("bold").setFontColor("#FFFFFF").setHorizontalAlignment("right").setVerticalAlignment("middle").setFontSize(9);
  sheet.getRange("G2").setFormula('=TODAY()').setBackground("#FFFCD0").setFontColor("#333333").setNumberFormat("DD/MMM/YYYY").setHorizontalAlignment("center").setVerticalAlignment("middle").setFontSize(9);

  sheet.getRange("B2").setValue("🗑").setFontWeight("bold").setFontColor("#FFFFFF").setHorizontalAlignment("center").setVerticalAlignment("middle").setFontSize(9);
  sheet.getRange("C2").insertCheckboxes().setValue(false).setBackground("#FFFCD0");

  sheet.getRange("D2").setValue("🚚").setFontWeight("bold").setFontColor("#FFFFFF").setHorizontalAlignment("center").setVerticalAlignment("middle").setFontSize(9);
  sheet.getRange("E2").insertCheckboxes().setValue(false).setBackground("#FFFCD0");
  sheet.setRowHeight(2, 24);

  // Fila 3: Headers estables tradicionales (10 columns)
  sheet.getRange(3, 1, 1, NUM_COLS)
    .setValues([["No","CATEGORÍA","PRODUCTO","UNIDAD","SALDO TEÓRICO","CANT. A PEDIR","DIFERENCIA","","",""]])
    .setBackground("#3D5A47").setFontColor("#FFFFFF").setFontWeight("bold").setFontSize(9).setHorizontalAlignment("center").setVerticalAlignment("middle");
  sheet.setRowHeight(3, 34);
  
  // Inmovilización blindada móvil
  sheet.setFrozenRows(3);
  sheet.setFrozenColumns(3); 
  sheet.setHiddenGridlines(false);

  // Reglas de Formato Condicional Nativo para Estados de Pedido
  _aplicarFormatosCondicionales(sheet);
  _actualizarVisibilidadInactivos(sheet);

  _aplicarAnchosColumnas(sheet);
  sheet.hideColumns(1);  // Ocultar No
  sheet.hideColumns(COL_RECIBIDA, 2); // Ocultar Cant. Recibida (H) y Estado (I)
  sheet.hideColumns(10); // Ocultar Alerta Adición (Col J)
  sheet.showColumns(2);  // Mostrar Categoría
  
  // Crear filtro
  try {
    let filter = sheet.getFilter();
    if (filter) filter.remove();
    const lastRow = Math.max(sheet.getLastRow(), DATA_START_ROW);
    sheet.getRange(3, 2, lastRow - 2, 6).createFilter(); // Columns B to G (6 columns)
  } catch(err) {}
  
  _actualizarAvisoPedido();
}

function _aplicarFormatosCondicionales(sheet) {
  sheet.clearConditionalFormatRules();
  const count = _getProductCount();
  if (count < 1) return;
  const range = sheet.getRange(DATA_START_ROW, 1, count, NUM_COLS);
  const rangeE = sheet.getRange(DATA_START_ROW, 5, count, 1);
  const syncName = SHEET_SYNC;
  
  // Regla 1: Alerta adición de última hora (naranja brillante)
  const ruleAdicion = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$J4="🚨 ADICIÓN"')
    .setBackground("#FFD54F")
    .setRanges([range])
    .build();
      
  // Regla 1.5: Inactivos (gris)
  const ruleInactivo = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=VLOOKUP($C4, INDIRECT("\'' + SHEET_SYNC + '\'!C:I"), 7, FALSE)="NO"')
    .setBackground("#EEEEEE")
    .setFontColor("#9E9E9E")
    .setItalic(true)
    .setRanges([range])
    .build();
      
  // Regla 2: Completos
  const ruleCompleto = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($F4>0, IFERROR(VLOOKUP($C4, INDIRECT("\'🚚 SURTIDO RÁPIDO\'!C:G"), 4, FALSE), FALSE))')
    .setBackground(COLORS.completo)
    .setRanges([range])
    .build();

  // Regla 3: Inexistente / 0 Recibido (Rojo suave)
  const ruleInexistente = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($F4>0, IFERROR(VLOOKUP($C4, INDIRECT("\'🚚 SURTIDO RÁPIDO\'!C:G"), 5, FALSE), FALSE))')
    .setBackground(COLORS.inexistente)
    .setRanges([range])
    .build();
      
  // Regla 4: Parciales
  const ruleParcial = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($F4>0, IFERROR(VLOOKUP($C4, INDIRECT("\'🚚 SURTIDO RÁPIDO\'!C:G"), 3, FALSE), 0)>0, IFERROR(VLOOKUP($C4, INDIRECT("\'🚚 SURTIDO RÁPIDO\'!C:G"), 3, FALSE), 0)<$F4)')
    .setBackground(COLORS.parcial)
    .setRanges([range])
    .build();
      
  // Regla 5: Pendientes (si la cant recibida no tiene valor/null)
  const rulePendiente = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($F4>0, NOT(IFERROR(VLOOKUP($C4, INDIRECT("\'🚚 SURTIDO RÁPIDO\'!C:G"), 4, FALSE), FALSE)), NOT(IFERROR(VLOOKUP($C4, INDIRECT("\'🚚 SURTIDO RÁPIDO\'!C:G"), 5, FALSE), FALSE)), IFERROR(VLOOKUP($C4, INDIRECT("\'🚚 SURTIDO RÁPIDO\'!C:G"), 3, FALSE), 0)=0)')
    .setBackground(COLORS.pendiente)
    .setRanges([range])
    .build();

  const rules = [ruleCompleto, ruleParcial, ruleAdicion, ruleInexistente, rulePendiente, ruleInactivo];
  
  // Reglas Semáforo en Columna E (SALDO TEÓRICO)
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(`=AND(INDIRECT("'${syncName}'!J" & ROW())>0, INDIRECT("'${syncName}'!E" & ROW()) < 0.5*INDIRECT("'${syncName}'!J" & ROW()))`)
    .setBackground("#FFCDD2").setFontColor("#B71C1C").setRanges([rangeE]).build());
    
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(`=AND(INDIRECT("'${syncName}'!J" & ROW())>0, INDIRECT("'${syncName}'!E" & ROW()) < INDIRECT("'${syncName}'!J" & ROW()), INDIRECT("'${syncName}'!E" & ROW()) >= 0.5*INDIRECT("'${syncName}'!J" & ROW()))`)
    .setBackground("#FFE0B2").setFontColor("#BF360C").setRanges([rangeE]).build());
    
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(`=AND(OR(INDIRECT("'${syncName}'!J" & ROW())>0, INDIRECT("'${syncName}'!K" & ROW())>0), INDIRECT("'${syncName}'!E" & ROW()) >= INDIRECT("'${syncName}'!J" & ROW()), INDIRECT("'${syncName}'!E" & ROW()) <= INDIRECT("'${syncName}'!K" & ROW()))`)
    .setBackground("#C8E6C9").setFontColor("#1B5E20").setRanges([rangeE]).build());
    
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(`=AND(INDIRECT("'${syncName}'!K" & ROW())>0, INDIRECT("'${syncName}'!E" & ROW()) > INDIRECT("'${syncName}'!K" & ROW()))`)
    .setBackground("#B3E5FC").setFontColor("#0D47A1").setRanges([rangeE]).build());
    
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(`=AND(INDIRECT("'${syncName}'!J" & ROW())=0, INDIRECT("'${syncName}'!K" & ROW())=0)`)
    .setBackground("#CFD8DC").setFontColor("#37474F").setRanges([rangeE]).build());
      
  sheet.setConditionalFormatRules(rules);
}

function acercaDe() {
  SpreadsheetApp.getUi().alert(`⚙️ Mise v5.0 — Pedidos ${BODEGA_NOMBRE}`, "Diseño optimizado para móviles de 9 columnas con surtido y fórmulas integradas.");
}

function _actualizarVisibilidadInactivos(sheet) {
  const count = _getProductCount();
  if (count < 1) return;
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sync = ss.getSheetByName(SHEET_SYNC);
  if (!sync) return;
  
  sheet.showRows(DATA_START_ROW, count);
  
  const syncValues = sync.getRange(4, 3, count, 7).getValues(); // Column C (PRODUCTO) to I (ACTIVO)
  const activeMap = {};
  for (let i = 0; i < syncValues.length; i++) {
    const prodName = String(syncValues[i][0]).trim();
    const activo = String(syncValues[i][6]).trim(); // Col I is index 6 relative to Col C
    activeMap[prodName] = activo;
  }
  
  const pedidoProducts = sheet.getRange(DATA_START_ROW, 3, count, 1).getValues();
  
  let startHide = -1;
  let hideCount = 0;
  
  for (let i = 0; i < count; i++) {
    const prodName = String(pedidoProducts[i][0]).trim();
    const isInactive = (activeMap[prodName] === "NO");
    const row = DATA_START_ROW + i;
    
    if (isInactive) {
      if (startHide === -1) {
        startHide = row;
        hideCount = 1;
      } else {
        hideCount++;
      }
    } else {
      if (startHide !== -1) {
        sheet.hideRows(startHide, hideCount);
        startHide = -1;
        hideCount = 0;
      }
    }
  }
  
  if (startHide !== -1) {
    sheet.hideRows(startHide, hideCount);
  }
}

// ── SURTIDO RÁPIDO (MOBILE-FIRST RECEPCIÓN) ───────────────────────────────────
function _generarSurtidoRapidoInternal(activateSheet) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const pSheet = ss.getSheetByName(SHEET_PEDIDO);
  if (!pSheet) return;

  const lr = pSheet.getLastRow();
  if (lr < DATA_START_ROW) {
    try { ss.toast("No hay productos en el pedido.", "❌ Surtido", 4); } catch(e) {}
    return;
  }

  // Leer todos los datos del pedido (10 columnas: No, CATEGORÍA, PRODUCTO, UNIDAD, SALDO, CANT. PEDIR, DIFERENCIA, H, I, J)
  const dataRange = pSheet.getRange(DATA_START_ROW, 1, lr - DATA_START_ROW + 1, NUM_COLS);
  const data = dataRange.getValues();
  const backgrounds = pSheet.getRange(DATA_START_ROW, 3, lr - DATA_START_ROW + 1, 1).getBackgrounds(); // Col C background

  const filtered = [];
  for (let i = 0; i < data.length; i++) {
    const cantPedir = parseFloat(data[i][5]);
    if (!isNaN(cantPedir) && cantPedir > 0) {
      const no = data[i][0];
      const cat = data[i][1];
      const prod = String(data[i][2]).trim();
      const bgColC = String(backgrounds[i][0] || "").toLowerCase();

      // Consultar información directamente desde el pedido diario (columnas ocultas H e I)
      const cantRecibida = data[i][COL_RECIBIDA - 1]; // Col H (index 7)
      const estado = String(data[i][COL_ESTADO - 1] || "").trim(); // Col I (index 8)
      
      const completo = (estado === "COMPLETO");
      const inexistente = (estado === "INEXISTENTE");

      // Detect highlight color (Adición si Col J tiene "🚨 ADICIÓN", o morado si Col C background es morado)
      let highlightBg = null;
      if (data[i][9] === "🚨 ADICIÓN") {
        highlightBg = "#FFD54F"; // Orange addition alert
      } else if (bgColC === "#e8eaf6" || bgColC === "rgb(232, 234, 246)") {
        highlightBg = "#E8EAF6"; // Lavender
      }

      filtered.push({
        rowIdxInPedido: DATA_START_ROW + i,
        no,
        cat,
        prod,
        cantPedir,
        cantRecibida,
        completo,
        inexistente,
        highlightBg
      });
    }
  }

  // Buscar o crear la pestaña de Surtido Rápido
  const sheetName = "🚚 SURTIDO RÁPIDO";
  let sSheet = ss.getSheetByName(sheetName);
  if (sSheet) {
    sSheet.clear();
    const protections = sSheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
    protections.forEach(p => { if (p.canEdit()) p.remove(); });
  } else {
    sSheet = ss.insertSheet(sheetName);
  }

  // Configurar columnas de la hoja
  sSheet.getRange("A1:C1").merge().setBackground("#3D5A47");
  sSheet.getRange("D1:G1").merge()
    .setValue(`MISE — SURTIDO RÁPIDO (${BODEGA_NOMBRE})`)
    .setBackground("#3D5A47").setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(11).setFontFamily("Arial").setHorizontalAlignment("center").setVerticalAlignment("middle");
  sSheet.setRowHeight(1, 30);

  sSheet.getRange("A2:C2").merge().setBackground("#F5EFE6");
  sSheet.getRange("D2:G2").merge()
    .setValue("Instrucciones: Marca ✅ si llegó completo o ❌ si no hay. Cantidad manual si llegó parcial.")
    .setBackground("#F5EFE6").setFontColor("#333333").setFontSize(9)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sSheet.setRowHeight(2, 20);

  // Headers de columnas (Fila 3)
  const headers = ["No", "CATEGORÍA", "PRODUCTO", "CANT. PEDIDA", "CANT. RECIBIDA", "✅ COMPLETO", "❌ INEXISTENTE"];
  sSheet.getRange(3, 1, 1, 7)
    .setValues([headers])
    .setBackground("#3D5A47").setFontColor("#FFFFFF").setFontWeight("bold").setFontSize(9)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sSheet.setRowHeight(3, 28);
  
  // Inmovilización de columnas y filas
  sSheet.setFrozenRows(3);
  sSheet.setFrozenColumns(3);

  sSheet.setColumnWidth(1, 40);   // No
  sSheet.setColumnWidth(2, 125);  // CATEGORÍA
  sSheet.setColumnWidth(3, 210);  // PRODUCTO
  sSheet.setColumnWidth(4, 95);   // CANT. PEDIDA
  sSheet.setColumnWidth(5, 110);  // CANT. RECIBIDA (Editable)
  sSheet.setColumnWidth(6, 95);   // ✅ COMPLETO
  sSheet.setColumnWidth(7, 95);   // ❌ INEXISTENTE
  sSheet.setColumnWidth(8, 40);   // ALERTA (Hidden)

  sSheet.hideColumns(1, 2); // Ocultar No y Categoría

  const rows = Math.max(filtered.length, 1);

  if (filtered.length === 0) {
    sSheet.getRange("C4")
      .setValue("No hay productos ordenados para surtir hoy (CANT. A PEDIR = 0).")
      .setFontStyle("italic").setFontColor("#C62828").setHorizontalAlignment("left").setVerticalAlignment("middle");
    sSheet.setRowHeight(4, 30);
    sSheet.getRange("D4:H4").setValue("");
  } else {
    const values = [];
    const bgs = [];
    const checkCompleto = [];
    const checkInexistente = [];
    const alertasVal = [];
    
    for (let i = 0; i < rows; i++) {
      const item = filtered[i];
      const bg = i % 2 === 0 ? "#FAFAFA" : "#FFFFFF";
      
      values.push([
        item.no,
        item.cat,
        item.prod,
        item.cantPedir,
        item.cantRecibida
      ]);
      
      const rowBg = Array(7).fill(item.highlightBg || bg);
      if (!item.highlightBg) {
        rowBg[4] = COLORS.blue; // Resaltar CANT. RECIBIDA en azul
        rowBg[5] = "#E8F5E9";  // Resaltar COMPLETO en verde claro
        rowBg[6] = "#FFEBEE";  // Resaltar INEXISTENTE en rojo claro
      }
      bgs.push(rowBg);
      
      checkCompleto.push([item.completo]);
      checkInexistente.push([item.inexistente]);
      alertasVal.push([item.highlightBg === "#FFD54F" ? "🚨 ADICIÓN" : ""]);
    }

    // Escribir datos básicos
    sSheet.getRange(4, 1, rows, 5).setValues(values);
    sSheet.getRange(4, 1, rows, 7).setBackgrounds(bgs)
      .setFontFamily("Calibri").setFontSize(10).setVerticalAlignment("middle");
    
    sSheet.getRange(4, 1, rows, 1).setHorizontalAlignment("center").setFontWeight("bold");
    sSheet.getRange(4, 2, rows, 1).setHorizontalAlignment("center");
    sSheet.getRange(4, 3, rows, 1).setHorizontalAlignment("left");
    sSheet.getRange(4, 4, rows, 1).setHorizontalAlignment("right");
    sSheet.getRange(4, 5, rows, 1).setHorizontalAlignment("right");

    // Escribir checkboxes
    sSheet.getRange(4, 6, rows, 1).insertCheckboxes().setValues(checkCompleto).setHorizontalAlignment("center");
    sSheet.getRange(4, 7, rows, 1).insertCheckboxes().setValues(checkInexistente).setHorizontalAlignment("center");

    // Escribir columna oculta de alerta
    sSheet.getRange(4, 8, rows, 1).setValues(alertasVal);
    sSheet.hideColumns(8);

    // Validar entrada numérica en la columna E (Cant. Recibida)
    const valRule = SpreadsheetApp.newDataValidation()
      .requireNumberGreaterThanOrEqualTo(0)
      .setAllowInvalid(false)
      .setHelpText("Ingresa una cantidad mayor o igual a 0.")
      .build();
    sSheet.getRange(4, 5, rows, 1).setDataValidation(valRule);

    // Proteger columnas A, B, C y D
    try {
      const prot = sSheet.getRange(4, 1, rows, 4).protect()
        .setDescription("No modificar datos base del producto.");
      prot.removeEditors(prot.getEditors());
      if (prot.canDomainEdit()) prot.setDomainEdit(false);
    } catch(e) {}

    // Aplicar Reglas de Formato Condicional para coloreado de filas
    sSheet.clearConditionalFormatRules();
    const rangeS = sSheet.getRange(4, 1, rows, 7); // A4:G
    
    const ruleSCompleto = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$F4=TRUE')
      .setBackground("#C8E6C9") // light green
      .setRanges([rangeS])
      .build();
      
    const ruleSInexistente = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$G4=TRUE')
      .setBackground("#FFCDD2") // light red
      .setRanges([rangeS])
      .build();

    const ruleSIncompleto = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=AND($E4>0, $E4<$D4, $F4=FALSE, $G4=FALSE)')
      .setBackground("#FFE0B2") // light orange
      .setRanges([rangeS])
      .build();

    const ruleSAdicion = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$H4="🚨 ADICIÓN"')
      .setBackground("#FFD54F") // orange
      .setRanges([rangeS])
      .build();

    sSheet.setConditionalFormatRules([ruleSCompleto, ruleSInexistente, ruleSIncompleto, ruleSAdicion]);
  }

  // --- TABLA DE RESUMEN DE PRODUCTOS (COLUMNAS I-J) ---
  sSheet.getRange("I3:J3").merge()
    .setValue("RESUMEN SURTIDO")
    .setBackground("#3D5A47").setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(9).setFontFamily("Arial").setHorizontalAlignment("center").setVerticalAlignment("middle");
  sSheet.setRowHeight(3, 28);
    
  sSheet.getRange("I4").setValue("✅ Completos");
  sSheet.getRange("J4").setFormula("=COUNTIF(F4:F" + (3 + rows) + ", TRUE)");
  
  sSheet.getRange("I5").setValue("⚠️ Incompletos");
  sSheet.getRange("J5").setFormula("=COUNTIFS(D4:D" + (3 + rows) + ", \">0\", E4:E" + (3 + rows) + ", \">0\", F4:F" + (3 + rows) + ", FALSE, G4:G" + (3 + rows) + ", FALSE)");
  
  sSheet.getRange("I6").setValue("❌ Inexistentes");
  sSheet.getRange("J6").setFormula("=COUNTIF(G4:G" + (3 + rows) + ", TRUE)");
  
  sSheet.getRange("I7").setValue("🚨 Adiciones");
  sSheet.getRange("J7").setFormula("=COUNTIF(H4:H" + (3 + rows) + ", \"🚨 ADICIÓN\")");

  sSheet.getRange("I4:J4").setBackground("#E8F5E9");
  sSheet.getRange("I5:J5").setBackground("#FFF3E0");
  sSheet.getRange("I6:J6").setBackground("#FFEBEE");
  sSheet.getRange("I7:J7").setBackground("#FFFDE7");
  
  sSheet.getRange("I4:I7").setFontWeight("bold").setFontSize(9).setHorizontalAlignment("left").setVerticalAlignment("middle");
  sSheet.getRange("J4:J7").setFontWeight("bold").setFontSize(10).setHorizontalAlignment("center").setVerticalAlignment("middle");
  sSheet.getRange("I3:J7").setBorder(true, true, true, true, true, true, "#CCCCCC", SpreadsheetApp.BorderStyle.SOLID);
  sSheet.setColumnWidth(9, 120);  // Column I width
  sSheet.setColumnWidth(10, 60);  // Column J width

  // Marcar que surtido está activo
  PropertiesService.getScriptProperties().setProperty("IS_SURTIDO_ACTIVE", "true");

  if (activateSheet) {
    ss.setActiveSheet(sSheet);
  }
}

function generarSurtidoRapido() {
  PropertiesService.getScriptProperties().setProperty("IS_SURTIDO_ACTIVE", "true");
  _generarSurtidoRapidoInternal(true);
}

function generarSurtidoRapidoSilencioso() {
  _generarSurtidoRapidoInternal(false);
}

function generarDatosPrueba() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_PEDIDO);
  if (!sheet) return;
  
  const count = _getProductCount();
  if (count < 1) return;
  
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;
  
  try {
    const rangeF = sheet.getRange(DATA_START_ROW, COL_CANT_PEDIR, count, 1);
    const valuesF = rangeF.getValues();
    
    // Choose 15-25 random products to order
    const numToOrder = Math.floor(Math.random() * 11) + 15; // 15 to 25
    const selectedIndices = new Set();
    while (selectedIndices.size < numToOrder) {
      selectedIndices.add(Math.floor(Math.random() * count));
    }
    
    selectedIndices.forEach(idx => {
      // Set random quantity to order (integers or decimals)
      const isFloat = Math.random() > 0.5;
      const base = Math.floor(Math.random() * 8) + 1; // 1 to 8
      let val = base;
      if (isFloat) {
        const decimals = [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875];
        val = base + decimals[Math.floor(Math.random() * decimals.length)];
      }
      valuesF[idx][0] = val;
    });
    
    rangeF.setValues(valuesF);
    
    SpreadsheetApp.flush();
    SpreadsheetApp.getActive().toast(`Se generaron datos de prueba para ${numToOrder} productos ✓`, "🎲 Prueba", 4);
  } finally {
    lock.releaseLock();
  }
}