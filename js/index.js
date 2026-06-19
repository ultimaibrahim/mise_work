// Inicializar Iconos Lucide al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  openOnboarding(false); // Auto-lanzamiento en primer inicio si no se ha completado
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

// --- MANEJO DE TEMA (CLARO / OSCURO) ---
const htmlEl = document.documentElement;
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    const currentTheme = htmlEl.getAttribute('data-theme');
    if (currentTheme === 'dark') {
      htmlEl.setAttribute('data-theme', 'light');
      themeIcon.setAttribute('data-lucide', 'moon');
    } else {
      htmlEl.setAttribute('data-theme', 'dark');
      themeIcon.setAttribute('data-lucide', 'sun');
    }
    lucide.createIcons();
  });
}

// --- BUSCADOR EN VIVO ---
const searchInput = document.getElementById('search-input');
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    
    if (!query) {
      // Restaurar navegación normal
      navItems.forEach(i => i.style.display = 'flex');
      return;
    }

    // Filtrar elementos de navegación y auto-mostrar el primero que coincida
    let foundTarget = null;
    navItems.forEach(item => {
      const text = item.textContent.toLowerCase();
      const target = item.getAttribute('data-target');
      const section = document.getElementById(`sect-${target}`);
      const sectionContent = section ? section.textContent.toLowerCase() : '';
      
      if (text.includes(query) || sectionContent.includes(query)) {
        item.style.display = 'flex';
        if (!foundTarget) foundTarget = item;
      } else {
        item.style.display = 'none';
      }
    });

    // Si encuentra coincidencia, la activa de forma automática
    if (foundTarget) {
      foundTarget.click();
    }
  });
}

// --- MOCKUP INTERACTIVO (TÁCTIL / CLICK) ---
const hoverCells = document.querySelectorAll('.hover-cell');
const tooltipBoxes = document.querySelectorAll('.tooltip-info-box');

hoverCells.forEach(cell => {
  // Evento Click/Tap para móviles y escritorio
  cell.addEventListener('click', (e) => {
    e.stopPropagation();
    const tipId = cell.getAttribute('data-tip');
    
    // Quitar estado activo táctil de otras celdas
    hoverCells.forEach(c => c.classList.remove('active-touch'));
    
    // Ocultar todos los tooltips
    tooltipBoxes.forEach(box => box.style.display = 'none');
    
    // Mostrar tooltip correspondiente
    const targetBox = document.getElementById(`tip-${tipId}`);
    if (targetBox) {
      cell.classList.add('active-touch');
      targetBox.style.display = 'block';
    }
  });

  // Evento Hover para escritorio
  cell.addEventListener('mouseenter', () => {
    const tipId = cell.getAttribute('data-tip');
    tooltipBoxes.forEach(box => box.style.display = 'none');
    const targetBox = document.getElementById(`tip-${tipId}`);
    if (targetBox) {
      targetBox.style.display = 'block';
    }
  });
});

