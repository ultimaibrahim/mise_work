---
name: MISE Web-App
description: Sistema de diseño editorial, reposado y responsivo móvil para la documentación de MISE.
colors:
  verde: "#3D5A47"
  verde-deep: "#2A3F32"
  sage: "#7A9E8A"
  oro: "#B8902F"
  bg-light: "#F4ECDF"
  surface-light: "#FFFFFF"
  surface-2-light: "#FAF5EB"
  bg-dark: "#14181A"
  surface-dark: "#1C2220"
  surface-2-dark: "#232A27"
typography:
  display:
    fontFamily: "Playfair Display, serif"
    fontSize: "3.5rem"
    fontWeight: 700
  body:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
  mono:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.85rem"
    fontWeight: 400
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
components:
  card:
    backgroundColor: "var(--surface)"
    rounded: "var(--radius-lg)"
    padding: "24px"
---

## Overview
MISE es una web de documentación técnica e interactiva de control de inventarios diseñada principalmente para lectura móvil por parte de encargados y bodegueros. El estilo es editorial, espacioso y reposado, reduciendo al mínimo la carga cognitiva y optimizando la claridad visual de los procesos de software en la sucursal.

## Colors
El sistema utiliza una paleta cromática sobria y natural basada en tonos forestales y dorados (La Crêpe Parisienne):
- **Verde principal (`--verde` / `#3D5A47`)**: Para acentos principales, títulos y marcas de sistema estables.
- **Oro (`--oro` / `#B8902F`)**: Para estados de advertencia, resaltes didácticos y elementos de navegación activos.
- **Fondo Claro (`--bg` / `#F4ECDF`)** y **Fondo Oscuro (`--bg` / `#14181A`)**: Selección de temas con alto contraste (cumpliendo WCAG AA).

## Typography
- **Display (Playfair Display)**: Reservado exclusivamente para títulos principales y encabezados editoriales (`h1`, `h2`).
- **Body (Plus Jakarta Sans)**: Utilizado para todo el cuerpo del texto, controles de navegación y etiquetas. Máximo 65-75ch de longitud por línea.
- **Mono (JetBrains Mono)**: Para datos numéricos de hojas de cálculo, identificadores técnicos y código Apps Script.

## Elevation
- **Sombras (`--shadow`)**: Sombras muy tenues en modo claro para separar componentes, y dependencia de bordes (`--border`) semi-transparentes en modo oscuro para evitar destellos visuales.
- **Bordes**: Los bordes definen la estructura sin saturar la vista.

## Components
- **Tarjetas Informativas (`.info-card`)**: Con fondo semi-transparente, borde fino y espaciado generoso.
- **Navegación Móvil (`.sidebar`)**: Limpia, con categorías legibles y controles de toque grandes (mínimo 48px de alto).
- **Tablas de Hojas de Cálculo (`.sheet-table`)**: Celdas con espaciado interno (padding) holgado para lectura cómoda en pantallas táctiles.

## Do's and Don'ts
### Do's
- Mantener espacios en blanco amplios y márgenes laterales de al menos `1.5rem` (`24px`) en móviles.
- Utilizar `text-wrap: pretty` para evitar palabras huérfanas en descripciones.
- Asegurar que todos los botones de la interfaz tengan un área de interacción táctil holgada.

### Don'ts
- No utilizar tipografías serif (`Playfair Display`) en elementos de datos, botones o etiquetas de interfaz.
- No congestionar la pantalla móvil con tablas completas de múltiples columnas; priorizar vistas de columna única o deslizamiento controlado.
