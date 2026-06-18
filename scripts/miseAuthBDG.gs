/**
 * MISE — Bodegas Script v1.0 (Lanzamiento Oficial)
 * Suite Atelier · La Crêpe Parisienne · Grupo MYT
 * (Reemplaza a los prototipos de la serie v0.5.0)
 *
 * INSTALAR EN: Bodegas (Google Sheets)
 * Extensiones → Apps Script → reemplazar todo → guardar → recargar hoja
 *
 * PROPÓSITO: Sistema de inventario operativo para bodega.
 * El bodeguero registra ENT/SAL diario en el KARDEX.
 * El encargado ve saldos en Pedidos Andares / Pedidos Mercado via IMPORTRANGE.
 *
 * HOJAS QUE CREA:
 *   MAESTRO        — catálogo de 131 productos
 *   KARDEX_BA      — movimientos diarios B-Andares
 *   KARDEX_BM      — movimientos diarios B-Mercado
 *   VISTA_MOVIL_BA — saldos para IMPORTRANGE (Pedidos Andares)
 *   VISTA_MOVIL_BM — saldos para IMPORTRANGE (Pedidos Mercado)
 *   CADUCIDADES    — vista consolidada de fechas de caducidad
 *   🗒 LOG         — auditoría de operaciones
 */

// ── CONSTANTES ────────────────────────────────────────────────────────────────
const BODEGAS = {
  BA: { key: "BA", nombre: "B-Andares", kardex: "KARDEX_BA", vista: "VISTA_MOVIL_BA" },
  BM: { key: "BM", nombre: "B-Mercado", kardex: "KARDEX_BM", vista: "VISTA_MOVIL_BM" }
};

const SHEET_MAESTRO  = "MAESTRO";
const SHEET_LOG      = "🗒 LOG";
const MAESTRO_START  = 4;   // fila donde empiezan datos en MAESTRO
const KARDEX_START   = 7;   // fila donde empiezan datos en KARDEX
const KARDEX_SLD_ANT = 8;   // col H — SALDO ANTERIOR
const KARDEX_SLD_FIN = 29;  // col AC — SLD domingo
const KARDEX_DAYS    = 7;
const DIAS           = ["LUN","MAR","MIE","JUE","VIE","SAB","DOM"];

// Paleta extraída del xlsx real
const C = {
  dark:    "#3D5A47",
  sage:    "#7A9E8A",
  dkGreen: "#2E5D4B",
  mdGreen: "#4A6E58",
  ltGreen: "#5C8269",
  cream:   "#F5EFE6",
  yellow:  "#FFFCD0",
  iceBlue: "#E3F2FD",
  entBg:   "#E8F5E9",
  salBg:   "#FFEBEE",
  rowA:    "#FAFAFA",
  rowB:    "#FFFFFF",
};

// ── MENÚ ──────────────────────────────────────────────────────────────────────
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("⚙️ Mise")
    .addItem("🚀 Setup completo",                         "setupCompleto")
    .addSeparator()
    .addItem("📅 Configurar semana — B-Andares",          "configurarSemanaBA")
    .addItem("📅 Configurar semana — B-Mercado",          "configurarSemanaBM")
    .addSeparator()
    .addItem("📅 Avanzar semana — B-Andares",             "avanzarSemanaBA")
    .addItem("📅 Avanzar semana — B-Mercado",             "avanzarSemanaBM")
    .addSeparator()
    .addItem("📊 Recrear VISTA_MOVIL_BA",                 "crearVistaMóvilBA")
    .addItem("📊 Recrear VISTA_MOVIL_BM",                 "crearVistaMóvilBM")
    .addItem("🏷 Recrear CADUCIDADES",                    "crearCaducidades")
    .addSeparator()
    .addItem("🆕 Agregar producto al catálogo",           "agregarProducto")
    .addItem("➕ Carga masiva de productos",             "crearHojaCargaMasiva")
    .addItem("📝 Editar productos seleccionados",         "crearHojaEdicionMasiva")
    .addItem("🔧 Restaurar validaciones de MAESTRO",     "restaurarValidacionesMaestro")
    .addSeparator()
    .addItem("🧪 Correr tests",                           "runTests")
    .addItem("🧹 Limpiar propiedades",                    "limpiarProps")
    .addSeparator()
    .addItem("ℹ️ Acerca de",                               "acercaDe")
    .addToUi();
}

// ── onEdit: REGISTRO TRANSACCIONAL Y ACCIONES ──────────────────────────────────
function onEdit(e) {
  if (!e) return;
  const sheet = e.range.getSheet();
  const name  = sheet.getName();
  const row   = e.range.getRow();
  const col   = e.range.getColumn();

  // 1. Manejo del Dropdown Nativo en MAESTRO (Desactivar/Anular productos y lote)
  if (name === SHEET_MAESTRO) {
    if (row === 2) {
      if (col === 4) { // D2 - Desactivar Seleccionados
        if (e.range.getValue() === true) {
          e.range.setValue(false);
          desactivarSeleccionadosMaestro();
        }
      } else if (col === 6) { // F2 - Activar Seleccionados
        if (e.range.getValue() === true) {
          e.range.setValue(false);
          activarSeleccionadosMaestro();
        }
      } else if (col === 8) { // H2 - Limpiar Selección
        if (e.range.getValue() === true) {
          e.range.setValue(false);
          limpiarSeleccionMaestro();
        }
      }
      return;
    }

    if (col === 6 && row >= MAESTRO_START) {
      const val = e.range.getValue();
      const lock = LockService.getScriptLock();
      if (!lock.tryLock(15000)) return;
      try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const kardexRow = row - MAESTRO_START + KARDEX_START;
        Object.values(BODEGAS).forEach(b => {
          const kSheet = ss.getSheetByName(b.kardex);
          if (kSheet) {
            if (val === "NO") {
              kSheet.hideRows(kardexRow);
            } else {
              kSheet.showRows(kardexRow);
            }
          }
        });
        // Recrear vistas
        _buildVista("BA");
        _buildVista("BM");
        crearCaducidades();
      } finally {
        lock.releaseLock();
      }
    }
    return;
  }

  // 1.5 Manejo de Carga Masiva (Checkbox Confirmar)
  if (name === "➕ AGREGAR_MÚLTIPLES") {
    if (row === 3 && col === 5) {
      if (e.range.getValue() === true) {
        procesarCargaMasiva();
      }
    }
    return;
  }

  // 1.6 Manejo de Edición Masiva (Checkbox Confirmar)
  if (name === "✏️ EDITAR_PRODUCTOS") {
    if (row === 3 && col === 5) {
      if (e.range.getValue() === true) {
        procesarEdicionMasiva();
      }
    }
    return;
  }

  let bodegaKey = null;
  if (name === BODEGAS.BA.kardex)      bodegaKey = "BA";
  else if (name === BODEGAS.BM.kardex) bodegaKey = "BM";
  else return;

  // 2. Manejo de Checkboxes Interactivos (Fila 4 en KARDEX)
  if (row === 4) {
    if (col === 11) { // K4 - Avanzar Semana
      if (e.range.getValue() === true) {
        e.range.setValue(false);
        _avanzarSemana(bodegaKey);
      }
    } else if (col === 14) { // N4 - Recrear Vista Móvil
      if (e.range.getValue() === true) {
        e.range.setValue(false);
        _buildVista(bodegaKey);
        SpreadsheetApp.getActive().toast(`VISTA_MOVIL_${bodegaKey} recreada`, "⚙️ Mise", 4);
      }
    } else if (col === 17) { // Q4 - Agregar Producto
      if (e.range.getValue() === true) {
        e.range.setValue(false);
        agregarProducto();
      }
    } else if (col === 20) { // T4 - Anular Producto
      if (e.range.getValue() === true) {
        e.range.setValue(false);
        anularProducto();
      }
    }
    return;
  }

  if (row < KARDEX_START) return;

  // 3. Solo reaccionar a columnas ENT o SAL para validación rápida
  let tipo = null;
  for (let d = 0; d < KARDEX_DAYS; d++) {
    if (col === 9 + d * 3)     { tipo = "ENT"; break; }
    if (col === 9 + d * 3 + 1) { tipo = "SAL"; break; }
  }
  if (!tipo) return;

  const val = e.range.getValue();
  if (val !== "" && (typeof val !== "number" || val < 0)) {
    e.range.clearContent();
    SpreadsheetApp.getActive().toast(`${tipo} debe ser número ≥ 0`, "⚙️ Mise", 4);
  }
}

// ── SETUP COMPLETO CORREGIDO SIN ERRORES DE ACCESO ───────────────────────────
function setupCompleto() {
  const ui   = SpreadsheetApp.getUi();
  const resp = ui.alert(
    "🚀 Setup completo",
    "Se borrarán TODAS las hojas del libro y se creará el sistema desde cero.\n\n¿Continuar?",
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;

  // 1. Limpiar propiedades de versiones anteriores
  PropertiesService.getScriptProperties().deleteAllProperties();
  SpreadsheetApp.flush(); // 🔥 FIX 1: Forzar el borrado inmediato en los servidores de Google

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Borrar todo excepto una hoja temporal (Sheets necesita mínimo 1)
  const temp = ss.insertSheet("__temp__");
  ss.getSheets().forEach(s => {
    if (s.getName() !== "__temp__") {
      try { ss.deleteSheet(s); } catch(e) {}
    }
  });

  // 2. MAESTRO
  SpreadsheetApp.getActive().toast("Creando MAESTRO...", "⚙️ Mise", 3);
  const maestro = ss.insertSheet(SHEET_MAESTRO);
  _buildMaestro(maestro);
  SpreadsheetApp.flush(); // 🔥 FIX 2: Forzar a que los 131 productos se escriban en físico YA antes de avanzar

  // 3. KARDEX
  SpreadsheetApp.getActive().toast("Creando KARDEX...", "⚙️ Mise", 3);
  Object.values(BODEGAS).forEach(b => {
    const k = ss.insertSheet(b.kardex);
    _buildKardex(k, b.nombre);
    _poblarKardex(k);
  });
  SpreadsheetApp.flush(); // 🔥 FIX 3: Asegurar que las fórmulas de los Kardex se asienten bien

  // 4. VISTAS MÓVIL
  SpreadsheetApp.getActive().toast("Creando VISTAS MÓVIL...", "⚙️ Mise", 3);
  Object.keys(BODEGAS).forEach(key => _buildVista(key));
  
  // 5. CADUCIDADES
  SpreadsheetApp.getActive().toast("Creando CADUCIDADES...", "⚙️ Mise", 3);
  crearCaducidades();

  // Eliminar hoja temporal
  const t = ss.getSheetByName("__temp__");
  if (t) ss.deleteSheet(t);

  _log("setupCompleto", "Sistema creado desde cero");
  ui.alert("✅ Setup completo", `Sistema listo.\n\nPróximos pasos:\n1. ⚙️ Mise → Configurar semana\n2. ⚙️ Mise → Correr tests\n3. Configurar IMPORTRANGE en Pedidos Andares o Pedidos Mercado`, ui.ButtonSet.OK);
}

// ── CONSTRUCCIÓN: MAESTRO ─────────────────────────────────────────────────────
function _buildMaestro(sheet) {
  sheet.getRange(1, 1, 1, 9).merge()
    .setValue("MISE — MAESTRO DE PRODUCTOS   |   La Crêpe Parisienne · Grupo MYT")
    .setBackground(C.dark).setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(11).setFontFamily("Arial").setHorizontalAlignment("center");
  sheet.setRowHeight(1, 32);

  // Fila 2: Acciones por Lote
  sheet.getRange(2, 1, 1, 9).setBackground(C.cream);
  sheet.getRange("A2:B2").merge()
    .setValue("⚠️ Acciones por lote:").setFontWeight("bold").setFontColor(C.dark)
    .setHorizontalAlignment("right").setVerticalAlignment("middle").setFontSize(9);
  sheet.getRange("C2").setValue("Desactivar").setFontWeight("bold").setFontColor(C.dark).setHorizontalAlignment("right").setVerticalAlignment("middle").setFontSize(9);
  sheet.getRange("D2").insertCheckboxes().setValue(false).setBackground(C.yellow);
  sheet.getRange("E2").setValue("Activar").setFontWeight("bold").setFontColor(C.dark).setHorizontalAlignment("right").setVerticalAlignment("middle").setFontSize(9);
  sheet.getRange("F2").insertCheckboxes().setValue(false).setBackground(C.yellow);
  sheet.getRange("G2").setValue("Limpiar Sel.").setFontWeight("bold").setFontColor(C.dark).setHorizontalAlignment("right").setVerticalAlignment("middle").setFontSize(9);
  sheet.getRange("H2").insertCheckboxes().setValue(false).setBackground(C.yellow);
  sheet.getRange("I2").setValue("").setBackground(C.cream);
  sheet.setRowHeight(2, 24);

  sheet.getRange(3, 1, 1, 9)
    .setValues([["No","ID_FAMILIA","PRODUCTO","PRESENTACION","UNIDAD","ACTIVO","MÍN","MÁX","SELECCIONAR"]])
    .setBackground(C.sage).setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(10).setHorizontalAlignment("center");
  sheet.setRowHeight(3, 26);
  sheet.setFrozenRows(3);

  sheet.setColumnWidth(1, 32);
  sheet.setColumnWidth(2, 110);
  sheet.setColumnWidth(3, 210);
  sheet.setColumnWidth(4, 140);
  sheet.setColumnWidth(5, 70);
  sheet.setColumnWidth(6, 60);
  sheet.setColumnWidth(7, 55);
  sheet.setColumnWidth(8, 55);
  sheet.setColumnWidth(9, 85);

  const datos = _catalogo();
  // Poblar datos con la columna extra SELECCIONAR en falso
  const maestroDatos = datos.map(r => [r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], false]);
  sheet.getRange(MAESTRO_START, 1, datos.length, 9).setValues(maestroDatos);
  const bgs = datos.map((_, i) => Array(9).fill(i % 2 === 0 ? C.rowA : C.rowB));
  sheet.getRange(MAESTRO_START, 1, datos.length, 9).setBackgrounds(bgs);
  
  // Añadir validación dropdown (SÍ/NO) en columna F (col 6)
  const validationRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["SÍ", "NO"], true)
    .setAllowInvalid(false)
    .setHelpText("Selecciona SÍ o NO para activar/desactivar el producto.")
    .build();
  sheet.getRange(MAESTRO_START, 6, datos.length, 1).setDataValidation(validationRule);

  // Añadir checkboxes en columna I (col 9)
  sheet.getRange(MAESTRO_START, 9, datos.length, 1).insertCheckboxes().setValue(false);

  // Formato condicional de seleccion e inactivos
  sheet.clearConditionalFormatRules();
  const cfRange = sheet.getRange(MAESTRO_START, 1, datos.length, 9);
  const selectionRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$I' + MAESTRO_START + '=TRUE')
    .setBackground("#E3F2FD")
    .setRanges([cfRange])
    .build();
    
  const inactiveRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$F' + MAESTRO_START + '="NO"')
    .setBackground("#EEEEEE")
    .setFontColor("#9E9E9E")
    .setRanges([cfRange])
    .build();
    
  sheet.setConditionalFormatRules([selectionRule, inactiveRule]);
}

