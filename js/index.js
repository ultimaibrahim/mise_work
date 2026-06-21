// Inicializar elementos al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  
  // Sincronizar tema inicial
  const isDark = document.documentElement.classList.contains('dark') || 
                 document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
  }
  syncThemeIcons();

  // Registrar clic en todos los toggles de tema
  ['landing-theme-toggle', 'sim-theme-toggle', 'manual-theme-toggle', 'theme-toggle'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleTheme();
      });
    }
  });

  // Escuchar movimiento del ratón para Spotlight Cards
  const cards = document.querySelectorAll('.spotlight-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });

  // Habilitar click en ROL Badge del simulador para alternar rol
  const badge = document.getElementById('sim-role-badge');
  if (badge) {
    badge.style.cursor = 'pointer';
    badge.title = 'Haz clic para cambiar de Rol';
    badge.addEventListener('click', () => {
      const newRole = simRole === 'pedidos' ? 'bodega' : 'pedidos';
      switchSimulatorRole(newRole);
    });
  }

  // Enrutar al iniciar
  const hash = window.location.hash || '#/landing';
  const view = hash.replace('#/', '');
  if (['landing', 'simulator', 'manual'].includes(view)) {
    navigateTo(view);
  } else {
    navigateTo('landing');
  }

  // EVENTO DE CLIC EN EL MENÚ ⚙️ MISE (EVITA GLITCH POR HOVER)
  const menuGroup = document.getElementById('sim-menu-group');
  if (menuGroup) {
    menuGroup.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const dropdown = menuGroup.querySelector('.sim-dropdown');
      if (dropdown) {
        dropdown.classList.toggle('hidden');
      }
    });
  }

  // Cerrar menú de Sheets al dar clic fuera
  document.addEventListener('click', () => {
    if (menuGroup) {
      const dropdown = menuGroup.querySelector('.sim-dropdown');
      if (dropdown) {
        dropdown.classList.add('hidden');
      }
    }
  });
});

// --- MANEJO DE NAVEGACIÓN ---
const navItems = document.querySelectorAll('.nav-item');
const docSections = document.querySelectorAll('.doc-section');
const headerTitle = document.getElementById('header-title');
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menu-toggle');
const menuIcon = document.getElementById('menu-icon');
const sidebarClose = document.getElementById('sidebar-close');
const sidebarOverlay = document.getElementById('sidebar-overlay');

function closeMobileMenu() {
  if (sidebar) sidebar.classList.remove('open');
  if (sidebarOverlay) sidebarOverlay.classList.remove('active');
  if (menuIcon) {
    menuIcon.setAttribute('data-lucide', 'menu');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

navItems.forEach(item => {
  item.addEventListener('click', () => {
    const target = item.getAttribute('data-target');
    if (!target) return;
    
    // Quitar clases activas
    navItems.forEach(i => i.classList.remove('active'));
    docSections.forEach(s => s.classList.remove('active'));

    // Activar seleccionados
    item.classList.add('active');
    const activeSection = document.getElementById(`sect-${target}`);
    if (activeSection) {
      activeSection.classList.add('active');
    }
    
    // Actualizar título de cabecera
    headerTitle.textContent = item.textContent.trim();

    // Cerrar menú móvil si está abierto
    if (window.innerWidth <= 992) {
      closeMobileMenu();
    }
  });
});

// Toggle menú móvil
if (menuToggle) {
  menuToggle.addEventListener('click', () => {
    if (sidebar) sidebar.classList.toggle('open');
    if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
    
    if (sidebar && sidebar.classList.contains('open')) {
      menuIcon.setAttribute('data-lucide', 'x');
    } else {
      menuIcon.setAttribute('data-lucide', 'menu');
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
  });
}

// Botón cerrar sidebar móvil
if (sidebarClose) {
  sidebarClose.addEventListener('click', () => {
    closeMobileMenu();
  });
}

// Clic en overlay para cerrar sidebar móvil
if (sidebarOverlay) {
  sidebarOverlay.addEventListener('click', () => {
    closeMobileMenu();
  });
}

// --- MANEJO DE TEMA (CLARO / OSCURO) Con Transición Suave ---
const htmlEl = document.documentElement;
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    // Añadir clase de transición suave al body
    document.body.classList.add('theme-transitioning');
    
    const currentTheme = htmlEl.getAttribute('data-theme');
    if (currentTheme === 'dark') {
      htmlEl.setAttribute('data-theme', 'light');
      themeIcon.setAttribute('data-lucide', 'moon');
    } else {
      htmlEl.setAttribute('data-theme', 'dark');
      themeIcon.setAttribute('data-lucide', 'sun');
    }
    
    lucide.createIcons();
    
    // Remover clase de transición después de completarse
    setTimeout(() => {
      document.body.classList.remove('theme-transitioning');
    }, 400);
  });
}

// --- BUSCADOR EN VIVO (Filtrado sin saltos invasivos) ---
const searchInput = document.getElementById('search-input');
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    
    if (!query) {
      // Restaurar navegación normal
      navItems.forEach(i => i.style.display = 'flex');
      return;
    }

    // Filtrar elementos de navegación
    navItems.forEach(item => {
      const text = item.textContent.toLowerCase();
      const target = item.getAttribute('data-target');
      const section = document.getElementById(`sect-${target}`);
      const sectionContent = section ? section.textContent.toLowerCase() : '';
      
      if (text.includes(query) || sectionContent.includes(query)) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
  });
}

// --- MOCKUP INTERACTIVO CON PANEL INSPECTOR LATERAL ---
document.querySelectorAll('.sheet-interface-container').forEach(container => {
  const inspectorContent = container.querySelector('.inspector-content');
  const inspector = container.querySelector('.sheet-inspector');
  let emptyStateHTML = ''; // Se cargará dinámicamente en el primer evento para capturar el SVG renderizado
  let selectedCell = null;

  const hoverCells = container.querySelectorAll('.hover-cell');

  hoverCells.forEach(cell => {
    const tipId = cell.getAttribute('data-tip');
    const targetBox = document.getElementById(`tip-${tipId}`);

    const showCellInfo = () => {
      // Capturar el HTML ya procesado con el SVG de Lucide original
      if (!emptyStateHTML && inspectorContent) {
        emptyStateHTML = inspectorContent.innerHTML;
      }
      
      if (targetBox && inspectorContent) {
        inspectorContent.innerHTML = targetBox.innerHTML;
        if (inspector) inspector.classList.add('active');
      }
    };

    const resetToSelected = () => {
      if (selectedCell) {
        const selTipId = selectedCell.getAttribute('data-tip');
        const selTargetBox = document.getElementById(`tip-${selTipId}`);
        if (selTargetBox && inspectorContent) {
          inspectorContent.innerHTML = selTargetBox.innerHTML;
          if (inspector) inspector.classList.add('active');
        }
      } else {
        if (inspectorContent && emptyStateHTML) {
          inspectorContent.innerHTML = emptyStateHTML;
        }
        if (inspector) inspector.classList.remove('active');
      }
    };

    // Click/Tap para seleccionar celda fijando la explicación
    cell.addEventListener('click', (e) => {
      e.stopPropagation();
      
      if (selectedCell === cell) {
        // Deseleccionar al hacer click de nuevo
        selectedCell.classList.remove('active-touch');
        selectedCell = null;
        resetToSelected();
      } else {
        // Seleccionar nueva celda
        if (selectedCell) selectedCell.classList.remove('active-touch');
        selectedCell = cell;
        selectedCell.classList.add('active-touch');
        showCellInfo();
      }
    });

    // Hover (Preview rápido en escritorio)
    cell.addEventListener('mouseenter', () => {
      showCellInfo();
    });

    cell.addEventListener('mouseleave', () => {
      resetToSelected();
    });
  });

  // Hacer click fuera restablece el panel inspector
  document.addEventListener('click', () => {
    if (selectedCell) {
      selectedCell.classList.remove('active-touch');
      selectedCell = null;
      resetToSelected();
    }
  });
});

