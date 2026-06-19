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
          En las pestañas <strong>KARDEX_BA</strong> (Andares) y <strong>KARDEX_BM</strong> (Mercado), el bodeguero registra entradas (compras) y salidas (entregas) diarias. Soporta <strong>hasta 4 decimales</strong> (formato <code>0.####</code>) para un control de inventario exacto.
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
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); font-weight:600;">Fruta de temporada (Domo)</td>
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center; background:#eef9f0;">1.5</td>
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center; background:#fdf2f2;">0.375</td>
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center; font-weight:bold; color:var(--oro);">1.125 kg</td>
                  </tr>
                </table>
              </div>
          </div>
        </div>
        
        <div class="dos-donts-grid">
          <div class="dos-box">
            <div class="dos-box-title"><i data-lucide="check-circle" style="width:16px;"></i> Permitido (Dos)</div>
            <ul class="rules-list">
              <li>Registrar las entradas físicas exactas (compras) en cuanto ingresan al almacén utilizando hasta 4 decimales.</li>
              <li>Ejecutar <strong>Avanzar semana</strong> los sábados al concluir el conteo final de cierre.</li>
            </ul>
          </div>
          <div class="donts-box">
            <div class="donts-box-title"><i data-lucide="x-circle" style="width:16px;"></i> A Evitar (Don'ts)</div>
            <ul class="rules-list">
              <li><strong>NO</strong> alteres las fechas de control de la celda G4 a mitad de semana.</li>
              <li><strong>NO</strong> borres la fila de fórmulas de saldo. El sistema calcula los saldos y acumulados de forma autónoma.</li>
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
      title: "Levantamiento de Pedidos y Filtros",
      render: (viewMode) => `
        <p style="font-size:0.92rem; line-height:1.6; margin-bottom:1rem;">
          En los libros de sucursales, el encargado captura cantidades en **CANT. A PEDIR (F)**. Soporta <strong>hasta 4 decimales</strong> (ej. <code>1.125</code>) para evitar redondeos.
        </p>
        <p style="font-size:0.92rem; line-height:1.6; margin-bottom:1rem;">
          Usa los <strong>Filtros por Categoría</strong> nativos en la cabecera (Columna B) para aislar secciones de insumos (ej. refrigerados, lácteos) y pedir de forma rápida en tu móvil o PC.
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
                    <th style="padding:0.45rem 0.6rem; border:1px solid var(--border);">CATEGORÍA</th>
                    <th style="padding:0.45rem 0.6rem; border:1px solid var(--border);">PRODUCTO</th>
                    <th style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center;">PEDIR</th>
                    <th style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center;">ESTADO</th>
                  </tr>
                  <tr style="background:#fffdec;">
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); color:var(--oro); font-weight:bold;">1. REFRIGERADOS</td>
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); font-weight:600;">Harina Crepas (Domo)</td>
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center; font-weight:bold;">1.125</td>
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center; color:#cda300; font-weight:bold;">⏳ PENDIENTE</td>
                  </tr>
                </table>
              </div>
            ` : `
              <div class="mock-phone">
                <div style="background:var(--header-bg); padding:0.4rem; border-bottom:1px solid var(--border); font-weight:600; text-align:center; font-size:0.72rem;">
                  1. REFRIGERADOS
                </div>
                <div style="padding:0.8rem; display:flex; flex-direction:column; gap:0.4rem; margin-top:0.8rem;">
                  <span style="font-weight:bold; font-size:0.8rem;">Harina Crepas (Domo)</span>
                  <div style="display:flex; gap:0.5rem; align-items:center;">
                    <span style="color:var(--text-muted);">Pedir:</span>
                    <input type="text" value="1.125" style="width:70px; text-align:center; background:var(--surface-2); border:1px solid var(--border); color:var(--text); border-radius:var(--radius-sm); padding:0.2rem;" disabled>
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
              <li>Ingresar cantidades con decimales (ej. <code>1.125</code>) para que la bodega reciba el peso real solicitado.</li>
              <li>Aislar categorías usando el filtro nativo de la celda B3 en tu celular para mayor comodidad.</li>
            </ul>
          </div>
          <div class="donts-box">
            <div class="donts-box-title"><i data-lucide="x-circle" style="width:16px;"></i> A Evitar (Don'ts)</div>
            <ul class="rules-list">
              <li><strong>NO</strong> escribas texto o letras en la columna de pedidos.</li>
              <li><strong>NO</strong> uses comas si tu hoja usa puntos decimales. Sé consistente con la configuración de tu región.</li>
            </ul>
          </div>
        </div>
      `
    },
    {
      title: "Ordenar Pedido",
      render: (viewMode) => `
        <p style="font-size:0.92rem; line-height:1.6; margin-bottom:1rem;">
          Una vez ingresados tus insumos, marca el checkbox de <strong>⚙️ Ordenar (Celda D2)</strong>. El pedido se organizará automáticamente agrupando todos los insumos por su categoría de almacenamiento y subirá los productos pedidos al principio de cada grupo.
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
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); font-weight:bold; color:var(--verde);">1. REFRIGERADOS</td>
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
      title: "Surtido Rápido Móvil",
      render: (viewMode) => `
        <p style="font-size:0.92rem; line-height:1.6; margin-bottom:1rem;">
          Al marcar <strong>🚚 Surtido (L2)</strong> se genera la hoja operativa <strong>🚚 SURTIDO RÁPIDO</strong>. Diseñada para su uso en celulares, cuenta con **Columnas Ocultas** para ahorrar espacio y la **Inmovilización de Producto**.
        </p>
        <p style="font-size:0.92rem; line-height:1.6; margin-bottom:1rem;">
          La columna <strong>PRODUCTO</strong> queda fija a la izquierda: al desplazarte horizontalmente en tu móvil para registrar las cantidades recibidas, el nombre de los productos permanecerá fijo en pantalla.
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
                <div style="background:var(--header-bg); padding:0.5rem; border-bottom:1px solid var(--border); font-weight:600; font-size:0.75rem;"><i data-lucide="file-spreadsheet" style="width:14px;"></i> Surtido Rápido &gt; Columnas Inmovilizadas</div>
                <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.72rem;">
                  <tr style="background:var(--surface-2); font-weight:bold; color:var(--text-muted);">
                    <th style="padding:0.45rem 0.6rem; border:1px solid var(--border); background:var(--surface-3); position:sticky; left:0; z-index:1;">[PRODUCTO] (Congelada)</th>
                    <th style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center;">PEDIDO</th>
                    <th style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center;">COMPLETO</th>
                    <th style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center;">INEXISTENTE</th>
                  </tr>
                  <tr>
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); font-weight:600; background:var(--surface-1); position:sticky; left:0; border-right:2px solid var(--border); z-index:1;">Queso Mozzarella</td>
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center;">1.125</td>
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center;"><input type="checkbox" disabled></td>
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center;"><input type="checkbox" disabled></td>
                  </tr>
                </table>
              </div>
            ` : `
              <div class="mock-phone">
                <div style="background:var(--header-bg); padding:0.4rem; border-bottom:1px solid var(--border); font-weight:600; text-align:center; font-size:0.72rem;">
                  Surtido Rápido Móvil
                </div>
                <div style="padding:0.5rem; display:flex; flex-direction:column; gap:0.2rem; margin-top:0.4rem;">
                  <span style="font-weight:bold; font-size:0.8rem; color:var(--oro);">Queso Mozzarella</span>
                  <div style="display:flex; justify-content:space-between; align-items:center; background:var(--surface-2); padding:0.4rem; border-radius:var(--radius-sm); font-size:0.75rem;">
                    <span>Pedido: <strong>1.125</strong></span>
                    <span>Completo: <input type="checkbox" checked disabled></span>
                    <span>Inexistente: <input type="checkbox" disabled></span>
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
              <li>Desplazarte horizontalmente en tu móvil con tranquilidad: el producto siempre permanecerá a la vista a la izquierda de la pantalla.</li>
              <li>Marcar directamente el checkbox de la columna F para indicar que el producto llegó completo.</li>
            </ul>
          </div>
          <div class="donts-box">
            <div class="donts-box-title"><i data-lucide="x-circle" style="width:16px;"></i> A Evitar (Don'ts)</div>
            <ul class="rules-list">
              <li><strong>NO</strong> intentes mostrar de nuevo las columnas A y B manualmente; están ocultas a propósito para optimizar el espacio horizontal en celulares.</li>
            </ul>
          </div>
        </div>
      `
    },
    {
      title: "Dashboard y Colores Dinámicos",
      render: (viewMode) => `
        <p style="font-size:0.92rem; line-height:1.6; margin-bottom:1rem;">
          <strong>Dashboard en Tiempo Real:</strong> En la parte superior derecha de Surtido Rápido se encuentra una tarjeta de control que resume de forma automática cuántos productos de tu lista están:
          <span style="color:var(--verde); font-weight:bold;">Completos</span>, 
          <span style="color:#e65100; font-weight:bold;">Incompletos (Parciales)</span>, 
          <span style="color:var(--rojo); font-weight:bold;">Inexistentes</span> o son 
          <span style="color:#e65100; font-weight:bold;">Adiciones</span>.
        </p>
        <p style="font-size:0.92rem; line-height:1.6; margin-bottom:1rem;">
          <strong>Colores Dinámicos & Adiciones:</strong> Toda la fila cambia de color instantáneamente según el estado del producto. Si agregas un producto nuevo al Pedido Diario después de haber ordenado la lista, se marcará automáticamente en color naranja vibrante como <code>🚨 ADICIÓN</code>. Al surtirlo y marcar su estado, su color de alerta se sobrescribe al de su nuevo estado.
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
                <div style="background:var(--header-bg); padding:0.5rem; border-bottom:1px solid var(--border); font-weight:600; font-size:0.75rem; display:flex; justify-content:space-between;">
                  <span>Surtido Rápido</span>
                  <span style="background:var(--surface-3); padding:0.1rem 0.4rem; border-radius:var(--radius-sm); font-size:0.65rem; color:var(--oro);">📊 C: 5 | I: 1 | N: 0 | A: 0</span>
                </div>
                <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.72rem;">
                  <tr style="background:rgba(76, 175, 80, 0.08);">
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); font-weight:600; color:var(--verde);">✓ Queso Mozzarella</td>
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center; font-weight:bold; color:var(--verde);">COMPLETO</td>
                  </tr>
                  <tr style="background:rgba(255, 167, 38, 0.12);">
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); font-weight:600; color:#e65100;">+ Nutella (Extra)</td>
                    <td style="padding:0.45rem 0.6rem; border:1px solid var(--border); text-align:center; font-weight:bold; background:#FFA726; color:#000;">🚨 ADICIÓN</td>
                  </tr>
                </table>
              </div>
            ` : `
              <div class="mock-phone">
                <div style="background:var(--header-bg); padding:0.4rem; border-bottom:1px solid var(--border); font-weight:600; text-align:center; font-size:0.72rem; display:flex; justify-content:space-between; align-items:center;">
                  <span>Vista Móvil</span>
                  <span style="background:var(--surface-2); padding:0.1rem 0.3rem; border-radius:3px; font-size:0.6rem; color:var(--oro);">📊 C:5 I:1 N:0</span>
                </div>
                <div style="padding:0.5rem; display:flex; flex-direction:column; gap:0.4rem; margin-top:0.4rem;">
                  <div style="background:rgba(76, 175, 80, 0.08); padding:0.4rem; border-radius:var(--radius-sm); border-left:4px solid var(--verde); font-size:0.7rem;">
                    <strong>Queso Mozzarella</strong> - Completo Green
                  </div>
                  <div style="background:rgba(255, 167, 38, 0.12); padding:0.4rem; border-radius:var(--radius-sm); border-left:4px solid #FFA726; font-size:0.7rem;">
                    <strong>Nutella (Extra)</strong> - 🚨 ADICIÓN
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
              <li>Monitorear la tarjeta de resumen superior en tiempo real para ver el avance del surtido sin tener que contar fila por fila.</li>
              <li>Saber que si agregas un insumo de último minuto en Pedido Diario, aparecerá marcado como adición para que no se olvide.</li>
            </ul>
          </div>
          <div class="donts-box">
            <div class="donts-box-title"><i data-lucide="x-circle" style="width:16px;"></i> A Evitar (Don'ts)</div>
            <ul class="rules-list">
              <li><strong>NO</strong> borres la tarjeta de resumen ni rompas sus fórmulas automáticas; se ubica en el área de columnas I y J.</li>
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
