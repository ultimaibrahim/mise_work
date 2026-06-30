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

  // Hamburger Menu Drawer Events
  const menuBtn = document.getElementById('menu-btn');
  const menuCloseBtn = document.getElementById('menu-close-btn');
  const menuDrawer = document.getElementById('menu-drawer');
  const backdrop = document.getElementById('drawer-backdrop');

  if (menuBtn && menuDrawer) {
    menuBtn.addEventListener('click', openMenuDrawer);
  }
  if (menuCloseBtn) {
    menuCloseBtn.addEventListener('click', closeMenuDrawer);
  }
  if (backdrop) {
    backdrop.addEventListener('click', closeMenuDrawer);
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

// --- HAMBURGER DRAWER LÓGICA ---
function openMenuDrawer() {
  const drawer = document.getElementById('menu-drawer');
  if (drawer) {
    drawer.classList.remove('hidden');
    setTimeout(() => {
      const inner = drawer.querySelector('.relative');
      if (inner) inner.classList.remove('-translate-x-full');
    }, 10);
  }
}

function closeMenuDrawer() {
  const drawer = document.getElementById('menu-drawer');
  if (drawer) {
    const inner = drawer.querySelector('.relative');
    if (inner) inner.classList.add('-translate-x-full');
    setTimeout(() => {
      drawer.classList.add('hidden');
    }, 300);
  }
}

window.drawerNavigate = function(viewId) {
  closeMenuDrawer();
  switchMainView(viewId);
};

// --- VIEW NAVIGATION ---
window.switchMainView = function(viewId) {
  const views = ['landing', 'manual', 'manual-pedidos', 'manual-bodega', 'tips', 'about'];
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
      desc: 'Celda editable por el encargado de tienda. Registra las cantidades deseadas para reabastecer el punto de venta. Al capturar, la fila completa se sombrea en amarillo suave para corroborar visualmente la lista.'
    },
    'adicion': {
      title: 'Alerta de Adición Tardía',
      desc: 'Si agregas o modificas una cantidad en la tienda después de que el pedido fue consolidado, la celda de estatus cambia de forma automática a naranja con la alerta "🚨 ADICIÓN". Indica al surtidor de bodega que es un pedido de último minuto.'
    },
    'surtido-check-complete': {
      title: 'Check Completo (Surtido)',
      desc: 'Casilla táctil para marcar si la cantidad de insumos recibida coincide al 100% con lo solicitado originalmente. Rellena la cantidad real recibida de forma automática y cambia el estatus de la fila a verde.'
    },
    'surtido-check-missing': {
      title: 'Check Inexistente (Surtido)',
      desc: 'Casilla táctil para indicar que el producto no fue entregado por bodega. Registra automáticamente existencias de recepción en cero para auditoría de faltantes.'
    }
  },
  bodegas: {
    'activo-check': {
      title: 'Casilla Activo (Catálogo Maestro)',
      desc: 'Controla si el insumo está disponible para los pedidos de las tiendas. Al cambiar a NO, el producto se oculta de inmediato de las pantallas de los encargados, evitando pedidos erróneos de insumos agotados.'
    },
    'min-max': {
      title: 'Niveles Mínimo y Máximo',
      desc: 'Rangos de stock requeridos para la sucursal. Estos parámetros son la base para calcular las alertas del semáforo inteligente de compras.'
    },
    'acciones-check': {
      title: 'Checkbox de Selección Masiva',
      desc: 'Casilla que permite al administrador seleccionar productos específicos del catálogo para aplicar cambios en lote usando el menú superior "⚙️ Mise" (como dar de baja o eliminar varios productos juntos).'
    },
    'descontinuado': {
      title: 'Producto Descontinuado',
      desc: 'Cuando un producto se inactiva, su fila se atenúa en color gris. Permite conservar el registro histórico en bodega central sin entorpecer la operación diaria de las tiendas.'
    },
    'saldo-real': {
      title: 'Saldo Real (Kardex)',
      desc: 'Existencia física teórica calculada de forma dinámica mediante la fórmula: (Inventario Inicial + Entradas por compras - Salidas enviadas a tiendas). Asegura un inventario libre de descuadres.'
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