// --- SELECTOR DE SUB-MENÚ AVANZADO ---
const btnMenuBodega = document.getElementById('btn-menu-bodega');
const btnMenuPedidos = document.getElementById('btn-menu-pedidos');
const docMenuBodega = document.getElementById('menu-doc-bodega');
const docMenuPedidos = document.getElementById('menu-doc-pedidos');

if (btnMenuBodega && btnMenuPedidos) {
  btnMenuBodega.addEventListener('click', () => {
    btnMenuBodega.classList.add('primary');
    btnMenuPedidos.classList.remove('primary');
    if (docMenuBodega) docMenuBodega.style.display = 'block';
    if (docMenuPedidos) docMenuPedidos.style.display = 'none';
  });

  btnMenuPedidos.addEventListener('click', () => {
    btnMenuPedidos.classList.add('primary');
    btnMenuBodega.classList.remove('primary');
    if (docMenuBodega) docMenuBodega.style.display = 'none';
    if (docMenuPedidos) docMenuPedidos.style.display = 'block';
  });
}

// --- GESTIÓN DE RUTA Y NAVEGACIÓN SPA ---
window.navigateTo = function(viewName) {
  const views = ['landing', 'simulator', 'manual'];
  views.forEach(v => {
    const el = document.getElementById(`${v}-view`);
    if (el) {
      if (v === viewName) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }
  });
  
  window.location.hash = `#/${viewName}`;
  
  if (viewName === 'manual') {
    const activeNav = document.querySelector('.nav-item.active');
    if (activeNav) {
      const target = activeNav.getAttribute('data-target');
      const activeSection = document.getElementById(`sect-${target}`);
      if (activeSection) {
        activeSection.classList.add('active');
      }
    }
  }
  
  if (viewName === 'simulator') {
    initSimulator();
  }
  
  syncThemeIcons();
};

window.addEventListener('hashchange', () => {
  const hash = window.location.hash || '#/landing';
  const view = hash.replace('#/', '');
  if (['landing', 'simulator', 'manual'].includes(view)) {
    const targetView = document.getElementById(`${view}-view`);
    if (targetView && targetView.classList.contains('hidden')) {
      navigateTo(view);
    }
  }
});

// --- MANEJO DE TEMA ---
window.toggleTheme = function() {
  document.body.classList.add('theme-transitioning');
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  if (newTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  
  syncThemeIcons();
  
  setTimeout(() => {
    document.body.classList.remove('theme-transitioning');
  }, 400);
};

window.syncThemeIcons = function() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const icons = document.querySelectorAll('#landing-theme-toggle i, #sim-theme-toggle i, #manual-theme-toggle i, #theme-icon');
  icons.forEach(icon => {
    if (isDark) {
      icon.setAttribute('data-lucide', 'sun');
    } else {
      icon.setAttribute('data-lucide', 'moon');
    }
  });
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
};

// --- LÓGICA DE SIMULADOR DE GOOGLE SHEETS INTERACTIVO ---
let simRole = 'pedidos'; 
let simCurrentStep = 0;
let simPedidosData = [];
let simMaestroData = [];
let simKardexData = [];
let simActiveTab = 'pedido';
let simIsSorted = false;
let simWeekAdvanced = false;

// HELPER DE FECHA DINÁMICA
function getFormattedDate() {
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const today = new Date();
  const day = today.getDate();
  const month = months[today.getMonth()];
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
}

