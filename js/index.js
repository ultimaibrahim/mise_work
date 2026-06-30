// MISE Application Controller (Mobile-First & Didactic Mode)

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // Setup theme
  initTheme();
  
  // Register theme toggle click
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }

  // Set initial view from URL hash or default to landing
  const hash = window.location.hash || '#/landing';
  const initialView = hash.replace('#/', '');
  switchMainView(initialView);

  // Set up search in manual
  const searchInput = document.getElementById('manual-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', handleManualSearch);
  }

  // Load first GAS info automatically when sheets tab is loaded
  triggerGASInfo('maestro-activo');
});

// --- THEME STATE & TOGGLE ---
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
  }
  syncThemeIcons();
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }
  syncThemeIcons();
}

function syncThemeIcons() {
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    const isDark = document.documentElement.classList.contains('dark');
    btn.innerHTML = isDark 
      ? `<i data-lucide="sun" class="w-5 h-5 text-oro"></i>` 
      : `<i data-lucide="moon" class="w-5 h-5 text-verde"></i>`;
    if (typeof lucide !== 'undefined') {
      lucide.createIcons({ node: btn });
    }
  }
}

// --- VIEW NAVIGATION ---
window.switchMainView = function(viewId) {
  const views = ['landing', 'sheets', 'manual'];
  if (!views.includes(viewId)) viewId = 'landing';

  // Toggle views
  views.forEach(v => {
    const el = document.getElementById(`${v}-view`);
    if (el) {
      if (v === viewId) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }
  });

  // Update URL hash
  window.location.hash = `#/${viewId}`;

  // Update navigation buttons active state
  const buttons = document.querySelectorAll('nav button');
  buttons.forEach(btn => {
    const onclickStr = btn.getAttribute('onclick') || '';
    if (onclickStr.includes(viewId)) {
      btn.classList.add('text-oro');
      btn.classList.remove('text-text-muted');
    } else {
      btn.classList.remove('text-oro');
      btn.classList.add('text-text-muted');
    }
  });
};

window.navigateTo = function(viewId) {
  switchMainView(viewId);
};

// --- SPREADSHEET SHEETS TOGGLE ---
window.switchActiveSheet = function(sheetKey) {
  // Hide all mock tables
  const tables = ['maestro', 'pedido', 'kardex'];
  tables.forEach(t => {
    const tbl = document.getElementById(`mock-table-${t}`);
    if (tbl) {
      if (t === sheetKey) {
        tbl.classList.remove('hidden');
      } else {
        tbl.classList.add('hidden');
      }
    }
  });

  // Update tabs visual style
  const tabs = document.querySelectorAll('.sheet-tab');
  tabs.forEach(tab => {
    const onclickStr = tab.getAttribute('onclick') || '';
    if (onclickStr.includes(sheetKey)) {
      tab.classList.add('border-oro', 'text-oro');
      tab.classList.remove('border-transparent', 'text-text-muted');
    } else {
      tab.classList.remove('border-oro', 'text-oro');
      tab.classList.add('border-transparent', 'text-text-muted');
    }
  });

  // Update custom filename
  const filename = document.getElementById('current-sheet-filename');
  if (filename) {
    if (sheetKey === 'maestro') {
      filename.textContent = 'MISE — Catálogo Bodega';
      triggerGASInfo('maestro-activo');
    } else if (sheetKey === 'pedido') {
      filename.textContent = 'MISE — Pedido Diario (BA)';
      triggerGASInfo('pedido-pedir');
    } else if (sheetKey === 'kardex') {
      filename.textContent = 'MISE — Kardex Bodega';
      triggerGASInfo('kardex-saldo');
    }
  }
};

