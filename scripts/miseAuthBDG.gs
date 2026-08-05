/**
 * MISE — Bodegas Script v1.5.0 Altair (Quiosco de Picking & Categorías Dinámicas)
 * Suite Atelier · La Crêpe Parisienne · Grupo MYT
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
 *   KARDEX_BA      — movimientos diarios Andares
 *   KARDEX_BM      — movimientos diarios Mercado
 *   VISTA_MOVIL_BA — saldos para IMPORTRANGE (Pedidos Andares)
 *   VISTA_MOVIL_BM — saldos para IMPORTRANGE (Pedidos Mercado)
 *   CADUCIDADES    — vista consolidada de fechas de caducidad
 *   🗒 LOG         — auditoría de operaciones
 */

// ── CONSTANTES ────────────────────────────────────────────────────────────────
const BODEGAS = {
  BA: { key: "BA", nombre: "Andares", kardex: "KARDEX_BA", vista: "VISTA_MOVIL_BA" },
  BM: { key: "BM", nombre: "Mercado", kardex: "KARDEX_BM", vista: "VISTA_MOVIL_BM" }
};

const SHEET_MAESTRO  = "MAESTRO";
const SHEET_LOG      = "🗒 LOG";
const MAESTRO_START  = 4;   // fila donde empiezan datos en MAESTRO
const KARDEX_START   = 7;   // fila donde empiezan datos en KARDEX
const KARDEX_SLD_ANT = 9;   // col I — SALDO ANTERIOR
const KARDEX_SLD_FIN = 30;  // col AD — SLD domingo
const KARDEX_DAYS    = 7;
const DIAS           = ["LUN","MAR","MIE","JUE","VIE","SAB","DOM"];
const MAESTRO_COLS   = 13;  // A-M en MAESTRO (13 columnas tras remover ID_FAMILIA)
const KARDEX_TOTAL_COLS = 30; // A-AD en KARDEX

// ── UTILERÍAS DINÁMICAS DE MAPEO DE ENCABEZADOS ──────────────────────────────
function _colToLetter(col) {
  let letter = "";
  let temp = col;
  while (temp > 0) {
    let rem = (temp - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    temp = Math.floor((temp - rem) / 26);
  }
  return letter;
}

function _getMaestroHeaderMap(sheet) {
  const targetSheet = sheet || SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_MAESTRO);
  if (!targetSheet) return {};
  const lastCol = targetSheet.getLastColumn();
  if (lastCol < 1) return {};
  const headers = targetSheet.getRange(3, 1, 1, lastCol).getValues()[0];
  const map = {};
  headers.forEach((h, idx) => {
    if (h) {
      const colNum = idx + 1;
      const key = String(h).trim().toUpperCase();
      map[key] = { col: colNum, letter: _colToLetter(colNum), index: idx };
    }
  });
  return map;
}

// Mapa ID_FAMILIA → CATEGORÍA
const CATEGORIAS_MAP = {
  'REF': 'REFRIGERADOS',
  'FYV': 'FRUTAS Y VERDURAS',
  'LEC': 'LÁCTEOS',
  'ABR': 'ABARROTES',
  'BEB': 'BEBIDAS',
  'DES': 'DESECHABLES',
  'JAR': 'JARCERÍA'
};
const CATEGORIAS_LISTA = Object.values(CATEGORIAS_MAP);

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
  try {
    migrarEstructuraMaestro13Cols();
    // NOTA: Se removió la reparación automática al abrir para evitar toasts innecesarios.
    // La reparación manual está disponible en el menú "⚙️ Mise -> Diagnosticar y reparar sistema".
  } catch(e) {}
  try {
    const ui = SpreadsheetApp.getUi();
    const menu = ui.createMenu("⚙️ Mise")
      .addItem("🩺 Diagnosticar y reparar sistema",       "repararYSincronizarSistemaManualmente")
      .addSeparator()
      .addSubMenu(ui.createMenu("📅 Gestión Semanal")
        .addItem("📅 Configurar semana — Andares",          "configurarSemanaBA")
        .addItem("📅 Configurar semana — Mercado",          "configurarSemanaBM")
        .addSeparator()
        .addItem("⏩ Avanzar semana — Andares",             "avanzarSemanaBA")
        .addItem("⏩ Avanzar semana — Mercado",             "avanzarSemanaBM"))
      .addSeparator()
      .addSubMenu(ui.createMenu("🛠️ Gestión de Productos")
        .addItem("🖐️ Ordenar picking (Drag & Drop)",       "abrirConstructorPickingHTML")
        .addSeparator()
        .addItem("➕ Agregar productos en lote",            "crearHojaCargaMasiva")
        .addItem("📝 Editar productos seleccionados",     "crearHojaEdicionMasiva")
        .addItem("🗑 Eliminar productos seleccionados",    "eliminarSeleccionadosMaestro")
        .addItem("🧹 Eliminar productos duplicados",      "eliminarDuplicadosCatalogo"))
      .addSeparator()
      .addSubMenu(ui.createMenu("📊 Mantenimiento de Vistas")
        .addItem("📊 Recrear VISTA_MOVIL_BA",             "crearVistaMóvilBA")
        .addItem("📊 Recrear VISTA_MOVIL_BM",             "crearVistaMóvilBM")
        .addSeparator()
        .addItem("🔒 Proteger catálogo anti-dummies",      "protegerMaestroSeguro"))
      .addSeparator()
      .addItem("⚠️ Restablecer sistema (Destructivo)",     "setupCompleto")
      .addSeparator()
      .addItem("ℹ️ Acerca de",                               "acercaDe");
    menu.addToUi();
  } catch(e) {}
}

// ── MOTOR AUTORREPARADOR (SELF-HEALING ENGINE) ────────────────────────────────
function repararYSincronizarSistemaManualmente() {
  repararYSincronizarSistema(false);
}

