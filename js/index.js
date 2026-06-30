// MISE Application Controller (Mobile-First & Clean Documentation Mode)

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
  const views = ['landing', 'manual', 'about'];
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

// --- ACCORDION EXPANSION ---
window.toggleAccordion = function(id) {
  const content = document.getElementById(`content-${id}`);
  const arrow = document.getElementById(`arrow-${id}`);
  
  if (content && arrow) {
    const isHidden = content.classList.contains('hidden');
    
    // Close all accordions first for clean visual focus
    const allContents = document.querySelectorAll('.accordion-content');
    const allArrows = document.querySelectorAll('.accordion-item button i');
    
    allContents.forEach(c => c.classList.add('hidden'));
    allArrows.forEach(a => a.style.transform = 'rotate(0deg)');

    if (isHidden) {
      content.classList.remove('hidden');
      arrow.style.transform = 'rotate(180deg)';
      // Reset contextual helps
      if (id === 'pedidos') {
        showHelp('pedidos', 'pedir');
      } else if (id === 'bodegas') {
        showHelp('bodegas', 'activo-check');
      }
    }
  }
};

// --- TOGGLE MOCK SHEET TABS ---
window.toggleSubSheet = function(sheetKey) {
  if (sheetKey === 'ped-diario' || sheetKey === 'sur-rapido') {
    const isDiario = sheetKey === 'ped-diario';
    document.getElementById('sub-table-ped-diario').classList.toggle('hidden', !isDiario);
    document.getElementById('sub-table-sur-rapido').classList.toggle('hidden', isDiario);
    
    // Toggle active tab classes
    document.getElementById('tab-ped-diario').className = isDiario 
      ? 'px-3 py-1.5 border-r border-border bg-surface text-oro' 
      : 'px-3 py-1.5 border-r border-border text-text-muted';
    document.getElementById('tab-sur-rapido').className = !isDiario 
      ? 'px-3 py-1.5 bg-surface text-oro' 
      : 'px-3 py-1.5 text-text-muted';
      
    showHelp('pedidos', isDiario ? 'pedir' : 'surtido-check');
  } else if (sheetKey === 'maestro' || sheetKey === 'kardex') {
    const isMaestro = sheetKey === 'maestro';
    document.getElementById('sub-table-maestro').classList.toggle('hidden', !isMaestro);
    document.getElementById('sub-table-kardex').classList.toggle('hidden', isMaestro);
    
    // Toggle active tab classes
    document.getElementById('tab-maestro').className = isMaestro 
      ? 'px-3 py-1.5 border-r border-border bg-surface text-oro' 
      : 'px-3 py-1.5 border-r border-border text-text-muted';
    document.getElementById('tab-kardex').className = !isMaestro 
      ? 'px-3 py-1.5 bg-surface text-oro' 
      : 'px-3 py-1.5 text-text-muted';
      
    showHelp('bodegas', isMaestro ? 'activo-check' : 'saldo-real');
  }
};

// --- CONTEXTUAL HELP METADATA ---
const CONTEXT_HELP = {
  pedidos: {
    'pedir': {
      title: 'Columna Pedir (Cantidad a solicitar)',
      desc: 'Celda rellenable por el encargado de tienda. Permite ingresar cantidades numéricas con hasta 4 posiciones decimales si se requieren gramos u onzas. La fila se resalta automáticamente en amarillo suave al capturar para que el operario visualice fácilmente qué productos lleva seleccionados.'
    },
    'adicion': {
      title: 'Alerta de Adición Tardía',
      desc: 'Si agregas o modificas una cantidad en la sucursal después de la hora de bloqueo de pedidos, la celda de estatus cambia automáticamente a naranja y muestra el texto "🚨 ADICIÓN". Esto sirve para alertar de inmediato a bodega que se trata de un pedido de último minuto.'
    },
    'surtido-check': {
      title: 'Marcación de Surtido Rápido',
      desc: 'Diseñado específicamente para pantallas de celulares. Permite al personal en la tienda marcar directamente con checks si la mercancía del camión llegó completa o inexistente. Evita el ingreso manual de números en pantallas móviles, acelerando la conciliación de mermas.'
    }
  },
  bodegas: {
    'activo-check': {
      title: 'Casilla Activo (Control de Catálogo)',
      desc: 'Permite definir si un insumo está disponible para las sucursales. Al cambiar la celda de SÍ a NO, el producto se oculta en caliente de las pantallas móviles de las tiendas, previniendo que los encargados realicen solicitudes de insumos agotados o descontinuados.'
    },
    'min-max': {
      title: 'Control de Mínimos y Máximos',
      desc: 'Establece los parámetros de stock recomendados para la sucursal. Estos números alimentan el semáforo inteligente de inventario para alertar visualmente sobre la falta de stock o el riesgo de merma por exceso de mercancía.'
    },
    'acciones-check': {
      title: 'Checkboxes de Acción Masiva',
      desc: 'Permiten seleccionar múltiples productos del catálogo al mismo tiempo. Al marcar los productos, el bodeguero puede utilizar el menú superior para desactivarlos, reactivarlos o eliminarlos en un solo paso.'
    },
    'descontinuado': {
      title: 'Producto Deshabilitado',
      desc: 'Los productos desactivados (con estatus NO en Activo) se atenúan con color gris en la hoja del administrador. Esto le permite llevar un control histórico sin saturar la vista operativa.'
    },
    'saldo-real': {
      title: 'Cálculo Automático de Saldo',
      desc: 'Muestra el stock restante calculado al instante con la fórmula de (Inventario Inicial + Entradas del día - Salidas del día). Garantiza que las cifras físicas coincidan con el libro digital en todo momento.'
    }
  }
};

window.showHelp = function(moduleKey, itemKey) {
  const data = CONTEXT_HELP[moduleKey] ? CONTEXT_HELP[moduleKey][itemKey] : null;
  if (!data) return;

  const titleEl = document.getElementById(`help-title-${moduleKey}`);
  const descEl = document.getElementById(`help-desc-${moduleKey}`);
  
  if (titleEl) titleEl.textContent = data.title;
  if (descEl) descEl.textContent = data.desc;

  // Add click highlights to cells
  const allCells = document.querySelectorAll('.accordion-content td');
  allCells.forEach(cell => cell.classList.remove('pulse-gold'));

  if (event && event.currentTarget) {
    event.currentTarget.classList.add('pulse-gold');
  }
};

// --- MANUAL SEARCH ---
function handleManualSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  const accordionItems = document.querySelectorAll('.accordion-item');

  accordionItems.forEach(item => {
    const title = item.querySelector('button').textContent.toLowerCase();
    const content = item.querySelector('.accordion-content').textContent.toLowerCase();

    if (query === '' || title.includes(query) || content.includes(query)) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  });
}