// ── CONSTRUCCIÓN: KARDEX COMPLETAMENTE LIMPIO Y SIMÉTRICO ──────────────────
function _buildKardex(sheet, nombre) {
  // Asegurar columnas suficientes (necesita hasta col 29)
  const needed = 29;
  if (sheet.getMaxColumns() < needed) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), Math.max(1, needed - sheet.getMaxColumns()));
  }

  // Fila 1: leyenda semáforo caducidad
  sheet.getRange(1, 1, 1, 8)
    .setValues([["🔴 CAD","🔴 ≤2d","🟠 ≤7d","🟡 ≤14d","🟤 ≤28d","🔵 ≤60d","🟢 OK","⚪ S/F"]])
    .setFontSize(8).setBackground("#F5F5F5").setFontColor("#666666")
    .setHorizontalAlignment("center");
  sheet.setRowHeight(1, 18);

  // Fila 2: título
  sheet.getRange(2, 1, 1, 29).merge()
    .setValue(`MISE — KARDEX ${nombre}   |   La Crêpe Parisienne`)
    .setBackground(C.dark).setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(11).setFontFamily("Arial").setHorizontalAlignment("center");
  sheet.setRowHeight(2, 30);

  // Filas 3-4: semana (FIX VISUAL: Combinación horizontal y alineación intermedia)
  const headersSemana = [
    { rangeHeader: "A3:B3", rangeData: "B4", label: "SEMANA" },
    { rangeHeader: "C3:D3", rangeData: "D4", label: "FECHA INI" },
    { rangeHeader: "E3:F3", rangeData: "F4", label: "FECHA FIN" },
    { rangeHeader: "G3:H3", rangeData: "H4", label: "SUCURSAL" }
  ];

  headersSemana.forEach(h => {
    sheet.getRange(h.rangeHeader).merge()
      .setValue(h.label)
      .setFontWeight("bold")
      .setBackground(C.sage)
      .setFontColor("#FFFFFF")
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setFontSize(9);
  });

  // Forzar que los datos de la fila 4 compartan alineación vertical intermedia simétrica
  sheet.getRange("B4:H4")
    .setFontFamily("Calibri")
    .setFontSize(10)
    .setVerticalAlignment("middle");

  sheet.getRange('B4').setFormula('=IFERROR(ISOWEEKNUM(D4);"")')
    .setBackground(C.yellow).setHorizontalAlignment("center");
  sheet.getRange("D4").setBackground(C.yellow).setNumberFormat("DD/MMM/YYYY")
    .setHorizontalAlignment("center");
  sheet.getRange('F4').setFormula('=IFERROR(D4+6;"")')
    .setBackground(C.yellow).setNumberFormat("DD/MMM/YYYY").setHorizontalAlignment("center");
  sheet.getRange("H4").setValue(nombre).setBackground(C.yellow).setHorizontalAlignment("center");
  
  sheet.getRange("D4").setDataValidation(
    SpreadsheetApp.newDataValidation().requireDate()
      .setHelpText("LUNES de la semana. Usar ⚙️ Mise → Configurar semana.").build()
  );

  // Botones interactivos (casillas de verificación para UX móvil)
  sheet.getRange("J4").setValue("⚙️ Avanzar Sem.").setHorizontalAlignment("right").setFontWeight("bold").setFontSize(8).setFontColor("#FFFFFF").setBackground(C.dark);
  sheet.getRange("K4").insertCheckboxes().setValue(false).setBackground(C.yellow).setHorizontalAlignment("center");

  sheet.getRange("M4").setValue("🔄 Recrear Vista").setHorizontalAlignment("right").setFontWeight("bold").setFontSize(8).setFontColor("#FFFFFF").setBackground(C.dark);
  sheet.getRange("N4").insertCheckboxes().setValue(false).setBackground(C.yellow).setHorizontalAlignment("center");

  sheet.getRange("P4").setValue("🆕 Nuevo Prod.").setHorizontalAlignment("right").setFontWeight("bold").setFontSize(8).setFontColor("#FFFFFF").setBackground(C.dark);
  sheet.getRange("Q4").insertCheckboxes().setValue(false).setBackground(C.yellow).setHorizontalAlignment("center");

  sheet.getRange("S4").setValue("🚫 Anular Prod.").setHorizontalAlignment("right").setFontWeight("bold").setFontSize(8).setFontColor("#FFFFFF").setBackground(C.dark);
  sheet.getRange("T4").insertCheckboxes().setValue(false).setBackground(C.yellow).setHorizontalAlignment("center");

  sheet.setRowHeight(3, 22);
  sheet.setRowHeight(4, 22);

  // Fila 5: sección datos + días
  sheet.getRange(5, 1, 1, 8).merge()
    .setValue("DATOS DEL PRODUCTO")
    .setBackground(C.dark).setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(9).setHorizontalAlignment("center");
  DIAS.forEach((dia, idx) => {
    const sc = 9 + idx * 3;
    sheet.getRange(5, sc, 1, 3).merge().setValue(dia)
      .setBackground(idx % 2 === 0 ? C.mdGreen : C.ltGreen)
      .setFontColor("#FFFFFF").setFontWeight("bold").setFontSize(9).setHorizontalAlignment("center");
  });
  sheet.setRowHeight(5, 22);

  // Fila 6: headers de columna
  sheet.getRange(6, 1, 1, 8)
    .setValues([["No","PRODUCTO","PRESENTACIÓN","UNIDAD","CADUCIDAD","LOTE","🚦","SALDO\nANT"]])
    .setBackground(C.dark).setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(9).setHorizontalAlignment("center").setVerticalAlignment("middle");
  DIAS.forEach((_, idx) => {
    const sc = 9 + idx * 3;
    sheet.getRange(6, sc).setValue("ENT").setBackground(C.entBg)
      .setFontColor(C.dkGreen).setFontWeight("bold").setFontSize(8).setHorizontalAlignment("center");
    sheet.getRange(6, sc + 1).setValue("SAL").setBackground(C.salBg)
      .setFontColor("#C62828").setFontWeight("bold").setFontSize(8).setHorizontalAlignment("center");
    sheet.getRange(6, sc + 2).setValue("SLD").setBackground(C.dkGreen)
      .setFontColor("#FFFFFF").setFontWeight("bold").setFontSize(8).setHorizontalAlignment("center");
  });
  sheet.setRowHeight(6, 28);
  sheet.setFrozenRows(6);

  // FIX DE ANCHOS: Columnas de cabecera perfectamente equilibradas y holgadas
  sheet.setColumnWidth(1, 45);   // A — No
  sheet.setColumnWidth(2, 185);  // B — PRODUCTO
  sheet.setColumnWidth(3, 115);  // C — PRESENTACIÓN
  sheet.setColumnWidth(4, 115);  // D — UNIDAD (Fecha Ini Input)
  sheet.setColumnWidth(5, 115);  // E — CADUCIDAD
  sheet.setColumnWidth(6, 115);  // F — LOTE
  sheet.setColumnWidth(7, 65);   // G — 🚦
  sheet.setColumnWidth(8, 110);  // H — SALDO ANT (Nombre de sucursal completo)
  
  for (let d = 0; d < 7; d++) {
    sheet.setColumnWidth(9 + d * 3, 52);
    sheet.setColumnWidth(10 + d * 3, 52);
    sheet.setColumnWidth(11 + d * 3, 62);
  }

  // Formato fecha col E y validación de fecha
  sheet.getRange(KARDEX_START, 5, 200, 1).setNumberFormat("DD/MMM/YY");
  sheet.getRange(KARDEX_START, 5, 200, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireDate()
      .setHelpText("Fecha de caducidad del lote").build()
  );

  // Semáforo col G: formato condicional por texto (8 niveles)
  const cfR = sheet.getRange(KARDEX_START, 7, 200, 1);
  sheet.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("🔴 CAD")
      .setBackground("#FFCDD2").setFontColor("#B71C1C").setBold(true).setRanges([cfR]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("🔴 ≤2d")
      .setBackground("#FFCDD2").setFontColor("#B71C1C").setRanges([cfR]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("🟠 ≤7d")
      .setBackground("#FFE0B2").setFontColor("#BF360C").setRanges([cfR]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("🟡 ≤14d")
      .setBackground("#FFF9C4").setFontColor("#F57F17").setRanges([cfR]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("🟤 ≤28d")
      .setBackground("#EFEBE9").setFontColor("#4E342E").setRanges([cfR]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("🔵 ≤60d")
      .setBackground("#E3F2FD").setFontColor("#0D47A1").setRanges([cfR]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("🟢 OK")
      .setBackground("#C8E6C9").setFontColor("#1B5E20").setRanges([cfR]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("⚪ S/F")
      .setBackground(C.yellow).setFontColor("#555555").setRanges([cfR]).build(),
  ]);
}

// ── POBLAR KARDEX DESDE MAESTRO ───────────────────────────────────────────────
function _poblarKardex(sheet) {
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const maestro = ss.getSheetByName(SHEET_MAESTRO);
  if (!maestro) return;

  const lr   = maestro.getLastRow();
  if (lr < MAESTRO_START) return;

  const data = maestro.getRange(MAESTRO_START, 1, lr - MAESTRO_START + 1, 8).getValues();
  const prods = data.filter(r => r[0] !== "" && r[0] !== null);
  if (prods.length === 0) return;

  const count = prods.length;

  // Cols A-D: No, PRODUCTO, PRESENTACIÓN, UNIDAD
  sheet.getRange(KARDEX_START, 1, count, 4)
    .setValues(prods.map(p => [p[0], p[2], p[3], p[4]]));

  // 🔥 FIX SEMÁFORO DINÁMICO: Inyectar fórmula de Sheets para calcular caducidad en tiempo real
  const formulasSemaforo = [];
  for (let r = 0; r < count; r++) {
    const rn = KARDEX_START + r; // Fila actual en el Kardex
    
    // Fórmula regionalizada que evalúa la diferencia de días entre la Col E (Caducidad) y HOY()
    const formulaCad = '=IF(ISBLANK(E' + rn + '); "⚪ S/F"; ' +
                       'IF(E' + rn + '-TODAY()<=0; "🔴 CAD"; ' +
                       'IF(E' + rn + '-TODAY()<=2; "🔴 ≤2d"; ' +
                       'IF(E' + rn + '-TODAY()<=7; "🟠 ≤7d"; ' +
                       'IF(E' + rn + '-TODAY()<=14; "🟡 ≤14d"; ' +
                       'IF(E' + rn + '-TODAY()<=28; "🟤 ≤28d"; ' +
                       'IF(E' + rn + '-TODAY()<=60; "🔵 ≤60d"; "🟢 OK")))))))';
    formulasSemaforo.push([formulaCad]);
  }
  
  // Asignar las fórmulas en masa a la columna 7 (Col G - 🚦)
  sheet.getRange(KARDEX_START, 7, count, 1).setFormulas(formulasSemaforo);

  // Fórmulas SLD para cada día: SLD = SLDprev + ENT - SAL
  for (let d = 0; d < KARDEX_DAYS; d++) {
    const sldCol  = 11 + d * 3;
    const prevCol = 8  + d * 3;
    const entCol  = 9  + d * 3;
    const salCol  = 10 + d * 3;
    const formulas = [];
    for (let r = 0; r < count; r++) {
      const rn = KARDEX_START + r;
      formulas.push(['=' + _col(prevCol) + rn + '+IFERROR(' + _col(entCol) + rn + ';0)-IFERROR(' + _col(salCol) + rn + ';0)']);
    }
    sheet.getRange(KARDEX_START, sldCol, count, 1).setFormulas(formulas);
  }

  // Formato visual filas alternas
  const bgs = prods.map((_, i) => Array(29).fill(i % 2 === 0 ? C.rowA : C.rowB));
  sheet.getRange(KARDEX_START, 1, count, 29).setBackgrounds(bgs);
  sheet.getRange(KARDEX_START, 8, count, 1).setBackgrounds(Array(count).fill([C.iceBlue]));
  // ENT verde, SAL rosa, SLD azul hielo por día
  for (let d = 0; d < KARDEX_DAYS; d++) {
    sheet.getRange(KARDEX_START, 9  + d * 3, count, 1).setBackgrounds(Array(count).fill([C.entBg]));
    sheet.getRange(KARDEX_START, 10 + d * 3, count, 1).setBackgrounds(Array(count).fill([C.salBg]));
    sheet.getRange(KARDEX_START, 11 + d * 3, count, 1).setBackgrounds(Array(count).fill([C.iceBlue]));
  }
}

// ── CONSTRUCCIÓN: VISTA MÓVIL ─────────────────────────────────────────────────
function crearVistaMóvilBA() { _buildVista("BA"); }
function crearVistaMóvilBM() { _buildVista("BM"); }

function _buildVista(key) {
  const bodega = BODEGAS[key];
  const ss     = SpreadsheetApp.getActiveSpreadsheet();

  let sheet = ss.getSheetByName(bodega.vista);
  if (sheet) ss.deleteSheet(sheet);
  sheet = ss.insertSheet(bodega.vista);

  // Header — 8 cols (incluye ACTIVO)
  sheet.getRange(1, 1, 1, 8).merge()
    .setValue(`MISE — VISTA MÓVIL · ${bodega.nombre}   |   La Crêpe Parisienne`)
    .setBackground(C.dark).setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(11).setFontFamily("Arial").setHorizontalAlignment("center");
  sheet.setRowHeight(1, 30);

  sheet.getRange(2, 1, 1, 8).merge()
    .setValue("Solo lectura. Fuente del IMPORTRANGE para Pedidos Andares / Pedidos Mercado.")
    .setBackground(C.cream).setFontColor(C.dark).setFontSize(9).setHorizontalAlignment("center");
  sheet.setRowHeight(2, 20);

  sheet.getRange(3, 1, 1, 8)
    .setValues([["No","PRODUCTO","UNIDAD","SALDO ACTUAL","🚦 STOCK","ENT HOY","SAL HOY","ACTIVO"]])
    .setBackground(C.sage).setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(10).setHorizontalAlignment("center");
  sheet.setRowHeight(3, 26);
  sheet.setFrozenRows(3);

  // Poblar desde KARDEX vía referencia directa (sin INDIRECT)
  const kardex = ss.getSheetByName(bodega.kardex);
  if (!kardex) return;

  const lr = kardex.getLastRow();
  if (lr < KARDEX_START) return;

  const data  = kardex.getRange(KARDEX_START, 1, lr - KARDEX_START + 1, 4).getValues();
  const prods = data.map((r, i) => ({ no: r[0], nombre: String(r[1]).trim(), unidad: r[3], srcRow: KARDEX_START + i }))
    .filter(p => p.nombre && p.no);
  const count = prods.length;
  if (count === 0) return;

  const DR  = 4;
  const ref = _quoteName(bodega.kardex);

  sheet.getRange(DR, 1, count, 1).setValues(prods.map(p => [p.no]));
  sheet.getRange(DR, 2, count, 1).setValues(prods.map(p => [p.nombre]));
  sheet.getRange(DR, 3, count, 1).setValues(prods.map(p => [p.unidad]));

  // Col D: saldo actual = SLD domingo (col AC = 29)
  sheet.getRange(DR, 4, count, 1)
    .setFormulas(prods.map(p => ['=IFERROR(' + ref + '!AC' + p.srcRow + '*1;0)']))
    .setNumberFormat("0.##");

  // Col E: semáforo de stock
  const maestro = ss.getSheetByName(SHEET_MAESTRO);
  const mlr     = maestro.getLastRow();
  const mData   = maestro.getRange(MAESTRO_START, 1, mlr - MAESTRO_START + 1, 7).getValues()
    .filter(r => r[0] !== "");

  const semaforos = prods.map((p, i) => {
    const saldo = sheet.getRange(DR + i, 4).getValue() || 0;
    const min   = (mData[i] && mData[i][6]) ? mData[i][6] : 0;
    if (min === 0) return ["⚪"];
    if (saldo < min)       return ["🔴"];
    if (saldo < min * 1.5) return ["🟡"];
    return ["🟢"];
  });
  sheet.getRange(DR, 5, count, 1).setValues(semaforos);

  // Cols F y G: ENT HOY y SAL HOY dinámicos con WEEKDAY(TODAY())
  const entCols = ["I","L","O","R","U","X","AA"];
  const salCols = ["J","M","P","S","V","Y","AB"];

  const entFormulas = prods.map(p => {
    const kr = p.srcRow;
    const entRefs = entCols.map(c => ref + '!' + c + kr).join(';');
    return ['=IFERROR(CHOOSE(WEEKDAY(TODAY();2);' + entRefs + ');0)'];
  });

  const salFormulas = prods.map(p => {
    const kr = p.srcRow;
    const salRefs = salCols.map(c => ref + '!' + c + kr).join(';');
    return ['=IFERROR(CHOOSE(WEEKDAY(TODAY();2);' + salRefs + ');0)'];
  });

  sheet.getRange(DR, 6, count, 1).setFormulas(entFormulas).setNumberFormat("0.##");
  sheet.getRange(DR, 7, count, 1).setFormulas(salFormulas).setNumberFormat("0.##");

  // Col H: ACTIVO (Col F en MAESTRO)
  const refMaestro = _quoteName(SHEET_MAESTRO);
  sheet.getRange(DR, 8, count, 1)
    .setFormulas(prods.map(p => ['=' + refMaestro + '!F' + (p.srcRow - KARDEX_START + MAESTRO_START)]));

  // Formato
  const bgs = prods.map((_, i) => Array(8).fill(i % 2 === 0 ? C.rowA : C.rowB));
  sheet.getRange(DR, 1, count, 8).setBackgrounds(bgs);
  sheet.getRange(DR, 4, count, 1).setBackgrounds(Array(count).fill([C.iceBlue]));
  sheet.getRange(DR, 6, count, 1).setBackgrounds(Array(count).fill([C.entBg]));
  sheet.getRange(DR, 7, count, 1).setBackgrounds(Array(count).fill([C.salBg]));
  sheet.getRange(DR, 5, count, 1).setHorizontalAlignment("center").setFontWeight("bold");
  sheet.getRange(DR, 2, count, 1).setHorizontalAlignment("left");
  sheet.getRange(DR, 1, count, 8)
    .setFontFamily("Calibri").setFontSize(10).setVerticalAlignment("middle").setHorizontalAlignment("center");

  // CF: SALDO < 1 = fondo rojo
  sheet.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(1)
      .setBackground("#FFCDD2").setFontColor("#B71C1C")
      .setRanges([sheet.getRange(DR, 4, count, 1)]).build()
  ]);

  sheet.setColumnWidth(1, 40);  sheet.setColumnWidth(2, 210);
  sheet.setColumnWidth(3, 75);  sheet.setColumnWidth(4, 105);
  sheet.setColumnWidth(5, 65);  sheet.setColumnWidth(6, 80);
  sheet.setColumnWidth(7, 80);  sheet.setColumnWidth(8, 70);

  _log("_buildVista", `${bodega.nombre}: ${count} productos`);
}

// ── CADUCIDADES (vista simple, sin INDIRECT) ──────────────────────────────────
function crearCaducidades() {
  const ss     = SpreadsheetApp.getActiveSpreadsheet();
  const NOMBRE = "CADUCIDADES";

  let sheet = ss.getSheetByName(NOMBRE);
  if (sheet) ss.deleteSheet(sheet);
  sheet = ss.insertSheet(NOMBRE);

  // Layout de columnas:
  // A=No  B=PRODUCTO  C=CAT  D=UND
  // E=CAD_BA  F=LOTE_BA  G=🚦_BA
  // H=SEP (separador visual)
  // I=CAD_BM  J=LOTE_BM  K=🚦_BM
  // L=⚡VENCE PRIMERO (cuál bodega tiene el lote más próximo a vencer)
  const TOTAL_COLS = 12;
  if (sheet.getMaxColumns() < TOTAL_COLS) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), TOTAL_COLS - sheet.getMaxColumns());
  }

  // Fila 1: título completo
  sheet.getRange(1, 1, 1, TOTAL_COLS).merge()
    .setValue("MISE — CADUCIDADES   |   La Crêpe Parisienne · Grupo MYT")
    .setBackground(C.dark).setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(11).setFontFamily("Arial").setHorizontalAlignment("center");
  sheet.setRowHeight(1, 30);

  // Fila 2: leyenda semáforo
  sheet.getRange(2, 1, 1, 8)
    .setValues([["🔴 CAD","🔴 ≤2d","🟠 ≤7d","🟡 ≤14d","🟤 ≤28d","🔵 ≤60d","🟢 OK","⚪ S/F"]])
    .setFontSize(8).setBackground("#F5F5F5").setFontColor("#666666").setHorizontalAlignment("center");
  sheet.setRowHeight(2, 18);

  // Fila 3: headers de sección — dos bloques + separador
  // Bloque info
  sheet.getRange(3, 1, 1, 4)
    .setValues([["No","PRODUCTO","CAT","UND"]])
    .setBackground(C.dark).setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(9).setHorizontalAlignment("center");

  // Bloque B-Andares
  sheet.getRange(3, 5, 1, 3)
    .setValues([["CADUCIDAD","LOTE","🚦"]])
    .setBackground(C.mdGreen).setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(9).setHorizontalAlignment("center");
  // Encabezado de bodega sobre el bloque
  sheet.getRange("E2:G2").merge()
    .setValue("B-ANDARES")
    .setBackground(C.mdGreen).setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(9).setHorizontalAlignment("center");

  // Separador columna H
  sheet.getRange(3, 8).setValue("|")
    .setBackground(C.dark).setFontColor(C.dark).setHorizontalAlignment("center");
  sheet.getRange("H2").setValue("|").setBackground(C.dark).setFontColor(C.dark);

  // Bloque B-Mercado
  sheet.getRange(3, 9, 1, 3)
    .setValues([["CADUCIDAD","LOTE","🚦"]])
    .setBackground(C.ltGreen).setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(9).setHorizontalAlignment("center");
  sheet.getRange("I2:K2").merge()
    .setValue("B-MERCADO")
    .setBackground(C.ltGreen).setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(9).setHorizontalAlignment("center");

  // Columna ⚡
  sheet.getRange(3, 12).setValue("⚡ VENCE ANTES")
    .setBackground(C.dark).setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(9).setHorizontalAlignment("center");
  sheet.getRange("L2").setValue("⚡").setBackground(C.dark).setFontColor("#FFFFFF")
    .setHorizontalAlignment("center");

  sheet.setRowHeight(2, 20);
  sheet.setRowHeight(3, 26);
  sheet.setFrozenRows(3);

  // Construir mapa separado por bodega: nombre → row en ese KARDEX
  const mapBA = {}, mapBM = {};
  const maps  = { BA: mapBA, BM: mapBM };

  Object.entries(BODEGAS).forEach(([key, b]) => {
    const ks = ss.getSheetByName(b.kardex);
    if (!ks) return;
    const lr = ks.getLastRow();
    if (lr < KARDEX_START) return;
    const rows = ks.getRange(KARDEX_START, 1, lr - KARDEX_START + 1, 2).getValues();
    rows.forEach((row, i) => {
      const nombre = String(row[1]).trim();
      if (nombre) maps[key][nombre] = KARDEX_START + i;
    });
  });

  // Datos desde MAESTRO
  const maestro = ss.getSheetByName(SHEET_MAESTRO);
  const lr2     = maestro.getLastRow();
  const mData   = maestro.getRange(MAESTRO_START, 1, lr2 - MAESTRO_START + 1, 5).getValues()
    .filter(r => r[0] !== "");

  const DR    = 4;
  const count = mData.length;
  const refBA = _quoteName(BODEGAS.BA.kardex);
  const refBM = _quoteName(BODEGAS.BM.kardex);

  mData.forEach((p, i) => {
    const r      = DR + i;
    const nombre = String(p[2]).trim();
    const bg     = i % 2 === 0 ? C.rowA : C.rowB;
    const cat    = p[1] ? p[1].split("-")[0] : "";

    // Cols A-D: info del producto
    sheet.getRange(r, 1).setValue(p[0]).setBackground(bg).setHorizontalAlignment("center");
    sheet.getRange(r, 2).setValue(nombre).setBackground(bg).setHorizontalAlignment("left");
    sheet.getRange(r, 3).setValue(cat).setBackground(bg).setHorizontalAlignment("center");
    sheet.getRange(r, 4).setValue(p[4]).setBackground(bg).setHorizontalAlignment("center");

    // Cols E-G: B-Andares
    const krBA = mapBA[nombre];
    if (krBA) {
      sheet.getRange(r, 5).setFormula('=IFERROR(' + refBA + '!E' + krBA + ';"")')
        .setNumberFormat("DD/MMM/YY").setBackground(bg);
      sheet.getRange(r, 6).setFormula('=' + refBA + '!F' + krBA).setBackground(bg);
      sheet.getRange(r, 7).setFormula('=' + refBA + '!G' + krBA).setBackground(C.yellow);
    } else {
      sheet.getRange(r, 5).setValue("").setBackground(bg);
      sheet.getRange(r, 6).setValue("").setBackground(bg);
      sheet.getRange(r, 7).setValue("⚪ S/F").setBackground(C.yellow);
    }

    // Col H: separador visual
    sheet.getRange(r, 8).setValue("").setBackground(C.dark);

    // Cols I-K: B-Mercado
    const krBM = mapBM[nombre];
    if (krBM) {
      sheet.getRange(r, 9).setFormula('=IFERROR(' + refBM + '!E' + krBM + ';"")')
        .setNumberFormat("DD/MMM/YY").setBackground(bg);
      sheet.getRange(r, 10).setFormula('=' + refBM + '!F' + krBM).setBackground(bg);
      sheet.getRange(r, 11).setFormula('=' + refBM + '!G' + krBM).setBackground(C.yellow);
    } else {
      sheet.getRange(r, 9).setValue("").setBackground(bg);
      sheet.getRange(r, 10).setValue("").setBackground(bg);
      sheet.getRange(r, 11).setValue("⚪ S/F").setBackground(C.yellow);
    }

    // Col L: ⚡ VENCE ANTES — cuál bodega tiene la caducidad más próxima
    // Fórmula: compara E (BA) e I (BM). Si ambas vacías → "—"
    // Si solo una tiene fecha → esa. Si ambas → la menor.
    const eRef = 'E' + r;
    const iRef = 'I' + r;
    sheet.getRange(r, 12)
      .setFormula('=IF(AND(E' + r + '="";I' + r + '="");"—";IF(E' + r + '="";"B-Mercado";IF(I' + r + '="";"B-Andares";IF(E' + r + '<=I' + r + ';"B-Andares";"B-Mercado"))))')
      .setHorizontalAlignment("center").setBackground(bg);
  });

  // Anchos de columna
  sheet.setColumnWidth(1, 32);   // No
  sheet.setColumnWidth(2, 195);  // PRODUCTO
  sheet.setColumnWidth(3, 50);   // CAT
  sheet.setColumnWidth(4, 50);   // UND
  sheet.setColumnWidth(5, 90);   // CAD_BA
  sheet.setColumnWidth(6, 85);   // LOTE_BA
  sheet.setColumnWidth(7, 50);   // 🚦_BA
  sheet.setColumnWidth(8, 8);    // SEP
  sheet.setColumnWidth(9, 90);   // CAD_BM
  sheet.setColumnWidth(10, 85);  // LOTE_BM
  sheet.setColumnWidth(11, 50);  // 🚦_BM
  sheet.setColumnWidth(12, 95);  // ⚡

  // Formato condicional: semáforos BA (col G) y BM (col K)
  const _cfRules = (range) => [
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("🔴 CAD")
      .setBackground("#FFCDD2").setFontColor("#B71C1C").setBold(true).setRanges([range]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("🔴 ≤2d")
      .setBackground("#FFCDD2").setFontColor("#B71C1C").setRanges([range]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("🟠 ≤7d")
      .setBackground("#FFE0B2").setFontColor("#BF360C").setRanges([range]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("🟡 ≤14d")
      .setBackground("#FFF9C4").setFontColor("#F57F17").setRanges([range]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("🟤 ≤28d")
      .setBackground("#EFEBE9").setFontColor("#4E342E").setRanges([range]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("🔵 ≤60d")
      .setBackground("#E3F2FD").setFontColor("#0D47A1").setRanges([range]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("🟢 OK")
      .setBackground("#C8E6C9").setFontColor("#1B5E20").setRanges([range]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("⚪ S/F")
      .setBackground(C.yellow).setFontColor("#555555").setRanges([range]).build(),
  ];

  const cfBA = sheet.getRange(DR, 7, count, 1);
  const cfBM = sheet.getRange(DR, 11, count, 1);
  sheet.setConditionalFormatRules([..._cfRules(cfBA), ..._cfRules(cfBM)]);

  _log("crearCaducidades", `Dual BA+BM. ${count} productos`);

  SpreadsheetApp.getActive().toast(
    `${count} productos con caducidades de ambas bodegas`, "🏷 Caducidades", 5
  );
}

// ── CONFIGURAR SEMANA ─────────────────────────────────────────────────────────
function configurarSemanaBA() { _configurarSemana("BA"); }
function configurarSemanaBM() { _configurarSemana("BM"); }

function _configurarSemana(key) {
  const ui     = SpreadsheetApp.getUi();
  const bodega = BODEGAS[key];
  const ss     = SpreadsheetApp.getActiveSpreadsheet();
  const sheet  = ss.getSheetByName(bodega.kardex);
  if (!sheet) { ui.alert(`No existe ${bodega.kardex}.`); return; }

  const modo = ui.alert(
    `📅 Configurar semana — ${bodega.nombre}`,
    "[Sí] → número de semana ISO (1–53)\n[No] → cualquier fecha de la semana",
    ui.ButtonSet.YES_NO_CANCEL
  );
  if (modo === ui.Button.CANCEL) return;

  let monday;
  if (modo === ui.Button.YES) {
    const w = ui.prompt("Semana ISO", `Semana actual: ${_isoWeek(new Date())}\nNúmero (1–53):`, ui.ButtonSet.OK_CANCEL);
    if (w.getSelectedButton() !== ui.Button.OK) return;
    const n = parseInt(w.getResponseText().trim());
    if (!n || n < 1 || n > 53) { ui.alert("Número inválido."); return; }
    monday = _mondayOfWeek(n, new Date().getFullYear());
  } else {
    const d = ui.prompt("Fecha", `Hoy: ${_fmt(new Date())}\nDD/MM/YYYY:`, ui.ButtonSet.OK_CANCEL);
    if (d.getSelectedButton() !== ui.Button.OK) return;
    const p = d.getResponseText().trim().split("/");
    if (p.length !== 3) { ui.alert("Formato inválido. Usa DD/MM/YYYY"); return; }
    const date = new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
    if (isNaN(date.getTime())) { ui.alert("Fecha inválida."); return; }
    const dow = date.getDay() || 7;
    monday = new Date(date);
    monday.setDate(date.getDate() - dow + 1);
  }

  sheet.getRange("D4").setValue(monday).setNumberFormat("DD/MMM/YYYY");
  SpreadsheetApp.flush();
  const sem = sheet.getRange("B4").getValue();
  const sun = sheet.getRange("F4").getValue();
  ui.alert(`✅ Semana ${sem} configurada\n${_fmt(monday)} → ${sun instanceof Date ? _fmt(sun) : sun}`);
  _log("configurarSemana", `${bodega.nombre} | Sem ${sem} | ${_fmt(monday)}`);
}

// ── AVANZAR SEMANA ────────────────────────────────────────────────────────────
function avanzarSemanaBA() { _avanzarSemana("BA"); }
function avanzarSemanaBM() { _avanzarSemana("BM"); }

function _avanzarSemana(key) {
  const ui     = SpreadsheetApp.getUi();
  const bodega = BODEGAS[key];
  const ss     = SpreadsheetApp.getActiveSpreadsheet();
  const sheet  = ss.getSheetByName(bodega.kardex);
  if (!sheet) { ui.alert(`No existe ${bodega.kardex}.`); return; }

  const d4 = sheet.getRange("D4").getValue();
  if (!(d4 instanceof Date) || isNaN(d4.getTime())) {
    ui.alert("La fecha de inicio (D4) no es válida. Por favor configúrala primero.");
    return;
  }

  const sem = sheet.getRange("B4").getValue() || 0;
  const sun = sheet.getRange("F4").getValue();
  const resp = ui.alert(
    `📅 Avanzar semana — ${bodega.nombre}`,
    `• Semana ${sem} (${_fmt(d4)} → ${sun instanceof Date ? _fmt(sun) : sun})\n` +
    `• Los saldos finales de domingo se pasarán como saldos iniciales.\n` +
    `• Se guardará el histórico diario en HISTORIAL_${key} con fechas exactas.\n` +
    `• Se limpiará la semana en curso para iniciar de nuevo.\n\n` +
    `¿Confirmar?`,
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) { ui.alert("Otra operación en progreso."); return; }

  try {
    const lr      = sheet.getLastRow();
    const numRows = lr - KARDEX_START + 1;
    if (numRows < 1) return;

    // 1. Leer saldos finales (col AC = 29)
    const saldosFin = sheet.getRange(KARDEX_START, KARDEX_SLD_FIN, numRows, 1).getValues();
    const saldosAnt = saldosFin.map(r => [typeof r[0] === "number" ? r[0] : 0]);

    // 2. Guardar en HISTORIAL horizontal
    _guardarHistHorizontal(key, sheet, numRows, d4, sem);

    // 3. Escribir saldos finales en SALDO ANT (col H = 8)
    sheet.getRange(KARDEX_START, KARDEX_SLD_ANT, numRows, 1).setValues(saldosAnt);

    // 4. Limpiar celdas de entrada/salida
    for (let d = 0; d < KARDEX_DAYS; d++) {
      sheet.getRange(KARDEX_START, 9  + d * 3, numRows, 1).clearContent();
      sheet.getRange(KARDEX_START, 10 + d * 3, numRows, 1).clearContent();
    }

    // 5. Avanzar D4 por 7 días
    const next = new Date(d4);
    next.setDate(d4.getDate() + 7);
    sheet.getRange("D4").setValue(next).setNumberFormat("DD/MMM/YYYY");

    _log("avanzarSemana", `${bodega.nombre} | Semana ${sem} avanzada.`);
    ui.alert(`✅ Semana avanzada en ${bodega.nombre}.`);
  } finally {
    lock.releaseLock();
  }
}

function _guardarHistHorizontal(key, sheet, numRows, monday, sem) {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const histName = `HISTORIAL_${key}`;
  let hSheet = ss.getSheetByName(histName);
  
  if (!hSheet) {
    hSheet = ss.insertSheet(histName);
    hSheet.setFrozenColumns(3);
    hSheet.setFrozenRows(4);
    
    hSheet.getRange("A1:C1").merge().setValue(`HISTORIAL DE MOVIMIENTOS — ${BODEGAS[key].nombre}`)
      .setFontWeight("bold").setFontColor("#FFFFFF").setBackground(C.dark).setHorizontalAlignment("center").setVerticalAlignment("middle");
    hSheet.getRange(1, 4, 1, hSheet.getMaxColumns() - 3).setBackground(C.dark);
    
    hSheet.getRange("A2:A4").merge().setValue("No").setFontWeight("bold").setFontColor("#FFFFFF").setBackground(C.dark).setHorizontalAlignment("center").setVerticalAlignment("middle");
    hSheet.getRange("B2:B4").merge().setValue("PRODUCTO").setFontWeight("bold").setFontColor("#FFFFFF").setBackground(C.dark).setHorizontalAlignment("center").setVerticalAlignment("middle");
    hSheet.getRange("C2:C4").merge().setValue("UNIDAD").setFontWeight("bold").setFontColor("#FFFFFF").setBackground(C.dark).setHorizontalAlignment("center").setVerticalAlignment("middle");
    
    const prods = sheet.getRange(KARDEX_START, 1, numRows, 4).getValues();
    const histProds = prods.map(p => [p[0], p[1], p[3]]);
    hSheet.getRange(5, 1, numRows, 3).setValues(histProds);
    
    const bgs = histProds.map((_, i) => Array(3).fill(i % 2 === 0 ? C.rowA : C.rowB));
    hSheet.getRange(5, 1, numRows, 3).setBackgrounds(bgs).setFontFamily("Calibri").setFontSize(10).setVerticalAlignment("middle");
    hSheet.getRange(5, 1, numRows, 1).setHorizontalAlignment("center");
    hSheet.getRange(5, 2, numRows, 1).setHorizontalAlignment("left");
    hSheet.getRange(5, 3, numRows, 1).setHorizontalAlignment("center");
    
    hSheet.setColumnWidth(1, 45);
    hSheet.setColumnWidth(2, 210);
    hSheet.setColumnWidth(3, 65);
  }

  const lastRowH = hSheet.getLastRow();
  const numRowsH = lastRowH - 4;
  if (numRowsH < numRows) {
    const diff = numRows - numRowsH;
    hSheet.insertRowsAfter(lastRowH, diff);
    const newProds = sheet.getRange(KARDEX_START + numRowsH, 1, diff, 4).getValues();
    const histNewProds = newProds.map(p => [p[0], p[1], p[3]]);
    hSheet.getRange(lastRowH + 1, 1, diff, 3).setValues(histNewProds);
    
    const bgs = histNewProds.map((_, i) => Array(3).fill((numRowsH + i) % 2 === 0 ? C.rowA : C.rowB));
    hSheet.getRange(lastRowH + 1, 1, diff, 3).setBackgrounds(bgs).setFontFamily("Calibri").setFontSize(10).setVerticalAlignment("middle");
    hSheet.getRange(lastRowH + 1, 1, diff, 1).setHorizontalAlignment("center");
    hSheet.getRange(lastRowH + 1, 3, diff, 1).setHorizontalAlignment("center");
  }

  const startCol = hSheet.getLastColumn() + 1;
  hSheet.insertColumnsAfter(startCol - 1, 15);

  const semStr = `SEMANA ${sem} (${monday.getFullYear()})`;
  hSheet.getRange(2, startCol, 1, 14).merge().setValue(semStr)
    .setFontWeight("bold").setFontColor("#FFFFFF").setBackground(C.dark).setHorizontalAlignment("center").setVerticalAlignment("middle");
  hSheet.getRange(1, startCol, 1, 15).setBackground(C.dark);

  const kardexVals = sheet.getRange(KARDEX_START, 9, numRows, 21).getValues();
  const histVals = [];

  for (let r = 0; r < numRows; r++) {
    const rowVals = [];
    for (let d = 0; d < KARDEX_DAYS; d++) {
      const entVal = kardexVals[r][d * 3];
      const salVal = kardexVals[r][d * 3 + 1];
      rowVals.push(entVal === "" ? 0 : entVal);
      rowVals.push(salVal === "" ? 0 : salVal);
    }
    histVals.push(rowVals);
  }

  const daysShort = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
  const mShort = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  for (let d = 0; d < KARDEX_DAYS; d++) {
    const colIdx = startCol + d * 2;
    const dayDate = new Date(monday.getTime() + d * 24 * 60 * 60 * 1000);
    const dayStr = `${daysShort[d]} ${dayDate.getDate()}/${mShort[dayDate.getMonth()]}`;
    
    hSheet.getRange(3, colIdx, 1, 2).merge().setValue(dayStr)
      .setFontWeight("bold").setFontColor("#333333").setBackground(C.cream).setHorizontalAlignment("center").setVerticalAlignment("middle").setFontSize(9);
      
    hSheet.getRange(4, colIdx).setValue("ENT").setFontWeight("bold").setFontColor(C.dkGreen).setBackground(C.entBg).setHorizontalAlignment("center").setFontSize(8);
    hSheet.getRange(4, colIdx + 1).setValue("SAL").setFontWeight("bold").setFontColor("#C62828").setBackground(C.salBg).setHorizontalAlignment("center").setFontSize(8);
    
    hSheet.setColumnWidth(colIdx, 55);
    hSheet.setColumnWidth(colIdx + 1, 55);
  }

  hSheet.getRange(5, startCol, numRows, 14).setValues(histVals);

  const colBgs = [];
  for (let r = 0; r < numRows; r++) {
    const rowBg = [];
    for (let d = 0; d < KARDEX_DAYS; d++) {
      rowBg.push(C.entBg);
      rowBg.push(C.salBg);
    }
    colBgs.push(rowBg);
  }
  hSheet.getRange(5, startCol, numRows, 14).setBackgrounds(colBgs)
    .setFontFamily("Calibri").setFontSize(10).setVerticalAlignment("middle").setHorizontalAlignment("center");

  // Configurar columna de separación (15ª columna = startCol + 14)
  const sepColIdx = startCol + 14;
  hSheet.setColumnWidth(sepColIdx, 8);
  hSheet.getRange(2, sepColIdx, numRows + 3, 1).setBackground("#555555");
}

// ── AGREGAR PRODUCTO ──────────────────────────────────────────────────────────
function agregarProducto() {
  const ui      = SpreadsheetApp.getUi();
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const maestro = ss.getSheetByName(SHEET_MAESTRO);
  if (!maestro) { ui.alert("No existe MAESTRO."); return; }

  const pResp = ui.prompt("🆕 Nuevo Producto", "Nombre del producto:", ui.ButtonSet.OK_CANCEL);
  if (pResp.getSelectedButton() !== ui.Button.OK) return;
  const prod = pResp.getResponseText().trim();
  if (!prod) return;

  const iResp = ui.prompt("🆕 Nuevo Producto", "ID de familia (ej: REF-019):", ui.ButtonSet.OK_CANCEL);
  if (iResp.getSelectedButton() !== ui.Button.OK) return;
  const idFam = iResp.getResponseText().trim();

  const uResp = ui.prompt("🆕 Nuevo Producto", "Unidad (kg / lt / pza / paq):", ui.ButtonSet.OK_CANCEL);
  if (uResp.getSelectedButton() !== ui.Button.OK) return;
  const unidad = uResp.getResponseText().trim();

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) { ui.alert("El archivo está ocupado. Intenta de nuevo."); return; }

  try {
    const lr    = maestro.getLastRow();
    const nos   = maestro.getRange(MAESTRO_START, 1, lr - MAESTRO_START + 1, 1).getValues();
    const lastNo = nos.reduce((max, r) => Math.max(max, parseInt(r[0]) || 0), 0);
    const newNo = lastNo + 1;
    const newRow = lr + 1;

    // 1. Insertar en MAESTRO
    maestro.getRange(newRow, 1, 1, 9)
      .setValues([[newNo, idFam, prod, "", unidad, "SÍ", 0, 0, false]]);
    const rowColor = (newNo % 2 === 1) ? C.rowA : C.rowB;
    maestro.getRange(newRow, 1, 1, 9).setBackground(rowColor);
    
    // Configurar dropdown nativo SÍ/NO
    const validationRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(["SÍ", "NO"], true)
      .setAllowInvalid(false)
      .setHelpText("Selecciona SÍ o NO para activar/desactivar el producto.")
      .build();
    maestro.getRange(newRow, 6).setDataValidation(validationRule);

    // Configurar checkbox de seleccion
    maestro.getRange(newRow, 9).insertCheckboxes().setValue(false);

    // 2. Insertar en KARDEX_BA y KARDEX_BM
    Object.values(BODEGAS).forEach(b => {
      const kSheet = ss.getSheetByName(b.kardex);
      if (kSheet) {
        const lastRowK = kSheet.getLastRow();
        const nextRowK = lastRowK + 1;
        
        kSheet.getRange(nextRowK, 1, 1, 4).setValues([[newNo, prod, "", unidad]]);
        kSheet.getRange(nextRowK, 5).setDataValidation(
          SpreadsheetApp.newDataValidation().requireDate()
            .setHelpText("Fecha de caducidad del lote").build()
        ).setNumberFormat("DD/MMM/YY");
        
        const formulaCad = '=IF(ISBLANK(E' + nextRowK + '); "⚪ S/F"; ' +
                           'IF(E' + nextRowK + '-TODAY()<=0; "🔴 CAD"; ' +
                           'IF(E' + nextRowK + '-TODAY()<=2; "🔴 ≤2d"; ' +
                           'IF(E' + nextRowK + '-TODAY()<=7; "🟠 ≤7d"; ' +
                           'IF(E' + nextRowK + '-TODAY()<=14; "🟡 ≤14d"; ' +
                           'IF(E' + nextRowK + '-TODAY()<=28; "🟤 ≤28d"; ' +
                           'IF(E' + nextRowK + '-TODAY()<=60; "🔵 ≤60d"; "🟢 OK")))))))';
        kSheet.getRange(nextRowK, 7).setFormula(formulaCad);
        kSheet.getRange(nextRowK, 8).setValue(0);
        
        for (let d = 0; d < KARDEX_DAYS; d++) {
          const sldCol  = 11 + d * 3;
          const prevCol = 8  + d * 3;
          const entCol  = 9  + d * 3;
          const salCol  = 10 + d * 3;
          
          kSheet.getRange(nextRowK, entCol).setValue("");
          kSheet.getRange(nextRowK, salCol).setValue("");
          const fSld = '=' + _col(prevCol) + nextRowK + '+IFERROR(' + _col(entCol) + nextRowK + ';0)-IFERROR(' + _col(salCol) + nextRowK + ';0)';
          kSheet.getRange(nextRowK, sldCol).setFormula(fSld);
        }
        
        kSheet.getRange(nextRowK, 1, 1, 29).setBackgrounds([Array(29).fill(rowColor)]);
        kSheet.getRange(nextRowK, 8).setBackground(C.iceBlue);
        for (let d = 0; d < KARDEX_DAYS; d++) {
          kSheet.getRange(nextRowK, 9  + d * 3).setBackground(C.entBg);
          kSheet.getRange(nextRowK, 10 + d * 3).setBackground(C.salBg);
          kSheet.getRange(nextRowK, 11 + d * 3).setBackground(C.iceBlue);
        }
      }
    });

    // 3. Insertar en HISTORIAL_BA y HISTORIAL_BM
    Object.values(BODEGAS).forEach(b => {
      const histName = `HISTORIAL_${b.key}`;
      const hSheet = ss.getSheetByName(histName);
      if (hSheet) {
        const lastRowH = hSheet.getLastRow();
        const nextRowH = lastRowH + 1;
        hSheet.getRange(nextRowH, 1, 1, 3).setValues([[newNo, prod, unidad]]).setBackground(rowColor);
        hSheet.getRange(nextRowH, 1, 1, 1).setHorizontalAlignment("center");
        hSheet.getRange(nextRowH, 3, 1, 1).setHorizontalAlignment("center");
      }
    });

    // 4. Recrear Vistas Móviles
    _buildVista("BA");
    _buildVista("BM");

    // 5. Recrear Caducidades
    crearCaducidades();

    ui.alert("✅ Producto agregado", `"${prod}" se ha agregado al catálogo, kardex y hojas de historial.`, ui.ButtonSet.OK);
    _log("agregarProducto", `Producto: ${prod}`);
  } finally {
    lock.releaseLock();
  }
}

function anularProducto() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const maestro = ss.getSheetByName(SHEET_MAESTRO);
  if (!maestro) { ui.alert("No existe MAESTRO."); return; }

  const resp = ui.prompt(
    "🚫 Anular Producto",
    "Ingresa el número (No) o el nombre del producto a anular/desactivar:",
    ui.ButtonSet.OK_CANCEL
  );
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  const input = resp.getResponseText().trim();
  if (!input) return;

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) { ui.alert("El archivo está ocupado. Intenta de nuevo."); return; }

  try {
    const lr = maestro.getLastRow();
    const data = maestro.getRange(MAESTRO_START, 1, lr - MAESTRO_START + 1, 3).getValues(); // No, ID, PRODUCTO
    let foundRow = -1;
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]) === input || String(data[i][2]).toLowerCase() === input.toLowerCase()) {
        foundRow = MAESTRO_START + i;
        break;
      }
    }

    if (foundRow === -1) {
      ui.alert("❌ Producto no encontrado. Verifica el número o nombre.");
      return;
    }

    // Cambiar columna ACTIVO (col 6) a NO
    maestro.getRange(foundRow, 6).setValue("NO");
    
    // Ocultar en Kardex
    const kardexRow = foundRow - MAESTRO_START + KARDEX_START;
    Object.values(BODEGAS).forEach(b => {
      const kSheet = ss.getSheetByName(b.kardex);
      if (kSheet) {
        kSheet.hideRows(kardexRow);
      }
    });

    // Recrear vistas
    _buildVista("BA");
    _buildVista("BM");
    crearCaducidades();

    ui.alert("✅ Producto anulado", "El producto ha sido marcado como inactivo y ocultado de las hojas de operaciones.", ui.ButtonSet.OK);
    _log("anularProducto", `Fila Maestro: ${foundRow}`);
  } finally {
    lock.releaseLock();
  }
}

