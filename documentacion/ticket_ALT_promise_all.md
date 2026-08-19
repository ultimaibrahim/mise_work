# ⚡ Ticket Técnico ALT-101: Prototipo Multi-Hilo Concurrente con `Promise.all`
**Proyecto**: Suite MISE · Bodega General & Tiendas Remotas  
**Autor de la Propuesta**: Ibrahim García  
**Tipo**: Spike / Prototipo de Rendimiento Extremo  
**Estado**: Listo para pruebas en laboratorio  

---

## 🎯 Objetivo y Contexto

Probar el modelo de **ejecución multi-hilo en la nube de Google** orquestado desde el diálogo web (`PickingDialog.html`) mediante `Promise.all()`, dividiendo la persistencia masiva en dos fases:
1. **Fase 1 (Atómica Local)**: Mutaciones de Altas, Ediciones y Re-ordenamiento en la hoja `MAESTRO`.
2. **Fase 2 (Concurrente Paralela)**: Disparo simultáneo de 4 contenedores V8 independientes para actualizar `KARDEX_BA`, `KARDEX_BM`, `PDA (Andares)` y `PDM (Mercado)`.

---

## 💻 1. Código del Frontend (`PickingDialog.html`)

Reemplazar la función de guardado en el diálogo web con este orquestador asíncrono:

```javascript
// ─────────────────────────────────────────────────────────────────────────────
// 🚀 ORQUESTADOR ASÍNCRONO MULTI-HILO (FRONTEND PROMISE.ALL)
// ─────────────────────────────────────────────────────────────────────────────

// Helper promisificador para llamadas nativas a google.script.run
function runServerAsync(fnName, ...args) {
  return new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler(reject)[fnName](...args);
  });
}

async function guardarPowerhouseCompleto() {
  const btnSave = document.getElementById("btnSave");
  const spinner = document.getElementById("spinner");
  const btnText = document.getElementById("btnSaveText");

  btnSave.disabled = true;
  spinner.style.display = "inline-block";
  btnText.innerText = "⚡ Guardando Catálogo (Fase 1)...";

  const t0 = performance.now();

  try {
    const altasValidas = nuevosItemsAlta.filter(it => it.name.trim() !== "");
    const payload = {
      nuevos: altasValidas,
      ediciones: Array.from(itemsEditadosMap.values()),
      eliminados: Array.from(itemsEliminados),
      picking: rawItems.map((it, idx) => ({ name: it.name, rank: idx + 1, cat: it.cat }))
    };

    // ── FASE 1: Transacción Atómica en MAESTRO (Secuencial Crítico) ──────────
    await runServerAsync("workerGuardarMaestro", currentKey, payload);

    btnText.innerText = "⚡ Sincronizando Bodegas y Tiendas en Paralelo (Fase 2)...";

    // ── FASE 2: Multi-Hilo Paralelo Concurrente (4 Workers Simultáneos) ──────
    await Promise.all([
      runServerAsync("workerSyncKardexYVista", "BA"),
      runServerAsync("workerSyncKardexYVista", "BM"),
      runServerAsync("workerPushTiendaRemota", "BA"),
      runServerAsync("workerPushTiendaRemota", "BM")
    ]);

    const totalSeconds = ((performance.now() - t0) / 1000).toFixed(1);
    onSaveSuccess(`⚡ Guardado y sincronizado con éxito en ${totalSeconds}s (4 Workers concurrentes)`);
  } catch (err) {
    onSaveFailure(err);
  } finally {
    btnSave.disabled = false;
    spinner.style.display = "none";
    btnText.innerText = "✦ Guardar y Aplicar Cambios";
  }
}
```

---

## ⚙️ 2. Código del Backend (`miseAuthBDG.gs`)

Endpoints independientes en Apps Script para recibir las peticiones concurrentes:

