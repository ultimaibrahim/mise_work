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
});

// --- MANEJO DE NAVEGACIÓN ---
const navItems = document.querySelectorAll('.nav-item');
const docSections = document.querySelectorAll('.doc-section');
const headerTitle = document.getElementById('header-title');
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menu-toggle');
const menuIcon = document.getElementById('menu-icon');

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
      sidebar.classList.remove('open');
      menuIcon.setAttribute('data-lucide', 'menu');
      lucide.createIcons();
    }
  });
});

// Toggle menú móvil
if (menuToggle) {
  menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    if (sidebar.classList.contains('open')) {
      menuIcon.setAttribute('data-lucide', 'x');
    } else {
      menuIcon.setAttribute('data-lucide', 'menu');
    }
    lucide.createIcons();
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

const INITIAL_PEDIDOS = [
  { no: 1, cat: '1. REFRIGERADOS', prod: 'Harina Crepas (Domo)', unit: 'kg', pedir: '', recibido: '', estado: '⏳ PENDIENTE', alerta: '-', active: true },
  { no: 2, cat: '1. REFRIGERADOS', prod: 'Queso Mozzarella', unit: 'kg', pedir: '', recibido: '', estado: '⏳ PENDIENTE', alerta: '-', active: true },
  { no: 3, cat: '2. ABARROTES', prod: 'Nutella', unit: 'bote', pedir: '', recibido: '', estado: '⏳ PENDIENTE', alerta: '-', active: true },
  { no: 4, cat: '2. ABARROTES', prod: 'Azúcar Refinada', unit: 'bulto', pedir: '', recibido: '', estado: '⏳ PENDIENTE', alerta: '-', active: true },
  { no: 5, cat: '3. FRUTAS Y VERDURAS', prod: 'Fresa Entera', unit: 'caja', pedir: '', recibido: '', estado: '⏳ PENDIENTE', alerta: '-', active: false }
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
        <p class="mb-3">Como <strong>Encargado de Tienda</strong>, tu labor consiste en registrar el pedido diario a pie de pasillo en tu celular o PC.</p>
        <p class="mb-3">A la izquierda verás la hoja de cálculo interactiva cargada en la sección <strong>PEDIDO DIARIO</strong>.</p>
        <p class="text-oro font-semibold">Presiona "Siguiente" para comenzar el tutorial interactivo.</p>
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
        <p class="mb-3">Vamos a simular el levantamiento. Haz clic en la celda amarilla bajo la columna <strong>PEDIR</strong> para la fila de <strong>Harina Crepas (F2)</strong> e introduce la cantidad <strong>1.5</strong>.</p>
        <p class="mb-3 text-xs text-text-muted">Consejo: Al capturar, la fila completa se ilumina en amarillo para confirmar visualmente el insumo pedido.</p>
      `,
      init: () => {
        simActiveTab = 'pedido';
        renderSimTabs();
        renderSimTable();
        setTimeout(() => {
          const input = document.getElementById('input-pedir-1');
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
      errorMsg: "Ingresa un número válido mayor a 0 (ej. 1.5) en la celda PEDIR de Harina Crepas (F2)."
    },
    {
      title: "3. Ordenamiento por Categorías",
      desc: `
        <p class="mb-3">¡Excelente! La fila se sombreó en amarillo de forma automática.</p>
        <p class="mb-3">Para agilizar el surtido por pasillo, presiona el botón inferior o selecciona <strong>Sincronizar estados</strong> en el menú <strong>⚙️ Mise</strong> para simular el reordenamiento.</p>
        <div class="flex justify-center my-4">
          <button onclick="simRunSort()" class="btn-ob primary text-xs flex items-center gap-1.5"><i data-lucide="arrow-down-narrow-wide" class="w-4 h-4"></i> Ordenar y Agrupar Pasillos</button>
        </div>
      `,
      init: () => {
        renderSimTable();
      },
      verify: () => {
        return simIsSorted;
      },
      errorMsg: "Presiona el botón 'Ordenar y Agrupar Pasillos' para simular el ordenamiento."
    },
    {
      title: "4. Alertas de Adiciones",
      desc: `
        <p class="mb-3">¡La lista se ha reorganizado físicamente agrupando las categorías!</p>
        <p class="mb-3">Si agregas una cantidad extra después del envío, el sistema lo marcará como adición. Edita la celda <strong>PEDIR de Nutella (F3)</strong> ingresando la cantidad <strong>1</strong>.</p>
      `,
      init: () => {
        simActiveTab = 'pedido';
        renderSimTable();
        setTimeout(() => {
          const input = document.getElementById('input-pedir-3');
          if (input) {
            input.focus();
            input.select();
          }
        }, 100);
      },
      verify: () => {
        const val = parseFloat(simPedidosData[2].pedir);
        return !isNaN(val) && val > 0;
      },
      errorMsg: "Introduce la cantidad 1 en la celda de Nutella (F3) para simular la adición."
    },
    {
      title: "5. Surtido Rápido Móvil",
      desc: `
        <p class="mb-3">¡Perfecto! Al agregar Nutella a destiempo, el sistema generó automáticamente la alerta <strong>🚨 ADICIÓN</strong> en color naranja.</p>
        <p class="mb-3">Ahora simulemos la entrega. Haz clic en la pestaña <strong>🚚 SURTIDO RÁPIDO</strong> a la izquierda e indica que la Harina llegó <strong>Completa</strong> marcando su casilla.</p>
      `,
      init: () => {
        // Enlazar pestaña
      },
      verify: () => {
        return simActiveTab === 'surtido' && simPedidosData[0].recibido === 'completo';
      },
      errorMsg: "Selecciona la pestaña 🚚 SURTIDO RÁPIDO y marca la casilla Completo para Harina Crepas."
    },
    {
      title: "6. ¡Flujo Completado!",
      desc: `
        <p class="mb-3">¡Enhorabuena! Has aprendido a pedir, ordenar pasillos, ver adiciones y registrar el recibo en móvil.</p>
        <p class="mb-3">Al marcar completo, la fila cambia a color verde y los KPIs superiores se actualizan al instante.</p>
        <div class="flex flex-col gap-2 pt-2">
          <button onclick="navigateTo('manual')" class="btn-ob text-xs justify-center font-bold">Ver el Manual Detallado</button>
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
        <p class="mb-3">Como <strong>Administrador de Bodegas</strong>, administras el catálogo de productos y registras el Kardex de entradas/salidas.</p>
        <p class="mb-3">En el simulador izquierdo verás la hoja <strong>MAESTRO</strong>. Haz clic en "Siguiente" para iniciar.</p>
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
        <p class="mb-3">Para volver a habilitar la <strong>Fresa Entera</strong> en las tiendas, cambia el valor de su celda <strong>ACTIVO (Columna F, Fila 4)</strong> haciendo clic en su celda <strong>NO</strong>.</p>
        <p class="mb-3 text-xs text-text-muted">Nota: Cuando un producto cambia a ACTIVO = SÍ, aparece de inmediato en el pedido de las tiendas.</p>
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
        <p class="mb-3">Registramos entradas y salidas en el Kardex. Haz clic en la pestaña <strong>KARDEX_BA</strong> a la izquierda para ver el formato.</p>
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
        <p class="mb-3">Esto simulará el respaldo histórico, la limpieza de registros diarios y el traslado del stock final como saldo inicial.</p>
      `,
      init: () => {
        simActiveTab = 'kardex';
        renderSimTable();
      },
      verify: () => {
        return simWeekAdvanced;
      },
      errorMsg: "Haz clic en el menú ⚙️ Mise → 'Avanzar semana' y confirma el cuadro de diálogo."
    },
    {
      title: "5. ¡Capacitación Terminada!",
      desc: `
        <p class="mb-3">¡Cierre semanal procesado con éxito! Las celdas se han limpiado y los saldos iniciales se trasladaron de forma inteligente.</p>
        <p class="mb-3">Ya estás listo para operar la Suite MISE con total confianza.</p>
        <div class="flex flex-col gap-2 pt-2">
          <button onclick="navigateTo('manual')" class="btn-ob text-xs justify-center font-bold">Ver el Manual Detallado</button>
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
  simRole = role;
  simCurrentStep = 0;
  simIsSorted = false;
  simWeekAdvanced = false;
  
  const badge = document.getElementById('sim-role-badge');
  if (badge) {
    badge.textContent = `ROL: ${simRole === 'pedidos' ? 'ENCARGADO' : 'BODEGUERO'}`;
  }
  
  initStep();
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
      selectSimCell(`E${no + 1}`, value, value);
      renderSimTable();
      updateSimKPIs();
      
      // Auto triggers for tutorial helpers
      if (simCurrentStep === 1 && no === 1 && parseFloat(value) > 0) {
        const nextBtn = document.getElementById('sim-btn-next');
        if (nextBtn) nextBtn.classList.add('animate-bounce');
      }
      
      if (simCurrentStep === 3 && no === 3 && parseFloat(value) > 0) {
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
    simStepNext();
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
      
      if (simCurrentStep === 4 && no === 1 && row.recibido === 'completo') {
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
        // Wait for render to finish
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
    headEl.innerHTML = `
      <tr>
        <th class="w-10">No</th>
        <th>CATEGORÍA</th>
        <th>PRODUCTO</th>
        <th>UNIDAD</th>
        <th class="w-20">PEDIR</th>
        <th class="w-24">ESTADO</th>
        <th>ALERTAS</th>
      </tr>
    `;
    
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
        <td class="text-center font-bold">${row.no}</td>
        <td class="font-bold text-emerald-800 dark:text-emerald-400">${row.cat}</td>
        <td class="font-bold cursor-pointer hover:underline" onclick="selectSimCell('C${row.no+1}', '${row.prod}')">${row.prod}</td>
        <td class="text-center">${row.unit}</td>
        <td class="edit-cell text-center font-bold">
          <input type="text" class="sim-cell-input" id="input-pedir-${row.no}" 
            value="${row.pedir}" 
            onfocus="selectSimCell('E${row.no+1}', '${row.pedir}')"
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
    });
  } 
  else if (simActiveTab === 'surtido') {
    headEl.innerHTML = `
      <tr>
        <th>PRODUCTO</th>
        <th class="w-20">PEDIDO</th>
        <th class="w-24">COMPLETO</th>
        <th class="w-24">INEXISTENTE</th>
      </tr>
    `;
    
    const filteredRows = simPedidosData.filter(r => parseFloat(r.pedir) > 0 && r.active);
    
    if (filteredRows.length === 0) {
      bodyEl.innerHTML = `
        <tr>
          <td colspan="4" class="text-center py-8 text-text-muted italic">
            No hay productos en el pedido. Regresa a PEDIDO DIARIO y captura cantidades.
          </td>
        </tr>
      `;
      return;
    }
    
    filteredRows.forEach(row => {
      let rowClass = '';
      if (row.recibido === 'completo') {
        rowClass = 'success-row';
      } else if (row.recibido === 'inexistente') {
        rowClass = 'inactive-row';
      }
      
      const tr = document.createElement('tr');
      tr.className = rowClass;
      tr.innerHTML = `
        <td class="font-bold cursor-pointer hover:underline" onclick="selectSimCell('A${row.no+1}', '${row.prod}')">${row.prod}</td>
        <td class="text-center font-bold">${row.pedir}</td>
        <td class="text-center">
          <input type="checkbox" ${row.recibido === 'completo' ? 'checked' : ''} 
            onclick="toggleSimSurtidoCheckbox(${row.no}, 'completo')">
        </td>
        <td class="text-center">
          <input type="checkbox" ${row.recibido === 'inexistente' ? 'checked' : ''} 
            onclick="toggleSimSurtidoCheckbox(${row.no}, 'inexistente')">
        </td>
      `;
      bodyEl.appendChild(tr);
    });
  }
  else if (simActiveTab === 'maestro') {
    headEl.innerHTML = `
      <tr>
        <th class="w-10">No</th>
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
        <td class="text-center font-bold">${row.no}</td>
        <td class="text-center font-mono">${row.id}</td>
        <td class="font-bold cursor-pointer hover:underline" onclick="selectSimCell('C${row.no+1}', '${row.prod}')">${row.prod}</td>
        <td>${row.pres}</td>
        <td class="text-center">${row.unit}</td>
        <td class="edit-cell text-center font-bold" onclick="toggleSimMaestroActivo(${row.no})">
          ${row.activo}
        </td>
        <td class="text-center">${row.min}</td>
        <td class="text-center">${row.max}</td>
        <td class="text-center">
          <input type="checkbox" ${row.selected ? 'checked' : ''} onclick="toggleSimMaestroSelect(${row.no})">
        </td>
      `;
      bodyEl.appendChild(tr);
    });
  }
  else if (simActiveTab === 'kardex') {
    headEl.innerHTML = `
      <tr>
        <th class="w-10">No</th>
        <th>PRODUCTO</th>
        <th class="w-24">LUN (ENT)</th>
        <th class="w-24">LUN (SAL)</th>
        <th class="w-24">SALDO ACTUAL</th>
      </tr>
    `;
    
    simKardexData.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="text-center font-bold">${row.no}</td>
        <td class="font-bold cursor-pointer hover:underline" onclick="selectSimCell('B${row.no+1}', '${row.prod}')">${row.prod}</td>
        <td class="text-center bg-emerald-50 dark:bg-emerald-950/10">
          <input type="text" class="sim-cell-input text-emerald-800 dark:text-emerald-400 font-bold" 
            value="${row.lunEnt}" 
            onfocus="selectSimCell('C${row.no+1}', '${row.lunEnt}')"
            oninput="handleKardexInputChange(${row.no}, 'lunEnt', this.value)">
        </td>
        <td class="text-center bg-red-50 dark:bg-red-950/10">
          <input type="text" class="sim-cell-input text-red-800 dark:text-red-400 font-bold" 
            value="${row.lunSal}" 
            onfocus="selectSimCell('D${row.no+1}', '${row.lunSal}')"
            oninput="handleKardexInputChange(${row.no}, 'lunSal', this.value)">
        </td>
        <td class="text-center font-bold text-oro" onclick="selectSimCell('E${row.no+1}', '${row.saldo}')">
          ${row.saldo}
        </td>
      `;
      bodyEl.appendChild(tr);
    });
  }
  
  updateSimKPIs();
}

window.openOnboarding = function(force = false) {
  navigateTo('simulator');
};