// ── TESTS ─────────────────────────────────────────────────────────────────────
function runTests() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let ts   = ss.getSheetByName("🧪 TESTS");
  if (!ts) ts = ss.insertSheet("🧪 TESTS");
  else ts.clearContents();

  ts.getRange(1, 1, 1, 4).setValues([["TEST","RESULTADO","DETALLE","TIMESTAMP"]])
    .setFontWeight("bold").setFontColor("#FFFFFF").setBackground(C.dark);
  ts.setColumnWidth(1, 280); ts.setColumnWidth(2, 90);
  ts.setColumnWidth(3, 400); ts.setFrozenRows(1);

  const now     = new Date();
  const results = [];

  function test(name, fn) {
    try {
      const r = fn();
      results.push([name, r.ok ? "✅ PASS" : "❌ FAIL", r.msg || "", now]);
    } catch(e) {
      results.push([name, "💥 ERROR", e.message || String(e), now]);
    }
  }

  test("T01 — MAESTRO existe y tiene datos", () => {
    const m = ss.getSheetByName(SHEET_MAESTRO);
    if (!m) return { ok: false, msg: "No encontrado" };
    const c = m.getLastRow() - MAESTRO_START + 1;
    return { ok: c > 100, msg: `${c} productos` };
  });

  test("T02 — KARDEX_BA existe", () => {
    const s = ss.getSheetByName(BODEGAS.BA.kardex);
    return { ok: !!s, msg: s ? `${s.getLastRow() - KARDEX_START + 1} productos` : "No encontrado" };
  });

  test("T03 — KARDEX_BM existe", () => {
    const s = ss.getSheetByName(BODEGAS.BM.kardex);
    return { ok: !!s, msg: s ? `${s.getLastRow() - KARDEX_START + 1} productos` : "No encontrado" };
  });

  test("T04 — VISTA_MOVIL_BA existe y tiene datos", () => {
    const s = ss.getSheetByName(BODEGAS.BA.vista);
    if (!s) return { ok: false, msg: "No encontrada" };
    return { ok: s.getLastRow() >= 4, msg: `${s.getLastRow() - 3} filas` };
  });

  test("T05 — VISTA_MOVIL_BM existe y tiene datos", () => {
    const s = ss.getSheetByName(BODEGAS.BM.vista);
    if (!s) return { ok: false, msg: "No encontrada" };
    return { ok: s.getLastRow() >= 4, msg: `${s.getLastRow() - 3} filas` };
  });

  test("T06 — CADUCIDADES existe", () => {
    const s = ss.getSheetByName("CADUCIDADES");
    return { ok: !!s, msg: s ? `${s.getLastRow() - 3} productos` : "No encontrada" };
  });

  test("T07 — KARDEX_BA tiene fórmulas SLD (col K fila 7)", () => {
    const s = ss.getSheetByName(BODEGAS.BA.kardex);
    if (!s) return { ok: false, msg: "No encontrado" };
    const f = s.getRange(KARDEX_START, 11).getFormula();
    return { ok: f.includes("="), msg: `K7: ${f.substring(0, 50)}` };
  });

  test("T08 — _mondayOfWeek(1, 2026) = 29/12/2025", () => {
    const m = _mondayOfWeek(1, 2026);
    const ok = m.toDateString() === new Date(2025, 11, 29).toDateString();
    return { ok, msg: `Resultado: ${_fmt(m)}` };
  });

  test("T09 — _isoWeek devuelve 1-53", () => {
    const w = _isoWeek(new Date());
    return { ok: w >= 1 && w <= 53, msg: `Semana actual: ${w}` };
  });

  test("T10 — LOG existe", () => {
    const s = ss.getSheetByName(SHEET_LOG);
    return { ok: !!s, msg: s ? `${s.getLastRow() - 1} entradas` : "No encontrado" };
  });

  ts.getRange(2, 1, results.length, 4).setValues(results);
  results.forEach((r, i) => {
    const bg = r[1].includes("PASS") ? "#C8E6C9" : r[1].includes("FAIL") ? "#FFCDD2" : "#FFE0B2";
    ts.getRange(i + 2, 1, 1, 4).setBackground(bg);
  });

  const passed = results.filter(r => r[1].includes("PASS")).length;
  SpreadsheetApp.getActive().toast(
    `${passed}/${results.length} tests pasaron`, "🧪 Mise Tests", 6
  );
  ss.setActiveSheet(ts);
}