// COLLAPSE TUTORIAL PANEL
window.toggleSimGuide = function() {
  const panel = document.getElementById('sim-guide-panel');
  const icon = document.getElementById('guide-toggle-icon');
  if (panel) {
    panel.classList.toggle('guide-collapsed');
    if (icon) {
      if (panel.classList.contains('guide-collapsed')) {
        icon.setAttribute('data-lucide', 'sidebar-close');
      } else {
        icon.setAttribute('data-lucide', 'sidebar-open');
      }
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  }
};

const INITIAL_PEDIDOS = [
  { no: 4, cat: '1. REFRIGERADOS', prod: 'Harina Crepas (Domo)', unit: 'kg', pedir: '', recibido: '', estado: '⏳ PENDIENTE', alerta: '-', active: true },
  { no: 5, cat: '1. REFRIGERADOS', prod: 'Queso Mozzarella', unit: 'kg', pedir: '', recibido: '', estado: '⏳ PENDIENTE', alerta: '-', active: true },
  { no: 6, cat: '2. ABARROTES', prod: 'Nutella', unit: 'bote', pedir: '', recibido: '', estado: '⏳ PENDIENTE', alerta: '-', active: true },
  { no: 7, cat: '2. ABARROTES', prod: 'Azúcar Refinada', unit: 'bulto', pedir: '', recibido: '', estado: '⏳ PENDIENTE', alerta: '-', active: true },
  { no: 8, cat: '3. FRUTAS Y VERDURAS', prod: 'Fresa Entera', unit: 'caja', pedir: '', recibido: '', estado: '⏳ PENDIENTE', alerta: '-', active: false }
];

const INITIAL_MAESTRO = [
  { no: 1, id: 'REF-001', prod: 'Jamón Lala Pechuga', pres: 'BOL 1 kg', unit: 'kg', activo: 'SÍ', min: 5, max: 20, selected: true },
  { no: 2, id: 'REF-002', prod: 'Queso Mozzarella', pres: 'BOL 2 kg', unit: 'kg', activo: 'SÍ', min: 10, max: 40, selected: false },
  { no: 3, id: 'ABA-001', prod: 'Nutella', pres: 'BOTE 3 kg', unit: 'bote', activo: 'SÍ', min: 1, max: 5, selected: false },
  { no: 4, id: 'FYV-001', prod: 'Fresa Entera', pres: 'CAJA 2 kg', unit: 'caja', activo: 'NO', min: 2, max: 10, selected: false }
];

const INITIAL_KARDEX = [
  { no: 1, prod: 'Jamón Lala Pechuga', lunEnt: '15', lunSal: '2', saldo: '13', active: true },
  { no: 2, prod: 'Queso Mozzarella', lunEnt: '20', lunSal: '5', saldo: '15', active: true },
  { no: 3, prod: 'Nutella', lunEnt: '5', lunSal: '1', saldo: '4', active: true },
  { no: 4, prod: 'Fresa Entera', lunEnt: '10', lunSal: '3', saldo: '7', active: true }
];

const SIM_STEPS = {
  pedidos: [
    {
      title: "1. Bienvenido al Simulador de Pedidos",
      desc: `
        <p class="mb-3">Como <strong>Encargado de Tienda</strong>, registras el pedido a pie de pasillo desde tu celular o tablet.</p>
        <p class="mb-3">A la izquierda tienes la hoja interactiva <strong>📋 PEDIDO DIARIO</strong>. Observa que en la <strong>fila 2</strong> se indica hoy: <span class="text-oro font-bold font-mono">${getFormattedDate()}</span>.</p>
        <div class="p-3 bg-verde/10 rounded-md border border-border text-xs space-y-1">
          <span class="font-bold text-oro">💡 TIP DEL ENCARGADO:</span>
          <p class="text-text-muted">Si la pantalla de tu celular es muy pequeña, usa el botón <i data-lucide="sidebar-open" class="w-3.5 h-3.5 inline text-oro"></i> en la cabecera para ocultar esta guía y enfocar la hoja de cálculo completa.</p>
        </div>
        <p class="text-oro font-semibold mt-3">Presiona "Siguiente" para iniciar.</p>
      `,
      init: () => {
        simActiveTab = 'pedido';
        simPedidosData = JSON.parse(JSON.stringify(INITIAL_PEDIDOS));
        simIsSorted = false;
        renderSimTabs();
        renderSimTable();
      },
      verify: () => true
    },
    {
      title: "2. Capturar Pedidos (Flotantes)",
      desc: `
        <p class="mb-3">Vamos a simular el levantamiento de stock. Escribe en la celda amarilla <strong>PEDIR (F4)</strong> para la fila de <strong>Harina Crepas</strong> e introduce la cantidad <strong>1.5</strong>.</p>
        <div class="p-3 bg-verde/10 rounded-md border border-border text-xs space-y-1">
          <span class="font-bold text-oro">💡 TIP DEL ENCARGADO:</span>
          <p class="text-text-muted">El sistema de pedidos de LCP permite el ingreso de números decimales de hasta 4 posiciones. Esto es vital para mermas en gramos.</p>
        </div>
      `,
      init: () => {
        simActiveTab = 'pedido';
        renderSimTabs();
        renderSimTable();
        setTimeout(() => {
          const input = document.getElementById('input-pedir-4');
          if (input) {
            input.focus();
            input.select();
          }
        }, 100);
      },
      verify: () => {
        const val = parseFloat(simPedidosData[0].pedir);
        return !isNaN(val) && val > 0;
      },
      errorMsg: "Ingresa un número válido mayor a 0 (ej. 1.5) en la celda PEDIR de Harina Crepas (F4)."
    },
    {
      title: "3. Ordenamiento por Categorías",
      desc: `
        <p class="mb-3">¡Excelente! Observa cómo la fila se iluminó de amarillo confirmando la selección.</p>
        <p class="mb-3">Para agilizar el surtido por pasillo, activa la casilla de verificación <strong>⚙️ Ordenar</strong> en la <strong>fila 2</strong> de la hoja para reorganizar el pedido.</p>
        <div class="p-3 bg-verde/10 rounded-md border border-border text-xs space-y-1">
          <span class="font-bold text-oro">💡 TIP DEL ENCARGADO:</span>
          <p class="text-text-muted">Al ordenar la hoja, el script agrupa físicamente los productos por pasillo y empuja las solicitudes activas hacia arriba, simplificando la ruta del picker.</p>
        </div>
      `,
      init: () => {
        renderSimTable();
      },
      verify: () => {
        return simIsSorted;
      },
      errorMsg: "Activa el checkbox '⚙️ Ordenar' en la fila 2 de la hoja interactiva a la izquierda."
    },
    {
      title: "4. Alertas de Adiciones",
      desc: `
        <p class="mb-3">¡La lista se ha agrupado por categorías colocando tu orden al principio!</p>
        <p class="mb-3">Si agregas una cantidad extra después de haber ordenado y enviado el archivo, el sistema lo marcará como adición. Captura la cantidad <strong>1</strong> en la celda <strong>PEDIR de Nutella (F5)</strong>.</p>
      `,
      init: () => {
        simActiveTab = 'pedido';
        renderSimTable();
        setTimeout(() => {
          const input = document.getElementById('input-pedir-6');
          if (input) {
            input.focus();
            input.select();
          }
        }, 100);
      },
      verify: () => {
        const val = parseFloat(simPedidosData.find(r => r.prod === 'Nutella').pedir);
        return !isNaN(val) && val > 0;
      },
      errorMsg: "Introduce la cantidad 1 en la celda de Nutella (F5) para simular la adición."
    },
    {
      title: "5. Surtido Rápido & Resumen",
      desc: `
        <p class="mb-3">¡Exacto! Al agregar Nutella a destiempo, el sistema generó automáticamente la alerta <strong>🚨 ADICIÓN</strong> en color naranja.</p>
        <p class="mb-3">Ahora simulemos la recepción. Activa el checkbox <strong>🚚 Surtido</strong> en la <strong>fila 2</strong> de la hoja para abrir el modo de conciliación en celular.</p>
        <div class="p-3 bg-verde/10 rounded-md border border-border text-xs space-y-1">
          <span class="font-bold text-oro">💡 TIP DEL ENCARGADO:</span>
          <p class="text-text-muted">El checkbox '🚚 Surtido' despliega de inmediato la pestaña de Surtido Rápido, ideal para conciliar la entrega a pie de camión.</p>
        </div>
      `,
      init: () => {
        renderSimTable();
      },
      verify: () => {
        return simActiveTab === 'surtido';
      },
      errorMsg: "Activa el checkbox '🚚 Surtido' en la fila 2 de la hoja interactiva a la izquierda."
    },
    {
      title: "6. Conciliación en Móvil",
      desc: `
        <p class="mb-3">¡Ya estamos en la hoja <strong>🚚 SURTIDO RÁPIDO</strong>! Nota que la <strong>fila 2</strong> tiene las instrucciones operativas.</p>
        <p class="mb-3">Marca la casilla de <strong>Completo (E4)</strong> de la Harina Crepas. Observa cómo cambia la fila a verde y se actualiza el panel <strong>RESUMEN SURTIDO</strong> a la derecha.</p>
        <div class="p-3 bg-verde/10 rounded-md border border-border text-xs space-y-1">
          <span class="font-bold text-oro">💡 TIP DEL ENCARGADO:</span>
          <p class="text-text-muted">El panel 'RESUMEN SURTIDO' se calcula automáticamente a partir de las casillas marcadas, dando un conteo preciso al instante.</p>
        </div>
      `,
      init: () => {
        simActiveTab = 'surtido';
        renderSimTabs();
        renderSimTable();
      },
      verify: () => {
        return simPedidosData.find(r => r.prod === 'Harina Crepas (Domo)').recibido === 'completo';
      },
      errorMsg: "Marca la casilla de Completo para la Harina Crepas en la columna E de la tabla."
    },
    {
      title: "7. ¡Simulación de Tienda Completada!",
      desc: `
        <p class="mb-3">¡Excelente! Has aprendido a levantar pedidos con decimales, ordenar por pasillos, gestionar adiciones y conciliar en móvil.</p>
        <div class="flex flex-col gap-2 pt-2">
          <button onclick="navigateTo('manual')" class="btn-ob text-xs justify-center font-bold">Abrir el Manual v2.0</button>
          <button onclick="switchSimulatorRole('bodega')" class="btn-ob primary text-xs justify-center font-bold">Probar Rol de Bodeguero</button>
        </div>
      `,
      init: () => {},
      verify: () => true
    }
  ],
  bodega: [
    {
      title: "1. Bienvenido al Rol de Bodeguero",
      desc: `
        <p class="mb-3">Como <strong>Administrador de Bodegas</strong>, controlas la disponibilidad del catálogo y realizas cierres de Kardex.</p>
        <p class="mb-3">A la izquierda tienes la hoja <strong>📋 MAESTRO</strong>. Haz clic en "Siguiente" para iniciar.</p>
        <div class="p-3 bg-verde/10 rounded-md border border-border text-xs space-y-1">
          <span class="font-bold text-oro">💡 TIP DEL BODEGUERO:</span>
          <p class="text-text-muted">El catálogo de insumos debe mantenerse ordenado. Usa 'Carga masiva' para añadir múltiples productos a la vez.</p>
        </div>
      `,
      init: () => {
        simActiveTab = 'maestro';
        simMaestroData = JSON.parse(JSON.stringify(INITIAL_MAESTRO));
        simKardexData = JSON.parse(JSON.stringify(INITIAL_KARDEX));
        simWeekAdvanced = false;
        renderSimTabs();
        renderSimTable();
      },
      verify: () => true
    },
    {
      title: "2. Administración de Catálogo",
      desc: `
        <p class="mb-3">La <strong>Fresa Entera</strong> está inactiva (ACTIVO = NO). Vamos a habilitarla para las tiendas haciendo clic en su celda <strong>NO (F4)</strong>.</p>
        <div class="p-3 bg-verde/10 rounded-md border border-border text-xs space-y-1">
          <span class="font-bold text-oro">💡 TIP DEL BODEGUERO:</span>
          <p class="text-text-muted">Al cambiar un producto a SÍ, los encargados de tienda lo verán en caliente en su hoja de pedidos diarios en la siguiente sincronización.</p>
        </div>
      `,
      init: () => {
        simActiveTab = 'maestro';
        renderSimTable();
      },
      verify: () => {
        return simMaestroData[3].activo === 'SÍ';
      },
      errorMsg: "Haz clic en la celda NO de Fresa Entera para cambiar su estado a SÍ."
    },
    {
      title: "3. Registro de Kardex",
      desc: `
        <p class="mb-3">Aquí registras entradas y salidas físicas. Haz clic en la pestaña <strong>📦 KARDEX_BA</strong> a la izquierda para continuar.</p>
        <p class="text-oro font-semibold">Presiona Siguiente cuando estés en la pestaña KARDEX_BA.</p>
      `,
      init: () => {},
      verify: () => {
        return simActiveTab === 'kardex';
      },
      errorMsg: "Haz clic en la pestaña KARDEX_BA a la izquierda."
    },
    {
      title: "4. Avanzar Semana (Cierre)",
      desc: `
        <p class="mb-3">Al concluir el sábado, debes cerrar la semana. Haz clic en el menú superior <strong>⚙️ Mise</strong> y selecciona la opción <strong>Avanzar semana</strong>.</p>
        <div class="p-3 bg-verde/10 rounded-md border border-border text-xs space-y-1">
          <span class="font-bold text-oro">💡 TIP DEL BODEGUERO:</span>
          <p class="text-text-muted">Esta acción automatizada respalda los saldos en el histórico de bodega, limpia las entradas/salidas diarias y traslada los saldos de cierre como stock inicial para el lunes.</p>
        </div>
      `,
      init: () => {
        simActiveTab = 'kardex';
        renderSimTable();
      },
      verify: () => {
        return simWeekAdvanced;
      },
      errorMsg: "Haz clic en el menú ⚙️ Mise → 'Avanzar semana' y confirma la acción en pantalla."
    },
    {
      title: "5. ¡Capacitación Terminada!",
      desc: `
        <p class="mb-3">¡Cierre semanal procesado con éxito! Los Kardex se han limpiado y los saldos iniciales se actualizaron automáticamente.</p>
        <p class="mb-3">Ya conoces todo el flujo de administración centralizada de la suite MISE.</p>
        <div class="flex flex-col gap-2 pt-2">
          <button onclick="navigateTo('manual')" class="btn-ob text-xs justify-center font-bold">Ver el Manual v2.0</button>
          <button onclick="navigateTo('landing')" class="btn-ob primary text-xs justify-center font-bold">Volver al Portal</button>
        </div>
      `,
      init: () => {},
      verify: () => true
    }
  ]
};

window.initSimulator = function() {
  if (!simRole) {
    simRole = 'pedidos';
  }
  
  const badge = document.getElementById('sim-role-badge');
  if (badge) {
    badge.textContent = `ROL: ${simRole === 'pedidos' ? 'ENCARGADO' : 'BODEGUERO'}`;
  }
  
  simCurrentStep = 0;
  simIsSorted = false;
  simWeekAdvanced = false;
  
  initStep();
};

window.switchSimulatorRole = function(role) {
  const container = document.getElementById('sim-role-container');
  if (container) {
    container.classList.add('role-transitioning');
  }
  
  setTimeout(() => {
    simRole = role;
    simCurrentStep = 0;
    simIsSorted = false;
    simWeekAdvanced = false;
    
    const badge = document.getElementById('sim-role-badge');
    if (badge) {
      badge.textContent = `ROL: ${simRole === 'pedidos' ? 'ENCARGADO' : 'BODEGUERO'}`;
    }
    
    initStep();
    
    if (container) {
      container.classList.remove('role-transitioning');
    }
  }, 300);
};

function initStep() {
  const steps = SIM_STEPS[simRole];
  const step = steps[simCurrentStep];
  
  const pct = (simCurrentStep / (steps.length - 1)) * 100;
  const bar = document.getElementById('sim-progress-bar');
  if (bar) bar.style.width = `${pct}%`;
  
  const progressText = document.getElementById('sim-step-progress');
  if (progressText) progressText.textContent = `Paso ${simCurrentStep + 1} de ${steps.length}`;
  
  const stepTitle = document.getElementById('sim-step-title');
  if (stepTitle) stepTitle.textContent = step.title;
  
  const stepDesc = document.getElementById('sim-step-desc');
  if (stepDesc) stepDesc.innerHTML = step.desc;
  
  const backBtn = document.getElementById('sim-btn-back');
  if (backBtn) backBtn.disabled = simCurrentStep === 0;
  
  const nextBtn = document.getElementById('sim-btn-next');
  if (nextBtn) {
    if (simCurrentStep === steps.length - 1) {
      nextBtn.innerHTML = `Finalizar <i data-lucide="check" class="w-4 h-4"></i>`;
    } else {
      nextBtn.innerHTML = `Siguiente <i data-lucide="arrow-right" class="w-4 h-4"></i>`;
    }
  }
  
  if (step.init) {
    step.init();
  }
  
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

window.simStepNext = function() {
  const steps = SIM_STEPS[simRole];
  const step = steps[simCurrentStep];
  
  const nextBtn = document.getElementById('sim-btn-next');
  if (nextBtn) {
    nextBtn.classList.remove('animate-bounce');
  }
  
  if (step.verify && !step.verify()) {
    alert(step.errorMsg || "Por favor, completa la acción requerida antes de continuar.");
    return;
  }
  
  if (simCurrentStep < steps.length - 1) {
    simCurrentStep++;
    initStep();
  } else {
    navigateTo('manual');
  }
};

window.simStepBack = function() {
  if (simCurrentStep > 0) {
    simCurrentStep--;
    initStep();
  }
};

window.selectSimCell = function(cellId, value, formula) {
  const cellIdEl = document.getElementById('sim-cell-id');
  const formulaBarEl = document.getElementById('sim-formula-bar');
  if (cellIdEl) cellIdEl.textContent = cellId;
  if (formulaBarEl) formulaBarEl.textContent = formula || value || '';
};

window.handleSimInputChange = function(no, field, value) {
  if (simRole === 'pedidos') {
    const row = simPedidosData.find(r => r.no === no);
    if (row) {
      row[field] = value;
      selectSimCell(`E${no}`, value, value);
      renderSimTable();
      updateSimKPIs();
      
      // Auto triggers for tutorial helpers
      if (simCurrentStep === 1 && no === 4 && parseFloat(value) > 0) {
        const nextBtn = document.getElementById('sim-btn-next');
        if (nextBtn) nextBtn.classList.add('animate-bounce');
      }
      
      if (simCurrentStep === 3 && no === 6 && parseFloat(value) > 0) {
        row.alerta = '🚨 ADICIÓN';
        renderSimTable();
        const nextBtn = document.getElementById('sim-btn-next');
        if (nextBtn) nextBtn.classList.add('animate-bounce');
      }
    }
  }
};

window.simRunSort = function() {
  if (simRole === 'pedidos') {
    simPedidosData.sort((a, b) => {
      if (a.cat !== b.cat) {
        return a.cat.localeCompare(b.cat);
      }
      const aPedir = parseFloat(a.pedir) || 0;
      const bPedir = parseFloat(b.pedir) || 0;
      if (aPedir !== bPedir) {
        return bPedir - aPedir;
      }
      return a.no - b.no;
    });
    
    simIsSorted = true;
    renderSimTable();
    if (simCurrentStep === 2) {
      simStepNext();
    }
  }
};

window.handleSimCheckOrdenar = function(checked) {
  if (checked) {
    simRunSort();
  } else {
    simIsSorted = false;
    renderSimTable();
  }
};

window.handleSimCheckSurtido = function(checked) {
  if (checked) {
    simActiveTab = 'surtido';
    renderSimTabs();
    renderSimTable();
    if (simCurrentStep === 4) {
      simStepNext();
    }
  }
};

window.toggleSimSurtidoCheckbox = function(no, type) {
  if (simRole === 'pedidos') {
    const row = simPedidosData.find(r => r.no === no);
    if (row) {
      if (type === 'completo') {
        row.recibido = row.recibido === 'completo' ? '' : 'completo';
      } else if (type === 'inexistente') {
        row.recibido = row.recibido === 'inexistente' ? '' : 'inexistente';
      }
      renderSimTable();
      updateSimKPIs();
      
      if (simCurrentStep === 5 && no === 4 && row.recibido === 'completo') {
        const nextBtn = document.getElementById('sim-btn-next');
        if (nextBtn) nextBtn.classList.add('animate-bounce');
      }
    }
  }
};

window.toggleSimMaestroActivo = function(no) {
  if (simRole === 'bodega' && simActiveTab === 'maestro') {
    const row = simMaestroData.find(r => r.no === no);
    if (row) {
      row.activo = row.activo === 'SÍ' ? 'NO' : 'SÍ';
      selectSimCell(`F${no + 1}`, row.activo, row.activo);
      
      const pedRow = simPedidosData.find(r => r.prod === row.prod);
      if (pedRow) {
        pedRow.active = row.activo === 'SÍ';
      }
      
      renderSimTable();
      
      if (simCurrentStep === 1 && row.prod === 'Fresa Entera' && row.activo === 'SÍ') {
        simStepNext();
      }
    }
  }
};

window.toggleSimMaestroSelect = function(no) {
  if (simActiveTab === 'maestro') {
    const row = simMaestroData.find(r => r.no === no);
    if (row) {
      row.selected = !row.selected;
      renderSimTable();
    }
  }
};

window.handleKardexInputChange = function(no, field, value) {
  if (simActiveTab === 'kardex') {
    const row = simKardexData.find(r => r.no === no);
    if (row) {
      row[field] = value;
      const ent = parseFloat(row.lunEnt) || 0;
      const sal = parseFloat(row.lunSal) || 0;
      row.saldo = (ent - sal).toString();
      selectSimCell(field === 'lunEnt' ? `C${no + 1}` : `D${no + 1}`, value, value);
      renderSimTable();
    }
  }
};

window.simTriggerMenu = function(action) {
  if (action === 'avanzar') {
    document.getElementById('sim-dialog-overlay').classList.remove('hidden');
  } else if (action === 'setup') {
    alert("Ejecutando Setup Completo en el libro de cálculo...");
  } else if (action === 'sincronizar') {
    if (simRole === 'pedidos' && simCurrentStep === 2) {
      simRunSort();
    } else {
      alert("Sincronización y enlace de catálogos completada.");
    }
  }
};

window.closeSimDialog = function(confirm) {
  document.getElementById('sim-dialog-overlay').classList.add('hidden');
  if (confirm) {
    if (simRole === 'bodega' && simCurrentStep === 3) {
      simWeekAdvanced = true;
      simKardexData.forEach(row => {
        row.lunEnt = '0';
        row.lunSal = '0';
      });
      renderSimTable();
      simStepNext();
    } else {
      alert("Operación confirmada.");
    }
  }
};

function updateSimKPIs() {
  const completeCount = simPedidosData.filter(r => r.recibido === 'completo' && r.active && parseFloat(r.pedir) > 0).length;
  const partialCount = simPedidosData.filter(r => parseFloat(r.pedir) > 0 && r.active && !r.recibido).length;
  const nonexistentCount = simPedidosData.filter(r => r.recibido === 'inexistente' && r.active && parseFloat(r.pedir) > 0).length;
  const additionCount = simPedidosData.filter(r => r.alerta === '🚨 ADICIÓN' && r.active).length;
  
  const titleBar = document.getElementById('sim-sheet-title');
  if (titleBar) {
    titleBar.innerHTML = `
      <div class="flex justify-between items-center w-full">
        <span>Libro de Cálculo - MISE Simulator</span>
        <span class="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold font-mono">
          📊 C: ${completeCount} | P: ${partialCount} | N: ${nonexistentCount} | A: ${additionCount}
        </span>
      </div>
    `;
  }
}

function renderSimTabs() {
  const bar = document.getElementById('sim-tabs-bar');
  if (!bar) return;
  
  bar.innerHTML = '';
  
  let tabs = [];
  if (simRole === 'pedidos') {
    tabs = [
      { id: 'pedido', label: '📋 PEDIDO DIARIO' },
      { id: 'surtido', label: '🚚 SURTIDO RÁPIDO' }
    ];
  } else {
    tabs = [
      { id: 'maestro', label: '📋 MAESTRO' },
      { id: 'kardex', label: '📦 KARDEX_BA' }
    ];
  }
  
  tabs.forEach(tab => {
    const btn = document.createElement('button');
    btn.className = `sim-tab-btn ${simActiveTab === tab.id ? 'active' : ''}`;
    btn.textContent = tab.label;
    btn.onclick = (e) => {
      e.preventDefault();
      simActiveTab = tab.id;
      renderSimTabs();
      renderSimTable();
      
      // Auto triggers for steps
      if (simRole === 'pedidos' && simCurrentStep === 4 && tab.id === 'surtido') {
        simStepNext();
      }
      if (simRole === 'bodega' && simCurrentStep === 2 && tab.id === 'kardex') {
        simStepNext();
      }
    };
    bar.appendChild(btn);
  });
}

function renderSimTable() {
  const headEl = document.getElementById('sim-table-head');
  const bodyEl = document.getElementById('sim-table-body');
  if (!headEl || !bodyEl) return;
  
  headEl.innerHTML = '';
  bodyEl.innerHTML = '';
  
  if (simActiveTab === 'pedido') {
    // ROW A, B, C... Letters row
    headEl.innerHTML = `
      <tr class="bg-surface-2 border-b border-border">
        <th class="w-10 bg-surface-2 border-r border-border text-center text-text-muted font-bold"></th>
        <th class="text-center font-bold text-[10px] text-text-muted">A</th>
        <th class="text-center font-bold text-[10px] text-text-muted">B</th>
        <th class="text-center font-bold text-[10px] text-text-muted">C</th>
        <th class="text-center font-bold text-[10px] text-text-muted">D</th>
        <th class="text-center font-bold text-[10px] text-text-muted">E</th>
        <th class="text-center font-bold text-[10px] text-text-muted">F</th>
        <th class="text-center font-bold text-[10px] text-text-muted">G</th>
      </tr>
      <tr class="bg-emerald-950/20 border-b border-border">
        <th class="text-center font-bold bg-surface-2 border-r border-border text-text-muted">1</th>
        <th colspan="7" class="py-2 text-center font-bold text-verde dark:text-emerald-400 uppercase tracking-wider font-serif">
          MISE — PEDIDO DIARIO (B-Andares)
        </th>
      </tr>
      <tr class="bg-surface border-b border-border">
        <td class="text-center font-bold bg-surface-2 border-r border-border text-text-muted">2</td>
        <td colspan="2" class="px-3 py-1.5 text-left font-bold">
          <label class="flex items-center gap-1.5 cursor-pointer select-none text-emerald-800 dark:text-emerald-400">
            <input type="checkbox" id="sim-check-ordenar" ${simIsSorted ? 'checked' : ''} onchange="handleSimCheckOrdenar(this.checked)" class="w-3.5 h-3.5 border-border rounded text-oro focus:ring-oro">
            <span>⚙️ Ordenar</span>
          </label>
        </td>
        <td colspan="2" class="px-3 py-1.5 text-center font-bold text-text-muted font-mono">
          <span>FECHA:</span> <span class="text-oro font-bold">${getFormattedDate()}</span>
        </td>
        <td colspan="3" class="px-3 py-1.5 text-right font-bold">
          <label class="flex items-center justify-end gap-1.5 cursor-pointer select-none text-emerald-800 dark:text-emerald-400">
            <input type="checkbox" id="sim-check-surtido" ${simActiveTab === 'surtido' ? 'checked' : ''} onchange="handleSimCheckSurtido(this.checked)" class="w-3.5 h-3.5 border-border rounded text-oro focus:ring-oro">
            <span>🚚 Surtido</span>
          </label>
        </td>
      </tr>
      <tr class="bg-surface-2 border-b border-border text-[10px] text-text-muted">
        <th class="text-center font-bold bg-surface-2 border-r border-border text-text-muted">3</th>
        <th>No</th>
        <th>CATEGORÍA</th>
        <th>PRODUCTO</th>
        <th>UNIDAD</th>
        <th class="w-20">PEDIR</th>
        <th class="w-24">ESTADO</th>
        <th>ALERTAS</th>
      </tr>
    `;
    
    let rowIndex = 4;
    simPedidosData.forEach(row => {
      if (row.prod === 'Fresa Entera' && !row.active) {
        return;
      }
      
      const val = row.pedir;
      let rowClass = '';
      if (parseFloat(val) > 0) {
        rowClass = 'active-row';
      }
      if (row.alerta === '🚨 ADICIÓN') {
        rowClass = 'addition-row';
      }
      
      const tr = document.createElement('tr');
      tr.className = rowClass;
      tr.innerHTML = `
        <td class="text-center font-bold bg-surface-2 border-r border-border text-text-muted select-none">${rowIndex}</td>
        <td class="text-center font-bold">${row.no}</td>
        <td class="font-bold text-emerald-800 dark:text-emerald-400">${row.cat}</td>
        <td class="font-bold cursor-pointer hover:underline" onclick="selectSimCell('C${rowIndex}', '${row.prod}')">${row.prod}</td>
        <td class="text-center">${row.unit}</td>
        <td class="edit-cell text-center font-bold">
          <input type="text" class="sim-cell-input" id="input-pedir-${row.no}" 
            value="${row.pedir}" 
            onfocus="selectSimCell('E${rowIndex}', '${row.pedir}')"
            oninput="handleSimInputChange(${row.no}, 'pedir', this.value)">
        </td>
        <td class="text-center font-bold ${parseFloat(row.pedir) > 0 ? 'text-amber-600' : 'text-text-muted'}">
          ${parseFloat(row.pedir) > 0 ? '⏳ PENDIENTE' : '-'}
        </td>
        <td class="text-center font-bold ${row.alerta === '🚨 ADICIÓN' ? 'text-orange-600' : 'text-text-muted'}">
          ${row.alerta}
        </td>
      `;
      bodyEl.appendChild(tr);
      rowIndex++;
    });
  } 
  else if (simActiveTab === 'surtido') {
    // RESUMEN SURTIDO COUNTERS
    const completeCount = simPedidosData.filter(r => r.recibido === 'completo' && r.active && parseFloat(r.pedir) > 0).length;
    const partialCount = simPedidosData.filter(r => parseFloat(r.pedir) > 0 && r.active && !r.recibido).length;
    const nonexistentCount = simPedidosData.filter(r => r.recibido === 'inexistente' && r.active && parseFloat(r.pedir) > 0).length;
    const additionCount = simPedidosData.filter(r => r.alerta === '🚨 ADICIÓN' && r.active).length;

    headEl.innerHTML = `
      <tr class="bg-surface-2 border-b border-border">
        <th class="w-10 bg-surface-2 border-r border-border text-center text-text-muted font-bold"></th>
        <th class="text-center font-bold text-[10px] text-text-muted">A</th>
        <th class="text-center font-bold text-[10px] text-text-muted">B</th>
        <th class="text-center font-bold text-[10px] text-text-muted">C</th>
        <th class="text-center font-bold text-[10px] text-text-muted">D</th>
        <th class="text-center font-bold text-[10px] text-text-muted">E</th>
        <th class="w-4 bg-surface-2 border-l border-r border-border text-center text-text-muted"></th>
        <th class="text-center font-bold text-[10px] text-text-muted">F</th>
        <th class="text-center font-bold text-[10px] text-text-muted">G</th>
      </tr>
      <tr class="bg-emerald-950/20 border-b border-border">
        <th class="text-center font-bold bg-surface-2 border-r border-border text-text-muted">1</th>
        <th colspan="5" class="py-2 text-center font-bold text-verde dark:text-emerald-400 uppercase tracking-wider font-serif">
          MISE — SURTIDO RÁPIDO (B-Andares)
        </th>
        <th class="bg-surface-2 border-l border-r border-border"></th>
        <th colspan="2" class="py-2 text-center font-bold text-oro uppercase tracking-wider font-serif bg-surface-2">
          RESUMEN SURTIDO
        </th>
      </tr>
      <tr class="bg-surface border-b border-border">
        <td class="text-center font-bold bg-surface-2 border-r border-border text-text-muted">2</td>
        <td colspan="5" class="px-3 py-1.5 text-xs text-text-muted font-light text-center">
          Instrucciones: Marca ✅ si llegó completo o ❌ si no hay. Cantidad manual si llegó parcial.
        </td>
        <td class="bg-surface-2 border-l border-r border-border"></td>
        <td class="px-3 py-1 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/10 text-emerald-800 dark:text-emerald-400 border-b border-border">✅ Completos</td>
        <td class="px-3 py-1 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/10 text-center border-b border-border text-emerald-800 dark:text-emerald-400">${completeCount}</td>
      </tr>
      <tr class="bg-surface-2 border-b border-border text-[10px] text-text-muted">
        <th class="text-center font-bold bg-surface-2 border-r border-border text-text-muted">3</th>
        <th>PRODUCTO</th>
        <th class="w-16">CANT. PEDIDA</th>
        <th class="w-16">CANT. RECIBIDA</th>
        <th class="w-20">✅ COMPLETO</th>
        <th class="w-20">❌ INEXISTENTE</th>
        <th class="bg-surface-2 border-l border-r border-border"></th>
        <td class="px-3 py-1 text-xs font-bold bg-amber-50 dark:bg-amber-950/10 text-amber-700 dark:text-amber-400 border-b border-border">⚠️ Incompletos</td>
        <td class="px-3 py-1 text-xs font-bold bg-amber-50 dark:bg-amber-950/10 text-center border-b border-border text-amber-700 dark:text-amber-400">${partialCount}</td>
      </tr>
    `;
    
    const filteredRows = simPedidosData.filter(r => parseFloat(r.pedir) > 0 && r.active);
    
    if (filteredRows.length === 0) {
      bodyEl.innerHTML = `
        <tr>
          <td colspan="9" class="text-center py-10 text-text-muted italic">
            No hay productos en el pedido. Regresa a PEDIDO DIARIO y captura cantidades.
          </td>
        </tr>
      `;
      return;
    }
    
    let rowIndex = 4;
    filteredRows.forEach(row => {
      let rowClass = '';
      let recVal = '';
      if (row.recibido === 'completo') {
        rowClass = 'success-row';
        recVal = row.pedir;
      } else if (row.recibido === 'inexistente') {
        rowClass = 'inactive-row';
        recVal = '0';
      }
      
      const tr = document.createElement('tr');
      tr.className = rowClass;
      
      // Dynamic right side cells for Resume
      let resumeLabelCell = '';
      let resumeValCell = '';
      
      if (rowIndex === 4) {
        resumeLabelCell = `<td class="px-3 py-1 bg-red-50 dark:bg-red-950/10 text-red-800 dark:text-red-400 font-bold border-b border-border">❌ Inexistentes</td>`;
        resumeValCell = `<td class="px-3 py-1 bg-red-50 dark:bg-red-950/10 text-red-800 dark:text-red-400 font-bold text-center border-b border-border">${nonexistentCount}</td>`;
      } else if (rowIndex === 5) {
        resumeLabelCell = `<td class="px-3 py-1 bg-orange-50 dark:bg-orange-950/10 text-orange-700 dark:text-orange-400 font-bold border-b border-border">🚨 Adiciones</td>`;
        resumeValCell = `<td class="px-3 py-1 bg-orange-50 dark:bg-orange-950/10 text-orange-700 dark:text-orange-400 font-bold text-center border-b border-border">${additionCount}</td>`;
      } else {
        resumeLabelCell = `<td class="bg-surface-2 border-b border-border"></td>`;
        resumeValCell = `<td class="bg-surface-2 border-b border-border"></td>`;
      }
      
      tr.innerHTML = `
        <td class="text-center font-bold bg-surface-2 border-r border-border text-text-muted select-none">${rowIndex}</td>
        <td class="font-bold cursor-pointer hover:underline" onclick="selectSimCell('A${rowIndex}', '${row.prod}')">${row.prod}</td>
        <td class="text-center font-bold">${row.pedir}</td>
        <td class="text-center font-bold bg-surface-2">
          <input type="text" class="sim-cell-input text-center font-bold text-text-muted" disabled value="${recVal}" placeholder="-">
        </td>
        <td class="text-center">
          <input type="checkbox" ${row.recibido === 'completo' ? 'checked' : ''} 
            onclick="toggleSimSurtidoCheckbox(${row.no}, 'completo')" class="w-4 h-4 border-border rounded text-verde focus:ring-verde">
        </td>
        <td class="text-center">
          <input type="checkbox" ${row.recibido === 'inexistente' ? 'checked' : ''} 
            onclick="toggleSimSurtidoCheckbox(${row.no}, 'inexistente')" class="w-4 h-4 border-border rounded text-red-600 focus:ring-red-600">
        </td>
        <td class="bg-surface-2 border-l border-r border-border"></td>
        ${resumeLabelCell}
        ${resumeValCell}
      `;
      bodyEl.appendChild(tr);
      rowIndex++;
    });
  }
  else if (simActiveTab === 'maestro') {
    headEl.innerHTML = `
      <tr class="bg-surface-2 border-b border-border">
        <th class="w-10 bg-surface-2 border-r border-border text-center text-text-muted font-bold"></th>
        <th class="text-center font-bold text-[10px] text-text-muted">A</th>
        <th class="text-center font-bold text-[10px] text-text-muted">B</th>
        <th class="text-center font-bold text-[10px] text-text-muted">C</th>
        <th class="text-center font-bold text-[10px] text-text-muted">D</th>
        <th class="text-center font-bold text-[10px] text-text-muted">E</th>
        <th class="text-center font-bold text-[10px] text-text-muted">F</th>
        <th class="text-center font-bold text-[10px] text-text-muted">G</th>
        <th class="text-center font-bold text-[10px] text-text-muted">H</th>
        <th class="text-center font-bold text-[10px] text-text-muted">I</th>
      </tr>
      <tr class="bg-emerald-950/20 border-b border-border">
        <th class="text-center font-bold bg-surface-2 border-r border-border text-text-muted">1</th>
        <th colspan="9" class="py-2 text-center font-bold text-verde dark:text-emerald-400 uppercase tracking-wider font-serif">
          MISE — CATÁLOGO MAESTRO (Bodega Central)
        </th>
      </tr>
      <tr class="bg-surface-2 border-b border-border text-[10px] text-text-muted">
        <th class="text-center font-bold bg-surface-2 border-r border-border text-text-muted">2</th>
        <th>No</th>
        <th>ID_FAMILIA</th>
        <th>PRODUCTO</th>
        <th>PRESENTACION</th>
        <th>UNIDAD</th>
        <th class="w-20">ACTIVO</th>
        <th>MÍN</th>
        <th>MÁX</th>
        <th class="w-20">SELECCIONAR</th>
      </tr>
    `;
    
    let rowIndex = 3;
    simMaestroData.forEach(row => {
      let rowClass = '';
      if (row.activo === 'NO') {
        rowClass = 'inactive-row';
      } else if (row.selected) {
        rowClass = 'active-row';
      }
      
      const tr = document.createElement('tr');
      tr.className = rowClass;
      tr.innerHTML = `
        <td class="text-center font-bold bg-surface-2 border-r border-border text-text-muted select-none">${rowIndex}</td>
        <td class="text-center font-bold">${row.no}</td>
        <td class="text-center font-mono">${row.id}</td>
        <td class="font-bold cursor-pointer hover:underline" onclick="selectSimCell('D${rowIndex}', '${row.prod}')">${row.prod}</td>
        <td>${row.pres}</td>
        <td class="text-center">${row.unit}</td>
        <td class="edit-cell text-center font-bold" onclick="toggleSimMaestroActivo(${row.no})">
          ${row.activo}
        </td>
        <td class="text-center">${row.min}</td>
        <td class="text-center">${row.max}</td>
        <td class="text-center">
          <input type="checkbox" ${row.selected ? 'checked' : ''} onclick="toggleSimMaestroSelect(${row.no})" class="w-4 h-4 border-border rounded text-oro focus:ring-oro">
        </td>
      `;
      bodyEl.appendChild(tr);
      rowIndex++;
    });
  }
  else if (simActiveTab === 'kardex') {
    headEl.innerHTML = `
      <tr class="bg-surface-2 border-b border-border">
        <th class="w-10 bg-surface-2 border-r border-border text-center text-text-muted font-bold"></th>
        <th class="text-center font-bold text-[10px] text-text-muted">A</th>
        <th class="text-center font-bold text-[10px] text-text-muted">B</th>
        <th class="text-center font-bold text-[10px] text-text-muted">C</th>
        <th class="text-center font-bold text-[10px] text-text-muted">D</th>
        <th class="text-center font-bold text-[10px] text-text-muted">E</th>
      </tr>
      <tr class="bg-emerald-950/20 border-b border-border">
        <th class="text-center font-bold bg-surface-2 border-r border-border text-text-muted">1</th>
        <th colspan="5" class="py-2 text-center font-bold text-verde dark:text-emerald-400 uppercase tracking-wider font-serif">
          MISE — REGISTRO KARDEX (B-Andares)
        </th>
      </tr>
      <tr class="bg-surface border-b border-border">
        <td class="text-center font-bold bg-surface-2 border-r border-border text-text-muted">2</td>
        <td colspan="5" class="px-3 py-1.5 text-center font-bold text-text-muted font-mono">
          <span>KARDEX ACTIVO DESDE LUNES:</span> <span class="text-oro font-bold">${getFormattedDate()}</span>
        </td>
      </tr>
      <tr class="bg-surface-2 border-b border-border text-[10px] text-text-muted">
        <th class="text-center font-bold bg-surface-2 border-r border-border text-text-muted">3</th>
        <th>No</th>
        <th>PRODUCTO</th>
        <th class="w-24">LUN (ENT)</th>
        <th class="w-24">LUN (SAL)</th>
        <th class="w-24">SALDO ACTUAL</th>
      </tr>
    `;
    
    let rowIndex = 4;
    simKardexData.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="text-center font-bold bg-surface-2 border-r border-border text-text-muted select-none">${rowIndex}</td>
        <td class="text-center font-bold">${row.no}</td>
        <td class="font-bold cursor-pointer hover:underline" onclick="selectSimCell('B${rowIndex}', '${row.prod}')">${row.prod}</td>
        <td class="text-center bg-emerald-50 dark:bg-emerald-950/10">
          <input type="text" class="sim-cell-input text-emerald-800 dark:text-emerald-400 font-bold" 
            value="${row.lunEnt}" 
            onfocus="selectSimCell('C${rowIndex}', '${row.lunEnt}')"
            oninput="handleKardexInputChange(${row.no}, 'lunEnt', this.value)">
        </td>
        <td class="text-center bg-red-50 dark:bg-red-950/10">
          <input type="text" class="sim-cell-input text-red-800 dark:text-red-400 font-bold" 
            value="${row.lunSal}" 
            onfocus="selectSimCell('D${rowIndex}', '${row.lunSal}')"
            oninput="handleKardexInputChange(${row.no}, 'lunSal', this.value)">
        </td>
        <td class="text-center font-bold text-oro" onclick="selectSimCell('E${rowIndex}', '${row.saldo}')">
          ${row.saldo}
        </td>
      `;
      bodyEl.appendChild(tr);
      rowIndex++;
    });
  }
  
  updateSimKPIs();
}

window.openOnboarding = function(force = false) {
  navigateTo('simulator');
};

