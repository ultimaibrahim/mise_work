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
  const views = ['landing', 'manual', 'manual-pedidos', 'manual-bodega', 'about'];
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

  // Update navigation buttons active state (highlight Manual button when in sub-pages)
  const buttons = document.querySelectorAll('nav button');
  buttons.forEach(btn => {
    const onclickStr = btn.getAttribute('onclick') || '';
    let isActive = false;
    
    if (viewId.startsWith('manual') && onclickStr.includes('manual')) {
      isActive = true;
    } else if (onclickStr.includes(viewId)) {
      isActive = true;
    }

    if (isActive) {
      btn.classList.add('text-oro');
      btn.classList.remove('text-text-muted');
    } else {
      btn.classList.remove('text-oro');
      btn.classList.add('text-text-muted');
    }
  });

  // Scroll window to top on view switch
  window.scrollTo(0, 0);

  // Initialize view contextual help
  if (viewId === 'manual-pedidos') {
    showHelp('pedidos', 'pedir');
  } else if (viewId === 'manual-bodega') {
    showHelp('bodegas', 'activo-check');
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
      
    showHelp('pedidos', isDiario ? 'pedir' : 'surtido-check-complete');
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
      title: 'Columna PEDIR (Cantidad de Pedido)',
      desc: 'Celda rellenable por el encargado de tienda. Permite ingresar cantidades de insumos. La fila se resalta automáticamente en amarillo suave para verificar visualmente qué productos han sido seleccionados.'
    },
    'adicion': {
      title: 'Alerta de Adición Tardía',
      desc: 'Si agregas o modificas una cantidad en la tienda después de que el pedido fue mandado a bodega, la celda de estatus cambia de forma automática a naranja con la alerta "🚨 ADICIÓN". Indica al surtidor de bodega que es un pedido de último minuto.'
    },
    'surtido-check-complete': {
      title: 'Check Completo (Surtido)',
      desc: 'Casilla táctil para el encargado. Se marca si la cantidad de insumos que llegó en el camión coincide exactamente con lo pedido. Colorea la fila de verde de forma automática.'
    },
    'surtido-check-missing': {
      title: 'Check Inexistente (Surtido)',
      desc: 'Casilla táctil para registrar que el insumo no fue entregado por bodega. El sistema descuenta el valor del pedido activo.'
    }
  },
  bodegas: {
    'activo-check': {
      title: 'Casilla Activo (Control de Catálogo)',
      desc: 'Define si un insumo está habilitado para pedidos. Si cambia a NO, el producto se oculta de inmediato de las pantallas de las tiendas, previniendo pedidos erróneos de productos agotados.'
    },
    'min-max': {
      title: 'Niveles de Mínimo y Máximo',
      desc: 'Establece los niveles de inventario de seguridad y sobrestock para la sucursal. Estos límites regulan el semáforo inteligente de inventario.'
    },
    'acciones-check': {
      title: 'Checkboxes de Selección Masiva',
      desc: 'Permite seleccionar múltiples productos de la hoja MAESTRO para aplicar cambios masivos desde el menú superior (como activar, desactivar o eliminar del catálogo en lote).'
    },
    'descontinuado': {
      title: 'Producto Descontinuado',
      desc: 'Cuando un producto se desactiva (Activo = NO), su fila se atenúa en gris para mantener el histórico de forma visual sin sobrecargar el catálogo activo de las tiendas.'
    },
    'saldo-real': {
      title: 'Saldo en Kardex',
      desc: 'Muestra el stock físico resultante calculado con la fórmula: (Inventario Inicial + Entradas por compras - Salidas hacia tiendas). Garantiza coincidencia física y digital.'
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
  const allCells = document.querySelectorAll('.mock-sheet-table td');
  allCells.forEach(cell => cell.classList.remove('pulse-gold'));

  if (event && event.currentTarget) {
    event.currentTarget.classList.add('pulse-gold');
  }
};

// --- MANUAL SEARCH ---
function handleManualSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  const menuCards = document.querySelectorAll('.manual-menu-card');

  menuCards.forEach(card => {
    const terms = card.getAttribute('data-search-terms') || '';
    const title = card.querySelector('h3').textContent.toLowerCase();
    const content = card.querySelector('p').textContent.toLowerCase();

    if (query === '' || terms.includes(query) || title.includes(query) || content.includes(query)) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}