// Ocultar cajas de información al hacer clic en cualquier otra parte de la pantalla
document.addEventListener('click', () => {
  tooltipBoxes.forEach(box => box.style.display = 'none');
  hoverCells.forEach(c => c.classList.remove('active-touch'));
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

// --- LÓGICA DEL WALKTHROUGH DE ONBOARDING ---
let obRole = null; // 'bodega' o 'pedidos'
let obCurrentStep = 0;
let obViewMode = 'pc'; // 'pc' o 'movil'

const obOverlay = document.getElementById('onboarding-overlay');
const obTitle = document.getElementById('ob-title');
const obBody = document.getElementById('ob-body');
const obProgressBar = document.getElementById('ob-progress-bar');
const obBtnBack = document.getElementById('ob-btn-back');
const obBtnNext = document.getElementById('ob-btn-next');
const obBtnSkip = document.getElementById('ob-btn-skip');
const obDotsContainer = document.getElementById('ob-dots');

const OB_CONTENT = {
  welcome: {
    title: "Elige tu Rol de Trabajo",
    render: () => `
      <p style="margin-bottom:1.5rem; text-align:center; color:var(--text-muted); font-size:0.95rem; line-height:1.6;">
        Bienvenido al sistema inteligente de control y distribución de existencias de **La Crêpe Parisienne**. 
        Para comenzar el recorrido guiado, por favor selecciona el perfil correspondiente a tu labor operativa diaria:
      </p>
      <div class="role-selection-grid">
        <div class="role-card ${obRole === 'bodega' ? 'selected' : ''}" id="role-btn-bodega">
          <div class="role-card-icon"><i data-lucide="warehouse" style="width:24px; height:24px;"></i></div>
          <h4 class="card-title" style="margin-top:0.5rem; font-size:1.1rem;">Surtidor / Bodeguero</h4>
          <p class="card-desc" style="font-size:0.85rem; line-height:1.4;">Control de stock semanal en la bodega central, entradas, salidas y administración del catálogo oficial.</p>
        </div>
        <div class="role-card ${obRole === 'pedidos' ? 'selected' : ''}" id="role-btn-pedidos">
          <div class="role-card-icon"><i data-lucide="store" style="width:24px; height:24px;"></i></div>
          <h4 class="card-title" style="margin-top:0.5rem; font-size:1.1rem;">Encargado de Tienda</h4>
          <p class="card-desc" style="font-size:0.85rem; line-height:1.4;">Levantamiento de pedidos diarios a pie de pasillo y conciliación de mercancía física recibida.</p>
        </div>
      </div>
      <p style="margin-top:2rem; font-size:0.82rem; text-align:center; color:var(--oro); font-weight:500;">
        *Nota: Podrás alternar de perfil o repetir esta guía en cualquier momento pulsando "Guía de Inicio" en la barra lateral.*
      </p>
    `
  },
  bodega: [
    {
      title: "Catálogo MAESTRO (Configuración)",
      render: () => `
        <p style="font-size:0.92rem; line-height:1.6; margin-bottom:1rem;">
          En el libro de <strong>Bodegas</strong>, la pestaña <strong>MAESTRO</strong> administra las altas, bajas y estados de todos los insumos que pueden ordenar las tiendas.
        </p>
        
        <div class="preview-container">
          <div class="preview-header">
            <span style="font-size:0.75rem; font-weight:600; color:var(--text-muted);"><i data-lucide="eye" style="width:14px; vertical-align:middle; margin-right:4px;"></i> Visualización del Diseño</span>
          </div>
          <div class="preview-content">
              <div class="mock-desktop">
                <div style="background:var(--header-bg); padding:0.5rem; border-bottom:1px solid var(--border); font-weight:600; display:flex; gap:0.4rem; font-size:0.75rem;"><i data-lucide="file-spreadsheet" style="width:14px;"></i> Bodegas &gt; MAESTRO</div>
                <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.75rem;">
                  <tr style="background:var(--surface-2); font-weight:bold; color:var(--text-muted);">
                    <th style="padding:0.45rem 0.6rem; border:1px solid var(--border);">PRODUCTO</th>
                    <th style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center;">ACTIVO</th>
                    <th style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center;">SELECCIONAR</th>
                  </tr>
                  <tr>
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); font-weight:600;">Jamón Lala Pechuga</td>
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center; color:var(--verde-soft); font-weight:bold;">SÍ</td>
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center;"><input type="checkbox" checked disabled></td>
                  </tr>
                </table>
              </div>
          </div>
        </div>
        
        <div class="dos-donts-grid">
          <div class="dos-box">
            <div class="dos-box-title"><i data-lucide="check-circle" style="width:16px;"></i> Permitido (Dos)</div>
            <ul class="rules-list">
              <li>Utilizar el menú <strong>⚙️ Mise → Editar productos seleccionados</strong> en PC para corregir nombres en lote.</li>
              <li>Marcar <strong>NO</strong> en la columna ACTIVO para ocultar de inmediato insumos agotados de las vistas de tiendas.</li>
            </ul>
          </div>
          <div class="donts-box">
            <div class="donts-box-title"><i data-lucide="x-circle" style="width:16px;"></i> A Evitar (Don'ts)</div>
            <ul class="rules-list">
              <li><strong>NO</strong> renombres o borres filas del catálogo de forma manual directa. Esto corrompe la sincronización.</li>
              <li><strong>NO</strong> limpies las casillas de selección manualmente; usa la celda interactiva <strong>Limpiar Sel. (H2)</strong>.</li>
            </ul>
          </div>
        </div>
      `
    },
    {
      title: "Kardex de Entradas y Salidas",
      render: () => `
        <p style="font-size:0.92rem; line-height:1.6; margin-bottom:1rem;">
          En las pestañas <strong>KARDEX_BA</strong> (Andares) y <strong>KARDEX_BM</strong> (Mercado), el bodeguero registra entradas (compras) y salidas (entregas) diarias. El stock neto se calcula automáticamente.
        </p>
        
        <div class="preview-container">
          <div class="preview-header">
            <span style="font-size:0.75rem; font-weight:600; color:var(--text-muted);"><i data-lucide="eye" style="width:14px; vertical-align:middle; margin-right:4px;"></i> Visualización del Diseño</span>
          </div>
          <div class="preview-content">
              <div class="mock-desktop">
                <div style="background:var(--header-bg); padding:0.5rem; border-bottom:1px solid var(--border); font-weight:600; font-size:0.75rem;"><i data-lucide="file-spreadsheet" style="width:14px;"></i> Bodegas &gt; KARDEX_BA</div>
                <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.72rem;">
                  <tr style="background:var(--surface-2); font-weight:bold; color:var(--text-muted);">
                    <th style="padding:0.45rem 0.6rem; border:1px solid var(--border);">PRODUCTO</th>
                    <th style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center;">LUN (ENT)</th>
                    <th style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center;">LUN (SAL)</th>
                    <th style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center;">SALDO ACTUAL</th>
                  </tr>
                  <tr>
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); font-weight:600;">Queso Mozzarella</td>
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center; background:#eef9f0;">10</td>
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center; background:#fdf2f2;">3</td>
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center; font-weight:bold; color:var(--oro);">7 kg</td>
                  </tr>
                </table>
              </div>
          </div>
        </div>
        
        <div class="dos-donts-grid">
          <div class="dos-box">
            <div class="dos-box-title"><i data-lucide="check-circle" style="width:16px;"></i> Permitido (Dos)</div>
            <ul class="rules-list">
              <li>Registrar las entradas físicas (compras) en cuanto ingresan al almacén.</li>
              <li>Ejecutar <strong>Avanzar semana</strong> los sábados al concluir el conteo final de cierre.</li>
            </ul>
          </div>
          <div class="donts-box">
            <div class="donts-box-title"><i data-lucide="x-circle" style="width:16px;"></i> A Evitar (Don'ts)</div>
            <ul class="rules-list">
              <li><strong>NO</strong> alteres las fechas de control de la celda D4 a mitad de semana.</li>
              <li><strong>NO</strong> borres la fila de fórmulas de saldo. El sistema calcula las sumas de forma autónoma.</li>
            </ul>
          </div>
        </div>
      `
    },
    {
      title: "Semáforo de Caducidades",
      render: () => `
        <p style="font-size:0.92rem; line-height:1.6; margin-bottom:1rem;">
          La pestaña <strong>CADUCIDADES</strong> compara las fechas ingresadas en ambos Kardex y colorea alertas automáticas para dar rotación prioritaria.
        </p>
        
        <div class="preview-container">
          <div class="preview-header">
            <span style="font-size:0.75rem; font-weight:600; color:var(--text-muted);"><i data-lucide="eye" style="width:14px; vertical-align:middle; margin-right:4px;"></i> Visualización del Diseño</span>
          </div>
          <div class="preview-content">
              <div class="mock-desktop">
                <div style="background:var(--header-bg); padding:0.5rem; border-bottom:1px solid var(--border); font-weight:600; font-size:0.75rem;"><i data-lucide="file-spreadsheet" style="width:14px;"></i> Bodegas &gt; CADUCIDADES</div>
                <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.72rem;">
                  <tr style="background:var(--surface-2); font-weight:bold; color:var(--text-muted);">
                    <th style="padding:0.45rem 0.6rem; border:1px solid var(--border);">PRODUCTO</th>
                    <th style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center;">B-ANDARES</th>
                    <th style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center;">B-MERCADO</th>
                  </tr>
                  <tr>
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); font-weight:600;">Frambuesa Congelada</td>
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center; background:#ffebeb; color:var(--rojo-soft); font-weight:bold;">25/Jun (≤7d)</td>
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center;">18/Jul (OK)</td>
                  </tr>
                </table>
              </div>
          </div>
        </div>
        
        <div class="dos-donts-grid">
          <div class="dos-box">
            <div class="dos-box-title"><i data-lucide="check-circle" style="width:16px;"></i> Permitido (Dos)</div>
            <ul class="rules-list">
              <li>Revisar este semáforo periódicamente para coordinar traspasos de inventarios lentos entre sucursales.</li>
              <li>Despachar siempre primero los productos con fecha más corta de anaquel (PEPS).</li>
            </ul>
          </div>
          <div class="donts-box">
            <div class="donts-box-title"><i data-lucide="x-circle" style="width:16px;"></i> A Evitar (Don'ts)</div>
            <ul class="rules-list">
              <li><strong>NO</strong> dejes en blanco el campo de caducidad al registrar entradas de insumos perecederos.</li>
              <li><strong>NO</strong> ignores las alertas rojas en pantalla; representan mermas inminentes.</li>
            </ul>
          </div>
        </div>
      `
    }
  ],
  pedidos: [
    {
      title: "Levantamiento de Pedidos",
      render: (viewMode) => `
        <p style="font-size:0.92rem; line-height:1.6; margin-bottom:1rem;">
          En los libros de sucursales, el encargado de tienda captura las cantidades en la columna <strong>CANT. A PEDIR</strong>. Al escribir, la fila se colorea como pendiente.
        </p>
        
        <div class="preview-container">
          <div class="preview-header">
            <span style="font-size:0.75rem; font-weight:600; color:var(--text-muted);"><i data-lucide="eye" style="width:14px; vertical-align:middle; margin-right:4px;"></i> Visualización del Diseño</span>
            <div class="preview-tabs">
              <button class="preview-tab-btn ${viewMode === 'pc' ? 'active' : ''}" onclick="setObViewMode('pc')">PC / Escritorio</button>
              <button class="preview-tab-btn ${viewMode === 'movil' ? 'active' : ''}" onclick="setObViewMode('movil')">Móvil / Celular</button>
            </div>
          </div>
          <div class="preview-content">
            ${viewMode === 'pc' ? `
              <div class="mock-desktop">
                <div style="background:var(--header-bg); padding:0.5rem; border-bottom:1px solid var(--border); font-weight:600; font-size:0.75rem;"><i data-lucide="file-spreadsheet" style="width:14px;"></i> Pedidos Andares &gt; PEDIDO DIARIO</div>
                <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.72rem;">
                  <tr style="background:var(--surface-2); font-weight:bold; color:var(--text-muted);">
                    <th style="padding:0.45rem 0.6rem; border:1px solid var(--border);">PRODUCTO</th>
                    <th style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center;">PEDIR</th>
                    <th style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center;">ESTADO</th>
                  </tr>
                  <tr style="background:#fffdec;">
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); font-weight:600;">Harina Crepas</td>
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center; font-weight:bold;">15</td>
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center; color:#cda300; font-weight:bold;">⏳ PENDIENTE</td>
                  </tr>
                </table>
              </div>
            ` : `
              <div class="mock-phone">
                <div style="background:var(--header-bg); padding:0.4rem; border-bottom:1px solid var(--border); font-weight:600; text-align:center; font-size:0.72rem;">
                  Nuevo Pedido Diario
                </div>
                <div style="padding:0.8rem; display:flex; flex-direction:column; gap:0.4rem; margin-top:0.8rem;">
                  <span style="font-weight:bold; font-size:0.8rem;">Harina Crepas</span>
                  <div style="display:flex; gap:0.5rem; align-items:center;">
                    <span style="color:var(--text-muted);">Pedir:</span>
                    <input type="number" value="15" style="width:60px; text-align:center; background:var(--surface-2); border:1px solid var(--border); color:var(--text); border-radius:var(--radius-sm); padding:0.2rem;" disabled>
                  </div>
                  <span style="color:#cda300; font-weight:bold; font-size:0.7rem; margin-top:0.2rem;">⏳ Estado: Pendiente</span>
                </div>
              </div>
            `}
          </div>
        </div>
        
        <div class="dos-donts-grid">
          <div class="dos-box">
            <div class="dos-box-title"><i data-lucide="check-circle" style="width:16px;"></i> Permitido (Dos)</div>
            <ul class="rules-list">
              <li><strong>¡Usa tu celular!</strong> Puedes recorrer la cocina e ir tecleando las cantidades directo en la hoja Sheets móvil.</li>
              <li>Limpiar la hoja diariamente antes de iniciar marcando la casilla <strong>Resetear (F2)</strong>.</li>
            </ul>
          </div>
          <div class="donts-box">
            <div class="donts-box-title"><i data-lucide="x-circle" style="width:16px;"></i> A Evitar (Don'ts)</div>
            <ul class="rules-list">
              <li><strong>NO</strong> escribas textos en la columna de pedidos; solo valores numéricos mayores a cero.</li>
              <li><strong>NO</strong> borres celdas de fórmulas completas. Solo limpia las columnas de cantidades.</li>
            </ul>
          </div>
        </div>
      `
    },
    {
      title: "Ordenar Pedido",
      render: (viewMode) => `
        <p style="font-size:0.92rem; line-height:1.6; margin-bottom:1rem;">
          Una vez ingresados tus insumos, el botón **Ordenar** los organiza y los acomoda según la disposición física de los pasillos de bodega central.
        </p>
        
        <div class="preview-container">
          <div class="preview-header">
            <span style="font-size:0.75rem; font-weight:600; color:var(--text-muted);"><i data-lucide="eye" style="width:14px; vertical-align:middle; margin-right:4px;"></i> Visualización del Diseño</span>
            <div class="preview-tabs">
              <button class="preview-tab-btn ${viewMode === 'pc' ? 'active' : ''}" onclick="setObViewMode('pc')">PC / Escritorio</button>
              <button class="preview-tab-btn ${viewMode === 'movil' ? 'active' : ''}" onclick="setObViewMode('movil')">Móvil / Celular</button>
            </div>
          </div>
          <div class="preview-content">
            ${viewMode === 'pc' ? `
              <div class="mock-desktop">
                <div style="background:var(--header-bg); padding:0.5rem; border-bottom:1px solid var(--border); font-weight:600; font-size:0.75rem;"><i data-lucide="file-spreadsheet" style="width:14px;"></i> Vista Ordenada</div>
                <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.72rem;">
                  <tr style="background:var(--surface-2); font-weight:bold; color:var(--text-muted);">
                    <th style="padding:0.45rem 0.6rem; border:1px solid var(--border);">PASILLO</th>
                    <th style="padding:0.45rem 0.6rem; border:1px solid var(--border);">PRODUCTO</th>
                    <th style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center;">PEDIDO</th>
                  </tr>
                  <tr style="background:rgba(61, 90, 71, 0.03);">
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); font-weight:bold; color:var(--verde);">REFRIGERADOS</td>
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border);">Queso Mozzarella</td>
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center; font-weight:bold;">10</td>
                  </tr>
                </table>
              </div>
            ` : `
              <div class="mock-phone">
                <p style="text-align:center; font-weight:600; margin-top:2rem; font-size:0.85rem;"><i data-lucide="sort-asc" style="width:20px; display:block; margin:0 auto 0.5rem auto; color:var(--oro);"></i> Recorrido Físico</p>
                <p style="text-align:center; font-size:0.75rem; color:var(--text-muted); padding:0 1rem; line-height:1.4; margin-top:0.4rem;">
                  Al presionar <strong>Ordenar</strong>, el pedido se organiza automáticamente por categorías, permitiendo al bodeguero surtir de golpe sin tener que regresar.
                </p>
              </div>
            `}
          </div>
        </div>
        
        <div class="dos-donts-grid">
          <div class="dos-box">
            <div class="dos-box-title"><i data-lucide="check-circle" style="width:16px;"></i> Permitido (Dos)</div>
            <ul class="rules-list">
              <li>Utilizar el checkbox **Ordenar (D2)** para reacomodar la lista una vez hayas terminado de registrar todo.</li>
              <li>Colapsar las familias que no pediste para un control visual más limpio en tienda.</li>
            </ul>
          </div>
          <div class="donts-box">
            <div class="donts-box-title"><i data-lucide="x-circle" style="width:16px;"></i> A Evitar (Don'ts)</div>
            <ul class="rules-list">
              <li><strong>NO</strong> ordenes la hoja usando las flechas de ordenamiento nativo A-Z de Sheets, ya que esto dañará la lógica de celdas cruzadas.</li>
            </ul>
          </div>
        </div>
      `
    },
    {
      title: "Conciliación y Adiciones",
      render: (viewMode) => `
        <p style="font-size:0.92rem; line-height:1.6; margin-bottom:1rem;">
          Al recibir el surtido, el bodeguero anota lo entregado en **CANT. RECIBIDA**. Si agregas un producto posterior al ordenamiento, se marcará de color naranja intenso como una adición prioritaria.
        </p>
        
        <div class="preview-container">
          <div class="preview-header">
            <span style="font-size:0.75rem; font-weight:600; color:var(--text-muted);"><i data-lucide="eye" style="width:14px; vertical-align:middle; margin-right:4px;"></i> Visualización del Diseño</span>
            <div class="preview-tabs">
              <button class="preview-tab-btn ${viewMode === 'pc' ? 'active' : ''}" onclick="setObViewMode('pc')">PC / Escritorio</button>
              <button class="preview-tab-btn ${viewMode === 'movil' ? 'active' : ''}" onclick="setObViewMode('movil')">Móvil / Celular</button>
            </div>
          </div>
          <div class="preview-content">
            ${viewMode === 'pc' ? `
              <div class="mock-desktop">
                <div style="background:var(--header-bg); padding:0.5rem; border-bottom:1px solid var(--border); font-weight:600; font-size:0.75rem;"><i data-lucide="file-spreadsheet" style="width:14px;"></i> Control de Tránsito</div>
                <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.72rem;">
                  <tr style="background:var(--surface-2); font-weight:bold; color:var(--text-muted);">
                    <th style="padding:0.45rem 0.6rem; border:1px solid var(--border);">PRODUCTO</th>
                    <th style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center;">PEDIDO</th>
                    <th style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center;">RECIBIDO</th>
                    <th style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center;">ALERTA</th>
                  </tr>
                  <tr style="background:rgba(255, 167, 38, 0.1);">
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); font-weight:600;">Nutella (Extra)</td>
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center;">1</td>
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center;"></td>
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center; background:#FFA726; color:#000; font-weight:bold;">🚨 ADICIÓN</td>
                  </tr>
                </table>
              </div>
            ` : `
              <div class="mock-phone">
                <div style="background:#FFA726; color:#000; padding:0.8rem; border-radius:var(--radius-sm); margin-top:1.5rem; font-weight:bold; text-align:center; font-size:0.75rem;">
                  🚨 ADICIÓN DETECTADA
                  <div style="font-weight:normal; font-size:0.68rem; margin-top:0.2rem; color:#111;">
                    Se agregó un producto posterior a cerrar el pedido del día.
                  </div>
                </div>
              </div>
            `}
          </div>
        </div>
        
        <div class="dos-donts-grid">
          <div class="dos-box">
            <div class="dos-box-title"><i data-lucide="check-circle" style="width:16px;"></i> Permitido (Dos)</div>
            <ul class="rules-list">
              <li>Revisar que el bodeguero capture exactamente lo que descarga. Esto calculará diferencias reales.</li>
              <li>Sincronizar (Celda H2) al final del recibimiento para limpiar cachés remotas.</li>
            </ul>
          </div>
          <div class="donts-box">
            <div class="donts-box-title"><i data-lucide="x-circle" style="width:16px;"></i> A Evitar (Don'ts)</div>
            <ul class="rules-list">
              <li><strong>NO</strong> dejes celdas vacías en la columna RECIBIDO de los productos entregados; si se recibió cero, escribe 0.</li>
            </ul>
          </div>
        </div>
      `
    }
  ],
  summary: {
    title: "¡Configuración Exitosa!",
    render: (role) => `
      <p style="margin-bottom:1.5rem; text-align:center; color:var(--text-muted); font-size:0.95rem; line-height:1.6;">
        Has concluido tu capacitación en el walkthrough de la Suite MISE v1.1. 
        Ya puedes acceder a las herramientas y libros en la nube desde tu dispositivo:
      </p>
      
      <div style="display:flex; flex-direction:column; gap:0.8rem; margin:1.5rem 0;">
        <a href="https://docs.google.com/spreadsheets/d/1kfjtwoX1U-ELq2du1zzJgc4VgO03n28wCVdiKrweHug/edit?usp=sharing" target="_blank" style="text-decoration:none; display:flex; justify-content:space-between; align-items:center; background:var(--card-bg); border:1px solid var(--border); padding:0.9rem 1.2rem; border-radius:var(--radius-md); color:var(--text); transition:var(--transition); font-size:0.9rem;" onmouseover="this.style.borderColor='var(--oro)'; this.style.background='var(--surface-2)'" onmouseout="this.style.borderColor='var(--border)'; this.style.background='var(--card-bg)'">
          <span style="display:flex; align-items:center; gap:0.6rem; font-weight:600;"><i data-lucide="warehouse" style="color:var(--oro); width:16px;"></i> Libro de Bodegas</span>
          <span style="font-size:0.78rem; color:var(--oro); font-weight:500;">Abrir Sheets <i data-lucide="external-link" style="width:12px; vertical-align:middle; margin-left:2px;"></i></span>
        </a>
        <a href="https://docs.google.com/spreadsheets/d/13yB8hsdwGHsckym_UOBVFZqCGlxGye6fTsL_MDnIDjo/edit?usp=sharing" target="_blank" style="text-decoration:none; display:flex; justify-content:space-between; align-items:center; background:var(--card-bg); border:1px solid var(--border); padding:0.9rem 1.2rem; border-radius:var(--radius-md); color:var(--text); transition:var(--transition); font-size:0.9rem;" onmouseover="this.style.borderColor='var(--oro)'; this.style.background='var(--surface-2)'" onmouseout="this.style.borderColor='var(--border)'; this.style.background='var(--card-bg)'">
          <span style="display:flex; align-items:center; gap:0.6rem; font-weight:600;"><i data-lucide="store" style="color:var(--oro); width:16px;"></i> Pedidos Andares</span>
          <span style="font-size:0.78rem; color:var(--oro); font-weight:500;">Abrir Sheets <i data-lucide="external-link" style="width:12px; vertical-align:middle; margin-left:2px;"></i></span>
        </a>
        <a href="https://docs.google.com/spreadsheets/d/1ifjZNdeMb_mBblcnyp6VhTqnm9C3tKOb1kKVFTwAwr8/edit?usp=sharing" target="_blank" style="text-decoration:none; display:flex; justify-content:space-between; align-items:center; background:var(--card-bg); border:1px solid var(--border); padding:0.9rem 1.2rem; border-radius:var(--radius-md); color:var(--text); transition:var(--transition); font-size:0.9rem;" onmouseover="this.style.borderColor='var(--oro)'; this.style.background='var(--surface-2)'" onmouseout="this.style.borderColor='var(--border)'; this.style.background='var(--card-bg)'">
          <span style="display:flex; align-items:center; gap:0.6rem; font-weight:600;"><i data-lucide="store" style="color:var(--oro); width:16px;"></i> Pedidos Mercado</span>
          <span style="font-size:0.78rem; color:var(--oro); font-weight:500;">Abrir Sheets <i data-lucide="external-link" style="width:12px; vertical-align:middle; margin-left:2px;"></i></span>
        </a>
      </div>
      
      <p style="text-align:center; font-size:0.82rem; color:var(--text-muted); line-height:1.5;">
        El manual detallado a la izquierda sigue disponible con información de todas las hojas y opciones avanzadas. ¡Exito en la operación!
      </p>
    `
  }
};

