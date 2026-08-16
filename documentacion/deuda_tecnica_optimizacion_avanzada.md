# 🚀 Arquitectura y Deuda Técnica a Futuro: Optimización Avanzada Suite MISE
**La Crêpe Parisienne · Grupo MYT**

Este documento registra la investigación técnica y hoja de ruta para la modernización de la infraestructura de backend en Google Apps Script (GAS) hacia una arquitectura orientada a eventos y transacciones atómicas de alto rendimiento.

---

## 📌 1. Diagnóstico del Estado Actual (`SpreadsheetApp` Clásico)

Actualmente, las operaciones de mantenimiento, reparación, setup y sincronización utilizan el servicio nativo `SpreadsheetApp`.

### Cuellos de Botella Identificados:
1. **Llamadas RPC Síncronas Secuenciales:** Cada llamada (`setValue`, `setBackground`, `setDataValidation`, `setColumnWidth`, `hideColumns`) realiza un viaje de red independiente (Roundtrip) a los servidores de Google.
2. **Latencia Acumulada en Setups / Reparaciones:** Funciones como `repararSistemaTienda()`, `repararYSincronizarSistema()` o `setupCompleto()` pueden realizar entre 50 y 200 llamadas remotas consecutivas, acumulando tiempos de ejecución de **15 a 45 segundos**.
3. **Riesgo de Timeouts:** Susceptibilidad a límites de tiempo de ejecución (6 minutos en funciones manuales / 30 segundos en triggers simples).
4. **Falta de Atomicidad:** Si una operación falla a la mitad de una reparación secuencial, la hoja puede quedar en un estado inconsistente o con formatos a medio aplicar.

---

## ⚡ 2. Propuesta de Modernización: `Sheets API v4` (Batch Updates)

Reemplazar las llamadas secuenciales de `SpreadsheetApp` por el Servicio Avanzado de Google Sheets (**Sheets API v4 REST**) mediante `Sheets.Spreadsheets.batchUpdate()`.

### Beneficios Técnicos:
* **Ejecución en 1 Sola Petición HTTP Atómica:** Todo el diseño de la hoja (valores, fórmulas, fondos, bordes, validaciones de dropdown, protecciones y anchos de columna) se calcula en memoria RAM mediante el motor V8 (~5 ms) y se despacha en una única solicitud.
* **Reducción Drástica de Tiempos:** Tiempos de construcción y reparación reducidos de **30-50 segundos a < 1.2 segundos**.
* **Consistencia Transaccional (ACID):** La actualización es de tipo *Todo o Nada*; si una regla es inválida, Google rechaza el lote completo sin corromper la interfaz operativa.

### Ejemplo de Implementación Arquitectónica:
```javascript
function repararSistemaConSheetsAPI(spreadsheetId, sheetId, payloadData) {
  const requests = [
    // 1. Inyección de Fórmulas y Valores
    {
      updateCells: {
        range: { sheetId: sheetId, startRowIndex: 3, startColumnIndex: 0 },
        rows: payloadData.rows,
        fields: "userEnteredValue,userEnteredFormat"
      }
    },
    // 2. Aplicación de Bordes y Colores en Lote
    {
      updateBorders: {
        range: { sheetId: sheetId, startRowIndex: 3, endRowIndex: payloadData.lastRow },
        top: { style: "SOLID", color: { red: 0.24, green: 0.35, blue: 0.28 } }
      }
    },
    // 3. Reglas de Validación de Datos (Dropdowns masivos)
    {
      setDataValidation: {
        range: { sheetId: sheetId, startRowIndex: 3, startColumnIndex: 1, endColumnIndex: 2 },
        rule: { condition: { type: "ONE_OF_LIST", values: [{ userEnteredValue: "REFRIGERADOS" }] }, showCustomUi: true }
      }
    }
  ];

  // Ejecución en 1 solo viaje de red
  Sheets.Spreadsheets.batchUpdate({ requests: requests }, spreadsheetId);
}
```

---

## 🌐 3. Arquitectura Orientada a Eventos (Webhooks & Web Apps)

### Problema Actual:
* La sincronización entre Bodega y Tiendas depende de `IMPORTRANGE` pasivo (latencia de 30s a 5 min) o de abrir archivos remotos con `SpreadsheetApp.openById()` (requiere compartir permisos entre usuarios).

### Solución con Webhooks:
1. **Despliegue como Web App (`doPost(e)`):** Cada tienda expone un endpoint seguro con token.
2. **Push Instantáneo (<300 ms):** Bodega despacha un `UrlFetchApp.fetch(urlTienda, { payload })` al guardar el orden de picking o confirmar el surtido.
3. **Desacoplamiento de Permisos:** El script de tienda ejecuta con permisos propios en la nube, sin necesidad de dar permisos de edición cruzados entre bodegueros y supervisores de tienda.

---

## 🧭 4. Recomendación Estratégica: ¿Cuándo Implementarlo?

### Veredicto: **Mejorar funcionalidades y flujos primero; migrar a Batch/Webhooks después.**

**Razones:**
1. **Estabilidad Actual:** La versión actual (**v1.6.4 Altair**) ya procesa el descuento en **<1 segundo** y sincroniza el picking en tiempo real.
2. **Costo de Implementación vs. Valor Inmediato:** Migrar a `Sheets API v4` requiere reescribir la capa de renderizado a sintaxis JSON de Google Sheets API y activar el servicio avanzado en la consola de GCP. Es más prudente afinar primero todas las reglas de negocio, reportes y vistas que necesitas en tienda.
3. **Momento Ideal de Migración:** Programar esta refactorización para la versión **v2.0 (Época Mayor)** una vez que el catálogo y las operaciones de todas las sucursales estén completamente estabilizados.