// --- GAS AUTOMATION INFORMATION MAPPING ---
const GAS_METADATA = {
  'menu-mise': {
    file: 'miseAuthBDG.gs',
    func: 'onOpen()',
    lines: 'Líneas 69-95',
    desc: 'Función disparadora que construye la barra de menús personalizada "⚙️ Mise" en Google Sheets cuando se abre la hoja de cálculo. Carga los accesos a Setup Completo, Avanzar Semana y Cargas Masivas.',
    code: `function onOpen() {\n  var ui = SpreadsheetApp.getUi();\n  ui.createMenu('⚙️ Mise')\n    .addItem('Setup completo', 'setupCompleto')\n    .addItem('Avanzar semana', 'avanzarSemana')\n    .addToUi();\n}`
  },
  'maestro-activo': {
    file: 'miseAuthBDG.gs',
    func: 'onEdit(e) -> Catálogo',
    lines: 'Líneas 98-132',
    desc: 'Trigger de edición que intercepta cuando se cambia el valor de la columna ACTIVO. Si cambia a NO, el script desactiva el insumo y lo remueve en caliente de la visualización de los pedidos móviles de las sucursales.',
    code: `function onEdit(e) {\n  var sheet = e.range.getSheet();\n  if (sheet.getName() === "MAESTRO" && e.range.getColumn() === 6) {\n    var isActivo = e.value === "SÍ";\n    _actualizarEstadoCatalogo(e.range.getRow(), isActivo);\n  }\n}`
  },
  'maestro-seleccionar': {
    file: 'miseAuthBDG.gs',
    func: 'desactivarSeleccionadosMaestro()',
    lines: 'Líneas 1837-1875',
    desc: 'Función por lotes vinculada a los checkboxes. Escanea todas las filas marcadas con la casilla en TRUE y ejecuta de manera masiva la desactivación del stock.',
    code: `function desactivarSeleccionadosMaestro() {\n  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("MAESTRO");\n  // Escanea celdas seleccionadas y desactiva productos...\n}`
  },
  'pedido-pedir': {
    file: 'miseAuthPDA.gs',
    func: 'onEdit(e) -> Tienda',
    lines: 'Líneas 226-290',
    desc: 'Interviene de forma inmediata al escribir en la columna PEDIR. Verifica la hora y el estado de la celda de confirmación de pedido para calcular si corresponde a un surtido regular o una adición tardía.',
    code: `function onEdit(e) {\n  var sheet = e.range.getSheet();\n  if (sheet.getName() === "PEDIDO DIARIO" && e.range.getColumn() === 3) {\n    _evaluarEstadoPedido(e);\n  }\n}`
  },
  'pedido-adicion': {
    file: 'miseAuthPDA.gs',
    func: 'onEdit(e) -> Alertas',
    lines: 'Líneas 300-345',
    desc: 'Si el encargado introduce cantidades de forma tardía (después de que el pedido fue mandado a bodega), esta rutina resalta la celda en naranja bajo el estado de ADICIÓN para avisar al personal de bodega.',
    code: `// Si el pedido ya está bloqueado/enviado:\nif (status === "ENVIADO") {\n  e.range.setBackground("#FFE0B2"); // Naranja\n  sheet.getRange(row, 5).setValue("🚨 ADICIÓN");\n}`
  },
  'kardex-saldo': {
    file: 'miseAuthBDG.gs',
    func: '_buildKardex() / avanzarSemana()',
    lines: 'Líneas 508-540',
    desc: 'Dibuja el Kardex calculando en tiempo real las entradas diarias y salidas físicas. El saldo remanente se archiva horizontalmente de forma automática al avanzar la semana.',
    code: `function _buildKardex(sheet, nombre) {\n  // Genera fórmulas condicionales y fórmulas de saldo:\n  // Saldo = Inventario Inicial + Entradas - Salidas\n}`
  }
};

window.triggerGASInfo = function(key) {
  const data = GAS_METADATA[key];
  if (!data) return;

  const fileEl = document.getElementById('gas-script-file');
  const nameEl = document.getElementById('gas-function-name');
  const descEl = document.getElementById('gas-function-desc');
  const codeBlock = document.getElementById('gas-code-block');
  const lineCount = document.getElementById('gas-line-count');
  const codeContainer = document.getElementById('gas-code-container');

  if (fileEl) fileEl.textContent = data.file;
  if (nameEl) nameEl.textContent = data.func;
  if (descEl) descEl.textContent = data.desc;
  if (lineCount) lineCount.textContent = data.lines;
  
  if (codeBlock) {
    codeBlock.textContent = data.code;
  }
  
  if (codeContainer) {
    codeContainer.classList.remove('hidden');
  }

  // Highlight selected cell styling dynamically
  const cells = document.querySelectorAll('.mock-sheet-table td');
  cells.forEach(c => c.classList.remove('pulse-gold'));
  
  const target = event ? event.currentTarget : null;
  if (target) {
    target.classList.add('pulse-gold');
  }
};

// --- TECHNICAL MANUAL SEARCH ---
function handleManualSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  const sections = document.querySelectorAll('.manual-section');

  sections.forEach(sec => {
    const terms = sec.getAttribute('data-search-terms') || '';
    const title = sec.querySelector('h3').textContent.toLowerCase();
    const content = sec.querySelector('p').textContent.toLowerCase();

    if (query === '' || terms.includes(query) || title.includes(query) || content.includes(query)) {
      sec.style.display = 'block';
    } else {
      sec.style.display = 'none';
    }
  });
}