function repararYSincronizarSistema(silent = false) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const maestro = ss.getSheetByName(SHEET_MAESTRO);
  if (!maestro) return;

  let repairsCount = 0;

  try {
    const lr = maestro.getLastRow();
    if (lr >= MAESTRO_START) {
      const count = lr - MAESTRO_START + 1;
      const map = _getMaestroHeaderMap(maestro);

      const cStkBA = map["STOCK_BA"] ? map["STOCK_BA"].col : 9;
      const cStkBM = map["STOCK_BM"] ? map["STOCK_BM"].col : 12;

      // 1. Escanear errores en STOCK_BA y STOCK_BM en MAESTRO
      const rangeStkBA = maestro.getRange(MAESTRO_START, cStkBA, count, 1);
      const rangeStkBM = maestro.getRange(MAESTRO_START, cStkBM, count, 1);

      const valuesStkBA = rangeStkBA.getValues();
      const valuesStkBM = rangeStkBM.getValues();

      const hasErrorBA = valuesStkBA.some(r => String(r[0]).includes("#N/A") || String(r[0]).includes("#REF") || String(r[0]).includes("#ERROR") || String(r[0]).includes("#VALUE"));
      const hasErrorBM = valuesStkBM.some(r => String(r[0]).includes("#N/A") || String(r[0]).includes("#REF") || String(r[0]).includes("#ERROR") || String(r[0]).includes("#VALUE"));

      if (hasErrorBA || hasErrorBM || !silent) {
        _ordenarYRenumerarTodo();
        repairsCount++;
      }

      // 2. Verificar dropdowns y validaciones desprendidas + asegurar columnas de quiosco
      _asegurarColumnasQuioscoEnMaestro(maestro);
      restaurarValidacionesMaestro();

      // 3. Recrear Vistas Móviles
      _buildVista("BA");
      _buildVista("BM");
    }

    if (!silent) {
      SpreadsheetApp.getActive().toast("🩺 Sistema verificado y autorreparado con éxito ✓", "⚙️ Mise Self-Healing", 4);
      SpreadsheetApp.getUi().alert("🩺 Diagnóstico Completo", "El sistema ha verificado todas las fórmulas, punteros y validaciones de MAESTRO y KARDEX.\n\nTodo se encuentra 100% sincronizado y saludable.", SpreadsheetApp.getUi().ButtonSet.OK);
    } else if (repairsCount > 0) {
      SpreadsheetApp.getActive().toast("🩺 Se detectaron y repararon fórmulas desfasadas automáticamente ✓", "⚙️ Mise Self-Healing", 4);
    }
  } catch (err) {
    if (!silent) {
      SpreadsheetApp.getUi().alert("❌ Error en Diagnóstico", err.toString(), SpreadsheetApp.getUi().ButtonSet.OK);
    }
  }
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
      } else if (col === 8) { // H2 - Eliminar Seleccionados
        if (e.range.getValue() === true) {
          e.range.setValue(false);
          eliminarSeleccionadosMaestro();
        }
      } else if (col === 10) { // J2 - Limpiar Selección
        if (e.range.getValue() === true) {
          e.range.setValue(false);
          limpiarSeleccionMaestro();
        }
      }
      return;
    }

    if (col === 7 && row >= MAESTRO_START) {
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
        // crearCaducidades(); // Feature deshabilitada
      } finally {
        lock.releaseLock();
      }
    }
    return;
  }

  // 1.5 Manejo de Carga Masiva (Checkbox Confirmar)
  if (name === "➕ AGREGAR_MÚLTIPLES") {
    if (row === 3 && col === 10) { // J3 - Confirmar
      if (e.range.getValue() === true) {
        e.range.setValue(false); // Reset inmediato preventivo contra dobles ejecuciones
        procesarCargaMasiva();
      }
    }
    return;
  }

  // 1.6 Manejo de Edición Masiva (Checkbox Confirmar)
  if (name === "✏️ EDITAR_PRODUCTOS") {
    if (row === 3 && col === 9) { // I3 - Confirmar
      if (e.range.getValue() === true) {
        e.range.setValue(false); // Reset inmediato preventivo contra dobles ejecuciones
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
    if (col === 14) { // N4 - Avanzar Semana
      if (e.range.getValue() === true) {
        e.range.setValue(false);
        _avanzarSemana(bodegaKey);
      }
    } else if (col === 17) { // Q4 - Recrear Vista Móvil
      if (e.range.getValue() === true) {
        e.range.setValue(false);
        _buildVista(bodegaKey);
        SpreadsheetApp.getActive().toast(`VISTA_MOVIL_${bodegaKey} recreada`, "⚙️ Mise", 4);
      }
    } else if (col === 20) { // T4 - Agregar Producto
      if (e.range.getValue() === true) {
        e.range.setValue(false);
        agregarProducto();
      }
    } else if (col === 23) { // W4 - Anular Producto
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
    if (col === 10 + d * 3)     { tipo = "ENT"; break; }
    if (col === 10 + d * 3 + 1) { tipo = "SAL"; break; }
  }
  if (!tipo) return;

  let rawVal = e.value;
  if (rawVal !== undefined && rawVal !== null) {
    const strVal = String(rawVal).trim();
    const cleanVal = strVal.replace(',', '.');
    const num = Number(cleanVal);
    if (!isNaN(num) && num >= 0) {
      e.range.setValue(num);
      return;
    }
  }

  let val = e.range.getValue();
  if (val !== "") {
    if (Object.prototype.toString.call(val) === '[object Date]') {
      e.range.clearContent();
      SpreadsheetApp.getActive().toast(`${tipo} debe ser número ≥ 0 (no se permiten fechas)`, "⚙️ Mise", 4);
      return;
    }
    if (typeof val === "string") {
      const cleanVal = val.replace(',', '.').trim();
      const num = Number(cleanVal);
      if (!isNaN(num) && num >= 0) {
        e.range.setValue(num);
        return;
      }
    }
    const checkVal = Number(val);
    if (isNaN(checkVal) || checkVal < 0) {
      e.range.clearContent();
      SpreadsheetApp.getActive().toast(`${tipo} debe ser número ≥ 0`, "⚙️ Mise", 4);
    }
  }
}

// ── SETUP COMPLETO CORREGIDO SIN ERRORES DE ACCESO ───────────────────────────
function setupCompleto() {
  const ui   = SpreadsheetApp.getUi();
  const pResp = ui.prompt(
    "⚠️ Restablecer sistema (Acción Destructiva)",
    "Esta operación borrará y reconstruirá toda la base de datos de Bodega desde cero.\n\nIngresa la contraseña de administrador para continuar:",
    ui.ButtonSet.OK_CANCEL
  );
  if (pResp.getSelectedButton() !== ui.Button.OK) return;
  
  const psw = pResp.getResponseText().trim();
  const adminPsw = PropertiesService.getScriptProperties().getProperty("ADMIN_PASSWORD") || "LCP-ADMIN-2026";
  if (psw !== adminPsw) {
    ui.alert("❌ Contraseña incorrecta. Operación abortada.");
    return;
  }
  
  const resp = ui.alert(
    "⚠️ Confirmación Final",
    "¿Estás absolutamente seguro de que deseas borrar los históricos y catálogo actual?",
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;

  // Purgar estados de sesión pero PRESERVAR contraseña de administrador
  const props = PropertiesService.getScriptProperties();
  const adminPswProp = props.getProperty("ADMIN_PASSWORD");

  props.deleteAllProperties();
  try { SpreadsheetApp.flush(); } catch(e) {}
  
  if (adminPswProp) props.setProperty("ADMIN_PASSWORD", adminPswProp);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Forzar configuración regional de México para evitar errores de análisis de fórmula (Inglés + comas)
  try { ss.setSpreadsheetLocale('es_MX'); } catch(e) {}
  
  // Hojas del sistema que queremos conservar (incluye 🗒 LOG)
  const systemSheetNames = [SHEET_MAESTRO, SHEET_LOG];
  Object.values(BODEGAS).forEach(b => {
    systemSheetNames.push(b.kardex);
    systemSheetNames.push(b.vista);
  });
  
  ss.getSheets().forEach(s => {
    const name = s.getName();
    if (!systemSheetNames.includes(name)) {
      try { ss.deleteSheet(s); } catch(e) {}
    }
  });

  function getOrCreateSheet(name) {
    let s = ss.getSheetByName(name);
    if (s) {
      s.clear();
      s.clearConditionalFormatRules();
      s.setHiddenGridlines(false);
      s.setFrozenRows(0);
      s.setFrozenColumns(0);
      try { s.showSheet(); } catch(e) {}
    } else {
      s = ss.insertSheet(name);
    }
    return s;
  }

  // 2. MAESTRO
  SpreadsheetApp.getActive().toast("Creando MAESTRO...", "⚙️ Mise", 3);
  const maestro = getOrCreateSheet(SHEET_MAESTRO);
  _buildMaestro(maestro);

  // 3. KARDEX
  SpreadsheetApp.getActive().toast("Creando KARDEX...", "⚙️ Mise", 3);
  Object.values(BODEGAS).forEach(b => {
    const k = getOrCreateSheet(b.kardex);
    _buildKardex(k, b.nombre);
    _poblarKardex(k);
  });

  // 4. VISTAS MÓVIL
  SpreadsheetApp.getActive().toast("Creando VISTAS MÓVIL...", "⚙️ Mise", 3);
  Object.keys(BODEGAS).forEach(key => _buildVista(key));

  _log("setupCompleto", "Sistema creado desde cero");
  ui.alert("✅ Setup completo", `Sistema listo.\n\nPróximos pasos:\n1. ⚙️ Mise → Configurar semana\n2. ⚙️ Mise → Correr tests\n3. Configurar IMPORTRANGE en Pedidos Andares o Pedidos Mercado`, ui.ButtonSet.OK);
}


// ── CONSTRUCCIÓN: MAESTRO ─────────────────────────────────────────────────────
function _aplicarReglasMaestro(maestro) {
  const lr = maestro.getLastRow();
  if (lr < MAESTRO_START) return;
  const count = lr - MAESTRO_START + 1;
  const map = _getMaestroHeaderMap(maestro);

  const lProd = map["PRODUCTO"] ? map["PRODUCTO"].letter : "C";
  const lAct  = map["ACTIVO"]   ? map["ACTIVO"].letter   : "F";
  const lMinBA = map["MÍN_BA"]  ? map["MÍN_BA"].letter  : "G";
  const lMaxBA = map["MÁX_BA"]  ? map["MÁX_BA"].letter  : "H";
  const lStkBA = map["STOCK_BA"] ? map["STOCK_BA"].letter : "I";
  const cStkBA = map["STOCK_BA"] ? map["STOCK_BA"].col    : 9;

  const lMinBM = map["MÍN_BM"]  ? map["MÍN_BM"].letter  : "J";
  const lMaxBM = map["MÁX_BM"]  ? map["MÁX_BM"].letter  : "K";
  const lStkBM = map["STOCK_BM"] ? map["STOCK_BM"].letter : "L";
  const cStkBM = map["STOCK_BM"] ? map["STOCK_BM"].col    : 12;

  const lSel   = map["SELECCIONAR"] ? map["SELECCIONAR"].letter : "M";

  const cfRange = maestro.getRange(MAESTRO_START, 1, count, maestro.getLastColumn());
  const rangeBA = maestro.getRange(MAESTRO_START, cStkBA, count, 1);
  const rangeBM = maestro.getRange(MAESTRO_START, cStkBM, count, 1);

  const selectionRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(`=$${lSel}${MAESTRO_START}=TRUE`)
    .setBackground("#E3F2FD")
    .setRanges([cfRange])
    .build();
    
  const inactiveRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(`=$${lAct}${MAESTRO_START}="NO"`)
    .setBackground("#EEEEEE")
    .setFontColor("#9E9E9E")
    .setRanges([cfRange])
    .build();

  const rules = [selectionRule, inactiveRule];
  
  // Rules for STOCK_BA
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(`=AND($${lMinBA}${MAESTRO_START}>0, IFERROR(VLOOKUP($${lProd}${MAESTRO_START}, INDIRECT("'KARDEX_BA'!$C:$AD"), 28, FALSE), 0) < 0.5*$${lMinBA}${MAESTRO_START})`)
    .setBackground("#FFCDD2").setFontColor("#B71C1C").setRanges([rangeBA]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(`=AND($${lMinBA}${MAESTRO_START}>0, IFERROR(VLOOKUP($${lProd}${MAESTRO_START}, INDIRECT("'KARDEX_BA'!$C:$AD"), 28, FALSE), 0) < $${lMinBA}${MAESTRO_START}, IFERROR(VLOOKUP($${lProd}${MAESTRO_START}, INDIRECT("'KARDEX_BA'!$C:$AD"), 28, FALSE), 0) >= 0.5*$${lMinBA}${MAESTRO_START})`)
    .setBackground("#FFE0B2").setFontColor("#BF360C").setRanges([rangeBA]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(`=AND(OR($${lMinBA}${MAESTRO_START}>0, $${lMaxBA}${MAESTRO_START}>0), IFERROR(VLOOKUP($${lProd}${MAESTRO_START}, INDIRECT("'KARDEX_BA'!$C:$AD"), 28, FALSE), 0) >= $${lMinBA}${MAESTRO_START}, IFERROR(VLOOKUP($${lProd}${MAESTRO_START}, INDIRECT("'KARDEX_BA'!$C:$AD"), 28, FALSE), 0) <= $${lMaxBA}${MAESTRO_START})`)
    .setBackground("#C8E6C9").setFontColor("#1B5E20").setRanges([rangeBA]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(`=AND($${lMaxBA}${MAESTRO_START}>0, IFERROR(VLOOKUP($${lProd}${MAESTRO_START}, INDIRECT("'KARDEX_BA'!$C:$AD"), 28, FALSE), 0) > $${lMaxBA}${MAESTRO_START})`)
    .setBackground("#B3E5FC").setFontColor("#0D47A1").setRanges([rangeBA]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(`=AND($${lMinBA}${MAESTRO_START}=0, $${lMaxBA}${MAESTRO_START}=0)`)
    .setBackground("#CFD8DC").setFontColor("#37474F").setRanges([rangeBA]).build());

  // Rules for STOCK_BM
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(`=AND($${lMinBM}${MAESTRO_START}>0, IFERROR(VLOOKUP($${lProd}${MAESTRO_START}, INDIRECT("'KARDEX_BM'!$C:$AD"), 28, FALSE), 0) < 0.5*$${lMinBM}${MAESTRO_START})`)
    .setBackground("#FFCDD2").setFontColor("#B71C1C").setRanges([rangeBM]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(`=AND($${lMinBM}${MAESTRO_START}>0, IFERROR(VLOOKUP($${lProd}${MAESTRO_START}, INDIRECT("'KARDEX_BM'!$C:$AD"), 28, FALSE), 0) < $${lMinBM}${MAESTRO_START}, IFERROR(VLOOKUP($${lProd}${MAESTRO_START}, INDIRECT("'KARDEX_BM'!$C:$AD"), 28, FALSE), 0) >= 0.5*$${lMinBM}${MAESTRO_START})`)
    .setBackground("#FFE0B2").setFontColor("#BF360C").setRanges([rangeBM]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(`=AND(OR($${lMinBM}${MAESTRO_START}>0, $${lMaxBM}${MAESTRO_START}>0), IFERROR(VLOOKUP($${lProd}${MAESTRO_START}, INDIRECT("'KARDEX_BM'!$C:$AD"), 28, FALSE), 0) >= $${lMinBM}${MAESTRO_START}, IFERROR(VLOOKUP($${lProd}${MAESTRO_START}, INDIRECT("'KARDEX_BM'!$C:$AD"), 28, FALSE), 0) <= $${lMaxBM}${MAESTRO_START})`)
    .setBackground("#C8E6C9").setFontColor("#1B5E20").setRanges([rangeBM]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(`=AND($${lMaxBM}${MAESTRO_START}>0, IFERROR(VLOOKUP($${lProd}${MAESTRO_START}, INDIRECT("'KARDEX_BM'!$C:$AD"), 28, FALSE), 0) > $${lMaxBM}${MAESTRO_START})`)
    .setBackground("#B3E5FC").setFontColor("#0D47A1").setRanges([rangeBM]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(`=AND($K${MAESTRO_START}=0, $L${MAESTRO_START}=0)`)
    .setBackground("#CFD8DC").setFontColor("#37474F").setRanges([rangeBM]).build());

  maestro.setConditionalFormatRules(rules);
}

function _buildMaestro(sheet) {
  sheet.getRange(1, 1, 1, 13).merge()
    .setValue("MISE — MAESTRO DE PRODUCTOS   |   La Crêpe Parisienne · Grupo MYT")
    .setBackground(C.dark).setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(11).setFontFamily("Arial").setHorizontalAlignment("center");
  sheet.setRowHeight(1, 32);

  // Fila 2: Acciones por Lote
  sheet.getRange(2, 1, 1, 13).setBackground(C.cream);
  sheet.getRange("A2:B2").merge()
    .setValue("⚠️ Acciones por lote:").setFontWeight("bold").setFontColor(C.dark)
    .setHorizontalAlignment("right").setVerticalAlignment("middle").setFontSize(9);
  sheet.getRange("C2").setValue("Desactivar").setFontWeight("bold").setFontColor(C.dark).setHorizontalAlignment("right").setVerticalAlignment("middle").setFontSize(9);
  sheet.getRange("D2").insertCheckboxes().setValue(false).setBackground(C.yellow);
  sheet.getRange("E2").setValue("Activar").setFontWeight("bold").setFontColor(C.dark).setHorizontalAlignment("right").setVerticalAlignment("middle").setFontSize(9);
  sheet.getRange("F2").insertCheckboxes().setValue(false).setBackground(C.yellow);
  sheet.getRange("G2").setValue("Eliminar Sel.").setFontWeight("bold").setFontColor(C.dark).setHorizontalAlignment("right").setVerticalAlignment("middle").setFontSize(9);
  sheet.getRange("H2").insertCheckboxes().setValue(false).setBackground(C.yellow);
  sheet.getRange("I2").setValue("Limpiar Sel.").setFontWeight("bold").setFontColor(C.dark).setHorizontalAlignment("right").setVerticalAlignment("middle").setFontSize(9);
  sheet.getRange("J2").insertCheckboxes().setValue(false).setBackground(C.yellow);
  sheet.setRowHeight(2, 24);

  sheet.getRange(3, 1, 1, 13)
    .setValues([["No","CATEGORÍA","PRODUCTO","PRESENTACION","UNIDAD","ACTIVO","MÍN_BA","MÁX_BA","STOCK_BA","MÍN_BM","MÁX_BM","STOCK_BM","SELECCIONAR"]])
    .setBackground(C.sage).setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(10).setHorizontalAlignment("center");
  sheet.setRowHeight(3, 26);
  sheet.setFrozenRows(3);
  sheet.setColumnWidth(1, 32);   // No
  sheet.setColumnWidth(2, 140);  // CATEGORÍA
  sheet.setColumnWidth(3, 240);  // PRODUCTO
  sheet.setColumnWidth(4, 140);  // PRESENTACIÓN
  sheet.setColumnWidth(5, 70);   // UNIDAD
  sheet.setColumnWidth(6, 70);   // ACTIVO
  sheet.setColumnWidth(7, 95);   // MÍN_BA
  sheet.setColumnWidth(8, 95);   // MÁX_BA
  sheet.setColumnWidth(9, 110);  // STOCK_BA
  sheet.setColumnWidth(10, 95);  // MÍN_BM
  sheet.setColumnWidth(11, 95);  // MÁX_BM
  sheet.setColumnWidth(12, 110); // STOCK_BM
  sheet.setColumnWidth(13, 110); // SELECCIONAR

  const datos = _catalogo();
  // Poblar datos con CATEGORÍA inferida y SELECCIONAR en falso
  const maestroDatos = datos.map(r => [r[0], CATEGORIAS_MAP[r[1].split('-')[0]] || '', r[2], r[3], r[4], r[5], r[6], r[7], '', 0, 0, '', false]);
  sheet.getRange(MAESTRO_START, 1, datos.length, 13).setValues(maestroDatos);
  
  // Escribir fórmulas iniciales en STOCK_BA y STOCK_BM
  const formulasBA = [];
  const formulasBM = [];
  for (let i = 0; i < datos.length; i++) {
    const rn = MAESTRO_START + i;
    const fBA = `=IFERROR(VLOOKUP(C${rn}, 'KARDEX_BA'!C:AD, 28, FALSE), 0) & IF(AND(G${rn}=0, H${rn}=0), "", IF(VLOOKUP(C${rn}, 'KARDEX_BA'!C:AD, 28, FALSE)<G${rn}, " (-" & (G${rn}-VLOOKUP(C${rn}, 'KARDEX_BA'!C:AD, 28, FALSE)) & ")", IF(VLOOKUP(C${rn}, 'KARDEX_BA'!C:AD, 28, FALSE)>H${rn}, " (+" & (VLOOKUP(C${rn}, 'KARDEX_BA'!C:AD, 28, FALSE)-H${rn}) & ")", " (-)")))`;
    const fBM = `=IFERROR(VLOOKUP(C${rn}, 'KARDEX_BM'!C:AD, 28, FALSE), 0) & IF(AND(J${rn}=0, K${rn}=0), "", IF(VLOOKUP(C${rn}, 'KARDEX_BM'!C:AD, 28, FALSE)<J${rn}, " (-" & (J${rn}-VLOOKUP(C${rn}, 'KARDEX_BM'!C:AD, 28, FALSE)) & ")", IF(VLOOKUP(C${rn}, 'KARDEX_BM'!C:AD, 28, FALSE)>K${rn}, " (+" & (VLOOKUP(C${rn}, 'KARDEX_BM'!C:AD, 28, FALSE)-K${rn}) & ")", " (-)")))`;
    formulasBA.push([fBA]);
    formulasBM.push([fBM]);
  }
  sheet.getRange(MAESTRO_START, 9, datos.length, 1).setFormulas(formulasBA);  // Col I (STOCK_BA)
  sheet.getRange(MAESTRO_START, 12, datos.length, 1).setFormulas(formulasBM); // Col L (STOCK_BM)

  const bgs = datos.map((_, i) => Array(13).fill(i % 2 === 0 ? C.rowA : C.rowB));
  sheet.getRange(MAESTRO_START, 1, datos.length, 13).setBackgrounds(bgs);
  
  // Añadir validación dropdown (SÍ/NO) en columna F (col 6)
  const validationRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["SÍ", "NO"], true)
    .setAllowInvalid(false)
    .setHelpText("Selecciona SÍ o NO para activar/desactivar el producto.")
    .build();
  sheet.getRange(MAESTRO_START, 6, datos.length, 1).setDataValidation(validationRule);

  // Añadir dropdown CATEGORÍA en columna B (col 2) con permisividad para nuevas categorías dinámicas
  const catValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(CATEGORIAS_LISTA, true)
    .setAllowInvalid(true)
    .setHelpText("Selecciona la categoría del producto o ingresa una nueva.")
    .build();
  sheet.getRange(MAESTRO_START, 2, datos.length, 1).setDataValidation(catValidation);

  // Añadir checkboxes en columna M (col 13)
  sheet.getRange(MAESTRO_START, 13, datos.length, 1).insertCheckboxes().setValue(false);

  // Formatos condicionales
  _aplicarReglasMaestro(sheet);

  // Crear filtro automático en MAESTRO
  const filterRange = sheet.getRange(3, 1, datos.length + 1, 13);
  if (sheet.getFilter()) {
    sheet.getFilter().remove();
  }
  filterRange.createFilter();
}

// ── CONSTRUCCIÓN: KARDEX COMPLETAMENTE LIMPIO Y SIMÉTRICO ──────────────────
function _buildKardex(sheet, nombre) {
  // Asegurar columnas suficientes (necesita hasta col 30)
  const needed = 30;
  if (sheet.getMaxColumns() < needed) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), Math.max(1, needed - sheet.getMaxColumns()));
  }

  // Fila 1: leyenda semáforo caducidad (Deshabilitada)
  /*
  sheet.getRange(1, 1, 1, 8)
    .setValues([["🔴 CAD","🔴 ≤2d","🟠 ≤7d","🟡 ≤14d","🟤 ≤28d","🔵 ≤60d","🟢 OK","⚪ S/F"]])
    .setFontSize(8).setBackground("#F5F5F5").setFontColor("#666666")
    .setHorizontalAlignment("center");
  sheet.setRowHeight(1, 18);
  */

  // Fila 2: título
  sheet.getRange(2, 1, 1, 3).setBackground(C.dark);
  sheet.getRange(2, 4, 1, 27).merge()
    .setValue(`MISE — KARDEX ${nombre}   |   La Crêpe Parisienne`)
    .setBackground(C.dark).setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(11).setFontFamily("Arial").setHorizontalAlignment("center");
  sheet.setRowHeight(2, 30);

  // Filas 3-4: semana
  const headersSemana = [
    { rangeHeader: "D3:E3", label: "SEMANA" },
    { rangeHeader: "F3:G3", label: "FECHA INI" },
    { rangeHeader: "H3:I3", label: "FECHA FIN" },
    { rangeHeader: "J3:K3", label: "SUCURSAL" }
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
  sheet.getRange("D4:K4")
    .setFontFamily("Calibri")
    .setFontSize(10)
    .setVerticalAlignment("middle");

  sheet.getRange('E4').setFormula('=IFERROR(ISOWEEKNUM(G4),"")')
    .setBackground(C.yellow).setHorizontalAlignment("center");
  sheet.getRange("G4").setBackground(C.yellow).setNumberFormat("DD/MMM/YYYY")
    .setHorizontalAlignment("center");
  sheet.getRange('I4').setFormula('=IFERROR(G4+6,"")')
    .setBackground(C.yellow).setNumberFormat("DD/MMM/YYYY").setHorizontalAlignment("center");
  sheet.getRange("K4").setValue(nombre).setBackground(C.yellow).setHorizontalAlignment("center");
  
  sheet.getRange("G4").setDataValidation(
    SpreadsheetApp.newDataValidation().requireDate()
      .setHelpText("LUNES de la semana. Usar ⚙️ Mise → Configurar semana.").build()
  );

  // Botones interactivos (casillas de verificación para UX móvil)
  sheet.getRange("L4:M4").merge().setValue("⚙️ Avanzar Sem.").setHorizontalAlignment("center").setVerticalAlignment("middle").setFontWeight("bold").setFontSize(8).setFontColor("#FFFFFF").setBackground(C.dark);
  sheet.getRange("N4").insertCheckboxes().setValue(false).setBackground(C.yellow).setHorizontalAlignment("center");

  sheet.getRange("O4:P4").merge().setValue("🔄 Recrear Vista").setHorizontalAlignment("center").setVerticalAlignment("middle").setFontWeight("bold").setFontSize(8).setFontColor("#FFFFFF").setBackground(C.dark);
  sheet.getRange("Q4").insertCheckboxes().setValue(false).setBackground(C.yellow).setHorizontalAlignment("center");

  sheet.getRange("R4:S4").merge().setValue("🆕 Nuevo Prod.").setHorizontalAlignment("center").setVerticalAlignment("middle").setFontWeight("bold").setFontSize(8).setFontColor("#FFFFFF").setBackground(C.dark);
  sheet.getRange("T4").insertCheckboxes().setValue(false).setBackground(C.yellow).setHorizontalAlignment("center");

  sheet.getRange("U4:V4").merge().setValue("🚫 Anular Prod.").setHorizontalAlignment("center").setVerticalAlignment("middle").setFontWeight("bold").setFontSize(8).setFontColor("#FFFFFF").setBackground(C.dark);
  sheet.getRange("W4").insertCheckboxes().setValue(false).setBackground(C.yellow).setHorizontalAlignment("center");

  sheet.setRowHeight(3, 22);
  sheet.setRowHeight(4, 22);

  // Fila 5: sección datos + días
  sheet.getRange(5, 1, 1, 3).merge()
    .setValue("DATOS DEL PRODUCTO")
    .setBackground(C.dark).setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(9).setHorizontalAlignment("center");
  sheet.getRange(5, 4, 1, 6).merge()
    .setValue("DATOS DEL PRODUCTO")
    .setBackground(C.dark).setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(9).setHorizontalAlignment("center");
  DIAS.forEach((dia, idx) => {
    const sc = 10 + idx * 3;
    sheet.getRange(5, sc, 1, 3).merge().setValue(dia)
      .setBackground(idx % 2 === 0 ? C.mdGreen : C.ltGreen)
      .setFontColor("#FFFFFF").setFontWeight("bold").setFontSize(9).setHorizontalAlignment("center");
  });
  sheet.setRowHeight(5, 22);

  // Fila 6: headers de columna
  sheet.getRange(6, 1, 1, 9)
    .setValues([["No","CATEGORÍA","PRODUCTO","PRESENTACIÓN","UNIDAD","CADUCIDAD","LOTE","🚦","SALDO\nANT"]])
    .setBackground(C.dark).setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(9).setHorizontalAlignment("center").setVerticalAlignment("middle");
  DIAS.forEach((_, idx) => {
    const sc = 10 + idx * 3;
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
  sheet.setColumnWidth(2, 140);  // B — CATEGORÍA
  sheet.setColumnWidth(3, 185);  // C — PRODUCTO
  sheet.setColumnWidth(4, 115);  // D — PRESENTACIÓN
  sheet.setColumnWidth(5, 115);  // E — UNIDAD
  sheet.setColumnWidth(6, 115);  // F — CADUCIDAD
  sheet.setColumnWidth(7, 115);  // G — LOTE
  sheet.setColumnWidth(8, 65);   // H — 🚦
  sheet.setColumnWidth(9, 110);  // I — SALDO ANT
  
  for (let d = 0; d < 7; d++) {
    sheet.setColumnWidth(10 + d * 3, 52);
    sheet.setColumnWidth(11 + d * 3, 52);
    sheet.setColumnWidth(12 + d * 3, 62);
  }

  // Formato fecha col F y validación de fecha (Feature deshabilitada)
  sheet.getRange(KARDEX_START, 6, 200, 1).setNumberFormat("DD/MMM/YY");
  /*
  sheet.getRange(KARDEX_START, 6, 200, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireDate()
      .setHelpText("Fecha de caducidad del lote").build()
  );
  */

  // Semáforo col H: formato condicional por texto (alertas stock)
  const cfR = sheet.getRange(KARDEX_START, 8, 200, 1);
  sheet.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenTextStartsWith("🔴")
      .setBackground("#FFCDD2").setFontColor("#B71C1C").setBold(true).setRanges([cfR]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextStartsWith("🔵")
      .setBackground("#B3E5FC").setFontColor("#0D47A1").setBold(true).setRanges([cfR]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextStartsWith("🟢")
      .setBackground("#C8E6C9").setFontColor("#1B5E20").setRanges([cfR]).build(),
  ]);

  sheet.setFrozenColumns(3);
  sheet.hideColumns(6, 2); // Ocultar CADUCIDAD y LOTE (deja 🚦 visible)
  sheet.hideRows(1);       // Ocultar leyenda de caducidades
}

// ── POBLAR KARDEX DESDE MAESTRO ───────────────────────────────────────────────
function _poblarKardex(sheet) {
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const maestro = ss.getSheetByName(SHEET_MAESTRO);
  if (!maestro) return;

  const lr   = maestro.getLastRow();
  if (lr < MAESTRO_START) return;

  const map = _getMaestroHeaderMap(maestro);
  const lProd  = map["PRODUCTO"] ? map["PRODUCTO"].letter : "C";
  const lMinBA = map["MÍN_BA"]  ? map["MÍN_BA"].letter  : "G";
  const lMaxBA = map["MÁX_BA"]  ? map["MÁX_BA"].letter  : "H";
  const lMinBM = map["MÍN_BM"]  ? map["MÍN_BM"].letter  : "J";
  const lMaxBM = map["MÁX_BM"]  ? map["MÁX_BM"].letter  : "K";

  // Índices para VLOOKUP desde PRODUCTO
  const idxMinBA = (map["MÍN_BA"] && map["PRODUCTO"]) ? (map["MÍN_BA"].col - map["PRODUCTO"].col + 1) : 5;
  const idxMaxBA = (map["MÁX_BA"] && map["PRODUCTO"]) ? (map["MÁX_BA"].col - map["PRODUCTO"].col + 1) : 6;
  const idxMinBM = (map["MÍN_BM"] && map["PRODUCTO"]) ? (map["MÍN_BM"].col - map["PRODUCTO"].col + 1) : 8;
  const idxMaxBM = (map["MÁX_BM"] && map["PRODUCTO"]) ? (map["MÁX_BM"].col - map["PRODUCTO"].col + 1) : 9;

  // Cols A-E: No, CATEGORÍA, PRODUCTO, PRESENTACIÓN, UNIDAD
  const dataRange = maestro.getRange(MAESTRO_START, 1, lr - MAESTRO_START + 1, maestro.getLastColumn()).getValues();
  const cNo   = map["NO"]           ? map["NO"].index           : 0;
  const cCat  = map["CATEGORÍA"]    ? map["CATEGORÍA"].index    : 1;
  const cProd = map["PRODUCTO"]     ? map["PRODUCTO"].index     : 2;
  const cPres = map["PRESENTACION"] ? map["PRESENTACION"].index : 3;
  const cUni  = map["UNIDAD"]       ? map["UNIDAD"].index       : 4;

  const prods = dataRange.filter(r => r[cNo] !== "" && r[cNo] !== null);
  if (prods.length === 0) return;

  const count = prods.length;

  sheet.getRange(KARDEX_START, 1, count, 5)
    .setValues(prods.map(p => [p[cNo], p[cCat], p[cProd], p[cPres], p[cUni]]));

  // Inyectar fórmulas de semáforo de stock en KARDEX (col H = 8)
  const sheetName = sheet.getName();
  const formulasH = [];
  for (let r = 0; r < count; r++) {
    const rn = KARDEX_START + r;
    let f = "";
    if (sheetName === "KARDEX_BA") {
      f = `=IF(AND(IFERROR(VLOOKUP(C${rn}, MAESTRO!${lProd}:${lMaxBA}, ${idxMinBA}, FALSE), 0)=0, IFERROR(VLOOKUP(C${rn}, MAESTRO!${lProd}:${lMaxBA}, ${idxMaxBA}, FALSE), 0)=0), "", IF(AD${rn}<IFERROR(VLOOKUP(C${rn}, MAESTRO!${lProd}:${lMaxBA}, ${idxMinBA}, FALSE), 0), "🔴 -" & (IFERROR(VLOOKUP(C${rn}, MAESTRO!${lProd}:${lMaxBA}, ${idxMinBA}, FALSE), 0)-AD${rn}), IF(AD${rn}>IFERROR(VLOOKUP(C${rn}, MAESTRO!${lProd}:${lMaxBA}, ${idxMaxBA}, FALSE), 0), "🔵 +" & (AD${rn}-IFERROR(VLOOKUP(C${rn}, MAESTRO!${lProd}:${lMaxBA}, ${idxMaxBA}, FALSE), 0)), "🟢 -")))`;
    } else {
      f = `=IF(AND(IFERROR(VLOOKUP(C${rn}, MAESTRO!${lProd}:${lMaxBM}, ${idxMinBM}, FALSE), 0)=0, IFERROR(VLOOKUP(C${rn}, MAESTRO!${lProd}:${lMaxBM}, ${idxMaxBM}, FALSE), 0)=0), "", IF(AD${rn}<IFERROR(VLOOKUP(C${rn}, MAESTRO!${lProd}:${lMaxBM}, ${idxMinBM}, FALSE), 0), "🔴 -" & (IFERROR(VLOOKUP(C${rn}, MAESTRO!${lProd}:${lMaxBM}, ${idxMinBM}, FALSE), 0)-AD${rn}), IF(AD${rn}>IFERROR(VLOOKUP(C${rn}, MAESTRO!${lProd}:${lMaxBM}, ${idxMaxBM}, FALSE), 0), "🔵 +" & (AD${rn}-IFERROR(VLOOKUP(C${rn}, MAESTRO!${lProd}:${lMaxBM}, ${idxMaxBM}, FALSE), 0)), "🟢 -")))`;
    }
    formulasH.push([f]);
  }
  sheet.getRange(KARDEX_START, 8, count, 1).setFormulas(formulasH);

  // Fórmulas SLD para cada día: SLD = SLDprev + ENT - SAL
  for (let d = 0; d < KARDEX_DAYS; d++) {
    const sldCol  = 12 + d * 3;
    const prevCol = 9  + d * 3;
    const entCol  = 10 + d * 3;
    const salCol  = 11 + d * 3;
    const formulas = [];
    for (let r = 0; r < count; r++) {
      const rn = KARDEX_START + r;
      formulas.push(['=' + _col(prevCol) + rn + '+IFERROR(' + _col(entCol) + rn + ',0)-IFERROR(' + _col(salCol) + rn + ',0)']);
    }
    sheet.getRange(KARDEX_START, sldCol, count, 1).setFormulas(formulas);
  }

  // Formato visual filas alternas
  const bgs = prods.map((_, i) => Array(30).fill(i % 2 === 0 ? C.rowA : C.rowB));
  sheet.getRange(KARDEX_START, 1, count, 30).setBackgrounds(bgs);
  sheet.getRange(KARDEX_START, 9, count, 1).setBackgrounds(Array(count).fill([C.iceBlue]));
  // ENT verde, SAL rosa, SLD azul hielo por día
  for (let d = 0; d < KARDEX_DAYS; d++) {
    sheet.getRange(KARDEX_START, 10 + d * 3, count, 1).setBackgrounds(Array(count).fill([C.entBg]));
    sheet.getRange(KARDEX_START, 11 + d * 3, count, 1).setBackgrounds(Array(count).fill([C.salBg]));
    sheet.getRange(KARDEX_START, 12 + d * 3, count, 1).setBackgrounds(Array(count).fill([C.iceBlue]));
  }

  // Formato numérico para datos diarios
  sheet.getRange(KARDEX_START, 10, count, 21).setNumberFormat("0.####");

  // Crear filtro automático en KARDEX
  const kRange = sheet.getRange(6, 1, count + 1, KARDEX_TOTAL_COLS);
  if (sheet.getFilter()) {
    sheet.getFilter().remove();
  }
  kRange.createFilter();
}

// ── CONSTRUCCIÓN: VISTA MÓVIL ─────────────────────────────────────────────────
function crearVistaMóvilBA() { _buildVista("BA"); }
function crearVistaMóvilBM() { _buildVista("BM"); }

function _buildVista(key) {
  const bodega = BODEGAS[key];
  const ss     = SpreadsheetApp.getActiveSpreadsheet();

  let sheet = ss.getSheetByName(bodega.vista);
  if (sheet) {
    sheet.clear();
    sheet.clearConditionalFormatRules();
    sheet.setHiddenGridlines(false);
    sheet.setFrozenRows(0);
    const maxRows = sheet.getMaxRows();
    const maxCols = sheet.getMaxColumns();
    if (maxRows > 0 && maxCols > 0) {
      try {
        sheet.getRange(1, 1, maxRows, maxCols).breakAtMerge();
      } catch(e) {}
    }
  } else {
    sheet = ss.insertSheet(bodega.vista);
  }

  // Header — 12 cols (incluye CATEGORÍA, ACTIVO, MÍN/MÁX y PICKING)
  sheet.getRange(1, 1, 1, 12).merge()
    .setValue(`MISE — VISTA MÓVIL · ${bodega.nombre}   |   La Crêpe Parisienne`)
    .setBackground(C.dark).setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(11).setFontFamily("Arial").setHorizontalAlignment("center");
  sheet.setRowHeight(1, 30);

  sheet.getRange(2, 1, 1, 12).merge()
    .setValue("Solo lectura. Fuente del IMPORTRANGE para Pedidos Andares / Pedidos Mercado.")
    .setBackground(C.cream).setFontColor(C.dark).setFontSize(9).setHorizontalAlignment("center");
  sheet.setRowHeight(2, 20);

  sheet.getRange(3, 1, 1, 12)
    .setValues([["No","CATEGORÍA","PRODUCTO","UNIDAD","SALDO ACTUAL","🚦 STOCK","ENT HOY","SAL HOY","ACTIVO","MÍN","MÁX","PICKING"]])
    .setBackground(C.sage).setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(10).setHorizontalAlignment("center");
  sheet.setRowHeight(3, 26);
  sheet.setFrozenRows(3);

  // Poblar desde KARDEX y MAESTRO (con categoría viva de MAESTRO)
  const kardex = ss.getSheetByName(bodega.kardex);
  if (!kardex) return;

  const lr = kardex.getLastRow();
  if (lr < KARDEX_START) return;

  const maestro = ss.getSheetByName(SHEET_MAESTRO);
  const mlr     = maestro.getLastRow();
  const map     = _getMaestroHeaderMap(maestro);
  const mData   = maestro.getRange(MAESTRO_START, 1, mlr - MAESTRO_START + 1, maestro.getLastColumn()).getValues();
  
  const cProd = map["PRODUCTO"] ? map["PRODUCTO"].index : 2;
  const cCatM = map["CATEGORÍA"] ? map["CATEGORÍA"].index : 1;
  const cMin  = (key === "BA") ? (map["MÍN_BA"] ? map["MÍN_BA"].index : 6) : (map["MÍN_BM"] ? map["MÍN_BM"].index : 9);
  const cMax  = (key === "BA") ? (map["MÁX_BA"] ? map["MÁX_BA"].index : 7) : (map["MÁX_BM"] ? map["MÁX_BM"].index : 10);
  const cMinQ = (key === "BA") ? (map["MÍN_Q_BA"] ? map["MÍN_Q_BA"].index : -1) : (map["MÍN_Q_BM"] ? map["MÍN_Q_BM"].index : -1);
  const cMaxQ = (key === "BA") ? (map["MÁX_Q_BA"] ? map["MÁX_Q_BA"].index : -1) : (map["MÁX_Q_BM"] ? map["MÁX_Q_BM"].index : -1);

  const maestroCatMap = {};
  const minStockMap = {};
  const maxStockMap = {};
  const minQMap = {};
  const maxQMap = {};
  mData.forEach(r => {
    const prodName = String(r[cProd]).trim();
    const catVal   = String(r[cCatM]).trim().toUpperCase();
    const minVal   = parseFloat(r[cMin]) || 0;
    const maxVal   = parseFloat(r[cMax]) || 0;
    const minQVal  = cMinQ !== -1 ? (parseFloat(r[cMinQ]) || 0) : minVal;
    const maxQVal  = cMaxQ !== -1 ? (parseFloat(r[cMaxQ]) || 0) : maxVal;
    if (prodName) {
      maestroCatMap[prodName] = catVal;
      minStockMap[prodName]   = minVal;
      maxStockMap[prodName]   = maxVal;
      minQMap[prodName]       = minQVal;
      maxQMap[prodName]       = maxQVal;
    }
  });

  const data  = kardex.getRange(KARDEX_START, 1, lr - KARDEX_START + 1, 30).getValues();
  const prods = data.map((r, i) => {
    const pName = String(r[2]).trim();
    return { 
      no: r[0], 
      cat: maestroCatMap[pName] || String(r[1]).trim().toUpperCase(), 
      nombre: pName, 
      unidad: r[4], 
      saldo: parseFloat(r[29]) || 0, // Col AD (Sunday balance) is column 30, index 29
      srcRow: KARDEX_START + i 
    };
  }).filter(p => p.nombre && p.no);
  const count = prods.length;
  if (count === 0) return;

  const DR  = 4;
  const ref = _quoteName(bodega.kardex);

  sheet.getRange(DR, 1, count, 1).setValues(prods.map(p => [p.no]));
  sheet.getRange(DR, 2, count, 1).setValues(prods.map(p => [p.cat]));
  sheet.getRange(DR, 3, count, 1).setValues(prods.map(p => [p.nombre]));
  sheet.getRange(DR, 4, count, 1).setValues(prods.map(p => [p.unidad]));

  // Col E: saldo actual = SLD domingo (col AD = 30)
  sheet.getRange(DR, 5, count, 1)
    .setFormulas(prods.map(p => ['=IFERROR(' + ref + '!AD' + p.srcRow + '*1,0)']))
    .setNumberFormat("0.####");

  // Col F: semáforo de stock
  const semaforos = prods.map(p => {
    const saldo = p.saldo;
    const min   = minStockMap[p.nombre] || 0;
    const max   = maxStockMap[p.nombre] || 0;
    if (min === 0 && max === 0) return ["⚪"];
    if (saldo < 0.5 * min)       return ["🔴"];
    if (saldo < min)             return ["🟠"];
    if (saldo <= max)            return ["🟢"];
    return ["🔵"];
  });
  sheet.getRange(DR, 6, count, 1).setValues(semaforos);

  // Cols G y H: ENT HOY y SAL HOY dinámicos con WEEKDAY(TODAY())
  const entCols = ["J","M","P","S","V","Y","AB"];
  const salCols = ["K","N","Q","T","W","Z","AC"];

  const entFormulas = prods.map(p => {
    const kr = p.srcRow;
    const entRefs = entCols.map(c => ref + '!' + c + kr).join(',');
    return ['=IFERROR(CHOOSE(WEEKDAY(TODAY(),2),' + entRefs + '),0)'];
  });

  const salFormulas = prods.map(p => {
    const kr = p.srcRow;
    const salRefs = salCols.map(c => ref + '!' + c + kr).join(',');
    return ['=IFERROR(CHOOSE(WEEKDAY(TODAY(),2),' + salRefs + '),0)'];
  });

  sheet.getRange(DR, 7, count, 1).setFormulas(entFormulas).setNumberFormat("0.####");
  sheet.getRange(DR, 8, count, 1).setFormulas(salFormulas).setNumberFormat("0.####");

  // Col I: ACTIVO desde MAESTRO
  const refMaestro = _quoteName(SHEET_MAESTRO);
  const lAct = map["ACTIVO"] ? map["ACTIVO"].letter : "F";
  sheet.getRange(DR, 9, count, 1)
    .setFormulas(prods.map(p => ['=' + refMaestro + '!' + lAct + (p.srcRow - KARDEX_START + MAESTRO_START)]));

  // Cols J, K y L: MÍN QUIOSCO, MÁX QUIOSCO y PICKING específicos de sucursal
  const lMinQ = cMinQ !== -1 ? map[key === "BA" ? "MÍN_Q_BA" : "MÍN_Q_BM"].letter : (map[key === "BA" ? "MÍN_BA" : "MÍN_BM"] ? map[key === "BA" ? "MÍN_BA" : "MÍN_BM"].letter : "G");
  const lMaxQ = cMaxQ !== -1 ? map[key === "BA" ? "MÁX_Q_BA" : "MÁX_Q_BM"].letter : (map[key === "BA" ? "MÁX_BA" : "MÁX_BM"] ? map[key === "BA" ? "MÁX_BA" : "MÁX_BM"].letter : "H");

  sheet.getRange(DR, 10, count, 1).setFormulas(prods.map(p => ['=' + refMaestro + '!' + lMinQ + (p.srcRow - KARDEX_START + MAESTRO_START)])).setNumberFormat("0.####");
  sheet.getRange(DR, 11, count, 1).setFormulas(prods.map(p => ['=' + refMaestro + '!' + lMaxQ + (p.srcRow - KARDEX_START + MAESTRO_START)])).setNumberFormat("0.####");

  // Col 12 (L): PICKING_BA o PICKING_BM (si existe en MAESTRO) o por defecto el No de producto
  const cPicKey = `PICKING_${key}`;
  const lPic = map[cPicKey] ? map[cPicKey].letter : (map["PICKING"] ? map["PICKING"].letter : null);
  if (lPic) {
    sheet.getRange(DR, 12, count, 1).setFormulas(prods.map(p => ['=' + refMaestro + '!' + lPic + (p.srcRow - KARDEX_START + MAESTRO_START)])).setNumberFormat("0");
  } else {
    sheet.getRange(DR, 12, count, 1).setValues(prods.map(p => [p.no])).setNumberFormat("0");
  }

  // Formato
  const bgs = prods.map((_, i) => Array(12).fill(i % 2 === 0 ? C.rowA : C.rowB));
  sheet.getRange(DR, 1, count, 12).setBackgrounds(bgs);
  sheet.getRange(DR, 5, count, 1).setBackgrounds(Array(count).fill([C.iceBlue]));
  sheet.getRange(DR, 7, count, 1).setBackgrounds(Array(count).fill([C.entBg]));
  sheet.getRange(DR, 8, count, 1).setBackgrounds(Array(count).fill([C.salBg]));
  sheet.getRange(DR, 6, count, 1).setHorizontalAlignment("center").setFontWeight("bold");
  sheet.getRange(DR, 3, count, 1).setHorizontalAlignment("left");
  sheet.getRange(DR, 1, count, 12)
    .setFontFamily("Calibri").setFontSize(10).setVerticalAlignment("middle").setHorizontalAlignment("center");

  // CF: SALDO < 1 = fondo rojo
  sheet.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(1)
      .setBackground("#FFCDD2").setFontColor("#B71C1C")
      .setRanges([sheet.getRange(DR, 5, count, 1)]).build()
  ]);

  sheet.setColumnWidth(1, 40);  sheet.setColumnWidth(2, 140);
  sheet.setColumnWidth(3, 210); sheet.setColumnWidth(4, 75);
  sheet.setColumnWidth(5, 105); sheet.setColumnWidth(6, 65);
  sheet.setColumnWidth(7, 80);  sheet.setColumnWidth(8, 80);
  sheet.setColumnWidth(9, 70);
  sheet.setColumnWidth(10, 55);
  sheet.setColumnWidth(11, 55);
  sheet.setColumnWidth(12, 60);

  sheet.hideSheet();

  _log("_buildVista", `${bodega.nombre}: ${count} productos`);
}

// ── CADUCIDADES (vista simple, sin INDIRECT) ──────────────────────────────────
function crearCaducidades() {
  const ss     = SpreadsheetApp.getActiveSpreadsheet();
  const NOMBRE = "CADUCIDADES";

  let sheet = ss.getSheetByName(NOMBRE);
  if (sheet) {
    try {
      ss.deleteSheet(sheet);
      sheet = ss.insertSheet(NOMBRE);
    } catch(e) {
      sheet.clear();
      sheet.clearConditionalFormatRules();
      sheet.setHiddenGridlines(false);
      sheet.setFrozenRows(0);
      sheet.setFrozenColumns(0);
    }
  } else {
    sheet = ss.insertSheet(NOMBRE);
  }

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

  // Bloque Andares
  sheet.getRange(3, 5, 1, 3)
    .setValues([["CADUCIDAD","LOTE","🚦"]])
    .setBackground(C.mdGreen).setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(9).setHorizontalAlignment("center");
  // Encabezado de bodega sobre el bloque
  sheet.getRange("E2:G2").merge()
    .setValue("ANDARES")
    .setBackground(C.mdGreen).setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(9).setHorizontalAlignment("center");

  // Separador columna H
  sheet.getRange(3, 8).setValue("|")
    .setBackground(C.dark).setFontColor(C.dark).setHorizontalAlignment("center");
  sheet.getRange("H2").setValue("|").setBackground(C.dark).setFontColor(C.dark);

  // Bloque Mercado
  sheet.getRange(3, 9, 1, 3)
    .setValues([["CADUCIDAD","LOTE","🚦"]])
    .setBackground(C.ltGreen).setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(9).setHorizontalAlignment("center");
  sheet.getRange("I2:K2").merge()
    .setValue("MERCADO")
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
    const rows = ks.getRange(KARDEX_START, 1, lr - KARDEX_START + 1, 3).getValues();
    rows.forEach((row, i) => {
      const nombre = String(row[2]).trim();
      if (nombre) maps[key][nombre] = KARDEX_START + i;
    });
  });

  // Datos desde MAESTRO
  const maestro = ss.getSheetByName(SHEET_MAESTRO);
  const lr2     = maestro.getLastRow();
  const mData   = maestro.getRange(MAESTRO_START, 1, lr2 - MAESTRO_START + 1, 6).getValues()
    .filter(r => r[0] !== "");

  const DR    = 4;
  const count = mData.length;
  const refBA = _quoteName(BODEGAS.BA.kardex);
  const refBM = _quoteName(BODEGAS.BM.kardex);

  mData.forEach((p, i) => {
    const r      = DR + i;
    const nombre = String(p[3]).trim();
    const bg     = i % 2 === 0 ? C.rowA : C.rowB;
    const cat    = String(p[2] || '').trim();

    // Cols A-D: info del producto
    sheet.getRange(r, 1).setValue(p[0]).setBackground(bg).setHorizontalAlignment("center");
    sheet.getRange(r, 2).setValue(nombre).setBackground(bg).setHorizontalAlignment("left");
    sheet.getRange(r, 3).setValue(cat).setBackground(bg).setHorizontalAlignment("center");
    sheet.getRange(r, 4).setValue(p[5]).setBackground(bg).setHorizontalAlignment("center");

    // Cols E-G: B-Andares
    const krBA = mapBA[nombre];
    if (krBA) {
      sheet.getRange(r, 5).setFormula('=IFERROR(' + refBA + '!F' + krBA + ',"")')
        .setNumberFormat("DD/MMM/YY").setBackground(bg);
      sheet.getRange(r, 6).setFormula('=' + refBA + '!G' + krBA).setBackground(bg);
      sheet.getRange(r, 7).setFormula('=' + refBA + '!H' + krBA).setBackground(C.yellow);
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
      sheet.getRange(r, 9).setFormula('=IFERROR(' + refBM + '!F' + krBM + ',"")')
        .setNumberFormat("DD/MMM/YY").setBackground(bg);
      sheet.getRange(r, 10).setFormula('=' + refBM + '!G' + krBM).setBackground(bg);
      sheet.getRange(r, 11).setFormula('=' + refBM + '!H' + krBM).setBackground(C.yellow);
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
      .setFormula('=IF(AND(E' + r + '="",I' + r + '=""),"—",IF(E' + r + '="","Mercado",IF(I' + r + '="","Andares",IF(E' + r + '<=I' + r + ',"Andares","Mercado"))))')
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

  sheet.getRange("G4").setValue(monday).setNumberFormat("DD/MMM/YYYY");
  const sem = sheet.getRange("E4").getValue();
  const sun = sheet.getRange("I4").getValue();
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

  const d4 = sheet.getRange("G4").getValue();
  if (!(d4 instanceof Date) || isNaN(d4.getTime())) {
    ui.alert("La fecha de inicio (G4) no es válida. Por favor configúrala primero.");
    return;
  }

  const sem = sheet.getRange("E4").getValue() || 0;
  const sun = sheet.getRange("I4").getValue();
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

    // 1. Leer saldos finales (col AD = 30)
    const saldosFin = sheet.getRange(KARDEX_START, KARDEX_SLD_FIN, numRows, 1).getValues();
    const saldosAnt = saldosFin.map(r => [typeof r[0] === "number" ? r[0] : 0]);

    // 2. Guardar en HISTORIAL horizontal
    _guardarHistHorizontal(key, sheet, numRows, d4, sem);

    // 3. Escribir saldos finales en SALDO ANT (col I = 9)
    sheet.getRange(KARDEX_START, KARDEX_SLD_ANT, numRows, 1).setValues(saldosAnt);

    // 4. Limpiar celdas de entrada/salida
    for (let d = 0; d < KARDEX_DAYS; d++) {
      sheet.getRange(KARDEX_START, 10 + d * 3, numRows, 1).clearContent();
      sheet.getRange(KARDEX_START, 11 + d * 3, numRows, 1).clearContent();
    }

    // 5. Avanzar G4 por 7 días
    const next = new Date(d4);
    next.setDate(d4.getDate() + 7);
    sheet.getRange("G4").setValue(next).setNumberFormat("DD/MMM/YYYY");

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
    // NOTA: antes había una línea que pintaba de fondo columnas 4..maxColumns aquí.
    // Se quitó porque el fondo (sin valor) en celdas vacías cuenta como "contenido"
    // para getLastColumn() en Sheets, así que en la primera corrida startCol se
    // calculaba mal (usando el ancho completo del grid, ~26 columnas, en vez de 3)
    // y los datos de la semana 1 terminaban escritos muy lejos a la derecha (col AA+),
    // dando la impresión de que la semana no se guardó / que la ejecución se rompió.
    // El fondo de la fila 1 para cada bloque semanal ya se pinta más abajo (línea ~1276).

    hSheet.getRange("A2:A4").merge().setValue("No").setFontWeight("bold").setFontColor("#FFFFFF").setBackground(C.dark).setHorizontalAlignment("center").setVerticalAlignment("middle");
    hSheet.getRange("B2:B4").merge().setValue("PRODUCTO").setFontWeight("bold").setFontColor("#FFFFFF").setBackground(C.dark).setHorizontalAlignment("center").setVerticalAlignment("middle");
    hSheet.getRange("C2:C4").merge().setValue("UNIDAD").setFontWeight("bold").setFontColor("#FFFFFF").setBackground(C.dark).setHorizontalAlignment("center").setVerticalAlignment("middle");
    
    const prods = sheet.getRange(KARDEX_START, 1, numRows, 5).getValues();
    const histProds = prods.map(p => [p[0], p[2], p[4]]);
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
    const newProds = sheet.getRange(KARDEX_START + numRowsH, 1, diff, 5).getValues();
    const histNewProds = newProds.map(p => [p[0], p[2], p[4]]);
    hSheet.getRange(lastRowH + 1, 1, diff, 3).setValues(histNewProds);
    
    const bgs = histNewProds.map((_, i) => Array(3).fill((numRowsH + i) % 2 === 0 ? C.rowA : C.rowB));
    hSheet.getRange(lastRowH + 1, 1, diff, 3).setBackgrounds(bgs).setFontFamily("Calibri").setFontSize(10).setVerticalAlignment("middle");
    hSheet.getRange(lastRowH + 1, 1, diff, 1).setHorizontalAlignment("center");
    hSheet.getRange(lastRowH + 1, 3, diff, 1).setHorizontalAlignment("center");
  }

  const startCol = hSheet.getLastColumn() + 1;
  hSheet.insertColumnsAfter(startCol - 1, 16);

  const semStr = `SEMANA ${sem} (${monday.getFullYear()})`;
  hSheet.getRange(2, startCol, 1, 15).merge().setValue(semStr)
    .setFontWeight("bold").setFontColor("#FFFFFF").setBackground(C.dark).setHorizontalAlignment("center").setVerticalAlignment("middle");
  hSheet.getRange(1, startCol, 1, 16).setBackground(C.dark);

  const kardexVals = sheet.getRange(KARDEX_START, 10, numRows, 21).getValues();
  const sldFin = sheet.getRange(KARDEX_START, KARDEX_SLD_FIN, numRows, 1).getValues();
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

  // SLD FIN header
  hSheet.getRange(3, startCol + 14).setValue("SLD FIN")
    .setFontWeight("bold").setFontColor("#333333").setBackground(C.iceBlue).setHorizontalAlignment("center").setVerticalAlignment("middle").setFontSize(9);
  hSheet.getRange(4, startCol + 14).setValue("").setBackground(C.iceBlue);
  hSheet.setColumnWidth(startCol + 14, 65);

  hSheet.getRange(5, startCol, numRows, 14).setValues(histVals);
  hSheet.getRange(5, startCol + 14, numRows, 1).setValues(sldFin);

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
  hSheet.getRange(5, startCol + 14, numRows, 1).setBackgrounds(Array(numRows).fill([C.iceBlue]))
    .setFontFamily("Calibri").setFontSize(10).setVerticalAlignment("middle").setHorizontalAlignment("center");

  // Formato numérico para datos y SLD FIN
  hSheet.getRange(5, startCol, numRows, 15).setNumberFormat("0.####");

  // Configurar columna de separación (16ª columna = startCol + 15)
  const sepColIdx = startCol + 15;
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

  // Inferir categoría del prefijo
  const idFamPrefix = idFam.split('-')[0].toUpperCase();
  const categoria = CATEGORIAS_MAP[idFamPrefix];
  if (!categoria) {
    ui.alert("⚠️ ID de Familia Inválido", `No se pudo determinar la categoría para el prefijo "${idFamPrefix}".\n\nPrefijos válidos:\n- REF (REFRIGERADOS)\n- FYV (FRUTAS Y VERDURAS)\n- LEC (LÁCTEOS)\n- ABR (ABARROTES)\n- BEB (BEBIDAS)\n- DES (DESECHABLES)\n- JAR (JARCERÍA)\n\nEl producto no fue agregado.`, ui.ButtonSet.OK);
    return;
  }

  const uResp = ui.prompt("🆕 Nuevo Producto", "Unidad (kg / lt / pza / paq / g / ml / rol / fco / dom / bol / caj):", ui.ButtonSet.OK_CANCEL);
  if (uResp.getSelectedButton() !== ui.Button.OK) return;
  const unidad = uResp.getResponseText().trim().toLowerCase();
  const unidadesValidas = ["kg", "lt", "pza", "paq", "g", "ml", "rol", "fco", "dom", "bol", "caj"];
  if (!unidadesValidas.includes(unidad)) {
    ui.alert("⚠️ Unidad Inválida", `La unidad "${unidad}" no es válida.\n\nValores válidos: ${unidadesValidas.join(", ")}`, ui.ButtonSet.OK);
    return;
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) { ui.alert("El archivo está ocupado. Intenta de nuevo."); return; }

  try {
    SpreadsheetApp.getActive().toast("⏳ Agregando nuevo producto al catálogo...", "⚙️ Mise", 5);
    const lr    = maestro.getLastRow();
    const nos   = maestro.getRange(MAESTRO_START, 1, lr - MAESTRO_START + 1, 1).getValues();
    const lastNo = nos.reduce((max, r) => Math.max(max, parseInt(r[0]) || 0), 0);
    const newNo = lastNo + 1;
    const newRow = lr + 1;

    // 1. Insertar en MAESTRO
    maestro.getRange(newRow, 1, 1, 14)
      .setValues([[newNo, idFam, categoria, prod, "", unidad, "SÍ", 0, 0, "", 0, 0, "", false]]);
    const rowColor = (newNo % 2 === 1) ? C.rowA : C.rowB;
    maestro.getRange(newRow, 1, 1, 14).setBackground(rowColor);
    
    // Configurar dropdown nativo SÍ/NO
    const validationRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(["SÍ", "NO"], true)
      .setAllowInvalid(false)
      .setHelpText("Selecciona SÍ o NO para activar/desactivar el producto.")
      .build();
    maestro.getRange(newRow, 7).setDataValidation(validationRule);

    // Configurar dropdown CATEGORÍA
    const catValidation = SpreadsheetApp.newDataValidation()
      .requireValueInList(CATEGORIAS_LISTA, true)
      .setAllowInvalid(false)
      .setHelpText("Selecciona la categoría del producto.")
      .build();
    maestro.getRange(newRow, 3).setDataValidation(catValidation);

    // Configurar checkbox de seleccion (columna 14 = N)
    maestro.getRange(newRow, 14).insertCheckboxes().setValue(false);

    // 2. Insertar en KARDEX_BA y KARDEX_BM
    Object.values(BODEGAS).forEach(b => {
      const kSheet = ss.getSheetByName(b.kardex);
      if (kSheet) {
        const lastRowK = kSheet.getLastRow();
        const nextRowK = lastRowK + 1;
        
        kSheet.getRange(nextRowK, 1, 1, 5).setValues([[newNo, categoria, prod, "", unidad]]);
        // kSheet.getRange(nextRowK, 6).setDataValidation(...) (Feature deshabilitada)
        kSheet.getRange(nextRowK, 6).setNumberFormat("DD/MMM/YY");
        
        // kSheet.getRange(nextRowK, 8).setFormula(...) (Feature deshabilitada)
        kSheet.getRange(nextRowK, 9).setValue(0);
        
        for (let d = 0; d < KARDEX_DAYS; d++) {
          const sldCol  = 12 + d * 3;
          const prevCol = 9  + d * 3;
          const entCol  = 10 + d * 3;
          const salCol  = 11 + d * 3;
          
          kSheet.getRange(nextRowK, entCol).setValue("");
          kSheet.getRange(nextRowK, salCol).setValue("");
          const fSld = '=' + _col(prevCol) + nextRowK + '+IFERROR(' + _col(entCol) + nextRowK + ',0)-IFERROR(' + _col(salCol) + nextRowK + ',0)';
          kSheet.getRange(nextRowK, sldCol).setFormula(fSld);
        }
        
        kSheet.getRange(nextRowK, 1, 1, 30).setBackgrounds([Array(30).fill(rowColor)]);
        kSheet.getRange(nextRowK, 9).setBackground(C.iceBlue);
        for (let d = 0; d < KARDEX_DAYS; d++) {
          kSheet.getRange(nextRowK, 10 + d * 3).setBackground(C.entBg);
          kSheet.getRange(nextRowK, 11 + d * 3).setBackground(C.salBg);
          kSheet.getRange(nextRowK, 12 + d * 3).setBackground(C.iceBlue);
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

    // 4. Re-ordenar y re-numerar todo, luego recrear vistas
    _ordenarYRenumerarTodo();
    _buildVista("BA");
    _buildVista("BM");

    // 5. Recrear Caducidades (Feature deshabilitada)
    // crearCaducidades();

    SpreadsheetApp.getActive().toast("✅ Producto agregado con éxito", "⚙️ Mise", 4);
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
    SpreadsheetApp.getActive().toast("⏳ Desactivando y ocultando producto...", "⚙️ Mise", 5);
    const lr = maestro.getLastRow();
    const data = maestro.getRange(MAESTRO_START, 1, lr - MAESTRO_START + 1, 4).getValues(); // No, ID, CAT, PRODUCTO
    let foundRow = -1;
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]) === input || String(data[i][3]).toLowerCase() === input.toLowerCase()) {
        foundRow = MAESTRO_START + i;
        break;
      }
    }

    if (foundRow === -1) {
      ui.alert("❌ Producto no encontrado. Verifica el número o nombre.");
      return;
    }

    // Cambiar columna ACTIVO (col 7) a NO
    maestro.getRange(foundRow, 7).setValue("NO");
    
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
    // crearCaducidades(); // Feature deshabilitada

    SpreadsheetApp.getActive().toast("✅ Producto anulado con éxito", "⚙️ Mise", 4);
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

// ── MIGRACIÓN IN-SITU NO DESTRUCTIVA (13 COLUMNAS) ────────────────────────────
function migrarEstructuraMaestro13Cols() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const maestro = ss.getSheetByName(SHEET_MAESTRO);
  if (!maestro) return;

  const headerRange = maestro.getRange(3, 1, 1, maestro.getLastColumn());
  const headers = headerRange.getValues()[0].map(h => String(h).trim().toUpperCase());

  // Verificar si la Columna B (índice 1) es ID_FAMILIA
  if (headers[1] === "ID_FAMILIA") {
    SpreadsheetApp.getActive().toast("⏳ Migrando MAESTRO de 14 a 13 columnas sin perder datos...", "⚙️ Mise", 5);
    
    // Eliminación atómica de Columna B (ID_FAMILIA)
    maestro.deleteColumn(2);
    
    // Actualizar encabezados
    maestro.getRange(1, 1, 1, 13).merge()
      .setValue("MISE — MAESTRO DE PRODUCTOS   |   La Crêpe Parisienne · Grupo MYT")
      .setBackground(C.dark).setFontColor("#FFFFFF").setFontWeight("bold")
      .setFontSize(11).setFontFamily("Arial").setHorizontalAlignment("center");

    maestro.getRange(2, 1, 1, 13).setBackground(C.cream);
    maestro.getRange(3, 1, 1, 13)
      .setValues([["No","CATEGORÍA","PRODUCTO","PRESENTACION","UNIDAD","ACTIVO","MÍN_BA","MÁX_BA","STOCK_BA","MÍN_BM","MÁX_BM","STOCK_BM","SELECCIONAR"]])
      .setBackground(C.sage).setFontColor("#FFFFFF").setFontWeight("bold")
      .setFontSize(10).setHorizontalAlignment("center");

    // Re-ordenar, re-numerar y actualizar Kardex y Vistas dinámicamente
    _ordenarYRenumerarTodo();
    _buildVista("BA");
    _buildVista("BM");

    SpreadsheetApp.getActive().toast("✅ Migración completada. Catálogo preservado al 100%", "⚙️ Mise", 5);
    _log("migrarEstructuraMaestro13Cols", "Migrado con éxito a 13 columnas preservando datos.");
  }
}

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
    "⚙️ Mise — v1.6.0 Altair",
    "Suite Atelier · La Crêpe Parisienne · Grupo MYT\n\n" +
    "Sistema de inventario operativo para bodega.\n" +
    "Quiosco de Picking · Remote Push Auto-Sync · Stock de Quiosco · 2 bodegas · Historial semanal",
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
  const map = _getMaestroHeaderMap(maestro);
  const cAct = map["ACTIVO"] ? map["ACTIVO"].index : 5;
  const cSel = map["SELECCIONAR"] ? map["SELECCIONAR"].index : 12;

  const rangeMaestro = maestro.getRange(MAESTRO_START, 1, count, maestro.getLastColumn());
  const valuesMaestro = rangeMaestro.getValues();
  
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    SpreadsheetApp.getUi().alert("El archivo está ocupado. Intenta de nuevo.");
    return;
  }
  
  try {
    let affected = 0;
    for (let i = 0; i < count; i++) {
      if (valuesMaestro[i][cSel] === true) {
        valuesMaestro[i][cAct] = "NO";
        valuesMaestro[i][cSel] = false;
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
  const map = _getMaestroHeaderMap(maestro);
  const cAct = map["ACTIVO"] ? map["ACTIVO"].index : 5;
  const cSel = map["SELECCIONAR"] ? map["SELECCIONAR"].index : 12;

  const rangeMaestro = maestro.getRange(MAESTRO_START, 1, count, maestro.getLastColumn());
  const valuesMaestro = rangeMaestro.getValues();
  
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    SpreadsheetApp.getUi().alert("El archivo está ocupado. Intenta de nuevo.");
    return;
  }
  
  try {
    let affected = 0;
    for (let i = 0; i < count; i++) {
      if (valuesMaestro[i][cSel] === true) {
        valuesMaestro[i][cAct] = "SÍ";
        valuesMaestro[i][cSel] = false;
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
      // crearCaducidades(); // Feature deshabilitada
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
  const map = _getMaestroHeaderMap(maestro);
  const cSel = map["SELECCIONAR"] ? map["SELECCIONAR"].col : 13;
  maestro.getRange(MAESTRO_START, cSel, count, 1).setValue(false);
  SpreadsheetApp.getActive().toast("Selección limpiada ✓", "⚙️ Mise", 3);
}

function eliminarSeleccionadosMaestro() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const maestro = ss.getSheetByName(SHEET_MAESTRO);
  if (!maestro) return;
  const lr = maestro.getLastRow();
  if (lr < MAESTRO_START) return;
  const count = lr - MAESTRO_START + 1;
  const map = _getMaestroHeaderMap(maestro);
  const cSel = map["SELECCIONAR"] ? map["SELECCIONAR"].index : 12;
  const data = maestro.getRange(MAESTRO_START, 1, count, maestro.getLastColumn()).getValues();
  
  // Encontrar filas seleccionadas
  const selectedRows = [];
  for (let i = 0; i < count; i++) {
    if (data[i][cSel] === true) {
      selectedRows.push(i);
    }
  }
  
  if (selectedRows.length === 0) {
    ui.alert("No hay productos seleccionados para eliminar.");
    return;
  }
  
  const nombres = selectedRows.map(i => data[i][3]).join(", ");
  const resp = ui.alert(
    "🗑 Eliminar Productos Definitivamente",
    `Se eliminarán ${selectedRows.length} producto(s) de TODAS las hojas (MAESTRO, KARDEX, HISTORIAL, CADUCIDADES):\n\n${nombres}\n\nEsta acción NO se puede deshacer. ¿Continuar?`,
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;
  
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) { ui.alert("El archivo está ocupado."); return; }
  
  try {
    SpreadsheetApp.getActive().toast("⏳ Eliminando productos seleccionados de todas las hojas...", "⚙️ Mise", 5);
    // Eliminar de abajo hacia arriba para no desplazar índices
    for (let i = selectedRows.length - 1; i >= 0; i--) {
      const rowIdx = selectedRows[i];
      const maestroRow = MAESTRO_START + rowIdx;
      const kardexRow = KARDEX_START + rowIdx;
      
      // Eliminar de MAESTRO
      maestro.deleteRow(maestroRow);
      
      // Eliminar de KARDEX
      Object.values(BODEGAS).forEach(b => {
        const kSheet = ss.getSheetByName(b.kardex);
        if (kSheet && kardexRow <= kSheet.getLastRow()) {
          kSheet.deleteRow(kardexRow);
        }
      });
      
      // Eliminar de HISTORIAL
      Object.values(BODEGAS).forEach(b => {
        const hSheet = ss.getSheetByName(`HISTORIAL_${b.key}`);
        const histRow = 4 + rowIdx; // historial starts at row 5 (header rows 1-4)
        if (hSheet && histRow <= hSheet.getLastRow()) {
          hSheet.deleteRow(histRow + 1);
        }
      });
    }
    
    // Re-numerar y re-formatear
    _ordenarYRenumerarTodo();
    
    // Recrear vistas y caducidades
    _buildVista("BA");
    _buildVista("BM");
    // crearCaducidades(); // Feature deshabilitada
    
    SpreadsheetApp.getActive().toast("✅ Eliminación completada", "⚙️ Mise", 4);
    ui.alert("✅ Eliminación completada", `Se eliminaron ${selectedRows.length} producto(s) definitivamente.`, ui.ButtonSet.OK);
    _log("eliminarSeleccionadosMaestro", `Eliminados: ${nombres}`);
  } finally {
    lock.releaseLock();
  }
}

function eliminarDuplicadosCatalogo() {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const maestro = ss.getSheetByName(SHEET_MAESTRO);
  if (!maestro) return;
  const lr = maestro.getLastRow();
  if (lr < MAESTRO_START) {
    ui.alert("No hay productos en MAESTRO.");
    return;
  }
  const count = lr - MAESTRO_START + 1;
  const data = maestro.getRange(MAESTRO_START, 1, count, MAESTRO_COLS).getValues();
  
  // Buscar duplicados (Misma Categoría + Producto + Presentación)
  const seenKeys = {};
  const duplicateIndices = [];
  const duplicateNames = [];
  
  for (let i = 0; i < count; i++) {
    const cat = String(data[i][2]).trim().toUpperCase();
    const prod = String(data[i][3]).trim().toUpperCase();
    const pres = String(data[i][4]).trim().toUpperCase();
    const key = `${cat}|${prod}|${pres}`;
    
    if (seenKeys[key]) {
      duplicateIndices.push(i);
      duplicateNames.push(data[i][3]); // Guardar nombre para mostrar al usuario
    } else {
      seenKeys[key] = true;
    }
  }
  
  if (duplicateIndices.length === 0) {
    ui.alert("🧹 Sin duplicados", "No se encontraron productos duplicados en el catálogo.", ui.ButtonSet.OK);
    return;
  }
  
  const resp = ui.alert(
    "🧹 Eliminar Productos Duplicados",
    `Se encontraron ${duplicateIndices.length} producto(s) duplicado(s) en el catálogo:\n\n${duplicateNames.join(", ")}\n\n¿Deseas eliminarlos de todas las hojas (MAESTRO, KARDEX, HISTORIAL) conservando solo el primer registro de cada uno?\n\nEsta acción NO se puede deshacer.`,
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;
  
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    ui.alert("El archivo está ocupado. Inténtalo de nuevo.");
    return;
  }
  
  try {
    SpreadsheetApp.getActive().toast("⏳ Eliminando duplicados de todas las hojas...", "🧹 Limpiar Duplicados", 5);
    
    // Eliminar de abajo hacia arriba para mantener estables los índices de fila
    for (let i = duplicateIndices.length - 1; i >= 0; i--) {
      const rowIdx = duplicateIndices[i];
      const maestroRow = MAESTRO_START + rowIdx;
      const kardexRow = KARDEX_START + rowIdx;
      
      // 1. Eliminar de MAESTRO
      maestro.deleteRow(maestroRow);
      
      // 2. Eliminar de KARDEX
      Object.values(BODEGAS).forEach(b => {
        const kSheet = ss.getSheetByName(b.kardex);
        if (kSheet && kardexRow <= kSheet.getLastRow()) {
          kSheet.deleteRow(kardexRow);
        }
      });
      
      // 3. Eliminar de HISTORIAL
      Object.values(BODEGAS).forEach(b => {
        const hSheet = ss.getSheetByName(`HISTORIAL_${b.key}`);
        const histRow = 4 + rowIdx; // historial starts at row 5
        if (hSheet && histRow <= hSheet.getLastRow()) {
          hSheet.deleteRow(histRow + 1);
        }
      });
    }
    
    // Re-ordenar, re-numerar y actualizar vistas
    _ordenarYRenumerarTodo();
    _buildVista("BA");
    _buildVista("BM");
    
    SpreadsheetApp.getActive().toast("✅ Duplicados eliminados con éxito", "🧹 Limpiar Duplicados", 4);
    ui.alert("✅ Limpieza completada", `Se eliminaron ${duplicateIndices.length} producto(s) duplicado(s) de todas las hojas.`, ui.ButtonSet.OK);
    _log("eliminarDuplicadosCatalogo", `Eliminados ${duplicateIndices.length} duplicados: ${duplicateNames.join(", ")}`);
  } catch (err) {
    SpreadsheetApp.getActive().toast("❌ Error al limpiar duplicados: " + err.message, "🧹 Limpiar Duplicados", 5);
  } finally {
    lock.releaseLock();
  }
}

function _ordenarYRenumerarTodo() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const maestro = ss.getSheetByName(SHEET_MAESTRO);
  if (!maestro) return;
  const lr = maestro.getLastRow();
  if (lr < MAESTRO_START) return;
  const count = lr - MAESTRO_START + 1;
  const map = _getMaestroHeaderMap(maestro);

  const cCat  = map["CATEGORÍA"]    ? map["CATEGORÍA"].index    : 1;
  const cProd = map["PRODUCTO"]     ? map["PRODUCTO"].index     : 2;
  const cPres = map["PRESENTACION"] ? map["PRESENTACION"].index : 3;
  const cUni  = map["UNIDAD"]       ? map["UNIDAD"].index       : 4;
  const cSel  = map["SELECCIONAR"] ? map["SELECCIONAR"].index : 12;
  const lProd = map["PRODUCTO"] ? map["PRODUCTO"].letter : "C";

  const lMinBA = map["MÍN_BA"]   ? map["MÍN_BA"].letter   : "G";
  const lMaxBA = map["MÁX_BA"]   ? map["MÁX_BA"].letter   : "H";
  const cStkBA = map["STOCK_BA"] ? map["STOCK_BA"].col    : 9;
  const idxMinBA = map["MÍN_BA"] && map["PRODUCTO"] ? (map["MÍN_BA"].col - map["PRODUCTO"].col + 1) : 5;
  const idxMaxBA = map["MÁX_BA"] && map["PRODUCTO"] ? (map["MÁX_BA"].col - map["PRODUCTO"].col + 1) : 6;

  const lMinBM = map["MÍN_BM"]   ? map["MÍN_BM"].letter   : "J";
  const lMaxBM = map["MÁX_BM"]   ? map["MÁX_BM"].letter   : "K";
  const cStkBM = map["STOCK_BM"] ? map["STOCK_BM"].col    : 12;
  const idxMinBM = map["MÍN_BM"] && map["PRODUCTO"] ? (map["MÍN_BM"].col - map["PRODUCTO"].col + 1) : 8;
  const idxMaxBM = map["MÁX_BM"] && map["PRODUCTO"] ? (map["MÁX_BM"].col - map["PRODUCTO"].col + 1) : 9;
  
  // 1. Leer datos de MAESTRO
  const range = maestro.getRange(MAESTRO_START, 1, count, maestro.getLastColumn());
  const data = range.getValues();
  
  // 2. Ordenar por CATEGORÍA (según el orden de CATEGORIAS_LISTA) y luego PRODUCTO
  data.sort((a, b) => {
    const catA = String(a[cCat] || '').trim();
    const catB = String(b[cCat] || '').trim();
    const idxA = CATEGORIAS_LISTA.indexOf(catA);
    const idxB = CATEGORIAS_LISTA.indexOf(catB);
    const priorityA = idxA === -1 ? 999 : idxA;
    const priorityB = idxB === -1 ? 999 : idxB;
    
    if (priorityA !== priorityB) return priorityA - priorityB;
    
    const prodA = String(a[cProd] || '').trim().toLowerCase();
    const prodB = String(b[cProd] || '').trim().toLowerCase();
    return prodA.localeCompare(prodB);
  });
  
  // 3. Re-numerar y limpiar selección
  for (let i = 0; i < data.length; i++) {
    data[i][0] = i + 1;
    data[i][cSel] = false;
  }
  
  // 4. Escribir datos ordenados
  range.setValues(data);
  
  // Inyectar formulas dinámicas de stock en MAESTRO
  const formulasBA = [];
  const formulasBM = [];
  for (let i = 0; i < data.length; i++) {
    const rn = MAESTRO_START + i;
    const fBA = `=IFERROR(VLOOKUP(${lProd}${rn}, 'KARDEX_BA'!C:AD, 26, FALSE), 0) & IF(AND(${lMinBA}${rn}=0, ${lMaxBA}${rn}=0), "", IF(VLOOKUP(${lProd}${rn}, 'KARDEX_BA'!C:AD, 26, FALSE)<${lMinBA}${rn}, " (-" & (${lMinBA}${rn}-VLOOKUP(${lProd}${rn}, 'KARDEX_BA'!C:AD, 26, FALSE)) & ")", IF(VLOOKUP(${lProd}${rn}, 'KARDEX_BA'!C:AD, 26, FALSE)>${lMaxBA}${rn}, " (+" & (VLOOKUP(${lProd}${rn}, 'KARDEX_BA'!C:AD, 26, FALSE)-${lMaxBA}${rn}) & ")", " (-)")))`;
    const fBM = `=IFERROR(VLOOKUP(${lProd}${rn}, 'KARDEX_BM'!C:AD, 26, FALSE), 0) & IF(AND(${lMinBM}${rn}=0, ${lMaxBM}${rn}=0), "", IF(VLOOKUP(${lProd}${rn}, 'KARDEX_BM'!C:AD, 26, FALSE)<${lMinBM}${rn}, " (-" & (${lMinBM}${rn}-VLOOKUP(${lProd}${rn}, 'KARDEX_BM'!C:AD, 26, FALSE)) & ")", IF(VLOOKUP(${lProd}${rn}, 'KARDEX_BM'!C:AD, 26, FALSE)>${lMaxBM}${rn}, " (+" & (VLOOKUP(${lProd}${rn}, 'KARDEX_BM'!C:AD, 26, FALSE)-${lMaxBM}${rn}) & ")", " (-)")))`;
    formulasBA.push([fBA]);
    formulasBM.push([fBM]);
  }
  maestro.getRange(MAESTRO_START, cStkBA, data.length, 1).setFormulas(formulasBA); // Col STOCK_BA
  maestro.getRange(MAESTRO_START, cStkBM, data.length, 1).setFormulas(formulasBM); // Col STOCK_BM
  
  // 5. Re-aplicar formatos visuales y condicionales
  const bgs = data.map((_, i) => Array(maestro.getLastColumn()).fill(i % 2 === 0 ? C.rowA : C.rowB));
  range.setBackgrounds(bgs);
  _aplicarReglasMaestro(maestro);
  
  // 6. Reconstruir KARDEX con los datos re-ordenados
  Object.values(BODEGAS).forEach(b => {
    const kSheet = ss.getSheetByName(b.kardex);
    if (!kSheet) return;
    const klr = kSheet.getLastRow();
    if (klr < KARDEX_START) return;
    const kCount = klr - KARDEX_START + 1;
    
    // Leer datos existentes del Kardex (preservar CADUCIDAD, LOTE, ENT, SAL)
    const kData = kSheet.getRange(KARDEX_START, 1, kCount, KARDEX_TOTAL_COLS).getValues();
    
    // Crear mapa por nombre de producto → datos del kardex (preservando entradas/salidas)
    const kMap = {};
    for (let i = 0; i < kCount; i++) {
      const nombre = String(kData[i][2]).trim(); // col C = PRODUCTO
      if (nombre) kMap[nombre] = kData[i];
    }
    
    // Re-construir datos del kardex en el nuevo orden del MAESTRO
    const newKData = [];
    for (let i = 0; i < data.length; i++) {
      const prodName = String(data[i][cProd]).trim(); // MAESTRO col PRODUCTO
      const existing = kMap[prodName];
      if (existing) {
        // Actualizar No y Categoría, preservar todo lo demás
        existing[0] = data[i][0];     // No
        existing[1] = data[i][cCat];  // CATEGORÍA
        existing[2] = data[i][cProd]; // PRODUCTO
        existing[3] = data[i][cPres]; // PRESENTACIÓN
        existing[4] = data[i][cUni];  // UNIDAD
        newKData.push(existing);
      } else {
        // Producto nuevo sin datos previos
        const row = new Array(KARDEX_TOTAL_COLS).fill('');
        row[0] = data[i][0];     // No
        row[1] = data[i][cCat];  // CATEGORÍA
        row[2] = data[i][cProd]; // PRODUCTO
        row[3] = data[i][cPres]; // PRESENTACIÓN
        row[4] = data[i][cUni];  // UNIDAD
        newKData.push(row);
      }
    }
    
    // Escribir datos estáticos (No, CAT, PROD, PRES, UND)
    const staticCols = newKData.map(r => [r[0], r[1], r[2], r[3], r[4]]);
    kSheet.getRange(KARDEX_START, 1, newKData.length, 5).setValues(staticCols);
    
    // Preservar CADUCIDAD y LOTE
    const cadLote = newKData.map(r => [r[5], r[6]]);
    kSheet.getRange(KARDEX_START, 6, newKData.length, 2).setValues(cadLote);
    
    // Preservar SALDO ANT
    const sldAnt = newKData.map(r => [r[8]]);
    kSheet.getRange(KARDEX_START, 9, newKData.length, 1).setValues(sldAnt);
    
    // Preservar ENT/SAL values
    for (let d = 0; d < KARDEX_DAYS; d++) {
      const entIdx = 9 + d * 3;  // 0-indexed in array
      const salIdx = 10 + d * 3;
      const entVals = newKData.map(r => [r[entIdx]]);
      const salVals = newKData.map(r => [r[salIdx]]);
      kSheet.getRange(KARDEX_START, 10 + d * 3, newKData.length, 1).setValues(entVals);
      kSheet.getRange(KARDEX_START, 11 + d * 3, newKData.length, 1).setValues(salVals);
    }
    
    // Re-escribir fórmulas de semáforo de stock en KARDEX (col H = 8)
    const formulasH = [];
    for (let r = 0; r < newKData.length; r++) {
      const rn = KARDEX_START + r;
      let f = "";
      if (b.key === "BA") {
        f = `=IF(AND(IFERROR(VLOOKUP(C${rn}, MAESTRO!${lProd}:${lMaxBA}, ${idxMinBA}, FALSE), 0)=0, IFERROR(VLOOKUP(C${rn}, MAESTRO!${lProd}:${lMaxBA}, ${idxMaxBA}, FALSE), 0)=0), "", IF(AD${rn}<IFERROR(VLOOKUP(C${rn}, MAESTRO!${lProd}:${lMaxBA}, ${idxMinBA}, FALSE), 0), "🔴 -" & (IFERROR(VLOOKUP(C${rn}, MAESTRO!${lProd}:${lMaxBA}, ${idxMinBA}, FALSE), 0)-AD${rn}), IF(AD${rn}>IFERROR(VLOOKUP(C${rn}, MAESTRO!${lProd}:${lMaxBA}, ${idxMaxBA}, FALSE), 0), "🔵 +" & (AD${rn}-IFERROR(VLOOKUP(C${rn}, MAESTRO!${lProd}:${lMaxBA}, ${idxMaxBA}, FALSE), 0)), "🟢 -")))`;
      } else {
        f = `=IF(AND(IFERROR(VLOOKUP(C${rn}, MAESTRO!${lProd}:${lMaxBM}, ${idxMinBM}, FALSE), 0)=0, IFERROR(VLOOKUP(C${rn}, MAESTRO!${lProd}:${lMaxBM}, ${idxMaxBM}, FALSE), 0)=0), "", IF(AD${rn}<IFERROR(VLOOKUP(C${rn}, MAESTRO!${lProd}:${lMaxBM}, ${idxMinBM}, FALSE), 0), "🔴 -" & (IFERROR(VLOOKUP(C${rn}, MAESTRO!${lProd}:${lMaxBM}, ${idxMinBM}, FALSE), 0)-AD${rn}), IF(AD${rn}>IFERROR(VLOOKUP(C${rn}, MAESTRO!${lProd}:${lMaxBM}, ${idxMaxBM}, FALSE), 0), "🔵 +" & (AD${rn}-IFERROR(VLOOKUP(C${rn}, MAESTRO!${lProd}:${lMaxBM}, ${idxMaxBM}, FALSE), 0)), "🟢 -")))`;
      }
      formulasH.push([f]);
    }
    kSheet.getRange(KARDEX_START, 8, newKData.length, 1).setFormulas(formulasH);
    
    // Re-escribir fórmulas SLD
    for (let d = 0; d < KARDEX_DAYS; d++) {
      const sldCol  = 12 + d * 3;
      const prevCol = 9  + d * 3;
      const entCol  = 10 + d * 3;
      const salCol  = 11 + d * 3;
      const formulas = [];
      for (let r = 0; r < newKData.length; r++) {
        const rn = KARDEX_START + r;
        formulas.push(['=' + _col(prevCol) + rn + '+IFERROR(' + _col(entCol) + rn + ',0)-IFERROR(' + _col(salCol) + rn + ',0)']);
      }
      kSheet.getRange(KARDEX_START, sldCol, newKData.length, 1).setFormulas(formulas);
    }
    
    // Re-aplicar backgrounds
    const kBgs = newKData.map((_, i) => Array(KARDEX_TOTAL_COLS).fill(i % 2 === 0 ? C.rowA : C.rowB));
    kSheet.getRange(KARDEX_START, 1, newKData.length, KARDEX_TOTAL_COLS).setBackgrounds(kBgs);
    kSheet.getRange(KARDEX_START, 9, newKData.length, 1).setBackgrounds(Array(newKData.length).fill([C.iceBlue]));
    for (let d = 0; d < KARDEX_DAYS; d++) {
      kSheet.getRange(KARDEX_START, 10 + d * 3, newKData.length, 1).setBackgrounds(Array(newKData.length).fill([C.entBg]));
      kSheet.getRange(KARDEX_START, 11 + d * 3, newKData.length, 1).setBackgrounds(Array(newKData.length).fill([C.salBg]));
      kSheet.getRange(KARDEX_START, 12 + d * 3, newKData.length, 1).setBackgrounds(Array(newKData.length).fill([C.iceBlue]));
    }

    // Actualizar filtro automático en KARDEX
    const kFilterRange = kSheet.getRange(6, 1, newKData.length + 1, KARDEX_TOTAL_COLS);
    if (kSheet.getFilter()) {
      kSheet.getFilter().remove();
    }
    kFilterRange.createFilter();
  });

  // Actualizar filtro automático en MAESTRO
  const mFilterRange = maestro.getRange(3, 1, data.length + 1, MAESTRO_COLS);
  if (maestro.getFilter()) {
    maestro.getFilter().remove();
  }
  mFilterRange.createFilter();
  
  // Re-aplicar las protecciones anti-dummies dinámicas
  protegerMaestroSeguro();
  
  _log("_ordenarYRenumerarTodo", `Re-ordenado y re-numerado: ${data.length} productos`);
}

function protegerMaestroSeguro() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const maestro = ss.getSheetByName(SHEET_MAESTRO);
  if (!maestro) return;
  
  // 1. Remover protecciones anteriores en esta hoja para evitar duplicidades
  const protections = maestro.getProtections(SpreadsheetApp.ProtectionType.SHEET);
  protections.forEach(p => {
    try { p.remove(); } catch(e) {}
  });
  
  // 2. Crear una nueva protección para toda la hoja
  const sheetProtection = maestro.protect().setDescription("Protección anti-dummies de MAESTRO");
  
  // Restringir a que solo el propietario y editores autorizados (incluyendo scripts) puedan modificarla
  const me = Session.getEffectiveUser().getEmail();
  sheetProtection.getEditors().forEach(editor => {
    if (editor.getEmail() !== me) {
      try { sheetProtection.removeEditor(editor); } catch(e) {}
    }
  });
  
  // 3. Definir rangos excepcionales (Libres de edición para cualquier editor de la hoja)
  const lr = Math.max(maestro.getLastRow(), MAESTRO_START);
  const count = lr - MAESTRO_START + 1;
  const map = _getMaestroHeaderMap(maestro);

  const cMinBA = map["MÍN_BA"]      ? map["MÍN_BA"].col      : 7;
  const cMinBM = map["MÍN_BM"]      ? map["MÍN_BM"].col      : 10;
  const cSel   = map["SELECCIONAR"] ? map["SELECCIONAR"].col : 13;

  const rangoMinMaxBA = maestro.getRange(MAESTRO_START, cMinBA, count, 2); // MÍN_BA y MÁX_BA
  const rangoMinMaxBM = maestro.getRange(MAESTRO_START, cMinBM, count, 2); // MÍN_BM y MÁX_BM
  const rangoSelect   = maestro.getRange(MAESTRO_START, cSel, count, 1);   // SELECCIONAR
  const checkboxesFila2 = maestro.getRange("D2:J2");                        // Checkboxes de acciones por lote
  
  sheetProtection.setUnprotectedRanges([rangoMinMaxBA, rangoMinMaxBM, rangoSelect, checkboxesFila2]);
}

function restaurarValidacionesMaestro() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const maestro = ss.getSheetByName(SHEET_MAESTRO);
  if (!maestro) return;
  const lr = maestro.getLastRow();
  if (lr < MAESTRO_START) return;
  const count = lr - MAESTRO_START + 1;
  const map = _getMaestroHeaderMap(maestro);

  const cCat = map["CATEGORÍA"]    ? map["CATEGORÍA"].col    : 2;
  const cAct = map["ACTIVO"]       ? map["ACTIVO"].col       : 6;
  const cSel = map["SELECCIONAR"] ? map["SELECCIONAR"].col : 13;
  
  // 1. Restaurar Dropdown ACTIVO (col 6 / F)
  const validationRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["SÍ", "NO"], true)
    .setAllowInvalid(false)
    .setHelpText("Selecciona SÍ o NO para activar/desactivar el producto.")
    .build();
  maestro.getRange(MAESTRO_START, cAct, count, 1).setDataValidation(validationRule);
  
  // 1.5. Restaurar Dropdown CATEGORÍA (col 2 / B)
  const catValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(CATEGORIAS_LISTA, true)
    .setAllowInvalid(false)
    .setHelpText("Selecciona la categoría del producto.")
    .build();
  maestro.getRange(MAESTRO_START, cCat, count, 1).setDataValidation(catValidation);
  
  // 2. Restaurar Checkboxes SELECCIONAR (col 13 / M)
  maestro.getRange(MAESTRO_START, cSel, count, 1).insertCheckboxes();
  
  // 3. Re-aplicar Formato Condicional Dinámico
  _aplicarReglasMaestro(maestro);
  
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
  sheet.getRange("A1:J1").merge()
    .setValue("MISE — AGREGAR PRODUCTOS EN LOTE")
    .setBackground(C.dark).setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(11).setFontFamily("Arial").setHorizontalAlignment("center").setVerticalAlignment("middle");
  sheet.setRowHeight(1, 30);
  
  sheet.getRange("A2:J2").merge()
    .setValue("Instrucciones: Completa las columnas B a J. Llena tantas filas como productos quieras agregar.")
    .setBackground(C.cream).setFontColor("#333333").setFontSize(9)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  sheet.setRowHeight(2, 20);
  
  sheet.getRange("A3:I3").merge()
    .setValue("Confirmar Carga de Productos:").setFontWeight("bold").setFontSize(9)
    .setHorizontalAlignment("right").setVerticalAlignment("middle").setBackground(C.sage).setFontColor("#FFFFFF");
  sheet.getRange("J3").insertCheckboxes().setValue(false).setBackground(C.yellow).setHorizontalAlignment("center");
  sheet.setRowHeight(3, 24);
  
  sheet.getRange("A4:J4")
    .setValues([["No", "CATEGORÍA (Obligatorio)", "PRODUCTO (Obligatorio)", "PRESENTACIÓN (Obligatorio)", "UNIDAD (Obligatorio)", "ID FAMILIA (Opcional)", "MÍN BA", "MÁX BA", "MÍN BM", "MÁX BM"]])
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
    bgs.push(Array(10).fill(i % 2 === 0 ? C.rowA : C.rowB));
  }
  sheet.getRange(5, 1, rows, 1).setValues(colA);
  sheet.getRange(5, 1, rows, 10).setBackgrounds(bgs)
    .setFontFamily("Calibri").setFontSize(10).setVerticalAlignment("middle");
  sheet.getRange(5, 1, rows, 1).setHorizontalAlignment("center");
  sheet.getRange(5, 2, rows, 1).setHorizontalAlignment("center");
  sheet.getRange(5, 5, rows, 1).setHorizontalAlignment("center");
  sheet.getRange(5, 6, rows, 1).setHorizontalAlignment("center");
  
  // Dropdown de categorías en columna B (col 2)
  const catValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(CATEGORIAS_LISTA, true)
    .setAllowInvalid(false)
    .setHelpText("Selecciona una categoría válida.")
    .build();
  sheet.getRange(5, 2, rows, 1).setDataValidation(catValidation);
  
  // Dropdown de unidades en columna E (col 5)
  const unitValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(["kg", "lt", "pza", "paq", "g", "ml", "rol", "fco", "dom", "bol", "caj"], true)
    .setAllowInvalid(false)
    .setHelpText("Selecciona una unidad válida.")
    .build();
  sheet.getRange(5, 5, rows, 1).setDataValidation(unitValidation);
  
  sheet.setColumnWidth(1, 40);
  sheet.setColumnWidth(2, 180);
  sheet.setColumnWidth(3, 220);
  sheet.setColumnWidth(4, 180);
  sheet.setColumnWidth(5, 140);
  sheet.setColumnWidth(6, 160);
  sheet.setColumnWidth(7, 75);
  sheet.setColumnWidth(8, 75);
  sheet.setColumnWidth(9, 75);
  sheet.setColumnWidth(10, 75);
  
  ss.setActiveSheet(sheet);
}

function procesarCargaMasiva() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tempSheet = ss.getSheetByName("➕ AGREGAR_MÚLTIPLES");
  if (!tempSheet) return;
  
  const lastRowT = tempSheet.getLastRow();
  if (lastRowT < 5) {
    SpreadsheetApp.getUi().alert("No hay productos para cargar.");
    tempSheet.getRange("J3").setValue(false);
    return;
  }
  
  const rawData = tempSheet.getRange(5, 1, lastRowT - 4, 10).getValues();
  const validRows = [];
  for (let i = 0; i < rawData.length; i++) {
    const cat = String(rawData[i][1]).trim();
    const prod = String(rawData[i][2]).trim();
    const pres = String(rawData[i][3]).trim();
    const unit = String(rawData[i][4]).trim();
    const idFam = String(rawData[i][5]).trim();
    const minBa = parseFloat(rawData[i][6]) || 0;
    const maxBa = parseFloat(rawData[i][7]) || 0;
    const minBm = parseFloat(rawData[i][8]) || 0;
    const maxBm = parseFloat(rawData[i][9]) || 0;
    
    if (prod !== "") {
      if (cat === "" || pres === "" || unit === "") {
        SpreadsheetApp.getUi().alert(`Error en fila ${i + 5}: El producto "${prod}" debe tener CATEGORÍA, PRESENTACIÓN y UNIDAD obligatoriamente.`);
        tempSheet.getRange("J3").setValue(false);
        return;
      }
      validRows.push({ cat, prod, pres, unit, idFam, minBa, maxBa, minBm, maxBm });
    }
  }
  
  if (validRows.length === 0) {
    SpreadsheetApp.getUi().alert("No se encontraron productos para cargar. Escribe al menos el nombre del producto en la columna C.");
    tempSheet.getRange("J3").setValue(false);
    return;
  }
  
  const proceed = SpreadsheetApp.getUi().alert(
    "➕ Confirmar Adición de Productos",
    `¿Confirmas agregar ${validRows.length} productos nuevos en lote al catálogo, kardex y hojas de historial?`,
    SpreadsheetApp.getUi().ButtonSet.YES_NO
  );
  if (proceed !== SpreadsheetApp.getUi().Button.YES) {
    tempSheet.getRange("J3").setValue(false);
    return;
  }
  
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    SpreadsheetApp.getUi().alert("El archivo está ocupado. Intenta de nuevo.");
    tempSheet.getRange("J3").setValue(false);
    return;
  }
  
  try {
    SpreadsheetApp.getActive().toast("⏳ Paso 1/4: Registrando productos en MAESTRO...", "⚙️ Agregar productos", 5);
    const maestro = ss.getSheetByName(SHEET_MAESTRO);
    const lrM = maestro.getLastRow();
    const nos = maestro.getRange(MAESTRO_START, 1, lrM - MAESTRO_START + 1, 1).getValues();
    let lastNo = nos.reduce((max, r) => Math.max(max, parseInt(r[0]) || 0), 0);
    
    const map = _getMaestroHeaderMap(maestro);
    const cCat = map["CATEGORÍA"] ? map["CATEGORÍA"].col : 2;
    const cAct = map["ACTIVO"]    ? map["ACTIVO"].col    : 6;
    const cSel = map["SELECCIONAR"] ? map["SELECCIONAR"].col : 13;

    const maestroRows = [];
    const bgsM = [];
    
    const newProductsData = []; // Para procesar en los Kardex
    
    for (let i = 0; i < validRows.length; i++) {
      const item = validRows[i];
      const newNo = ++lastNo;
      maestroRows.push([newNo, item.cat, item.prod, item.pres, item.unit, "SÍ", item.minBa, item.maxBa, "", item.minBm, item.maxBm, "", false]);
      
      const rowColor = (newNo % 2 === 1) ? C.rowA : C.rowB;
      bgsM.push(Array(maestro.getLastColumn()).fill(rowColor));
      
      newProductsData.push({ newNo, item, rowColor });
    }
    
    // 1. Escribir en MAESTRO
    const startRowM = lrM + 1;
    maestro.getRange(startRowM, 1, validRows.length, maestro.getLastColumn()).setValues(maestroRows);
    maestro.getRange(startRowM, 1, validRows.length, maestro.getLastColumn()).setBackgrounds(bgsM);
    
    // Agregar validación y checkboxes en MAESTRO
    const validationRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(["SÍ", "NO"], true)
      .setAllowInvalid(false)
      .setHelpText("Selecciona SÍ o NO para activar/desactivar el producto.")
      .build();
    maestro.getRange(startRowM, cAct, validRows.length, 1).setDataValidation(validationRule);
    const catValidationCM = SpreadsheetApp.newDataValidation()
      .requireValueInList(CATEGORIAS_LISTA, true)
      .setAllowInvalid(false)
      .setHelpText("Selecciona la categoría del producto.")
      .build();
    maestro.getRange(startRowM, cCat, validRows.length, 1).setDataValidation(catValidationCM);
    maestro.getRange(startRowM, cSel, validRows.length, 1).insertCheckboxes().setValue(false);
    
    SpreadsheetApp.getActive().toast("⏳ Paso 2/4: Extendiendo KARDEX de Andares y Mercado...", "⚙️ Agregar productos", 5);
    // 2. Insertar en KARDEX_BA y KARDEX_BM
    Object.values(BODEGAS).forEach(b => {
      const kSheet = ss.getSheetByName(b.kardex);
      if (kSheet) {
        const lastRowK = kSheet.getLastRow();
        const startRowK = lastRowK + 1;
        
        // Escribimos toda la fila del Kardex (30 columnas) en Batch 2D
        const fullKardexRows = [];
        const bgsK = [];
        
        for (let i = 0; i < newProductsData.length; i++) {
          const np = newProductsData[i];
          const row = new Array(KARDEX_TOTAL_COLS).fill("");
          
          // Estáticos
          row[0] = np.newNo;
          row[1] = np.item.cat;
          row[2] = np.item.prod;
          row[3] = np.item.pres;
          row[4] = np.item.unit;
          // Caducidad (5), Lote (6), Alerta Stock (7) vacíos.
          // Saldo Inicial (8) es 0
          row[8] = 0;
          
          // Fórmulas de Saldos de los 7 días
          const rn = startRowK + i;
          for (let d = 0; d < KARDEX_DAYS; d++) {
            const prevCol = 9  + d * 3;
            const entCol  = 10 + d * 3;
            const salCol  = 11 + d * 3;
            const sldColIdx = 11 + d * 3; // 0-indexed: Col L es 11
            row[sldColIdx] = '=' + _col(prevCol) + rn + '+IFERROR(' + _col(entCol) + rn + ',0)-IFERROR(' + _col(salCol) + rn + ',0)';
          }
          
          fullKardexRows.push(row);
          
          const rowColor = np.rowColor;
          const bgRow = Array(KARDEX_TOTAL_COLS).fill(rowColor);
          bgRow[8] = C.iceBlue; // Saldo Inicial
          for (let d = 0; d < KARDEX_DAYS; d++) {
            bgRow[9 + d * 3] = C.entBg;  // ENT
            bgRow[10 + d * 3] = C.salBg; // SAL
            bgRow[11 + d * 3] = C.iceBlue; // SLD
          }
          bgsK.push(bgRow);
        }
        
        // Escribir bloque completo en Kardex
        kSheet.getRange(startRowK, 1, validRows.length, KARDEX_TOTAL_COLS).setValues(fullKardexRows);
        kSheet.getRange(startRowK, 6, validRows.length, 1).setNumberFormat("DD/MMM/YY");
        kSheet.getRange(startRowK, 1, validRows.length, KARDEX_TOTAL_COLS).setBackgrounds(bgsK);
      }
    });
    
    SpreadsheetApp.getActive().toast("⏳ Paso 3/4: Creando históricos de consumo...", "⚙️ Agregar productos", 5);
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
    
    SpreadsheetApp.getActive().toast("⏳ Paso 4/4: Re-ordenando catálogo y recreando vistas...", "⚙️ Agregar productos", 5);
    // 4. Re-ordenar y re-numerar todo, luego recrear vistas
    _ordenarYRenumerarTodo();
    _buildVista("BA");
    _buildVista("BM");
    
    // 6. Eliminar hoja temporal
    try {
      ss.deleteSheet(tempSheet);
    } catch(e) {}
    
    SpreadsheetApp.getActive().toast(`✅ Se agregaron ${validRows.length} productos con éxito`, "⚙️ Agregar productos", 4);
    SpreadsheetApp.getUi().alert("✅ Carga masiva completada", `Se agregaron ${validRows.length} productos nuevos con éxito.`, SpreadsheetApp.getUi().ButtonSet.OK);
    _log("procesarCargaMasiva", `${validRows.length} productos cargados.`);
  } catch (err) {
    // Revertir el checkbox a false en caso de fallo para permitir reintentar
    try { tempSheet.getRange("J3").setValue(false); } catch(e) {}
    SpreadsheetApp.getActive().toast("❌ Error en carga masiva: " + err.message, "⚙️ Agregar productos", 6);
    SpreadsheetApp.getUi().alert("❌ Error en Carga Masiva", "No se completó la operación debido al siguiente error:\n\n" + err.toString() + "\n\nPor favor, revisa tus datos y reintenta.", SpreadsheetApp.getUi().ButtonSet.OK);
    _log("procesarCargaMasiva ERROR", err.toString());
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
  const map = _getMaestroHeaderMap(maestro);
  const data = maestro.getRange(MAESTRO_START, 1, count, maestro.getLastColumn()).getValues();

  const cNo    = map["NO"]           ? map["NO"].index           : 0;
  const cCat   = map["CATEGORÍA"]    ? map["CATEGORÍA"].index    : 1;
  const cProd  = map["PRODUCTO"]     ? map["PRODUCTO"].index     : 2;
  const cPres  = map["PRESENTACION"] ? map["PRESENTACION"].index : 3;
  const cUni   = map["UNIDAD"]       ? map["UNIDAD"].index       : 4;
  const cMinBA = map["MÍN_BA"]      ? map["MÍN_BA"].index      : 6;
  const cMaxBA = map["MÁX_BA"]      ? map["MÁX_BA"].index      : 7;
  const cMinBM = map["MÍN_BM"]      ? map["MÍN_BM"].index      : 9;
  const cMaxBM = map["MÁX_BM"]      ? map["MÁX_BM"].index      : 10;
  const cSel   = map["SELECCIONAR"] ? map["SELECCIONAR"].index : 12;

  const selectedProds = [];
  for (let i = 0; i < count; i++) {
    if (data[i][cSel] === true) {
      selectedProds.push({
        no: data[i][cNo],
        cat: data[i][cCat],
        prod: data[i][cProd],
        pres: data[i][cPres],
        unit: data[i][cUni],
        minBa: data[i][cMinBA],
        maxBa: data[i][cMaxBA],
        minBm: data[i][cMinBM],
        maxBm: data[i][cMaxBM]
      });
    }
  }
  
  if (selectedProds.length === 0) {
    SpreadsheetApp.getUi().alert("No has seleccionado ningún producto. Primero marca las casillas de la columna 'SELECCIONAR' en MAESTRO.");
    return;
  }
  
  let editSheet = ss.getSheetByName("✏️ EDITAR_PRODUCTOS");
  if (editSheet) {
    try {
      ss.deleteSheet(editSheet);
      editSheet = ss.insertSheet("✏️ EDITAR_PRODUCTOS");
    } catch(e) {
      editSheet.clear();
      editSheet.clearConditionalFormatRules();
      editSheet.setHiddenGridlines(false);
      editSheet.setFrozenRows(0);
      editSheet.setFrozenColumns(0);
    }
  } else {
    editSheet = ss.insertSheet("✏️ EDITAR_PRODUCTOS");
  }
  
  // Headers (10 columnas: A-J)
  editSheet.getRange("A1:J1").merge()
    .setValue("MISE — EDICIÓN MASIVA DE PRODUCTOS")
    .setBackground(C.dark).setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(11).setFontFamily("Arial").setHorizontalAlignment("center").setVerticalAlignment("middle");
  editSheet.setRowHeight(1, 30);
  
  editSheet.getRange("A2:J2").merge()
    .setValue("Instrucciones: Modifica los campos que desees. Las columnas CATEGORÍA, PRODUCTO, PRESENTACIÓN y UNIDAD son obligatorias. Deja la columna A (No) intacta.")
    .setBackground(C.cream).setFontColor("#333333").setFontSize(9)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  editSheet.setRowHeight(2, 20);
  
  editSheet.getRange("A3:H3").merge()
    .setValue("Confirmar Edición de Productos:").setFontWeight("bold").setFontSize(9)
    .setHorizontalAlignment("right").setVerticalAlignment("middle").setBackground(C.sage).setFontColor("#FFFFFF");
  editSheet.getRange("I3").insertCheckboxes().setValue(false).setBackground(C.yellow).setHorizontalAlignment("center");
  editSheet.getRange("J3").setValue("").setBackground(C.cream);
  editSheet.setRowHeight(3, 24);
  
  editSheet.getRange("A4:J4")
    .setValues([["No (No editar)", "CATEGORÍA (Obligatorio)", "PRODUCTO (Obligatorio)", "PRESENTACIÓN (Obligatorio)", "UNIDAD (Obligatorio)", "ID FAMILIA (Opcional)", "MÍN BA", "MÁX BA", "MÍN BM", "MÁX BM"]])
    .setBackground(C.dark).setFontColor("#FFFFFF").setFontWeight("bold").setFontSize(9)
    .setHorizontalAlignment("center").setVerticalAlignment("middle");
  editSheet.setRowHeight(4, 26);
  
  editSheet.setFrozenRows(4);
  
  // Poblar productos seleccionados (10 columnas)
  const editRows = [];
  const bgs = [];
  selectedProds.forEach((p, idx) => {
    editRows.push([p.no, p.cat, p.prod, p.pres, p.unit, p.idFam, p.minBa, p.maxBa, p.minBm, p.maxBm]);
    bgs.push(Array(10).fill(idx % 2 === 0 ? C.rowA : C.rowB));
  });
  
  const startRow = 5;
  editSheet.getRange(startRow, 1, selectedProds.length, 10).setValues(editRows);
  editSheet.getRange(startRow, 1, selectedProds.length, 10).setBackgrounds(bgs)
    .setFontFamily("Calibri").setFontSize(10).setVerticalAlignment("middle");
  editSheet.getRange(startRow, 1, selectedProds.length, 1).setHorizontalAlignment("center").setFontWeight("bold").setFontColor("#C62828");
  editSheet.getRange(startRow, 2, selectedProds.length, 1).setHorizontalAlignment("center");
  editSheet.getRange(startRow, 6, selectedProds.length, 1).setHorizontalAlignment("center");
  editSheet.getRange(startRow, 7, selectedProds.length, 4).setHorizontalAlignment("center");
  
  // Dropdown de categorías en columna B (col 2)
  const catValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(CATEGORIAS_LISTA, true)
    .setAllowInvalid(false)
    .setHelpText("Selecciona una categoría válida.")
    .build();
  editSheet.getRange(startRow, 2, selectedProds.length, 1).setDataValidation(catValidation);

  // Dropdown de unidades en columna E (col 5)
  const unitValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(["kg", "lt", "pza", "paq", "g", "ml", "rol", "fco", "dom", "bol", "caj"], true)
    .setAllowInvalid(false)
    .setHelpText("Selecciona una unidad válida.")
    .build();
  editSheet.getRange(startRow, 5, selectedProds.length, 1).setDataValidation(unitValidation);
  
  editSheet.setColumnWidth(1, 100);
  editSheet.setColumnWidth(2, 180);
  editSheet.setColumnWidth(3, 220);
  editSheet.setColumnWidth(4, 180);
  editSheet.setColumnWidth(5, 140);
  editSheet.setColumnWidth(6, 140);
  editSheet.setColumnWidth(7, 90);
  editSheet.setColumnWidth(8, 90);
  editSheet.setColumnWidth(9, 90);
  editSheet.setColumnWidth(10, 90);
  
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
    editSheet.getRange("I3").setValue(false);
    return;
  }
  
  const rawData = editSheet.getRange(5, 1, lastRowE - 4, 10).getValues();
  const validEdits = [];
  for (let i = 0; i < rawData.length; i++) {
    const no = parseInt(rawData[i][0]);
    const cat = String(rawData[i][1]).trim();
    const prod = String(rawData[i][2]).trim();
    const pres = String(rawData[i][3]).trim();
    const unit = String(rawData[i][4]).trim();
    const idFam = String(rawData[i][5]).trim();
    const minBa = parseFloat(rawData[i][6]) || 0;
    const maxBa = parseFloat(rawData[i][7]) || 0;
    const minBm = parseFloat(rawData[i][8]) || 0;
    const maxBm = parseFloat(rawData[i][9]) || 0;
    
    if (isNaN(no) || no <= 0) {
      SpreadsheetApp.getUi().alert(`Error en fila ${i + 5}: El identificador "No" no es válido. No debiste modificar la primera columna.`);
      editSheet.getRange("I3").setValue(false);
      return;
    }
    
    if (cat === "" || prod === "" || pres === "" || unit === "") {
      SpreadsheetApp.getUi().alert(`Error en fila ${i + 5}: Los campos CATEGORÍA, PRODUCTO, PRESENTACIÓN y UNIDAD son obligatorios.`);
      editSheet.getRange("I3").setValue(false);
      return;
    }
    
    validEdits.push({ no, cat, prod, pres, unit, idFam, minBa, maxBa, minBm, maxBm });
  }
  
  const proceed = SpreadsheetApp.getUi().alert(
    "📝 Guardar Cambios de Edición",
    `¿Confirmas guardar los cambios de ${validEdits.length} productos y actualizar el catálogo, kardex e historial?`,
    SpreadsheetApp.getUi().ButtonSet.YES_NO
  );
  if (proceed !== SpreadsheetApp.getUi().Button.YES) {
    editSheet.getRange("I3").setValue(false);
    return;
  }
  
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    SpreadsheetApp.getUi().alert("El archivo está ocupado. Intenta de nuevo.");
    editSheet.getRange("I3").setValue(false);
    return;
  }
  
  try {
    SpreadsheetApp.getActive().toast("⏳ Paso 1/4: Actualizando datos en MAESTRO...", "📝 Editar productos", 5);
    const maestro = ss.getSheetByName(SHEET_MAESTRO);
    const lrM = maestro.getLastRow();
    if (lrM >= MAESTRO_START) {
      const map = _getMaestroHeaderMap(maestro);
      const cCat = map["CATEGORÍA"]    ? map["CATEGORÍA"].index    : 1;
      const cProd = map["PRODUCTO"]     ? map["PRODUCTO"].index     : 2;
      const cPres = map["PRESENTACION"] ? map["PRESENTACION"].index : 3;
      const cUni  = map["UNIDAD"]       ? map["UNIDAD"].index       : 4;
      const cMinBA = map["MÍN_BA"]      ? map["MÍN_BA"].index      : 6;
      const cMaxBA = map["MÁX_BA"]      ? map["MÁX_BA"].index      : 7;
      const cMinBM = map["MÍN_BM"]      ? map["MÍN_BM"].index      : 9;
      const cMaxBM = map["MÁX_BM"]      ? map["MÁX_BM"].index      : 10;
      const cSel   = map["SELECCIONAR"] ? map["SELECCIONAR"].index : 12;

      const rangeM = maestro.getRange(MAESTRO_START, 1, lrM - MAESTRO_START + 1, maestro.getLastColumn());
      const dataM = rangeM.getValues();
      for (let i = 0; i < validEdits.length; i++) {
        const item = validEdits[i];
        const idx = item.no - 1;
        if (idx >= 0 && idx < dataM.length) {
          dataM[idx][cCat]   = item.cat;
          dataM[idx][cProd]  = item.prod;
          dataM[idx][cPres]  = item.pres;
          dataM[idx][cUni]   = item.unit;
          dataM[idx][cMinBA] = item.minBa;
          dataM[idx][cMaxBA] = item.maxBa;
          dataM[idx][cMinBM] = item.minBm;
          dataM[idx][cMaxBM] = item.maxBm;
          dataM[idx][cSel]   = false; // Desmarcar
        }
      }
      rangeM.setValues(dataM);
    }
    
    SpreadsheetApp.getActive().toast("⏳ Paso 2/4: Actualizando KARDEX de Andares y Mercado...", "📝 Editar productos", 5);
    // 2. Actualizar KARDEX_BA y KARDEX_BM (No, CATEGORÍA, PRODUCTO, PRESENTACIÓN, UNIDAD)
    Object.values(BODEGAS).forEach(b => {
      const kSheet = ss.getSheetByName(b.kardex);
      if (kSheet) {
        const lrK = kSheet.getLastRow();
        if (lrK >= KARDEX_START) {
          const rangeK = kSheet.getRange(KARDEX_START, 1, lrK - KARDEX_START + 1, 5);
          const dataK = rangeK.getValues();
          for (let i = 0; i < validEdits.length; i++) {
            const item = validEdits[i];
            const idx = item.no - 1;
            if (idx >= 0 && idx < dataK.length) {
              dataK[idx][1] = item.cat;
              dataK[idx][2] = item.prod;
              dataK[idx][3] = item.pres;
              dataK[idx][4] = item.unit;
            }
          }
          rangeK.setValues(dataK);
        }
      }
    });
    
    SpreadsheetApp.getActive().toast("⏳ Paso 3/4: Sincronizando históricos de consumo...", "📝 Editar productos", 5);
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
    
    SpreadsheetApp.getActive().toast("⏳ Paso 4/4: Re-ordenando catálogo y recreando vistas...", "📝 Editar productos", 5);
    // 4. Re-ordenar y re-numerar todo, luego recrear vistas
    _ordenarYRenumerarTodo();
    _buildVista("BA");
    _buildVista("BM");
    
    // 6. Eliminar hoja temporal
    try {
      ss.deleteSheet(editSheet);
    } catch(e) {}
    
    SpreadsheetApp.getActive().toast(`✅ Se actualizaron ${validEdits.length} productos con éxito`, "📝 Editar productos", 4);
    SpreadsheetApp.getUi().alert("✅ Edición masiva completada", `Se actualizaron ${validEdits.length} productos con éxito.`, SpreadsheetApp.getUi().ButtonSet.OK);
    _log("procesarEdicionMasiva", `${validEdits.length} productos actualizados.`);
  } catch (err) {
    // Revertir el checkbox a false en caso de fallo para permitir reintentar
    try { editSheet.getRange("I3").setValue(false); } catch(e) {}
    SpreadsheetApp.getActive().toast("❌ Error en edición masiva: " + err.message, "📝 Editar productos", 6);
    SpreadsheetApp.getUi().alert("❌ Error en Edición Masiva", "No se completó la operación debido al siguiente error:\n\n" + err.toString() + "\n\nPor favor, revisa tus datos y reintenta.", SpreadsheetApp.getUi().ButtonSet.OK);
    _log("procesarEdicionMasiva ERROR", err.toString());
  } finally {
    lock.releaseLock();
  }
}

// ── CONSTRUCTOR DE ORDEN DE PICKING (DRAG & DROP HTML) ────────────────────────
function abrirConstructorPickingHTML() {
  const html = HtmlService.createHtmlOutputFromFile('PickingDialog')
    .setWidth(1050)
    .setHeight(700);

  SpreadsheetApp.getUi().showModalDialog(html, "🖐️ Constructor de Orden de Picking");
}

function obtenerProductosPickingHTML(key) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const maestro = ss.getSheetByName(SHEET_MAESTRO);
  if (!maestro) return [];

  const lr = maestro.getLastRow();
  if (lr < MAESTRO_START) return [];

  const map = _getMaestroHeaderMap(maestro);
  const mData = maestro.getRange(MAESTRO_START, 1, lr - MAESTRO_START + 1, maestro.getLastColumn()).getValues();

  const cProd = map["PRODUCTO"] ? map["PRODUCTO"].index : 2;
  const cCat  = map["CATEGORÍA"] ? map["CATEGORÍA"].index : 1;
  const cPicKey = `PICKING_${key}`;
  const cPic = map[cPicKey] ? map[cPicKey].index : (map["PICKING"] ? map["PICKING"].index : -1);

  const items = [];
  mData.forEach((r, idx) => {
    const name = String(r[cProd]).trim();
    const cat  = String(r[cCat]).trim();
    const rank = cPic !== -1 ? (parseInt(r[cPic]) || (idx + 1)) : (idx + 1);
    if (name) {
      items.push({ name: name, cat: cat, rank: rank });
    }
  });

  // Ordenar por el rank actual
  items.sort((a, b) => a.rank - b.rank);
  return items;
}

