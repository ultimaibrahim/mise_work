# Suite MISE v1.0 — La Crêpe Parisienne

Suite unificada de control de inventarios, cálculo de diferencias y optimización de pedidos diarios para la bodega central y las sucursales de **La Crêpe Parisienne** (sucursales Andares y Mercado). 

Este repositorio contiene el código de automatización en Google Apps Script, la documentación interactiva en HTML y los documentos de arquitectura y requerimientos del sistema.

---

## 📁 Estructura del Proyecto

El proyecto está organizado de la siguiente manera:

```text
├── css/                        # Estilos del manual de usuario
│   └── index.css               # Diseño visual alineado con Reviews LCP GDL
├── documentacion/              # Documentos de soporte en formato Markdown
│   ├── manual_usuario.md       # Guía paso a paso para operarios en Bodega y Tiendas
│   ├── prd_detallado.md        # Documento de Requerimientos de Producto (Detallado)
│   ├── prd_simplificado.md     # Resumen ejecutivo de requerimientos de negocio
│   ├── presentacion_deck.md    # Transcripción del Slide Deck de presentación
│   └── ruta_aprendizaje.md     # Cursos y material para el aprendizaje de las tecnologías
├── js/                         # Lógica interactiva del manual
│   └── index.js                # Interactividad y motor de walkthrough de onboarding
├── scripts/                    # Código Apps Script para los libros de Google Sheets
│   ├── miseAuthBDG.gs          # Script para el libro "Bodegas"
│   ├── miseAuthPDA.gs          # Script para "Pedidos Andares"
│   └── miseAuthPDM.gs          # Script para "Pedidos Mercado"
├── .gitignore                  # Exclusiones de archivos del repositorio (ignora presentacion_deck/)
├── .nojekyll                   # Evita que Jekyll interfiera con la carga de index.html en GH Pages
└── index.html                  # Manual de usuario interactivo (Entry Point para GitHub Pages)
```

> [!NOTE]
> La carpeta local `presentacion_deck/` (que contiene las diapositivas interactivas `presentacion_deck.html`, `presentacion_deck.css` y `presentacion_deck.js`) ha sido excluida del repositorio mediante `.gitignore` a petición del usuario.

---

## 🛠️ Instalación y Configuración (Google Sheets)

Para instalar y habilitar las automatizaciones de la Suite MISE en sus respectivos libros de Google Sheets, siga los siguientes pasos:

### 1. Libro "Bodegas" (Módulo Central)
1. Abra el archivo de Google Sheets destinado para el control de bodega (**Bodegas**).
2. Diríjase al menú superior: **Extensiones** → **Apps Script**.
3. Reemplace todo el contenido del editor de código por el código de `scripts/miseAuthBDG.gs`.
4. Haga clic en **Guardar** (icono de disquete) y recargue la hoja de Google Sheets.
5. Aparecerá un menú personalizado llamado `⚙️ Mise` en la barra superior. Haga clic en `⚙️ Mise` → `🚀 Setup completo` para inicializar la estructura.

### 2. Libros de Pedidos ("Pedidos Andares" y "Pedidos Mercado")
1. Abra el archivo de Google Sheets respectivo para la tienda (Andares o Mercado).
2. Diríjase a **Extensiones** → **Apps Script**.
3. Copie y pegue el código del archivo correspondiente (`scripts/miseAuthPDA.gs` para Andares o `scripts/miseAuthPDM.gs` para Mercado).
4. Guarde el proyecto y recargue la hoja.
5. Ejecute `⚙️ Mise` → `🚀 Setup completo` en la barra superior.
6. En el menú `⚙️ Mise`, seleccione `🔗 Configurar conexión con Bodega` y pegue la URL completa del libro de **Bodegas** para enlazar los saldos en tiempo real.

---

## 📖 Documentación y Diapositivas

El repositorio cuenta con la siguiente herramienta web para la capacitación del personal y el despliegue automático:

- **Manual Interactivo (`index.html`, `css/index.css`, `js/index.js`)**: Manual dinámico con simuladores visuales de Sheets, walkthrough de onboarding paso a paso por roles y diagnóstico avanzado. Al estar nombrado como `index.html` en la raíz junto al archivo `.nojekyll`, sirve automáticamente de entry-point para el despliegue inmediato en **GitHub Pages**.

Para visualizarlo localmente, abra `index.html` en su navegador o sírvalo utilizando cualquier servidor local de desarrollo (`npx serve .` o *Live Server* en VS Code).

---

## 🚀 Tecnologías Utilizadas

- **Google Apps Script (V8 Engine)**: Automatización nativa en la nube, manipulación en lote (Batch 2D) de datos y triggers.
- **HTML5, Vanilla CSS3 y Javascript Moderno**: Estructuras limpias y estilos premium (diseño alineado con la guía visual oficial de *Reviews LCP GDL*).
- **Lucide Icons**: Biblioteca de iconos SVG ligeros y consistentes.

---

## ⚠️ Reglas de Desarrollo Críticas

### 1. Fórmulas en Google Sheets (Apps Script)
Al inyectar fórmulas dinámicas en celdas desde código Apps Script mediante `.setFormula()` o `.setFormulas()`:
- **Idioma**: Las fórmulas deben escribirse siempre en **inglés** (ej: `IFERROR`, `VLOOKUP`, `AND`, `OR`), incluso si el libro de cálculo del usuario final está configurado en español.
- **Separadores**: Los parámetros de las fórmulas deben estar separados obligatoriamente por **comas (`,`)**, nunca por puntos y comas (`;`), independientemente de la configuración regional de la hoja de cálculo del usuario.
- **Detección Automática**: Se incluye un script de prueba local `check_syntax.js` para validar la sintaxis y detectar de forma preventiva el uso de palabras clave en español o separadores de punto y coma en las cadenas de fórmulas.