// ── REGISTRO TRANSACCIONAL ────────────────────────────────────────────────────
// Removido por optimización de rendimiento en onEdit

// ── UTILIDADES ────────────────────────────────────────────────────────────────
function limpiarProps() {
  PropertiesService.getScriptProperties().deleteAllProperties();
  SpreadsheetApp.getUi().alert("🧹 Propiedades limpiadas.\nYa puedes ejecutar Setup completo.");
}

function _col(n) {
  let s = "", c = n;
  while (c > 0) { c--; s = String.fromCharCode(65 + c % 26) + s; c = Math.floor(c / 26); }
  return s;
}

function _quoteName(name) {
  return /[\s\-áéíóúÁÉÍÓÚüÜñÑ]/.test(name) ? `'${name}'` : name;
}

function _isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - y) / 86400000) + 1) / 7);
}

function _mondayOfWeek(week, year) {
  const jan4  = new Date(year, 0, 4);
  const dow   = jan4.getDay() || 7;
  const jan4m = new Date(jan4);
  jan4m.setDate(jan4.getDate() - dow + 1);
  const monday = new Date(jan4m);
  monday.setDate(jan4m.getDate() + (week - 1) * 7);
  return monday;
}

function _fmt(date) {
  if (!date || isNaN(date)) return "—";
  return `${String(date.getDate()).padStart(2,"0")}/${String(date.getMonth()+1).padStart(2,"0")}/${date.getFullYear()}`;
}