function openOnboarding(force = false) {
  if (!obOverlay) return;
  if (!force && localStorage.getItem('mise_onboarding_completed') === 'true') {
    return;
  }
  obCurrentStep = 0;
  obRole = null;
  obViewMode = 'pc';
  obOverlay.classList.add('active');
  renderObStep();
}

function closeOnboarding() {
  localStorage.setItem('mise_onboarding_completed', 'true');
  if (obOverlay) obOverlay.classList.remove('active');
}

window.setObViewMode = function(mode) {
  obViewMode = mode;
  renderObStep();
};

function selectObRole(role) {
  obRole = role;
  renderObStep();
}

function renderObStep() {
  if (!obTitle || !obBody || !obProgressBar || !obDotsContainer || !obBtnBack || !obBtnNext) return;

  // Determinar estructura de pasos
  let totalStepsCount = 2; // Bienvenida + Resumen (mínimo)

  if (obRole) {
    totalStepsCount = 2 + OB_CONTENT[obRole].length; // Bienvenido + Pasos Rol + Resumen
  }

  // Renderizar cuerpo de la pantalla
  if (obCurrentStep === 0) {
    // Pantalla de Bienvenida y Selección de Rol
    obTitle.textContent = OB_CONTENT.welcome.title;
    obBody.innerHTML = OB_CONTENT.welcome.render();
    
    // Asignar listeners a tarjetas de rol
    const btnBdg = document.getElementById('role-btn-bodega');
    const btnPed = document.getElementById('role-btn-pedidos');
    
    if (btnBdg && btnPed) {
      btnBdg.addEventListener('click', () => {
        selectObRole('bodega');
      });
      btnPed.addEventListener('click', () => {
        selectObRole('pedidos');
      });
    }
    
    obBtnBack.disabled = true;
    obBtnNext.disabled = !obRole; // Deshabilitado si no se ha seleccionado rol
    obBtnNext.innerHTML = 'Siguiente <i data-lucide="arrow-right" style="width:16px;"></i>';
  } 
  else if (obCurrentStep === totalStepsCount - 1) {
    // Pantalla Final de Resumen y Enlaces
    obTitle.textContent = OB_CONTENT.summary.title;
    obBody.innerHTML = OB_CONTENT.summary.render(obRole);
    
    obBtnBack.disabled = false;
    obBtnNext.disabled = false;
    obBtnNext.innerHTML = 'Finalizar <i data-lucide="check" style="width:16px;"></i>';
  } 
  else {
    // Pasos intermedios del rol
    const roleSteps = OB_CONTENT[obRole];
    const stepIndex = obCurrentStep - 1;
    const activeStepData = roleSteps[stepIndex];
    
    obTitle.textContent = activeStepData.title;
    obBody.innerHTML = activeStepData.render(obViewMode);
    
    obBtnBack.disabled = false;
    obBtnNext.disabled = false;
    obBtnNext.innerHTML = 'Siguiente <i data-lucide="arrow-right" style="width:16px;"></i>';
  }

  // Calcular barra de progreso
  const progressPercent = (obCurrentStep / (totalStepsCount - 1)) * 100;
  obProgressBar.style.width = `${progressPercent}%`;

  // Generar dots dinámicos
  obDotsContainer.innerHTML = '';
  for (let i = 0; i < totalStepsCount; i++) {
    const dot = document.createElement('div');
    dot.className = `onboarding-dot ${i === obCurrentStep ? 'active' : ''}`;
    obDotsContainer.appendChild(dot);
  }

  // Re-inicializar iconos Lucide en el contenido inyectado
  lucide.createIcons();
}

// Listeners de navegación de Onboarding
if (obBtnNext) {
  obBtnNext.addEventListener('click', () => {
    let totalStepsCount = 2;
    if (obRole) {
      totalStepsCount = 2 + OB_CONTENT[obRole].length;
    }
    
    if (obCurrentStep < totalStepsCount - 1) {
      obCurrentStep++;
      renderObStep();
    } else {
      closeOnboarding();
    }
  });
}

if (obBtnBack) {
  obBtnBack.addEventListener('click', () => {
    if (obCurrentStep > 0) {
      obCurrentStep--;
      renderObStep();
    }
  });
}

if (obBtnSkip) {
  obBtnSkip.addEventListener('click', () => {
    closeOnboarding();
  });
}

// Evento para lanzar el onboarding desde el menú lateral
const navItemWalkthrough = document.getElementById('nav-item-walkthrough');
if (navItemWalkthrough) {
  navItemWalkthrough.addEventListener('click', () => {
    openOnboarding(true); // Forzar apertura
  });
}
