// MISE Application Controller (Mobile-First & Clean Documentation Mode)

document.addEventListener('DOMContentLoaded', () => {
  // 1. Iniciar Animación de Carga Cinematográfica LCP (etoile)
  startLoadingSequence();

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

// --- LCP CINEMATIC LOADER LOGIC ---
function startLoadingSequence() {
  updateLcpLoader(10);
  
  setTimeout(() => {
    updateLcpLoader(35);
  }, 250);

  setTimeout(() => {
    updateLcpLoader(75);
  }, 500);

  setTimeout(() => {
    updateLcpLoader(100);
    hideLcpLoader();
  }, 850);
}

function updateLcpLoader(progress) {
  const stop1 = document.getElementById('gradient-stop-1');
  const stop2 = document.getElementById('gradient-stop-2');
  if (stop1 && stop2) {
    stop1.setAttribute('offset', `${progress}%`);
    stop2.setAttribute('offset', `${progress}%`);
  }
}

function hideLcpLoader() {
  const loader = document.getElementById('lcp-loader');
  const plancha = document.getElementById('lcp-loader-plancha');
  const appEl = document.getElementById('app');

  if (!loader) return;

  // 1. Asegurar progreso al 100% de la frase
  updateLcpLoader(100);

  // 2. Iniciar desaparición (fade/scale out) de textos
  setTimeout(() => {
    loader.classList.add('wrap-active');
  }, 250);

  // 3. Mostrar hilo de luz dorada en el centro (plancha)
  setTimeout(() => {
    loader.classList.add('line-visible');
  }, 550);

  // 4. Barrido de expansión total en crema y desvanecimiento
  setTimeout(() => {
    loader.classList.add('reveal-active');
    
    // Parallax inverso del contenedor de la aplicación
    setTimeout(() => {
      if (appEl) {
        appEl.classList.remove('loading-active');
        appEl.classList.add('entrance-active');
      }
    }, 150);

  }, 850);

  // 5. Ocultar del DOM al finalizar por completo la animación
  setTimeout(() => {
    loader.style.display = 'none';
    if (appEl) {
      appEl.classList.remove('entrance-active');
    }
  }, 1750);
}

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

  const currentActive = views.find(v => {
    const el = document.getElementById(`${v}-view`);
    return el && !el.classList.contains('hidden');
  });

  const newViewEl = document.getElementById(`${viewId}-view`);
  if (!newViewEl) return;

  if (currentActive && currentActive !== viewId) {
    const oldViewEl = document.getElementById(`${currentActive}-view`);
    const thread = document.getElementById('gold-thread-transition');

    if (oldViewEl && thread) {
      // 1. Mostrar y expandir horizontalmente el hilo de oro (500ms)
      thread.style.transition = 'transform 500ms cubic-bezier(0.23, 1, 0.32, 1), opacity 300ms ease';
      thread.style.opacity = '1';
      thread.style.transform = 'translate(-50%, -50%) scaleX(1)';

      // 2. Expandir verticalmente cubriendo la pantalla (550ms) y transicionar al color de fondo del tema
      setTimeout(() => {
        thread.style.transition = 'height 550ms cubic-bezier(0.23, 1, 0.32, 1), background-color 300ms ease, box-shadow 550ms ease';
        thread.style.height = '100vh';
        thread.style.backgroundColor = 'var(--bg)';
        thread.style.boxShadow = 'none'; // Desactivar resplandor al expandirse a bloque sólido
      }, 500);

      // 3. Intercambiar la vista justo cuando el bloque cubre todo (900ms)
      setTimeout(() => {
        oldViewEl.classList.add('hidden');
        newViewEl.classList.remove('hidden');
        window.scrollTo(0, 0);

        // Actualizar URL hash
        window.location.hash = `#/${viewId}`;
      }, 900);

      // 4. Desvanecer la cortina dorada (600ms fadeout)
      setTimeout(() => {
        thread.style.transition = 'opacity 600ms ease';
        thread.style.opacity = '0';
      }, 1050);

      // 5. Restablecer el estado inicial del hilo
      setTimeout(() => {
        thread.style.transition = 'none';
        thread.style.transform = 'translate(-50%, -50%) scaleX(0)';
        thread.style.height = '2px';
        thread.style.backgroundColor = 'var(--oro)';
        thread.style.boxShadow = '0 0 12px var(--oro), 0 0 24px var(--oro)';
      }, 1700);
    }
  } else {
    newViewEl.classList.remove('hidden');
    window.scrollTo(0, 0);
    window.location.hash = `#/${viewId}`;
  }

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
      ? 'px-4 py-2 border-r border-border bg-surface text-oro interactive-element' 
      : 'px-4 py-2 border-r border-border text-text-muted interactive-element';
    document.getElementById('tab-sur-rapido').className = !isDiario 
      ? 'px-4 py-2 bg-surface text-oro interactive-element' 
      : 'px-4 py-2 text-text-muted interactive-element';
      
    showHelp('pedidos', isDiario ? 'pedir' : 'surtido-check-complete');
  } else if (sheetKey === 'maestro' || sheetKey === 'kardex') {
    const isMaestro = sheetKey === 'maestro';
    document.getElementById('sub-table-maestro').classList.toggle('hidden', !isMaestro);
    document.getElementById('sub-table-kardex').classList.toggle('hidden', isMaestro);
    
    // Toggle active tab classes
    document.getElementById('tab-maestro').className = isMaestro 
      ? 'px-4 py-2 border-r border-border bg-surface text-oro interactive-element' 
      : 'px-4 py-2 border-r border-border text-text-muted interactive-element';
    document.getElementById('tab-kardex').className = !isMaestro 
      ? 'px-4 py-2 bg-surface text-oro interactive-element' 
      : 'px-4 py-2 text-text-muted interactive-element';
      
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