// ── LOG ───────────────────────────────────────────────────────────────────────
function _log(fn, msg) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let log  = ss.getSheetByName(SHEET_LOG);
    if (!log) {
      log = ss.insertSheet(SHEET_LOG);
      log.appendRow(["TIMESTAMP","FUNCIÓN","DETALLE","USUARIO"]);
      log.getRange(1, 1, 1, 4).setFontWeight("bold").setFontColor("#FFFFFF").setBackground(C.dark);
      log.setFrozenRows(1);
      log.setColumnWidth(1, 155); log.setColumnWidth(2, 150); log.setColumnWidth(3, 400);
    }
    log.appendRow([new Date(), fn, msg, Session.getActiveUser().getEmail() || "—"]);
  } catch(e) {}
}

// ── CATÁLOGO ──────────────────────────────────────────────────────────────────
function _catalogo() {
  // [No, ID_FAMILIA, PRODUCTO, PRESENTACION, UNIDAD, ACTIVO, MÍN, MÁX]
  return [
    [1,"REF-001","Pepperoni","BOL 500 g","kg","SÍ",0,0],
    [2,"REF-002","Jamón de pavo Lala","PAQ 450 g","kg","SÍ",0,0],
    [3,"REF-003","Prosciutto","PZA 100 g","pza","SÍ",0,0],
    [4,"REF-004","Tocino en trocitos","BOL 567 g","kg","SÍ",0,0],
    [5,"REF-005","Queso mozzarella CDK","BOL 700 g","kg","SÍ",0,0],
    [6,"REF-006","Queso mozzarella fresco Pilarica","PAQ 500 g","kg","SÍ",0,0],
    [7,"REF-007","Queso Philadelphia CDK","MAN 1 kg","kg","SÍ",0,0],
    [8,"REF-008","Queso gouda","BOL 2 kg","kg","SÍ",0,0],
    [9,"REF-009","Mantequilla Asturias","PZA 1 kg","kg","SÍ",0,0],
    [10,"REF-010","Mermelada de manzana CDK","MAN 1 kg","kg","SÍ",0,0],
    [11,"REF-011","Crema batida","MAN 453 g","g","SÍ",0,0],
    [12,"REF-012","Yogurt griego natural","BOT 1 kg","kg","SÍ",0,0],
    [13,"REF-013","Concentrado de guayaba","BOT 1 LT","lt","SÍ",0,0],
    [14,"REF-014","Concentrado de frutos rojos","BOT 1 LT","lt","SÍ",0,0],
    [15,"REF-015","Concentrado de limonada rosa","BOT 1 LT","lt","SÍ",0,0],
    [16,"REF-016","Jugo limón pepino jengibre","BOT 1 LT","lt","SÍ",0,0],
    [17,"REF-017","Concentrado de mango","BOT 1 LT","lt","SÍ",0,0],
    [18,"REF-018","Concentrado de mango maracuyá","BOT 1 LT","lt","SÍ",0,0],
    [19,"FYV-001","Fresa","DOM 454 g","kg","SÍ",0,0],
    [20,"FYV-002","Frambuesa","DOM 170 g","kg","SÍ",0,0],
    [21,"FYV-003","Zarzamora","DOM 170 g","kg","SÍ",0,0],
    [22,"FYV-004","Champiñones","BOL","pza","SÍ",0,0],
    [23,"FYV-005","Tomate cherry","DOM 280 g","g","SÍ",0,0],
    [24,"FYV-006","Limón","PZA","pza","SÍ",0,0],
    [25,"FYV-007","Pepino","PZA","pza","SÍ",0,0],
    [26,"FYV-008","Huevo","DOM 1 kg","kg","SÍ",0,0],
    [27,"FYV-009","Plátano","PZA","pza","SÍ",0,0],
    [28,"FYV-010","Espinaca","PAQ 180 g","g","SÍ",0,0],
    [29,"LEC-001","Leche entera Lala Bar","BOT 2 LT","lt","SÍ",0,0],
    [30,"LEC-002","Leche deslactosada Lala Bar","BOT 1 LT","lt","SÍ",0,0],
    [31,"LEC-003","Leche deslactosada light Lala Bar","BOT 1 LT","lt","SÍ",0,0],
    [32,"LEC-004","Leche light Lala Bar","BOT 1 LT","lt","SÍ",0,0],
    [33,"LEC-005","Leche almendra","BOT 1 LT","lt","SÍ",0,0],
    [34,"LEC-006","Leche avena","BOT 1 LT","lt","SÍ",0,0],
    [35,"ABR-001","Harina LCP","PAQ 1.5 kg","paq","SÍ",0,0],
    [36,"ABR-002","Harina de sarraceno","BOL 1 kg","kg","SÍ",0,0],
    [37,"ABR-003","Nutella","MAN 1 kg","kg","SÍ",0,0],
    [38,"ABR-004","Mermelada de fresa","MAN 1 kg","kg","SÍ",0,0],
    [39,"ABR-005","Mermelada de zarzamora","MAN 1 kg","kg","SÍ",0,0],
    [40,"ABR-006","Cajeta diluida CDK","MAN 1 kg","kg","SÍ",0,0],
    [41,"ABR-007","Lechera untable CDK","MAN 1 kg","kg","SÍ",0,0],
    [42,"ABR-008","Chocolate Turin untable CDK","MAN 1 kg","kg","SÍ",0,0],
    [43,"ABR-009","Chocolate obscuro untable CDK","MAN 1 kg","kg","SÍ",0,0],
    [44,"ABR-010","Gloria untable CDK","MAN 1 kg","kg","SÍ",0,0],
    [45,"ABR-011","Untable de pistache","MAN 1 kg","kg","SÍ",0,0],
    [46,"ABR-012","Crema de pistache CDK","MAN 1 kg","kg","SÍ",0,0],
    [47,"ABR-013","Crema de Lotus untable CDK","MAN 1 kg","kg","SÍ",0,0],
    [48,"ABR-014","Kinder Bueno","PAQ 10 PZA","pza","SÍ",0,0],
    [49,"ABR-015","Chocolate semi amargo Luneta","BOL 1 kg","kg","SÍ",0,0],
    [50,"ABR-016","Enjambre","BOL 700 g","g","SÍ",0,0],
    [51,"ABR-017","Café en grano Postales","BOL 1 kg","kg","SÍ",0,0],
    [52,"ABR-018","Café en grano Postales descaf.","BOL 1 kg","kg","SÍ",0,0],
    [53,"ABR-019","Caramelo con sal Monin","BOT 1.89 LT","lt","SÍ",0,0],
    [54,"ABR-020","Jarabe natural","BOT 1 LT","lt","SÍ",0,0],
    [55,"ABR-021","Jarabe de caramelo","BOT 1 LT","lt","SÍ",0,0],
    [56,"ABR-022","Jarabe de vainilla","BOT 1 LT","lt","SÍ",0,0],
    [57,"ABR-023","Jarabe de avellana","BOT 1 LT","lt","SÍ",0,0],
    [58,"ABR-024","Pistache tostado","BOL 680 g","g","SÍ",0,0],
    [59,"ABR-025","Nuez picada","BOL 1 kg","kg","SÍ",0,0],
    [60,"ABR-026","Bombón mini blanco","BOL 400 g","g","SÍ",0,0],
    [61,"ABR-027","Galleta Ricanelas","PAQ 113 g","g","SÍ",0,0],
    [62,"ABR-028","Galleta Oreo","PAQ 113 g","g","SÍ",0,0],
    [63,"ABR-029","Galleta Lotus Biscoff","PAQ 250 g","g","SÍ",0,0],
    [64,"ABR-030","Base neutra","BOL 1 kg","kg","SÍ",0,0],
    [65,"ABR-031","Té Chai Oregon","BOL 1.3 kg","kg","SÍ",0,0],
    [66,"ABR-032","Té matcha mascabado","BOL 1 kg","kg","SÍ",0,0],
    [67,"ABR-033","Tisana Paso de Ovejas","BOL 1 kg","kg","SÍ",0,0],
    [68,"ABR-034","Tisana Azoyú LCP","BOL 1 kg","kg","SÍ",0,0],
    [69,"ABR-035","Tisana Ixil LCP","BOL 1 kg","kg","SÍ",0,0],
    [70,"ABR-036","Chocolate Abuelita en polvo","BOL 1 kg","kg","SÍ",0,0],
    [71,"ABR-037","Chocolate blanco en polvo Da Vinci","BOL 1.3 kg","kg","SÍ",0,0],
    [72,"ABR-038","Salsa Pesto Barilla","FCO 190 g","g","SÍ",0,0],
    [73,"ABR-039","Salsa para pizza marinara","FCO 680 g","g","SÍ",0,0],
    [74,"ABR-040","Chile chipotle San Marcos","LAT 215 g","g","SÍ",0,0],
    [75,"ABR-041","Splenda en sobre","CAJ 700 PZA","pza","SÍ",0,0],
    [76,"ABR-042","Stevia en sobre","CAJ 400 PZA","pza","SÍ",0,0],
    [77,"ABR-043","Azúcar blanca refinada en sobre","BOL 200 PZA","pza","SÍ",0,0],
    [78,"ABR-044","Azúcar mascabado en sobre","BOL 200 PZA","pza","SÍ",0,0],
    [79,"ABR-045","Aceite de oliva La Fina","BOT 750 ml","ml","SÍ",0,0],
    [80,"ABR-046","Miel de abeja Carlota","FCO 330 ml","ml","SÍ",0,0],
    [81,"ABR-047","Canela en polvo McCormick","BOT 520 g","g","SÍ",0,0],
    [82,"ABR-048","Azúcar blanca","BOL 2 kg","kg","SÍ",0,0],
    [83,"ABR-049","Albahaca seca","PZA 330 g","g","SÍ",0,0],
    [84,"ABR-050","Pimienta negra molida","PZA 510 g","g","SÍ",0,0],
    [85,"ABR-051","Sal fina","BOL 1 kg","kg","SÍ",0,0],
    [86,"BEB-001","Canadá dry","PAQ 12 PZA","pza","SÍ",0,0],
    [87,"BEB-002","Pepsi Regular","PZA 330 ml","pza","SÍ",0,0],
    [88,"BEB-003","Pepsi Light","PZA 330 ml","pza","SÍ",0,0],
    [89,"BEB-004","Manzanita Sol","PZA 330 ml","pza","SÍ",0,0],
    [90,"BEB-005","Perrier","PZA 330 ml","pza","SÍ",0,0],
    [91,"BEB-006","Lipton","PZA 600 ml","pza","SÍ",0,0],
    [92,"BEB-007","Aranciata San Pellegrino","PZA 330 ml","pza","SÍ",0,0],
    [93,"BEB-008","Agua mineral Canada Dry","PAQ 12 PZA","pza","SÍ",0,0],
    [94,"BEB-009","Agua Epura","PAQ 12 PZA","pza","SÍ",0,0],
    [95,"DES-001","Servilleta 24x24 LCP","PAQ 125 PZA","paq","SÍ",0,0],
    [96,"DES-002","Cono para llevar LCP","PAQ 50 PZA","pza","SÍ",0,0],
    [97,"DES-003","Cono crepa individual","PAQ 50 PZA","pza","SÍ",0,0],
    [98,"DES-004","Popote estuchado GDL","PAQ 500 PZA","pza","SÍ",0,0],
    [99,"DES-005","Tapa PET 20 oz transparente","MAN 50 PZA","pza","SÍ",0,0],
    [100,"DES-006","Tapa PET DOM 20 oz","MAN 50 PZA","pza","SÍ",0,0],
    [101,"DES-007","Vaso bebida caliente 16 oz","MAN 50 PZA","pza","SÍ",0,0],
    [102,"DES-008","Tapa PET blanca caliente 16 oz","MAN 50 PZA","pza","SÍ",0,0],
    [103,"DES-009","Vaso expresso 4 oz","PAQ 25 PZA","pza","SÍ",0,0],
    [104,"DES-010","Tapa vaso 4 oz","PAQ 50 PZA","pza","SÍ",0,0],
    [105,"DES-011","Vaso 20 oz frío","MAN 50 PZA","pza","SÍ",0,0],
    [106,"DES-012","Portavaso 4 cavidades","PAQ 50 PZA","pza","SÍ",0,0],
    [107,"DES-013","Fajilla de cartón","PAQ 25 PZA","pza","SÍ",0,0],
    [108,"DES-014","Bolsa mediana LCP","BOL 1 kg","kg","SÍ",0,0],
    [109,"DES-015","Agitador de bambú 18 cm","CAJ 1000 PZA","pza","SÍ",0,0],
    [110,"DES-016","Cuchara desechable","PAQ 50 PZA","pza","SÍ",0,0],
    [111,"DES-017","Etiqueta consumo blanca","ROL 1000 PZA","pza","SÍ",0,0],
    [112,"DES-018","Hoja de polipapel","PAQ 1 kg","kg","SÍ",0,0],
    [113,"DES-019","Manga desechable","ROL 5 PZA","pza","SÍ",0,0],
    [114,"DES-020","Rollo térmico 80x70 mm","PZA","pza","SÍ",0,0],
    [115,"DES-021","Cofia blanca","BOL 100 PZA","pza","SÍ",0,0],
    [116,"DES-022","Rollo bolsa transparente","ROL","pza","SÍ",0,0],
    [117,"DES-023","Toalla en rollo","ROL 180 m","pza","SÍ",0,0],
    [118,"DES-024","Toalla Whiper","ROL","pza","SÍ",0,0],
    [119,"DES-025","Toallas interdobladas","PAQ 150 PZA","pza","SÍ",0,0],
    [120,"DES-026","Cubrebocas tricapa","CAJ 50 PZA","pza","SÍ",0,0],
    [121,"DES-027","Guantes nitrilo chico","PAQ 100 PZA","pza","SÍ",0,0],
    [122,"DES-028","Guantes nitrilo grande","PAQ 100 PZA","pza","SÍ",0,0],
    [123,"DES-029","Bolsa basura compostable gris","PZA","pza","SÍ",0,0],
    [124,"DES-030","Bolsa basura compostable verde","PZA","pza","SÍ",0,0],
    [125,"JAR-001","Fibra esponja Scotch","PZA","pza","SÍ",0,0],
    [126,"JAR-002","Microfibra amarilla","PZA","pza","SÍ",0,0],
    [127,"JAR-003","Microfibra verde","PZA","pza","SÍ",0,0],
    [128,"JAR-004","Microfibra azul","PZA","pza","SÍ",0,0],
    [129,"JAR-005","Piedra pómez para pulir","PZA","pza","SÍ",0,0],
    [130,"JAR-006","Gel sanitizante","BOT 1 LT","lt","SÍ",0,0],
    [131,"JAR-007","Cafiza","BOT 1 kg","kg","SÍ",0,0],
  ];
}