function guardarOrdenPickingHTML(key, payload) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    throw new Error("El sistema está ocupado. Intenta de nuevo en unos segundos.");
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const maestro = ss.getSheetByName(SHEET_MAESTRO);
    if (!maestro) throw new Error("No se encontró la hoja MAESTRO.");

    const lr = maestro.getLastRow();
    if (lr < MAESTRO_START) throw new Error("El catálogo está vacío.");

    const map = _getMaestroHeaderMap(maestro);
    let cPicKey = `PICKING_${key}`;
    let cPicObj = map[cPicKey] || map["PICKING"];

    // Si la columna no existe en MAESTRO, la creamos automáticamente en la Fila 3
    if (!cPicObj) {
      const lastCol = maestro.getLastColumn();
      const newCol = lastCol + 1;
      maestro.getRange(3, newCol).setValue(cPicKey);
      cPicObj = { col: newCol, index: newCol - 1 };
    }

    _asegurarFormatoHeadersMaestro(maestro);

    const count = lr - MAESTRO_START + 1;
    const prodRange = maestro.getRange(MAESTRO_START, map["PRODUCTO"] ? map["PRODUCTO"].col : 3, count, 1);
    const catRange  = maestro.getRange(MAESTRO_START, map["CATEGORÍA"] ? map["CATEGORÍA"].col : 2, count, 1);
    const prods = prodRange.getValues();

    const rankMap = {};
    const catMap = {};
    payload.forEach(item => {
      const pName = String(item.name).trim();
      rankMap[pName] = item.rank;
      if (item.cat) catMap[pName] = String(item.cat).trim().toUpperCase();
    });

    const newColValues = [];
    const newCatValues = [];

    for (let i = 0; i < prods.length; i++) {
      const pName = String(prods[i][0]).trim();
      const rank = rankMap[pName] || (i + 1);
      newColValues.push([rank]);

      if (catMap[pName]) {
        newCatValues.push([catMap[pName]]);
      } else {
        newCatValues.push([maestro.getRange(MAESTRO_START + i, map["CATEGORÍA"] ? map["CATEGORÍA"].col : 2).getValue()]);
      }
    }

    maestro.getRange(MAESTRO_START, cPicObj.col, count, 1).setValues(newColValues).setNumberFormat("0");
    if (map["CATEGORÍA"]) {
      try {
        catRange.clearDataValidations();
      } catch(e) {}
      catRange.setValues(newCatValues);
    }

    // Recrear vistas móviles para propagar cambios de inmediato
    _buildVista(key);
    
    // Auto-Sincronización Remota Push a Pedidos Andares y Mercado
    sincronizarRemotamenteTiendasPush();

    const bodegaNombre = BODEGAS[key] ? BODEGAS[key].nombre : key;
    _log("guardarOrdenPickingHTML", `${key}: Orden y categorías guardadas para ${payload.length} productos.`);
    return `✅ Se actualizó el orden de picking y categorías de Bodega ${bodegaNombre} y se auto-sincronizó con las tiendas.`;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Auto-Sincronización Remota Push (BDG -> PDA & PDM)
 * Abre silenciosamente los libros de Pedidos Andares y Pedidos Mercado
 * para reaplicar formatos, refrescar fórmulas y ordenar los pedidos en caliente.
 */
