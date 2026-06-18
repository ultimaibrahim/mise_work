# Suite MISE v1.0 — La Crêpe Parisienne

Suite unificada de control de inventarios, cálculo de diferencias y optimización de pedidos diarios para la bodega central y las sucursales de **La Crêpe Parisienne** (sucursales Andares y Mercado). 

Este repositorio contiene el código de automatización en Google Apps Script, la documentación interactiva en HTML y los documentos de arquitectura y requerimientos del sistema.

---

## 📁 Estructura del Proyecto

El proyecto está organizado de la siguiente manera:

```text
├── documentacion/              # Documentos de soporte en formato Markdown
│   ├── manual_usuario.md       # Guía paso a paso para operarios en Bodega y Tiendas
│   ├── prd_detallado.md        # Documento de Requerimientos de Producto (Detallado)
│   ├── prd_simplificado.md     # Resumen ejecutivo de requerimientos de negocio
│   ├── presentacion_deck.md    # Transcripción del Slide Deck de presentación
│   └── ruta_aprendizaje.md     # Cursos y material para el aprendizaje de las tecnologías
├── index.html                  # Manual de usuario interactivo (Entry Point para GitHub Pages)
├── index.css                   # Hoja de estilos del manual (diseño alineado con Reviews LCP GDL)
├── index.js                    # Lógica interactiva y motor del Walkthrough de Onboarding
├── presentacion_deck.html      # Estructura de diapositivas de presentación de producto
├── presentacion_deck.css       # Hoja de estilos del Slide Deck (diseño alineado con Reviews LCP GDL)
├── presentacion_deck.js        # Lógica de navegación y temas para las diapositivas
├── miseAuthBDG.gs              # Código Apps Script para el libro "Bodegas"
├── miseAuthPDA.gs              # Código Apps Script para "Pedidos Andares"
├── miseAuthPDM.gs              # Código Apps Script para "Pedidos Mercado"
└── .gitignore                  # Exclusiones de archivos del repositorio
```

---

## 🛠️ Instalación y Configuración (Google Sheets)

Para instalar y habilitar las automatizaciones de la Suite MISE en sus respectivos libros de Google Sheets, siga los siguientes pasos:

### 1. Libro "Bodegas" (Módulo Central)
1. Abra el archivo de Google Sheets destinado para el control de bodega (**Bodegas**).
2. Diríjase al menú superior: **Extensiones** → **Apps Script**.
3. Reemplace todo el contenido del editor de código por el código de `miseAuthBDG.gs`.
4. Haga clic en **Guardar** (icono de disquete) y recargue la hoja de Google Sheets.
5. Aparecerá un menú personalizado llamado `⚙️ Mise` en la barra superior. Haga clic en `⚙️ Mise` → `🚀 Setup completo` para inicializar la estructura.

### 2. Libros de Pedidos ("Pedidos Andares" y "Pedidos Mercado")
1. Abra el archivo de Google Sheets respectivo para la tienda (Andares o Mercado).
2. Diríjase a **Extensiones** → **Apps Script**.
3. Copie y pegue el código del archivo correspondiente (`miseAuthPDA.gs` para Andares o `miseAuthPDM.gs` para Mercado).
4. Guarde el proyecto y recargue la hoja.
5. Ejecute `⚙️ Mise` → `🚀 Setup completo` en la barra superior.
6. En el menú `⚙️ Mise`, seleccione `🔗 Configurar conexión con Bodega` y pegue la URL completa del libro de **Bodegas** para enlazar los saldos en tiempo real.

---

## 📖 Documentación y Diapositivas

El repositorio cuenta con dos herramientas web modularizadas para la capacitación del personal y el despliegue automático:

- **Manual Interactivo (`index.html`, `index.css`, `index.js`)**: Manual dinámico con simuladores visuales de Sheets, walkthrough de onboarding paso a paso por roles y diagnóstico avanzado. Al estar nombrado como `index.html` en la raíz, sirve automáticamente de entry-point para el despliegue en **GitHub Pages**.
- **Presentación de Producto (`presentacion_deck.html`, `presentacion_deck.css`, `presentacion_deck.js`)**: Diapositivas dinámicas diseñadas para explicar la evolución operativa "Antes de MISE" vs "Después de MISE" a supervisores y gerencia.

Para visualizarlos localmente, simplemente abra `index.html` o `presentacion_deck.html` en su navegador o sírvalos utilizando cualquier servidor local de desarrollo (`npx serve .` o *Live Server* en VS Code).

---

## 🚀 Tecnologías Utilizadas

- **Google Apps Script (V8 Engine)**: Automatización nativa en la nube, manipulación en lote (Batch 2D) de datos y triggers.
- **HTML5, Vanilla CSS3 y Javascript Moderno**: Estructuras limpias y estilos premium (diseño alineado con la guía visual oficial de *Reviews LCP GDL*).
- **Lucide Icons**: Biblioteca de iconos SVG ligeros y consistentes.