function acercaDe() {
  SpreadsheetApp.getUi().alert(
    "⚙️ Mise v5.0",
    "Suite Atelier · La Crêpe Parisienne · Grupo MYT\n\n" +
    "Sistema de inventario operativo para bodega.\n" +
    "131 productos · 2 bodegas · historial semanal · semáforo de caducidad",
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// ── ACCIONES EN LOTE Y CARGA MASIVA DE BODEGA ────────────────────────────────
function desactivarSeleccionadosMaestro() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const maestro = ss.getSheetByName(SHEET_MAESTRO);
  if (!maestro) return;
  const lr = maestro.getLastRow();
  if (lr < MAESTRO_START) return;
  const count = lr - MAESTRO_START + 1;
  const rangeMaestro = maestro.getRange(MAESTRO_START, 1, count, 9);
  const valuesMaestro = rangeMaestro.getValues();
  
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    SpreadsheetApp.getUi().alert("El archivo está ocupado. Intenta de nuevo.");
    return;
  }
  
  try {
    let affected = 0;
    for (let i = 0; i < count; i++) {
      if (valuesMaestro[i][8] === true) {
        valuesMaestro[i][5] = "NO";
        valuesMaestro[i][8] = false;
        const kardexRow = KARDEX_START + i;
        Object.values(BODEGAS).forEach(b => {
          const kSheet = ss.getSheetByName(b.kardex);
          if (kSheet) kSheet.hideRows(kardexRow);
        });
        affected++;
      }
    }
    if (affected > 0) {
      rangeMaestro.setValues(valuesMaestro);
      _buildVista("BA");
      _buildVista("BM");
      crearCaducidades();
      SpreadsheetApp.getActive().toast(`Se desactivaron ${affected} productos ✓`, "⚙️ Mise", 4);
    }
  } finally {
    lock.releaseLock();
  }
}