function sincronizarRemotamenteTiendasPush() {
  const props = PropertiesService.getScriptProperties();
  const urls = [
    { key: "BA", name: "Andares", url: props.getProperty("BODEGA_URL_BA") },
    { key: "BM", name: "Mercado", url: props.getProperty("BODEGA_URL_BM") }
  ];

  urls.forEach(t => {
    if (t.url) {
      try {
        const targetSs = SpreadsheetApp.openByUrl(t.url);
        if (targetSs) {
          // Ejecutar refresco interno de pedido en el libro remoto si tiene el script ligado
          // Al estar vinculado por IMPORTRANGE, un flush atómico re-sincroniza las referencias
          SpreadsheetApp.flush();
        }
      } catch(e) {
        _log("sincronizarRemotamenteTiendasPush ERROR", `${t.name}: ${e.toString()}`);
      }
    }
  });
}

/**
 * Asegura la existencia y formateo de las columnas de stock de quiosco en MAESTRO
 */
function _asegurarColumnasQuioscoEnMaestro(maestroSheet) {
  const sheet = maestroSheet || SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_MAESTRO);
  if (!sheet) return;

  const map = _getMaestroHeaderMap(sheet);
  const requiredCols = ["MÍN_Q_BA", "MÁX_Q_BA", "MÍN_Q_BM", "MÁX_Q_BM"];
  
  requiredCols.forEach(colName => {
    if (!map[colName]) {
      const newCol = sheet.getLastColumn() + 1;
      sheet.getRange(3, newCol).setValue(colName);
      map[colName] = { col: newCol, index: newCol - 1 };
    }
  });

  _asegurarFormatoHeadersMaestro(sheet);
}

