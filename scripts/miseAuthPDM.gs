/**
 * MISE — Pedidos Mercado Script v1.0 (Lanzamiento Oficial)
 * Suite Atelier · La Crêpe Parisienne · Grupo MYT
 * (Reemplaza a los prototipos de la serie v0.5.0)
 *
 * INSTALAR EN: Pedidos Mercado (Google Sheets de B-Mercado)
 * 
 * CAMBIOS v1.0 (Derivado del prototipo v0.5.0):
 * 1. Reset automático por día nuevo en onOpen (limpia cantidades y estados).
 * 2. Bypass de getUi() en resetearPedido() para compatibilidad móvil total.
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
const BODEGA_KEY    = "BM";
const BODEGA_NOMBRE = "B-Mercado";
const VISTA_MOVIL   = "VISTA_MOVIL_BM";
const SHEET_SYNC    = "_SYNC_BM";

// ── CONSTANTES ──────────────────────────────────────────────────────────────
const SHEET_PEDIDO   = "📋 PEDIDO DIARIO";
const SHEET_MOVIL    = "📊 VISTA_MÓVIL";
const SHEET_LOG      = "🗒 LOG";
const COL_CANT_PEDIR = 6;   // F — CANT. A PEDIR
const COL_RECIBIDA   = 7;   // G — CANT. RECIBIDA
const COL_ESTADO     = 9;   // I — ESTADO (fórmula)
const DATA_START_ROW = 4;
const NUM_COLS       = 12;

// Colores institucionales
const COLORS = {
  completo:  "#B9F6CA",
  parcial:   "#FFE0B2",
  pendiente: "#FFFDE7",
  yellow:    "#FFFCD0",
  blue:      "#D0E8FF",
  neutral_a: "#FAFAFA",
  neutral_b: "#FFFFFF",
  logHeader: "#3D5A47"
};

const ESTADO = {
  COMPLETO:  "✅ COMPLETO",
  PARCIAL:   "⚠️ PARCIAL",
  PENDIENTE: "⏳ PENDIENTE"
};

// ── MENÚ ────────────────────────────────────────────────────────────────────
function onOpen() {
  _checkAutoResetNuevoDia();
  _actualizarAvisoPedido();
  SpreadsheetApp.getUi()
    .createMenu("⚙️ Mise")
    .addItem("🚀 Setup completo", "setupCompleto")
    .addSeparator()
    .addItem(`🔗 Configurar conexión con ${BODEGA_NOMBRE}`, "configurarBodega")
    .addSeparator()
    .addItem("🔄 Sincronizar estados (manual / móvil)",  "sincronizarEstados")
    .addItem("📊 Ordenar pedido por estado",             "ordenarPedido")
    .addItem("🗑 Resetear pedido del día",               "resetearPedido")
    .addItem("🚚 Surtido Rápido (móvil)",                "generarSurtidoRapido")
    .addSeparator()
    .addItem("📅 Avanzar semana (ejecutar en Bodega)",   "avanzarSemanaInfo")
    .addSeparator()
    .addItem("⚡ Instalar trigger automático (móvil)",   "instalarTriggers")
    .addItem("🗑 Desinstalar trigger automático",        "desinstalarTriggers")
    .addItem("♻️ Invalidar caché de productos",          "invalidarCache")
    .addSeparator()
    .addItem("ℹ️ Acerca de Mise",                        "acercaDe")
    .addToUi();
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
      url = "https://docs.google.com/spreadsheets/d/1kfjtwoX1U-ELq2du1zzJgc4VgO03n28wCVdiKrweHug/";
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
    pedido.getRange("J4")
      .setValue("⚠️ CONECTAR BDG")
      .setFontColor("#C62828")
      .setFontSize(9)
      .setHorizontalAlignment("center")
      .setFontStyle("italic");
    _aplicarAnchosColumnas(pedido);
    return;
  }

  // Limpiar advertencia en J4
  pedido.getRange("J4").clearContent();

  const count  = sync.getLastRow() - 3; 
  if (count < 1) return;
  const DR     = DATA_START_ROW;
  const sRef   = "'" + SHEET_SYNC + "'";
  
  const existente = pedido.getRange(DR, 3).getValue(); 
  if (existente !== "" && existente !== null) {
    _aplicarAnchosColumnas(pedido); 
    return;
  }

  const colA = [], colC = [], colD = [], colE = [], colH = [], colI = [], colJ = [];
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
    colE.push(['=' + sRef + '!E' + sr]);
    colH.push(['=IF(F' + r + '=""; ""; G' + r + '-F' + r + ')']);
    colI.push(['=IF(' + sRef + '!I' + sr + '="NO"; "🚫 INACTIVO"; IF(F' + r + '="";"—";IF(G' + r + '=0;"⏳ PENDIENTE";IF(G' + r + '>=F' + r + ';"✅ COMPLETO";"⚠️ PARCIAL"))))']);
    colJ.push(['=IF(F' + r + '=""; ""; IF(G' + r + '<F' + r + '; "⚠️ INCOMPLETO"; ""))']);

    const rowBg = Array(NUM_COLS).fill(bg);
    rowBg[COL_CANT_PEDIR - 1] = COLORS.yellow;
    rowBg[COL_RECIBIDA - 1]   = COLORS.blue;
    rowBg[4]                  = COLORS.blue;
    bgs.push(rowBg);
  }

  // Escribir en bloque
  pedido.getRange(DR, 1, count, NUM_COLS).clearContent();
  pedido.getRange(DR, 1, count, NUM_COLS).setBackgrounds(bgs);

  // Escribir valores y fórmulas por columnas separadas para evitar sobreescritura accidental
  pedido.getRange(DR, 2, count, 1).setFormulas(colB);
  pedido.getRange(DR, 1, count, 1).setValues(colA);
  pedido.getRange(DR, 3, count, 1).setFormulas(colC);
  pedido.getRange(DR, 4, count, 1).setFormulas(colD);
  pedido.getRange(DR, 5, count, 1).setFormulas(colE);
  pedido.getRange(DR, 8, count, 1).setFormulas(colH);
  pedido.getRange(DR, 9, count, 1).setFormulas(colI);
  pedido.getRange(DR, 10, count, 1).setFormulas(colJ);

  pedido.getRange(DR, 1, count, NUM_COLS)
    .setFontFamily("Calibri").setFontSize(10).setVerticalAlignment("middle");
  
  pedido.getRange(DR, 1, count, 1).setHorizontalAlignment("center"); 
  pedido.getRange(DR, 3, count, 1).setHorizontalAlignment("left");   
  pedido.getRange(DR, 4, count, 1).setHorizontalAlignment("center"); 
  pedido.getRange(DR, 5, count, 1).setHorizontalAlignment("right");  
  pedido.getRange(DR, 9, count, 1).setHorizontalAlignment("center"); 
  pedido.getRange(DR, 10, count, 1).setHorizontalAlignment("center").setFontWeight("bold").setFontColor("#C62828"); 

  _aplicarAnchosColumnas(pedido);
  _aplicarFormatosCondicionales(pedido);
}

function _aplicarAnchosColumnas(sheet) {
  sheet.setColumnWidth(1, 40);   // No
  sheet.setColumnWidth(2, 115);  // CATEGORÍA
  sheet.setColumnWidth(3, 210);  // PRODUCTO
  sheet.setColumnWidth(4, 65);   // UNIDAD
  sheet.setColumnWidth(5, 110);  // SALDO TEÓRICO
  sheet.setColumnWidth(6, 110);  // CANT. A PEDIR
  sheet.setColumnWidth(7, 115);  // CANT. RECIBIDA
  sheet.setColumnWidth(8, 100);  // DIFERENCIA
  sheet.setColumnWidth(9, 110);  // ESTADO
  sheet.setColumnWidth(10, 130); // ALERTAS SURTIDO
  sheet.setColumnWidth(11, 80);  // K - 🚚 Surtido label
  sheet.setColumnWidth(12, 50);  // L - Checkbox
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
    // 1. Checkbox de retorno a Pedido Diario (Fila 3, Columna D)
    if (row === 3 && col === 4) {
      if (e.range.getValue() === true) {
        e.range.setValue(false);
        const pSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_PEDIDO);
        if (pSheet) {
          SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(pSheet);
        }
      }
      return;
    }

    if (row < 5) return;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const pSheet = ss.getSheetByName(SHEET_PEDIDO);
    if (!pSheet) return;

    // Obtener información del renglón actual
    const prodNo = sheet.getRange(row, 1).getValue();
    const prodName = sheet.getRange(row, 3).getValue();
    const cantPedir = parseFloat(sheet.getRange(row, 4).getValue()) || 0;

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
        } else {
          sheet.getRange(row, 5).setValue("");
          pSheet.getRange(rowInPedido, COL_RECIBIDA).setValue("");
        }
      }
      // 3. Columna G: ❌ INEXISTENTE
      else if (col === 7) {
        const valCheck = e.range.getValue();
        if (valCheck === true) {
          sheet.getRange(row, 6).setValue(false); // Completo = false
          sheet.getRange(row, 5).setValue(0); // Recibida = 0
          pSheet.getRange(rowInPedido, COL_RECIBIDA).setValue(0); // Sincronizar con pedido diario
        } else {
          sheet.getRange(row, 5).setValue("");
          pSheet.getRange(rowInPedido, COL_RECIBIDA).setValue("");
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
            return;
          }

          pSheet.getRange(rowInPedido, COL_RECIBIDA).setValue(checkVal);

          if (checkVal === cantPedir) {
            sheet.getRange(row, 6).setValue(true);
            sheet.getRange(row, 7).setValue(false);
          } else if (checkVal === 0) {
            sheet.getRange(row, 6).setValue(false);
            sheet.getRange(row, 7).setValue(true);
          } else {
            sheet.getRange(row, 6).setValue(false);
            sheet.getRange(row, 7).setValue(false);
          }
        } else {
          // Si borran la celda
          sheet.getRange(row, 6).setValue(false);
          sheet.getRange(row, 7).setValue(false);
          pSheet.getRange(rowInPedido, COL_RECIBIDA).setValue("");
        }
      }
    } finally {
      lock.releaseLock();
    }
    return;
  }

  // B. Manejo de la pestaña de Pedido Diario
  if (name !== SHEET_PEDIDO) return;

  // 1. Botones Interactivos Móviles (Fila 2) en columnas visibles C-L
  if (row === 2) {
    if (col === 4) { // D2 - Ordenar Pedido
      if (e.range.getValue() === true) {
        e.range.setValue(false);
        ordenarPedido();
      }
    } else if (col === 6) { // F2 - Resetear Pedido
      if (e.range.getValue() === true) {
        e.range.setValue(false);
        resetearPedido();
      }
    } else if (col === 8) { // H2 - Sincronizar Estados
      if (e.range.getValue() === true) {
        e.range.setValue(false);
        sincronizarEstados();
      }
    } else if (col === 12) { // L2 - Surtido Rápido
      if (e.range.getValue() === true) {
        e.range.setValue(false);
        generarSurtidoRapido();
      }
    }
    return;
  }

  if (row < DATA_START_ROW) return;

  // 2. Validaciones rápidas de entrada (F y G)
  if (col === COL_CANT_PEDIR || col === COL_RECIBIDA) {
    let rawVal = e.value;
    if (rawVal !== undefined && rawVal !== null) {
      const strVal = String(rawVal).trim();
      const cleanVal = strVal.replace(',', '.');
      const num = Number(cleanVal);
      if (!isNaN(num) && num >= 0) {
        e.range.setValue(num);
      }
    }

    let val = e.range.getValue();
    if (val !== "") {
      if (Object.prototype.toString.call(val) === '[object Date]') {
        e.range.clearContent();
        try { SpreadsheetApp.getActive().toast("El valor debe ser un número positivo (no se permiten fechas).", "❌ Mise", 5); } catch(err) {}
        return;
      }
      if (typeof val === "string") {
        const cleanVal = val.replace(',', '.').trim();
        const num = Number(cleanVal);
        if (!isNaN(num) && num >= 0) {
          e.range.setValue(num);
          val = num;
        }
      }
      const checkVal = Number(val);
      if (isNaN(checkVal) || checkVal < 0) {
        e.range.clearContent();
        try { SpreadsheetApp.getActive().toast("El valor debe ser un número positivo.", "❌ Mise", 5); } catch(err) {}
        return;
      }

      // Si es la columna de pedir, manejar alerta de adición
      if (col === COL_CANT_PEDIR) {
        if (checkVal > 0) {
          const isSorted = PropertiesService.getScriptProperties().getProperty("IS_ORDER_SORTED") === "true";
          if (isSorted) {
            sheet.getRange(row, 10).setValue("🚨 ADICIÓN");
          }
        } else {
          // Restaurar fórmula normal si se vacía la cantidad
          sheet.getRange(row, 10).setFormula('=IF(F' + row + '=""; ""; IF(G' + row + '<F' + row + '; "⚠️ INCOMPLETO"; ""))');
        }
      }
    }
  }
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
    SpreadsheetApp.flush();
    sync.getRange(4, 1).setFormula(formula);
    SpreadsheetApp.flush();
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
    const newFormulasA = [], newFormulasC = [], newFormulasD = [], newFormulasE = [], newFormulasH = [], newFormulasI = [], newFormulasJ = [];
    const newBgs = [];
    const newCats = [];

    for (let i = 0; i < diff; i++) {
      const r = insertStartRow + i;
      const sr = 4 + currentCount + i;
      const prodNo = currentCount + i + 1;

      newFormulasA.push([prodNo]);
      newFormulasC.push(['=' + sRef + '!C' + sr]);
      newFormulasD.push(['=' + sRef + '!D' + sr]);
      newFormulasE.push(['=' + sRef + '!E' + sr]);
      newFormulasH.push(['=IF(F' + r + '=""; ""; G' + r + '-F' + r + ')']);
      newFormulasI.push(['=IF(' + sRef + '!I' + sr + '="NO"; "🚫 INACTIVO"; IF(F' + r + '="";"—";IF(G' + r + '=0;"⏳ PENDIENTE";IF(G' + r + '>=F' + r + ';"✅ COMPLETO";"⚠️ PARCIAL"))))']);
      newFormulasJ.push(['=IF(F' + r + '=""; ""; IF(G' + r + '<F' + r + '; "⚠️ INCOMPLETO"; ""))']);

      const rowBg = Array(NUM_COLS).fill(highlightColor);
      rowBg[COL_CANT_PEDIR - 1] = COLORS.yellow;
      rowBg[COL_RECIBIDA - 1]   = COLORS.blue;
      rowBg[4]                  = COLORS.blue;
      newBgs.push(rowBg);

      newCats.push(['=' + sRef + '!B' + sr]);
    }

    // Escribir en bloque
    sheet.getRange(insertStartRow, 1, diff, NUM_COLS).setBackgrounds(newBgs);
    sheet.getRange(insertStartRow, 1, diff, 1).setValues(newFormulasA);
    sheet.getRange(insertStartRow, 2, diff, 1).setFormulas(newCats);
    sheet.getRange(insertStartRow, 3, diff, 1).setFormulas(newFormulasC);
    sheet.getRange(insertStartRow, 4, diff, 1).setFormulas(newFormulasD);
    sheet.getRange(insertStartRow, 5, diff, 1).setFormulas(newFormulasE);
    sheet.getRange(insertStartRow, 8, diff, 1).setFormulas(newFormulasH);
    sheet.getRange(insertStartRow, 9, diff, 1).setFormulas(newFormulasI);
    sheet.getRange(insertStartRow, 10, diff, 1).setFormulas(newFormulasJ);

    sheet.getRange(insertStartRow, 1, diff, NUM_COLS)
      .setFontFamily("Calibri").setFontSize(10).setVerticalAlignment("middle");
    sheet.getRange(insertStartRow, 1, diff, 1).setHorizontalAlignment("center");
    sheet.getRange(insertStartRow, 3, diff, 1).setHorizontalAlignment("left");
    sheet.getRange(insertStartRow, 4, diff, 1).setHorizontalAlignment("center");
    sheet.getRange(insertStartRow, 5, diff, 1).setHorizontalAlignment("right");
    sheet.getRange(insertStartRow, 9, diff, 1).setHorizontalAlignment("center");
    sheet.getRange(insertStartRow, 10, diff, 1).setHorizontalAlignment("center").setFontWeight("bold").setFontColor("#C62828");

    _aplicarFormatosCondicionales(sheet);

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
}

function ordenarPedido() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_PEDIDO);
  if (!sheet) return;

  const count  = _getProductCount();
  const range  = sheet.getRange(DATA_START_ROW, 1, count, NUM_COLS);
  const values = range.getValues();
  const fonts  = range.getFontWeights();

  const items = [];
  for (let i = 0; i < values.length; i++) {
    items.push({
      vals: values[i],
      fonts: fonts[i]
    });
  }

  // Ordenar por Categoría (B) ascendente, activos primero, inactivos después, y luego por pedidos (F > 0)
  items.sort((a, b) => {
    const catA = String(a.vals[1] || "").trim();
    const catB = String(b.vals[1] || "").trim();
    if (catA !== catB) {
      return catA.localeCompare(catB);
    }
    // Deshabilitados van al final de la categoría
    const isInactiveA = (a.vals[8] === "🚫 INACTIVO") ? 1 : 0;
    const isInactiveB = (b.vals[8] === "🚫 INACTIVO") ? 1 : 0;
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

  // Re-generar fondos y formatos limpios y estáticos (evita fijar el amarillo en disco y deja actuar el formato condicional nativo)
  const bgs = [];
  const cleanFonts = [];
  const colA = [], colC = [], colD = [], colE = [], colH = [], colI = [], colJ = [];
  const colB = [], colF = [], colG = [];

  const sRef = "'" + SHEET_SYNC + "'";
  for (let i = 0; i < items.length; i++) {
    const r = DATA_START_ROW + i;
    const prodNo = parseInt(items[i].vals[0]);
    const sr = prodNo ? prodNo + 3 : (4 + i);
    
    // Generar fondos estándar
    const bgRow = i % 2 === 0 ? COLORS.neutral_a : COLORS.neutral_b;
    const rowBg = Array(NUM_COLS).fill(bgRow);
    rowBg[4] = COLORS.blue;               // Col E
    rowBg[COL_CANT_PEDIR - 1] = COLORS.yellow; // Col F
    rowBg[COL_RECIBIDA - 1]   = COLORS.blue;   // Col G
    bgs.push(rowBg);

    // Tipografía estándar limpia
    const rowFont = Array(NUM_COLS).fill("normal");
    rowFont[COL_CANT_PEDIR - 1] = "bold";
    rowFont[COL_RECIBIDA - 1]   = "bold";
    rowFont[8]                  = "bold"; // Col I
    rowFont[9]                  = "bold"; // Col J
    cleanFonts.push(rowFont);

    // Separar datos
    colB.push(['=' + sRef + '!B' + sr]);
    colF.push([items[i].vals[5]]);
    colG.push([items[i].vals[6]]);

    // Generar fórmulas limpias
    colA.push([prodNo]);
    colC.push(['=' + sRef + '!C' + sr]);
    colD.push(['=' + sRef + '!D' + sr]);
    colE.push(['=' + sRef + '!E' + sr]);
    colH.push(['=IF(F' + r + '=""; ""; G' + r + '-F' + r + ')']);
    colI.push(['=IF(' + sRef + '!I' + sr + '="NO"; "🚫 INACTIVO"; IF(F' + r + '="";"—";IF(G' + r + '=0;"⏳ PENDIENTE";IF(G' + r + '>=F' + r + ';"✅ COMPLETO";"⚠️ PARCIAL"))))']);
    colJ.push(['=IF(F' + r + '=""; ""; IF(G' + r + '<F' + r + '; "⚠️ INCOMPLETO"; ""))']);
  }

  // 1. Escribir los valores de las columnas editables (B, F, G) y estática A
  sheet.getRange(DATA_START_ROW, 1, count, 1).setValues(colA);
  sheet.getRange(DATA_START_ROW, 2, count, 1).setFormulas(colB);
  sheet.getRange(DATA_START_ROW, 6, count, 1).setValues(colF);
  sheet.getRange(DATA_START_ROW, 7, count, 1).setValues(colG);

  // 2. Escribir las fórmulas limpias por columnas
  sheet.getRange(DATA_START_ROW, 3, count, 1).setFormulas(colC);
  sheet.getRange(DATA_START_ROW, 4, count, 1).setFormulas(colD);
  sheet.getRange(DATA_START_ROW, 5, count, 1).setFormulas(colE);
  sheet.getRange(DATA_START_ROW, 8, count, 1).setFormulas(colH);
  sheet.getRange(DATA_START_ROW, 9, count, 1).setFormulas(colI);
  sheet.getRange(DATA_START_ROW, 10, count, 1).setFormulas(colJ);

  // 3. Escribir formatos de fondo y texto limpios
  range.setBackgrounds(bgs);
  range.setFontWeights(cleanFonts);

  // 4. Re-aplicar formatos condicionales nativos limpios y visibilidad de inactivos
  _aplicarFormatosCondicionales(sheet);
  _actualizarVisibilidadInactivos(sheet);

  // Marcar que el pedido ya fue ordenado
  PropertiesService.getScriptProperties().setProperty("IS_ORDER_SORTED", "true");
  SpreadsheetApp.getActive().toast("Pedido ordenado por categorías ✓", "⚙️ Ordenar", 3);
}

function configurarBodega() {
  const ui    = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();
  const propKey = `BODEGA_URL_${BODEGA_KEY}`;
  const urlActual = props.getProperty(propKey) || "https://docs.google.com/spreadsheets/d/1kfjtwoX1U-ELq2du1zzJgc4VgO03n28wCVdiKrweHug/";
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
  const url = bodegaUrl || PropertiesService.getScriptProperties().getProperty(`BODEGA_URL_${BODEGA_KEY}`) || "https://docs.google.com/spreadsheets/d/1kfjtwoX1U-ELq2du1zzJgc4VgO03n28wCVdiKrweHug/";
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let syncSheet = ss.getSheetByName(SHEET_SYNC);
  if (!syncSheet) {
    syncSheet = ss.insertSheet(SHEET_SYNC);
    syncSheet.hideSheet();
    syncSheet.getRange(1, 1).setValue(`⚙️ SINCRONIZACIÓN ${BODEGA_NOMBRE} — NO EDITAR`);
    syncSheet.getRange(3, 1, 1, 9).setValues([["No","CATEGORÍA","PRODUCTO","UNIDAD","SALDO","🚦","ENT_HOY","SAL_HOY","ACTIVO"]]);
  }
  const lastRow = Math.max(syncSheet.getLastRow(), 4);
  if (lastRow >= 4) syncSheet.getRange(4, 1, lastRow - 3, 9).clearContent();
  const formula = '=IMPORTRANGE("' + url + '";"'  + VISTA_MOVIL + '!A4:I")';
  syncSheet.getRange(4, 1).setFormula(formula);
  SpreadsheetApp.flush();
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

function resetearPedido() {
  let proceed = false;
  try {
    const ui = SpreadsheetApp.getUi();
    const resp = ui.alert("🗑 Resetear pedido", "¿Confirmas limpiar el pedido actual?", ui.ButtonSet.YES_NO);
    proceed = (resp === ui.Button.YES);
  } catch(e) {
    proceed = true; // Móvil bypass
  }

  if (!proceed) return;
  _resetearPedidoSilencioso();

  try {
    SpreadsheetApp.getActive().toast("Pedido reseteado ✓", "⚙️ Mise", 3);
  } catch(e) {}
}

function _resetearPedidoSilencioso() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_PEDIDO);
  if (!sheet) return;
  const count = _getProductCount();
  sheet.getRange(DATA_START_ROW, COL_CANT_PEDIR, count, 1).clearContent();
  sheet.getRange(DATA_START_ROW, COL_RECIBIDA,   count, 1).clearContent();
  
  const bgs = [];
  for (let i = 0; i < count; i++) {
    const row = Array(NUM_COLS).fill(i % 2 === 0 ? COLORS.neutral_a : COLORS.neutral_b);
    row[COL_CANT_PEDIR - 1] = COLORS.yellow;
    row[COL_RECIBIDA - 1]   = COLORS.blue;
    row[4]                  = COLORS.blue;
    bgs.push(row);
  }
  sheet.getRange(DATA_START_ROW, 1, count, NUM_COLS).setBackgrounds(bgs);

  // Restaurar las fórmulas de la columna J para limpiar cualquier texto de alerta estático
  const colJFormulas = [];
  for (let i = 0; i < count; i++) {
    const r = DATA_START_ROW + i;
    colJFormulas.push(['=IF(F' + r + '=""; ""; IF(G' + r + '<F' + r + '; "⚠️ INCOMPLETO"; ""))']);
  }
  sheet.getRange(DATA_START_ROW, 10, count, 1).setFormulas(colJFormulas);

  // Re-aplicar formatos condicionales y visibilidad de inactivos
  _aplicarFormatosCondicionales(sheet);
  _actualizarVisibilidadInactivos(sheet);

  // Resetear el flag de ordenamiento
  PropertiesService.getScriptProperties().setProperty("IS_ORDER_SORTED", "false");
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
  SpreadsheetApp.flush();
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const temp = ss.insertSheet("__temp__");
  ss.getSheets().forEach(s => { if (s.getName() !== "__temp__") { try { ss.deleteSheet(s); } catch(e) {} } });
  const pedido = ss.insertSheet(SHEET_PEDIDO);
  _buildPedidoDiario(pedido);
  const t = ss.getSheetByName("__temp__"); if (t) ss.deleteSheet(t);
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
  
  // Limpiar A2 y B2 ya que se ocultarán
  sheet.getRange("A2:B2").clearContent();

  // Botones interactivos (casillas de verificación en columnas C-H)
  sheet.getRange("C2").setValue("⚙️ Ordenar").setFontWeight("bold").setFontColor("#FFFFFF").setHorizontalAlignment("right").setVerticalAlignment("middle").setFontSize(9);
  sheet.getRange("D2").insertCheckboxes().setValue(false).setBackground("#FFFCD0");
  
  sheet.getRange("E2").setValue("🗑 Resetear").setFontWeight("bold").setFontColor("#FFFFFF").setHorizontalAlignment("right").setVerticalAlignment("middle").setFontSize(9);
  sheet.getRange("F2").insertCheckboxes().setValue(false).setBackground("#FFFCD0");
  
  sheet.getRange("G2").setValue("🔄 Sincronizar").setFontWeight("bold").setFontColor("#FFFFFF").setHorizontalAlignment("right").setVerticalAlignment("middle").setFontSize(9);
  sheet.getRange("H2").insertCheckboxes().setValue(false).setBackground("#FFFCD0");

  sheet.getRange("I2").setValue("FECHA:").setFontWeight("bold").setFontColor("#FFFFFF").setHorizontalAlignment("right").setVerticalAlignment("middle").setFontSize(9);
  sheet.getRange("J2").setFormula('=TODAY()').setBackground("#FFFCD0").setFontColor("#333333").setNumberFormat("DD/MMM/YYYY").setHorizontalAlignment("center").setVerticalAlignment("middle").setFontSize(9);

  sheet.getRange("K2").setValue("🚚 Surtido").setFontWeight("bold").setFontColor("#FFFFFF").setHorizontalAlignment("right").setVerticalAlignment("middle").setFontSize(9);
  sheet.getRange("L2").insertCheckboxes().setValue(false).setBackground("#FFFCD0");
  sheet.setRowHeight(2, 24);

  // Fila 3: Headers estables tradicionales
  sheet.getRange(3, 1, 1, NUM_COLS)
    .setValues([["No","CATEGORÍA","PRODUCTO","UNIDAD","SALDO TEÓRICO","CANT. A PEDIR","CANT. RECIBIDA","DIFERENCIA","ESTADO","ALERTAS SURTIDO","",""]])
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
  sheet.hideColumns(1, 2); // Ocultar No y Categoría
  _actualizarAvisoPedido();
}

function _aplicarFormatosCondicionales(sheet) {
  sheet.clearConditionalFormatRules();
  const count = _getProductCount();
  if (count < 1) return;
  const range = sheet.getRange(DATA_START_ROW, 1, count, NUM_COLS);
  
  // Regla 1: Alerta adición de última hora (naranja brillante)
  const ruleAdicion = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$J4="🚨 ADICIÓN"')
    .setBackground("#FFD54F")
    .setRanges([range])
    .build();
    
  // Regla 1.5: Inactivos (gris)
  const ruleInactivo = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$I4="🚫 INACTIVO"')
    .setBackground("#EEEEEE")
    .setFontColor("#9E9E9E")
    .setItalic(true)
    .setRanges([range])
    .build();
    
  // Regla 2: Completos
  const ruleCompleto = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$I4="✅ COMPLETO"')
    .setBackground(COLORS.completo)
    .setRanges([range])
    .build();
    
  // Regla 3: Parciales
  const ruleParcial = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$I4="⚠️ PARCIAL"')
    .setBackground(COLORS.parcial)
    .setRanges([range])
    .build();
    
  // Regla 4: Pendientes
  const rulePendiente = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$I4="⏳ PENDIENTE"')
    .setBackground(COLORS.pendiente)
    .setRanges([range])
    .build();
    
  sheet.setConditionalFormatRules([ruleAdicion, ruleInactivo, ruleCompleto, ruleParcial, rulePendiente]);
}

function acercaDe() {
  SpreadsheetApp.getUi().alert(`⚙️ Mise v5.0 — Pedidos ${BODEGA_NOMBRE}`, "Diseño con botones alineados a columnas visibles C-H y alertas de última hora inteligentes.");
}


function _actualizarVisibilidadInactivos(sheet) {
  const count = _getProductCount();
  if (count < 1) return;
  
  // 1. Mostrar todas las filas de golpe para resetear visibilidad
  sheet.showRows(DATA_START_ROW, count);
  
  const rangeI = sheet.getRange(DATA_START_ROW, 9, count, 1);
  const valuesI = rangeI.getValues();
  
  let startHide = -1;
  let hideCount = 0;
  
  for (let i = 0; i < count; i++) {
    const isInactive = (valuesI[i][0] === "🚫 INACTIVO");
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
  
  // Si quedó un bloque pendiente al final
  if (startHide !== -1) {
    sheet.hideRows(startHide, hideCount);
  }
}

// ── SURTIDO RÁPIDO (MOBILE-FIRST RECEPCIÓN) ───────────────────────────────────
function generarSurtidoRapido() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const pSheet = ss.getSheetByName(SHEET_PEDIDO);
  if (!pSheet) return;

  const lr = pSheet.getLastRow();
  if (lr < DATA_START_ROW) {
    try { ss.toast("No hay productos en el pedido.", "❌ Surtido", 4); } catch(e) {}
    return;
  }

  // Leer todos los datos del pedido (No, CATEGORÍA, PRODUCTO, UNIDAD, SALDO, CANT. PEDIR, CANT. RECIBIDA)
  const data = pSheet.getRange(DATA_START_ROW, 1, lr - DATA_START_ROW + 1, 7).getValues();
  const filtered = [];
  for (let i = 0; i < data.length; i++) {
    const no = data[i][0];
    const cat = data[i][1];
    const prod = data[i][2];
    const unit = data[i][3];
    const sld = data[i][4];
    const cantPedir = parseFloat(data[i][5]);
    const cantRecibida = data[i][6]; // Puede ser número o estar vacío

    if (!isNaN(cantPedir) && cantPedir > 0) {
      // Determinar estado de los checkboxes
      let completo = false;
      let inexistente = false;
      
      const numRecibida = parseFloat(cantRecibida);
      if (!isNaN(numRecibida)) {
        if (numRecibida === cantPedir) {
          completo = true;
        } else if (numRecibida === 0) {
          inexistente = true;
        }
      }
      
      filtered.push({
        rowIdxInPedido: DATA_START_ROW + i,
        no,
        cat,
        prod,
        cantPedir,
        cantRecibida,
        completo,
        inexistente
      });
    }
  }

  // Buscar o crear la pestaña de Surtido Rápido
  const sheetName = "🚚 SURTIDO RÁPIDO";
  let sSheet = ss.getSheetByName(sheetName);
  if (sSheet) {
    // Si existe, limpiar todo
    sSheet.clear();
    // Eliminar protecciones previas
    const protections = sSheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
    protections.forEach(p => { if (p.canEdit()) p.remove(); });
  } else {
    sSheet = ss.insertSheet(sheetName);
  }

  // Configurar columnas de la hoja
  sSheet.getRange("A1:G1").merge()
    .setValue(`MISE — SURTIDO RÁPIDO (${BODEGA_NOMBRE})`)
    .setBackground("#3D5A47").setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(11).setFontFamily("Arial").setHorizontalAlignment("center").setVerticalAlignment("middle");
  sSheet.setRowHeight(1, 30);

  sSheet.getRange("A2:G2").merge()
    .setValue("Instrucciones: Marca ✅ si llegó completo o ❌ si no hay. Escribe en 'CANT. RECIBIDA' si llegó parcial.")
    .setBackground("#F5EFE6").setFontColor("#333333").setFontSize(9)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sSheet.setRowHeight(2, 20);

  // Volver al Pedido (Botón interactivo de retorno)
  sSheet.getRange("A3:C3").merge()
    .setValue("📋 Volver al Pedido Diario:").setFontWeight("bold").setFontSize(9)
    .setHorizontalAlignment("right").setVerticalAlignment("middle").setBackground("#7A9E8A").setFontColor("#FFFFFF");
  sSheet.getRange("D3").insertCheckboxes().setValue(false).setBackground("#FFFCD0").setHorizontalAlignment("center");
  sSheet.getRange("E3:G3").merge().setValue("").setBackground("#F5EFE6");
  sSheet.setRowHeight(3, 24);

  // Headers de columnas
  const headers = ["No", "CATEGORÍA", "PRODUCTO", "CANT. PEDIDA", "CANT. RECIBIDA", "✅ COMPLETO", "❌ INEXISTENTE"];
  sSheet.getRange(4, 1, 1, 7)
    .setValues([headers])
    .setBackground("#3D5A47").setFontColor("#FFFFFF").setFontWeight("bold").setFontSize(9)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sSheet.setRowHeight(4, 28);
  sSheet.setFrozenRows(4);

  sSheet.setColumnWidth(1, 40);   // No
  sSheet.setColumnWidth(2, 125);  // CATEGORÍA
  sSheet.setColumnWidth(3, 210);  // PRODUCTO
  sSheet.setColumnWidth(4, 95);   // CANT. PEDIDA
  sSheet.setColumnWidth(5, 110);  // CANT. RECIBIDA (Editable)
  sSheet.setColumnWidth(6, 95);   // ✅ COMPLETO
  sSheet.setColumnWidth(7, 95);   // ❌ INEXISTENTE

  if (filtered.length === 0) {
    sSheet.getRange("A5:G5").merge()
      .setValue("No hay productos ordenados para surtir hoy (CANT. A PEDIR = 0).")
      .setFontStyle("italic").setFontColor("#C62828").setHorizontalAlignment("center").setVerticalAlignment("middle");
    sSheet.setRowHeight(5, 30);
  } else {
    const rows = filtered.length;
    const values = [];
    const bgs = [];
    const checkCompleto = [];
    const checkInexistente = [];
    
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
      
      const rowBg = Array(7).fill(bg);
      rowBg[4] = COLORS.blue; // Resaltar CANT. RECIBIDA en azul
      rowBg[5] = "#E8F5E9";  // Resaltar COMPLETO en verde claro
      rowBg[6] = "#FFEBEE";  // Resaltar INEXISTENTE en rojo claro
      bgs.push(rowBg);
      
      checkCompleto.push([item.completo]);
      checkInexistente.push([item.inexistente]);
    }

    // Escribir datos básicos
    sSheet.getRange(5, 1, rows, 5).setValues(values);
    sSheet.getRange(5, 1, rows, 7).setBackgrounds(bgs)
      .setFontFamily("Calibri").setFontSize(10).setVerticalAlignment("middle");
    
    sSheet.getRange(5, 1, rows, 1).setHorizontalAlignment("center").setFontWeight("bold");
    sSheet.getRange(5, 2, rows, 1).setHorizontalAlignment("center");
    sSheet.getRange(5, 3, rows, 1).setHorizontalAlignment("left");
    sSheet.getRange(5, 4, rows, 1).setHorizontalAlignment("right");
    sSheet.getRange(5, 5, rows, 1).setHorizontalAlignment("right");

    // Escribir checkboxes
    sSheet.getRange(5, 6, rows, 1).insertCheckboxes().setValues(checkCompleto).setHorizontalAlignment("center");
    sSheet.getRange(5, 7, rows, 1).insertCheckboxes().setValues(checkInexistente).setHorizontalAlignment("center");

    // Validar entrada numérica en la columna E (Cant. Recibida)
    const valRule = SpreadsheetApp.newDataValidation()
      .requireNumberGreaterThanOrEqualTo(0)
      .setAllowInvalid(false)
      .setHelpText("Ingresa una cantidad mayor o igual a 0.")
      .build();
    sSheet.getRange(5, 5, rows, 1).setDataValidation(valRule);

    // Proteger columnas A, B, C y D para evitar modificaciones accidentales
    try {
      const prot = sSheet.getRange(5, 1, rows, 4).protect()
        .setDescription("No modificar datos base del producto.");
      prot.removeEditors(prot.getEditors());
      if (prot.canDomainEdit()) prot.setDomainEdit(false);
    } catch(e) {}
  }

  // Activar la hoja
  ss.setActiveSheet(sSheet);
}