function activarSeleccionadosMaestro() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const maestro = ss.getSheetByName(SHEET_MAESTRO);
  if (!maestro) return;
  const lr = maestro.getLastRow();
  if (lr < MAESTRO_START) return;
  const count = lr - MAESTRO_START + 1;
  const rangeMaestro = maestro.getRange(MAESTRO_START, 1, count, 9);
  const valuesMaestro = rangeMaestro.getValues();
  
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    SpreadsheetApp.getUi().alert("El archivo está ocupado. Intenta de nuevo.");
    return;
  }
  
  try {
    let affected = 0;
    for (let i = 0; i < count; i++) {
      if (valuesMaestro[i][8] === true) {
        valuesMaestro[i][5] = "SÍ";
        valuesMaestro[i][8] = false;
        const kardexRow = KARDEX_START + i;
        Object.values(BODEGAS).forEach(b => {
          const kSheet = ss.getSheetByName(b.kardex);
          if (kSheet) kSheet.showRows(kardexRow);
        });
        affected++;
      }
    }
    if (affected > 0) {
      rangeMaestro.setValues(valuesMaestro);
      _buildVista("BA");
      _buildVista("BM");
      crearCaducidades();
      SpreadsheetApp.getActive().toast(`Se activaron ${affected} productos ✓`, "⚙️ Mise", 4);
    }
  } finally {
    lock.releaseLock();
  }
}

function limpiarSeleccionMaestro() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const maestro = ss.getSheetByName(SHEET_MAESTRO);
  if (!maestro) return;
  const lr = maestro.getLastRow();
  if (lr < MAESTRO_START) return;
  const count = lr - MAESTRO_START + 1;
  maestro.getRange(MAESTRO_START, 9, count, 1).setValue(false);
  SpreadsheetApp.getActive().toast("Selección limpiada ✓", "⚙️ Mise", 3);
}

function restaurarValidacionesMaestro() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const maestro = ss.getSheetByName(SHEET_MAESTRO);
  if (!maestro) return;
  const lr = maestro.getLastRow();
  if (lr < MAESTRO_START) return;
  const count = lr - MAESTRO_START + 1;
  
  // 1. Restaurar Dropdown F (ACTIVO)
  const validationRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["SÍ", "NO"], true)
    .setAllowInvalid(false)
    .setHelpText("Selecciona SÍ o NO para activar/desactivar el producto.")
    .build();
  maestro.getRange(MAESTRO_START, 6, count, 1).setDataValidation(validationRule);
  
  // 2. Restaurar Checkboxes I (SELECCIONAR)
  maestro.getRange(MAESTRO_START, 9, count, 1).insertCheckboxes();
  
  // 3. Re-aplicar Formato Condicional
  maestro.clearConditionalFormatRules();
  const cfRange = maestro.getRange(MAESTRO_START, 1, count, 9);
  const selectionRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$I' + MAESTRO_START + '=TRUE')
    .setBackground("#E3F2FD")
    .setRanges([cfRange])
    .build();
    
  const inactiveRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$F' + MAESTRO_START + '="NO"')
    .setBackground("#EEEEEE")
    .setFontColor("#9E9E9E")
    .setRanges([cfRange])
    .build();
    
  maestro.setConditionalFormatRules([selectionRule, inactiveRule]);
  
  SpreadsheetApp.getActive().toast("Validaciones de MAESTRO restauradas ✓", "⚙️ Mise", 4);
}

function crearHojaCargaMasiva() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("➕ AGREGAR_MÚLTIPLES");
  if (sheet) {
    ss.setActiveSheet(sheet);
    SpreadsheetApp.getUi().alert("Ya existe la hoja '➕ AGREGAR_MÚLTIPLES'. Termina de llenarla o bórrala antes de crear otra.");
    return;
  }
  
  sheet = ss.insertSheet("➕ AGREGAR_MÚLTIPLES");
  
  // Headers
  sheet.getRange("A1:E1").merge()
    .setValue("MISE — CARGA MASIVA DE PRODUCTOS")
    .setBackground(C.dark).setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(11).setFontFamily("Arial").setHorizontalAlignment("center").setVerticalAlignment("middle");
  sheet.setRowHeight(1, 30);
  
  sheet.getRange("A2:E2").merge()
    .setValue("Instrucciones: Completa las columnas B a E. Llena tantas filas como productos quieras agregar.")
    .setBackground(C.cream).setFontColor("#333333").setFontSize(9)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sheet.setRowHeight(2, 20);
  
  sheet.getRange("A3:D3").merge()
    .setValue("Confirmar Carga de Productos:").setFontWeight("bold").setFontSize(9)
    .setHorizontalAlignment("right").setVerticalAlignment("middle").setBackground(C.sage).setFontColor("#FFFFFF");
  sheet.getRange("E3").insertCheckboxes().setValue(false).setBackground(C.yellow).setHorizontalAlignment("center");
  sheet.setRowHeight(3, 24);
  
  sheet.getRange("A4:E4")
    .setValues([["No", "ID FAMILIA (Opcional)", "PRODUCTO (Obligatorio)", "PRESENTACIÓN (Obligatorio)", "UNIDAD (Obligatorio)"]])
    .setBackground(C.dark).setFontColor("#FFFFFF").setFontWeight("bold").setFontSize(9)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sheet.setRowHeight(4, 26);
  
  sheet.setFrozenRows(4);
  
  // Pre-poblar 50 filas
  const rows = 50;
  const colA = [];
  const bgs = [];
  for (let i = 0; i < rows; i++) {
    colA.push([i + 1]);
    bgs.push(Array(5).fill(i % 2 === 0 ? C.rowA : C.rowB));
  }
  sheet.getRange(5, 1, rows, 1).setValues(colA);
  sheet.getRange(5, 1, rows, 5).setBackgrounds(bgs)
    .setFontFamily("Calibri").setFontSize(10).setVerticalAlignment("middle");
  sheet.getRange(5, 1, rows, 1).setHorizontalAlignment("center");
  sheet.getRange(5, 2, rows, 1).setHorizontalAlignment("center");
  sheet.getRange(5, 5, rows, 1).setHorizontalAlignment("center");
  
  // Dropdown de unidades en columna E
  const unitValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(["kg", "lt", "pza", "paq", "g", "ml", "rol", "fco", "dom", "bol", "caj"], true)
    .setAllowInvalid(false)
    .setHelpText("Selecciona una unidad válida.")
    .build();
  sheet.getRange(5, 5, rows, 1).setDataValidation(unitValidation);
  
  sheet.setColumnWidth(1, 40);
  sheet.setColumnWidth(2, 160);
  sheet.setColumnWidth(3, 220);
  sheet.setColumnWidth(4, 180);
  sheet.setColumnWidth(5, 140);
  
  ss.setActiveSheet(sheet);
}

function procesarCargaMasiva() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tempSheet = ss.getSheetByName("➕ AGREGAR_MÚLTIPLES");
  if (!tempSheet) return;
  
  const lastRowT = tempSheet.getLastRow();
  if (lastRowT < 5) {
    SpreadsheetApp.getUi().alert("No hay productos para cargar.");
    tempSheet.getRange("E3").setValue(false);
    return;
  }
  
  const rawData = tempSheet.getRange(5, 1, lastRowT - 4, 5).getValues();
  const validRows = [];
  for (let i = 0; i < rawData.length; i++) {
    const idFam = String(rawData[i][1]).trim();
    const prod = String(rawData[i][2]).trim();
    const pres = String(rawData[i][3]).trim();
    const unit = String(rawData[i][4]).trim();
    
    if (prod !== "") {
      if (pres === "" || unit === "") {
        SpreadsheetApp.getUi().alert(`Error en fila ${i + 5}: El producto "${prod}" debe tener PRESENTACIÓN y UNIDAD obligatoriamente.`);
        tempSheet.getRange("E3").setValue(false);
        return;
      }
      validRows.push({ idFam, prod, pres, unit });
    }
  }
  
  if (validRows.length === 0) {
    SpreadsheetApp.getUi().alert("No se encontraron productos para cargar. Escribe al menos el nombre del producto en la columna C.");
    tempSheet.getRange("E3").setValue(false);
    return;
  }
  
  const proceed = SpreadsheetApp.getUi().alert(
    "➕ Confirmar Carga Masiva",
    `¿Confirmas agregar ${validRows.length} productos nuevos en lote al catálogo, kardex y hojas de historial?`,
    SpreadsheetApp.getUi().ButtonSet.YES_NO
  );
  if (proceed !== SpreadsheetApp.getUi().Button.YES) {
    tempSheet.getRange("E3").setValue(false);
    return;
  }
  
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    SpreadsheetApp.getUi().alert("El archivo está ocupado. Intenta de nuevo.");
    tempSheet.getRange("E3").setValue(false);
    return;
  }
  
  try {
    const maestro = ss.getSheetByName(SHEET_MAESTRO);
    const lrM = maestro.getLastRow();
    const nos = maestro.getRange(MAESTRO_START, 1, lrM - MAESTRO_START + 1, 1).getValues();
    let lastNo = nos.reduce((max, r) => Math.max(max, parseInt(r[0]) || 0), 0);
    
    const maestroRows = [];
    const bgsM = [];
    
    const newProductsData = []; // Para procesar en los Kardex
    
    for (let i = 0; i < validRows.length; i++) {
      const item = validRows[i];
      const newNo = ++lastNo;
      maestroRows.push([newNo, item.idFam, item.prod, item.pres, item.unit, "SÍ", 0, 0, false]);
      
      const rowColor = (newNo % 2 === 1) ? C.rowA : C.rowB;
      bgsM.push(Array(9).fill(rowColor));
      
      newProductsData.push({ newNo, item, rowColor });
    }
    
    // 1. Escribir en MAESTRO
    const startRowM = lrM + 1;
    maestro.getRange(startRowM, 1, validRows.length, 9).setValues(maestroRows);
    maestro.getRange(startRowM, 1, validRows.length, 9).setBackgrounds(bgsM);
    
    // Agregar validación y checkboxes en MAESTRO
    const validationRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(["SÍ", "NO"], true)
      .setAllowInvalid(false)
      .setHelpText("Selecciona SÍ o NO para activar/desactivar el producto.")
      .build();
    maestro.getRange(startRowM, 6, validRows.length, 1).setDataValidation(validationRule);
    maestro.getRange(startRowM, 9, validRows.length, 1).insertCheckboxes().setValue(false);
    
    // 2. Insertar en KARDEX_BA y KARDEX_BM
    Object.values(BODEGAS).forEach(b => {
      const kSheet = ss.getSheetByName(b.kardex);
      if (kSheet) {
        const lastRowK = kSheet.getLastRow();
        const startRowK = lastRowK + 1;
        
        const kardexRows = [];
        const bgsK = [];
        const formulasSemaforo = [];
        
        for (let i = 0; i < newProductsData.length; i++) {
          const np = newProductsData[i];
          const rn = startRowK + i;
          
          // Cols A-D: No, PRODUCTO, PRESENTACIÓN, UNIDAD
          kardexRows.push([np.newNo, np.item.prod, np.item.pres, np.item.unit]);
          
          const rowColor = np.rowColor;
          bgsK.push(Array(29).fill(rowColor));
          
          // Semáforo fórmula
          const formulaCad = '=IF(ISBLANK(E' + rn + '); "⚪ S/F"; ' +
                             'IF(E' + rn + '-TODAY()<=0; "🔴 CAD"; ' +
                             'IF(E' + rn + '-TODAY()<=2; "🔴 ≤2d"; ' +
                             'IF(E' + rn + '-TODAY()<=7; "🟠 ≤7d"; ' +
                             'IF(E' + rn + '-TODAY()<=14; "🟡 ≤14d"; ' +
                             'IF(E' + rn + '-TODAY()<=28; "🟤 ≤28d"; ' +
                             'IF(E' + rn + '-TODAY()<=60; "🔵 ≤60d"; "🟢 OK")))))))';
          formulasSemaforo.push([formulaCad]);
        }
        
        // Escribir bases en Kardex
        kSheet.getRange(startRowK, 1, validRows.length, 4).setValues(kardexRows);
        kSheet.getRange(startRowK, 5, validRows.length, 1).setDataValidation(
          SpreadsheetApp.newDataValidation().requireDate()
            .setHelpText("Fecha de caducidad del lote").build()
        ).setNumberFormat("DD/MMM/YY");
        
        kSheet.getRange(startRowK, 7, validRows.length, 1).setFormulas(formulasSemaforo);
        kSheet.getRange(startRowK, 8, validRows.length, 1).setValue(0);
        
        // Fórmulas SLD y campos vacíos
        for (let d = 0; d < KARDEX_DAYS; d++) {
          const sldCol  = 11 + d * 3;
          const prevCol = 8  + d * 3;
          const entCol  = 9  + d * 3;
          const salCol  = 10 + d * 3;
          
          kSheet.getRange(startRowK, entCol, validRows.length, 1).setValue("");
          kSheet.getRange(startRowK, salCol, validRows.length, 1).setValue("");
          
          const fSlds = [];
          for (let i = 0; i < validRows.length; i++) {
            const rn = startRowK + i;
            fSlds.push(['=' + _col(prevCol) + rn + '+IFERROR(' + _col(entCol) + rn + ';0)-IFERROR(' + _col(salCol) + rn + ';0)']);
          }
          kSheet.getRange(startRowK, sldCol, validRows.length, 1).setFormulas(fSlds);
        }
        
        // Formato de fondos
        kSheet.getRange(startRowK, 1, validRows.length, 29).setBackgrounds(bgsK);
        kSheet.getRange(startRowK, 8, validRows.length, 1).setBackgrounds(Array(validRows.length).fill([C.iceBlue]));
        for (let d = 0; d < KARDEX_DAYS; d++) {
          kSheet.getRange(startRowK, 9  + d * 3, validRows.length, 1).setBackgrounds(Array(validRows.length).fill([C.entBg]));
          kSheet.getRange(startRowK, 10 + d * 3, validRows.length, 1).setBackgrounds(Array(validRows.length).fill([C.salBg]));
          kSheet.getRange(startRowK, 11 + d * 3, validRows.length, 1).setBackgrounds(Array(validRows.length).fill([C.iceBlue]));
        }
      }
    });
    
    // 3. Insertar en HISTORIAL_BA y HISTORIAL_BM
    Object.values(BODEGAS).forEach(b => {
      const histName = `HISTORIAL_${b.key}`;
      const hSheet = ss.getSheetByName(histName);
      if (hSheet) {
        const lastRowH = hSheet.getLastRow();
        const startRowH = lastRowH + 1;
        
        const histRows = [];
        const bgsH = [];
        for (let i = 0; i < newProductsData.length; i++) {
          const np = newProductsData[i];
          histRows.push([np.newNo, np.item.prod, np.item.unit]);
          bgsH.push(Array(3).fill(np.rowColor));
        }
        
        hSheet.getRange(startRowH, 1, validRows.length, 3).setValues(histRows);
        hSheet.getRange(startRowH, 1, validRows.length, 3).setBackgrounds(bgsH);
        hSheet.getRange(startRowH, 1, validRows.length, 1).setHorizontalAlignment("center");
        hSheet.getRange(startRowH, 3, validRows.length, 1).setHorizontalAlignment("center");
      }
    });
    
    // 4. Recrear Vistas Móviles
    _buildVista("BA");
    _buildVista("BM");
    
    // 5. Recrear Caducidades
    crearCaducidades();
    
    // 6. Eliminar hoja temporal
    try {
      ss.deleteSheet(tempSheet);
    } catch(e) {}
    
    SpreadsheetApp.getUi().alert("✅ Carga masiva completada", `Se agregaron ${validRows.length} productos nuevos con éxito.`, SpreadsheetApp.getUi().ButtonSet.OK);
    _log("procesarCargaMasiva", `${validRows.length} productos cargados.`);
  } finally {
    lock.releaseLock();
  }
}