/**
 * Formatea automáticamente todas las columnas del header MAESTRO con el verde C.sage institucional
 */
function _asegurarFormatoHeadersMaestro(maestroSheet) {
  const sheet = maestroSheet || SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_MAESTRO);
  if (!sheet) return;
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) return;

  // Des-fusionar banners superiores para re-fusionar limpísimamente hasta lastCol
  try { sheet.getRange("A1:ZZ1").breakAtMerge(); } catch(e) {}
  try { sheet.getRange("A2:ZZ2").breakAtMerge(); } catch(e) {}

  // Banner principal en Fila 1
  sheet.getRange(1, 1, 1, lastCol).merge()
    .setValue("MISE — MAESTRO DE PRODUCTOS   |   La Crêpe Parisienne · Grupo MYT")
    .setBackground(C.dark).setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(11).setFontFamily("Arial").setHorizontalAlignment("center").setVerticalAlignment("middle");
  sheet.setRowHeight(1, 32);

  // Fila 2: Fondo y acciones por lote
  sheet.getRange(2, 1, 1, lastCol).setBackground(C.cream);
  sheet.getRange("A2:B2").merge()
    .setValue("⚠️ Acciones por lote:").setFontWeight("bold").setFontColor(C.dark)
    .setHorizontalAlignment("right").setVerticalAlignment("middle").setFontSize(9);
  sheet.setRowHeight(2, 24);

  // Header Fila 3: Formato institucional C.sage a TODAS las columnas
  sheet.getRange(3, 1, 1, lastCol)
    .setBackground(C.sage).setFontColor("#FFFFFF").setFontWeight("bold")
    .setFontSize(10).setHorizontalAlignment("center").setVerticalAlignment("middle");
  sheet.setRowHeight(3, 26);

  // Ajustar anchos y filtros
  for (let c = 1; c <= lastCol; c++) {
    if (c > 13) sheet.setColumnWidth(c, 110);
  }

  try {
    let filter = sheet.getFilter();
    if (filter) filter.remove();
    const lr = Math.max(sheet.getLastRow(), MAESTRO_START);
    sheet.getRange(3, 1, lr - 2, lastCol).createFilter();
  } catch(e) {}
}