```javascript
// ════════════════════════════════════════════════════════════════════════════
// 🚀 MICRO-WORKERS PARALELOS CONCURRENTES (BACKEND)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Worker A: Guarda atómicamente Altas, Ediciones y Picking en MAESTRO (~1.2s)
 */
function workerGuardarMaestro(key, payload) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error("Bodega ocupada por otro proceso. Reintenta.");

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const maestro = ss.getSheetByName(SHEET_MAESTRO);
    if (!maestro) throw new Error("No existe la hoja MAESTRO");

    _asegurarColumnasQuioscoEnMaestro(maestro);
    const lrM = maestro.getLastRow();
    const map = _getMaestroHeaderMap(maestro);

    let cPicKey = `PICKING_${key}`;
    let cPicObj = map[cPicKey] || map["PICKING"];
    if (!cPicObj) {
      const lastCol = maestro.getLastColumn();
      const newCol = lastCol + 1;
      maestro.getRange(3, newCol).setValue(cPicKey);
      cPicObj = { col: newCol, index: newCol - 1 };
    }
    _asegurarFormatoHeadersMaestro(maestro);

    // 1. Procesar Altas
    const prodsNuevos = payload.nuevos || [];
    if (prodsNuevos.length > 0) {
      const lastColM = maestro.getLastColumn();
      const maestroNewRows = [];
      const bgsNew = [];

      for (let i = 0; i < prodsNuevos.length; i++) {
        const np = prodsNuevos[i];
        const newNo = lrM - MAESTRO_START + 1 + i + 1;
        const cat = String(np.cat || "ABARROTES").trim().toUpperCase();
        const prod = String(np.name || np.prod || "").trim();
        const pres = String(np.pres || "").trim();
        const unit = String(np.unit || "pza").trim().toLowerCase();
        const minBa = parseFloat(np.minBa) || 0;
        const maxBa = parseFloat(np.maxBa) || 0;
        const minBm = parseFloat(np.minBm) || 0;
        const maxBm = parseFloat(np.maxBm) || 0;
        const minQBa = parseFloat(np.minQBa) || 0;
        const maxQBa = parseFloat(np.maxQBa) || 0;
        const minQBm = parseFloat(np.minQBm) || 0;
        const maxQBm = parseFloat(np.maxQBm) || 0;

        if (!prod) continue;

        const rowM = new Array(lastColM).fill("");
        if (map["NO"])           rowM[map["NO"].index]           = newNo;
        if (map["CATEGORÍA"])    rowM[map["CATEGORÍA"].index]    = cat;
        if (map["PRODUCTO"])     rowM[map["PRODUCTO"].index]     = prod;
        if (map["PRESENTACION"]) rowM[map["PRESENTACION"].index] = pres;
        if (map["UNIDAD"])       rowM[map["UNIDAD"].index]       = unit;
        if (map["ACTIVO"])       rowM[map["ACTIVO"].index]       = "SÍ";
        if (map["MÍN_BA"])      rowM[map["MÍN_BA"].index]      = minBa;
        if (map["MÁX_BA"])      rowM[map["MÁX_BA"].index]      = maxBa;
        if (map["MÍN_BM"])      rowM[map["MÍN_BM"].index]      = minBm;
        if (map["MÁX_BM"])      rowM[map["MÁX_BM"].index]      = maxBm;
        if (map["MÍN_Q_BA"])    rowM[map["MÍN_Q_BA"].index]    = minQBa;
        if (map["MÁX_Q_BA"])    rowM[map["MÁX_Q_BA"].index]    = maxQBa;
        if (map["MÍN_Q_BM"])    rowM[map["MÍN_Q_BM"].index]    = minQBm;
        if (map["MÁX_Q_BM"])    rowM[map["MÁX_Q_BM"].index]    = maxQBm;
        if (map["SELECCIONAR"])  rowM[map["SELECCIONAR"].index]  = false;
        if (map["PICKING_BA"])   rowM[map["PICKING_BA"].index]   = newNo;
        if (map["PICKING_BM"])   rowM[map["PICKING_BM"].index]   = newNo;

        maestroNewRows.push(rowM);
        const rowColor = (newNo % 2 === 1) ? C.rowA : C.rowB;
        bgsNew.push(Array(lastColM).fill(rowColor));
      }

      if (maestroNewRows.length > 0) {
        const startRowM = maestro.getLastRow() + 1;
        maestro.getRange(startRowM, 1, maestroNewRows.length, lastColM).setValues(maestroNewRows);
        maestro.getRange(startRowM, 1, maestroNewRows.length, lastColM).setBackgrounds(bgsNew);
      }
    }

    // 2. Procesar Ediciones y Desactivaciones
    const ediciones = payload.ediciones || [];
    const eliminados = payload.eliminados || [];
    if (ediciones.length > 0 || eliminados.length > 0) {
      const lrCurr = maestro.getLastRow();
      const countCurr = lrCurr - MAESTRO_START + 1;
      const mRange = maestro.getRange(MAESTRO_START, 1, countCurr, maestro.getLastColumn());
      const mData = mRange.getValues();

      const editMap = {};
      ediciones.forEach(e => {
        const pKey = String(e.originalName || e.name || "").trim().toUpperCase();
        if (pKey) editMap[pKey] = e;
      });

      const delSet = new Set(eliminados.map(n => String(n).trim().toUpperCase()));

      for (let i = 0; i < mData.length; i++) {
        const prodName = String(mData[i][map["PRODUCTO"] ? map["PRODUCTO"].index : 2]).trim().toUpperCase();
        if (delSet.has(prodName)) {
          if (map["ACTIVO"]) mData[i][map["ACTIVO"].index] = "NO";
          continue;
        }

        const ed = editMap[prodName];
        if (ed) {
          if (ed.cat !== undefined && map["CATEGORÍA"])    mData[i][map["CATEGORÍA"].index] = String(ed.cat).trim().toUpperCase();
          if (ed.name !== undefined && map["PRODUCTO"])    mData[i][map["PRODUCTO"].index] = String(ed.name).trim();
          if (ed.pres !== undefined && map["PRESENTACION"]) mData[i][map["PRESENTACION"].index] = String(ed.pres).trim();
          if (ed.unit !== undefined && map["UNIDAD"])       mData[i][map["UNIDAD"].index] = String(ed.unit).trim().toLowerCase();
          if (ed.minBa !== undefined && map["MÍN_BA"])     mData[i][map["MÍN_BA"].index] = parseFloat(ed.minBa) || 0;
          if (ed.maxBa !== undefined && map["MÁX_BA"])     mData[i][map["MÁX_BA"].index] = parseFloat(ed.maxBa) || 0;
          if (ed.minBm !== undefined && map["MÍN_BM"])     mData[i][map["MÍN_BM"].index] = parseFloat(ed.minBm) || 0;
          if (ed.maxBm !== undefined && map["MÁX_BM"])     mData[i][map["MÁX_BM"].index] = parseFloat(ed.maxBm) || 0;
          if (ed.minQBa !== undefined && map["MÍN_Q_BA"]) mData[i][map["MÍN_Q_BA"].index] = parseFloat(ed.minQBa) || 0;
          if (ed.maxQBa !== undefined && map["MÁX_Q_BA"]) mData[i][map["MÁX_Q_BA"].index] = parseFloat(ed.maxQBa) || 0;
          if (ed.minQBm !== undefined && map["MÍN_Q_BM"]) mData[i][map["MÍN_Q_BM"].index] = parseFloat(ed.minQBm) || 0;
          if (ed.maxQBm !== undefined && map["MÁX_Q_BM"]) mData[i][map["MÁX_Q_BM"].index] = parseFloat(ed.maxQBm) || 0;
          if (ed.activo !== undefined && map["ACTIVO"])    mData[i][map["ACTIVO"].index] = ed.activo ? "SÍ" : "NO";
        }
      }
      mRange.setValues(mData);
    }

    // 3. Procesar Picking
    const lrFinal = maestro.getLastRow();
    const countFinal = lrFinal - MAESTRO_START + 1;
    const prodsFinal = maestro.getRange(MAESTRO_START, map["PRODUCTO"] ? map["PRODUCTO"].col : 3, countFinal, 1).getValues();
    const rankMap = {};
    const catMap = {};
    const pickingList = payload.picking || payload;

    if (Array.isArray(pickingList)) {
      pickingList.forEach((item, idx) => {
        const pName = String(item.name).trim();
        rankMap[pName] = item.rank || (idx + 1);
        if (item.cat) catMap[pName] = String(item.cat).trim().toUpperCase();
      });
    }

    if (cPicObj) {
      const newColValues = [];
      const newCatValues = [];
      const currentCats = map["CATEGORÍA"] ? maestro.getRange(MAESTRO_START, map["CATEGORÍA"].col, countFinal, 1).getValues() : [];

      for (let i = 0; i < prodsFinal.length; i++) {
        const pName = String(prodsFinal[i][0]).trim();
        const rank = rankMap[pName] || (i + 1);
        newColValues.push([rank]);

        if (catMap[pName]) {
          newCatValues.push([catMap[pName]]);
        } else {
          newCatValues.push([currentCats[i] ? currentCats[i][0] : ""]);
        }
      }

      maestro.getRange(MAESTRO_START, cPicObj.col, countFinal, 1).setValues(newColValues).setNumberFormat("0");
      if (map["CATEGORÍA"]) {
        try { maestro.getRange(MAESTRO_START, map["CATEGORÍA"].col, countFinal, 1).clearDataValidations(); } catch(e) {}
        maestro.getRange(MAESTRO_START, map["CATEGORÍA"].col, countFinal, 1).setValues(newCatValues);
      }
    }

    // Reordenar si hubo altas
    if (prodsNuevos.length > 0) {
      _ordenarYRenumerarTodo();
    }

    return { status: "OK", timestamp: Date.now() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Worker B & C: Sincroniza KARDEX y VISTA_MOVIL de una bodega específica (~1.5s)
 */
function workerSyncKardexYVista(key) {
  _buildVista(key);
  return { key, status: "OK" };
}

/**
 * Worker D & E: Sincroniza una tienda remota específica (Andares o Mercado) en paralelo (~1.8s)
 */
function workerPushTiendaRemota(key) {
  sincronizarRemotamenteTiendasPush(key);
  return { key, status: "OK" };
}
```

---

## 🔬 Protocolo de Prueba Recomendado
1. Copiar ambos bloques de código en un script de pruebas o rama de staging.
2. Asegurar que **ambos archivos (HTML y .gs) estén actualizados al mismo tiempo**.
3. Realizar un guardado desde el diálogo y verificar en el log de Apps Script (`Ejecuciones`) cómo los 4 workers de Fase 2 corren de forma simultánea.