function crearHojaEdicionMasiva() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const maestro = ss.getSheetByName(SHEET_MAESTRO);
  if (!maestro) return;
  
  const lr = maestro.getLastRow();
  if (lr < MAESTRO_START) {
    SpreadsheetApp.getUi().alert("No hay productos en MAESTRO.");
    return;
  }
  
  // Obtener seleccionados
  const count = lr - MAESTRO_START + 1;
  const data = maestro.getRange(MAESTRO_START, 1, count, 9).getValues();
  const selectedProds = [];
  for (let i = 0; i < count; i++) {
    if (data[i][8] === true) {
      selectedProds.push({
        no: data[i][0],
        idFam: data[i][1],
        prod: data[i][2],
        pres: data[i][3],
        unit: data[i][4],
        min: data[i][6],
        max: data[i][7]
      });
    }
  }
  
  if (selectedProds.length === 0) {
    SpreadsheetApp.getUi().alert("No has seleccionado ningún producto. Primero marca las casillas de la columna 'SELECCIONAR' en MAESTRO.");
    return;
  }
  
  let editSheet = ss.getSheetByName("✏️ EDITAR_PRODUCTOS");
  if (editSheet) {
    ss.deleteSheet(editSheet);
  }
  
  editSheet = ss.insertSheet("✏️ EDITAR_PRODUCTOS");
  
  // Headers
  editSheet.getRange("A1:G1").merge()
    .setValue("MISE — EDICIÓN MASIVA DE PRODUCTOS")
    .setBackground(C.dark).setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(11).setFontFamily("Arial").setHorizontalAlignment("center").setVerticalAlignment("middle");
  editSheet.setRowHeight(1, 30);
  
  editSheet.getRange("A2:G2").merge()
    .setValue("Instrucciones: Modifica los campos que desees. Las columnas PRODUCTO, PRESENTACIÓN y UNIDAD son obligatorias. Deja la columna A (No) intacta.")
    .setBackground(C.cream).setFontColor("#333333").setFontSize(9)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  editSheet.setRowHeight(2, 20);
  
  editSheet.getRange("A3:D3").merge()
    .setValue("Confirmar Edición de Productos:").setFontWeight("bold").setFontSize(9)
    .setHorizontalAlignment("right").setVerticalAlignment("middle").setBackground(C.sage).setFontColor("#FFFFFF");
  editSheet.getRange("E3").insertCheckboxes().setValue(false).setBackground(C.yellow).setHorizontalAlignment("center");
  editSheet.getRange("F3:G3").merge().setValue("").setBackground(C.cream);
  editSheet.setRowHeight(3, 24);
  
  editSheet.getRange("A4:G4")
    .setValues([["No (No editar)", "PRODUCTO (Obligatorio)", "PRESENTACIÓN (Obligatorio)", "UNIDAD (Obligatorio)", "ID FAMILIA (Opcional)", "MÍN (Stock)", "MÁX (Stock)"]])
    .setBackground(C.dark).setFontColor("#FFFFFF").setFontWeight("bold").setFontSize(9)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  editSheet.setRowHeight(4, 26);
  
  editSheet.setFrozenRows(4);
  
  // Poblar productos seleccionados
  const editRows = [];
  const bgs = [];
  selectedProds.forEach((p, idx) => {
    editRows.push([p.no, p.prod, p.pres, p.unit, p.idFam, p.min, p.max]);
    bgs.push(Array(7).fill(idx % 2 === 0 ? C.rowA : C.rowB));
  });
  
  const startRow = 5;
  editSheet.getRange(startRow, 1, selectedProds.length, 7).setValues(editRows);
  editSheet.getRange(startRow, 1, selectedProds.length, 7).setBackgrounds(bgs)
    .setFontFamily("Calibri").setFontSize(10).setVerticalAlignment("middle");
  editSheet.getRange(startRow, 1, selectedProds.length, 1).setHorizontalAlignment("center").setFontWeight("bold").setFontColor("#C62828");
  editSheet.getRange(startRow, 5, selectedProds.length, 1).setHorizontalAlignment("center");
  editSheet.getRange(startRow, 6, selectedProds.length, 2).setHorizontalAlignment("center");
  
  // Dropdown de unidades en columna D (col 4)
  const unitValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(["kg", "lt", "pza", "paq", "g", "ml", "rol", "fco", "dom", "bol", "caj"], true)
    .setAllowInvalid(false)
    .setHelpText("Selecciona una unidad válida.")
    .build();
  editSheet.getRange(startRow, 4, selectedProds.length, 1).setDataValidation(unitValidation);
  
  editSheet.setColumnWidth(1, 100);
  editSheet.setColumnWidth(2, 220);
  editSheet.setColumnWidth(3, 180);
  editSheet.setColumnWidth(4, 140);
  editSheet.setColumnWidth(5, 140);
  editSheet.setColumnWidth(6, 90);
  editSheet.setColumnWidth(7, 90);
  
  // Proteger la primera columna para advertir que no debe ser modificada
  try {
    const protection = editSheet.getRange(startRow, 1, selectedProds.length, 1).protect()
      .setDescription("No editar el identificador No.");
    protection.removeEditors(protection.getEditors());
    if (protection.canDomainEdit()) protection.setDomainEdit(false);
  } catch(e) {}
  
  ss.setActiveSheet(editSheet);
}

function procesarEdicionMasiva() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const editSheet = ss.getSheetByName("✏️ EDITAR_PRODUCTOS");
  if (!editSheet) return;
  
  const lastRowE = editSheet.getLastRow();
  if (lastRowE < 5) {
    SpreadsheetApp.getUi().alert("No hay productos para guardar.");
    editSheet.getRange("E3").setValue(false);
    return;
  }
  
  const rawData = editSheet.getRange(5, 1, lastRowE - 4, 7).getValues();
  const validEdits = [];
  for (let i = 0; i < rawData.length; i++) {
    const no = parseInt(rawData[i][0]);
    const prod = String(rawData[i][1]).trim();
    const pres = String(rawData[i][2]).trim();
    const unit = String(rawData[i][3]).trim();
    const idFam = String(rawData[i][4]).trim();
    const min = parseFloat(rawData[i][5]) || 0;
    const max = parseFloat(rawData[i][6]) || 0;
    
    if (isNaN(no) || no <= 0) {
      SpreadsheetApp.getUi().alert(`Error en fila ${i + 5}: El identificador "No" no es válido. No debiste modificar la primera columna.`);
      editSheet.getRange("E3").setValue(false);
      return;
    }
    
    if (prod === "" || pres === "" || unit === "") {
      SpreadsheetApp.getUi().alert(`Error en fila ${i + 5}: Los campos PRODUCTO, PRESENTACIÓN y UNIDAD son obligatorios.`);
      editSheet.getRange("E3").setValue(false);
      return;
    }
    
    validEdits.push({ no, prod, pres, unit, idFam, min, max });
  }
  
  const proceed = SpreadsheetApp.getUi().alert(
    "📝 Guardar Cambios de Edición",
    `¿Confirmas guardar los cambios de ${validEdits.length} productos y actualizar el catálogo, kardex e historial?`,
    SpreadsheetApp.getUi().ButtonSet.YES_NO
  );
  if (proceed !== SpreadsheetApp.getUi().Button.YES) {
    editSheet.getRange("E3").setValue(false);
    return;
  }
  
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    SpreadsheetApp.getUi().alert("El archivo está ocupado. Intenta de nuevo.");
    editSheet.getRange("E3").setValue(false);
    return;
  }
  
  try {
    const maestro = ss.getSheetByName(SHEET_MAESTRO);
    const lrM = maestro.getLastRow();
    if (lrM >= MAESTRO_START) {
      const rangeM = maestro.getRange(MAESTRO_START, 1, lrM - MAESTRO_START + 1, 9);
      const dataM = rangeM.getValues();
      for (let i = 0; i < validEdits.length; i++) {
        const item = validEdits[i];
        const idx = item.no - 1;
        if (idx >= 0 && idx < dataM.length) {
          dataM[idx][1] = item.idFam;
          dataM[idx][2] = item.prod;
          dataM[idx][3] = item.pres;
          dataM[idx][4] = item.unit;
          dataM[idx][6] = item.min;
          dataM[idx][7] = item.max;
          dataM[idx][8] = false; // Desmarcar
        }
      }
      rangeM.setValues(dataM);
    }
    
    // 2. Actualizar KARDEX_BA y KARDEX_BM (No, PRODUCTO, PRESENTACIÓN, UNIDAD)
    Object.values(BODEGAS).forEach(b => {
      const kSheet = ss.getSheetByName(b.kardex);
      if (kSheet) {
        const lrK = kSheet.getLastRow();
        if (lrK >= KARDEX_START) {
          const rangeK = kSheet.getRange(KARDEX_START, 1, lrK - KARDEX_START + 1, 4);
          const dataK = rangeK.getValues();
          for (let i = 0; i < validEdits.length; i++) {
            const item = validEdits[i];
            const idx = item.no - 1;
            if (idx >= 0 && idx < dataK.length) {
              dataK[idx][1] = item.prod;
              dataK[idx][2] = item.pres;
              dataK[idx][3] = item.unit;
            }
          }
          rangeK.setValues(dataK);
        }
      }
    });
    
    // 3. Actualizar HISTORIAL_BA y HISTORIAL_BM (No, PRODUCTO, UNIDAD)
    Object.values(BODEGAS).forEach(b => {
      const hSheet = ss.getSheetByName(`HISTORIAL_${b.key}`);
      if (hSheet) {
        const lrH = hSheet.getLastRow();
        if (lrH >= 5) {
          const rangeH = hSheet.getRange(5, 1, lrH - 4, 3);
          const dataH = rangeH.getValues();
          for (let i = 0; i < validEdits.length; i++) {
            const item = validEdits[i];
            const idx = item.no - 1;
            if (idx >= 0 && idx < dataH.length) {
              dataH[idx][1] = item.prod;
              dataH[idx][2] = item.unit;
            }
          }
          rangeH.setValues(dataH);
        }
      }
    });
    
    // 4. Recrear Vistas Móviles
    _buildVista("BA");
    _buildVista("BM");
    
    // 5. Recrear Caducidades
    crearCaducidades();
    
    // 6. Eliminar hoja temporal
    try {
      ss.deleteSheet(editSheet);
    } catch(e) {}
    
    SpreadsheetApp.getUi().alert("✅ Edición masiva completada", `Se actualizaron ${validEdits.length} productos con éxito.`, SpreadsheetApp.getUi().ButtonSet.OK);
    _log("procesarEdicionMasiva", `${validEdits.length} productos actualizados.`);
  } finally {
    lock.releaseLock();
  }
}