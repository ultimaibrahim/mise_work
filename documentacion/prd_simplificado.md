# PRD Simplificado / Ejecutivo
**Suite MISE v1.0 (Lanzamiento Oficial) — Atelier · La Crêpe Parisienne**

---

## 1. Resumen de Negocio
La suite MISE v1.0 (que consolida y reemplaza la serie de prototipos de prueba v0.5.3) digitaliza por completo el control de inventario de insumos en bodega y automatiza la generación de pedidos diarios para las sucursales de La Crêpe Parisienne (B-Andares y B-Mercado). Antes de MISE, no existía un sistema estructurado para esta operación. MISE optimiza el proceso reduciendo las diferencias entre lo pedido y lo entregado, alertando sobre adiciones tardías y ocultando del catálogo operativo todo producto dado de baja en Bodega.

---

## 2. Historias de Usuario
* **Como Supervisor de Tienda:** Quiero que la lista de pedidos diarios muestre únicamente los productos activos y los agrupe por su recorrido de categoría para levantar mi pedido en menos de 10 minutos desde mi teléfono o tablet.
* **Como Supervisor de Tienda:** Quiero poder agregar productos a mi pedido ordenado y que el sistema los marque como "Adiciones" en color naranja para que el bodeguero los surta de inmediato como urgencia.
* **Como Administrador de Bodega:** Quiero poder desactivar insumos del catálogo o modificarlos masivamente en una interfaz rápida sin ralentizar el sistema ni descuadrar los pedidos en curso de las tiendas.
* **Como Bodeguero (Surtidor):** Quiero registrar las cantidades entregadas en la columna de cantidades recibidas directamente al surtir, viendo de forma automática en color verde o naranja si el surtido fue completo o parcial.

---

## 3. Diagrama de Flujo de Datos

```
[Administrador de Bodega]
   │ (Marca productos / edita catálogo)
   ▼
[Bodega: Hoja MAESTRO] ───► [Vistas Móviles BA/BM] 
                                  │
                                  ├─► (IMPORTRANGE automático)
                                  ▼
                            [Hojas _SYNC en Pedidos]
                                  │
                                  ├─► (Sincronización en Tiendas)
                                  ▼
                            [📋 PEDIDO DIARIO (Visible)]
                                  │ (Herencia de visibilidad física)
                                  ▼
                            - Oculta inactivos
                            - Formatea estados (Verde/Gris/Amarillo)
```
