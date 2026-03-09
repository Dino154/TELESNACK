# 🍭 Tele Snack - Sistema de Gestión de Inventario y Ventas

![Tele Snack Banner](https://via.placeholder.com/1000x300/8e44ad/ffffff?text=Tele+Snack+-+El+Lado+Dulce+de+la+Gesti%C3%B3n)

**Tele Snack** es una aplicación web moderna, responsiva y segura diseñada para administrar ventas, inventarios y cuentas por cobrar (fiados) de manera eficiente en entornos con múltiples sedes. Cuenta con una Tienda Interactiva para los clientes y un Panel Administrativo completo (Dashboard) para los gerentes.

## ✨ Características Principales

### 🛒 Tienda (Punto de Venta)
* **Catálogo Dinámico:** Interfaz visual con insignias de estado (Nuevo, Remate, Agotado).
* **Carrito de Compras Interactivo:** Control de cantidades y validación de stock máximo en tiempo real.
* **Múltiples Métodos de Pago:** Soporte para Efectivo, Yape (con validación de número de operación) y Crédito (Fiado).
* **Control de Morosidad Automático:** El sistema oculta la opción de "Fiado" si el usuario excede su límite de crédito o si un administrador le revoca el permiso.
* **Auto-Cierre de Sesión:** Temporizador de seguridad (40s) por inactividad para proteger cuentas en dispositivos compartidos.

### 📊 Panel Administrativo (Dashboard)
* **Métricas y Gráficos:** Visualización de ingresos, métodos de pago y rentabilidad usando gráficas interactivas (`Chart.js`). Línea de tiempo limitada a los últimos 7 días con actividad.
* **Control de Inventario (CRUD):** Creación, edición y eliminación de productos. Filtro en tiempo real y soporte fotográfico.
* **Gestión de Usuarios:** Panel para registrar clientes o administradores. Permite habilitar/deshabilitar el acceso al sistema (`Activo/Inactivo`) y el derecho a crédito (`Puede Fiar`).
* **Módulo Contable (Minimizable):** Cálculo automático de costos vs. precio de venta para determinar la ganancia neta.
* **Cuentas por Cobrar:** Sistema de abonos parciales o liquidación total de deudas consolidadas por usuario.

### 🗂️ Kardex Avanzado y Reportes
* **Historial Agrupado:** Los movimientos de inventario y ventas se agrupan automáticamente por mes en un formato "acordeón" desplegable.
* **Exportación Profesional:**
  * 🖨️ **Catálogos en PDF:** Generación de un catálogo visual imprimible directamente desde el inventario.
  * 📄 **Reportes Financieros:** Exportación nativa del Kardex y Finanzas a **PDF, Excel y CSV**.

### 🛡️ Seguridad Integrada
* **Escudo Anti-Atrás (Bfcache):** Previene la recuperación de sesiones cerradas (sesiones fantasma) al usar la flecha de retroceso del navegador usando manejo avanzado del historial (`location.replace`).
* **Recarga Silenciosa:** UI fluida que actualiza datos en segundo plano sin recargar toda la página (Single Page Application feel).

## 👥 Sistema de Roles

El sistema cuenta con acceso jerárquico basado en el perfil del usuario:

1. **👑 SuperAdmin:** Control global. Puede ver y modificar la información de todas las sedes, eliminar registros y administrar accesos.
2. **🏢 AdminSede:** Control local. Puede ver el inventario y las ventas de su respectiva sede, visualizar clientes, pero con restricciones para eliminar o modificar productos base (Solo lectura).
3. **👤 Usuario:** Cliente final. Su acceso se restringe únicamente al catálogo de la tienda para realizar compras.

## 🛠️ Tecnologías Utilizadas

* **Frontend:** HTML5, CSS3, JavaScript (ES6+), CSS Grid/Flexbox para diseño Responsivo.
* **Librerías UI/UX:** * [SweetAlert2](https://sweetalert2.github.io/) (Modales y alertas dinámicas).
  * [Chart.js](https://www.chartjs.org/) (Visualización de datos).
  * [Flatpickr](https://flatpickr.js.org/) (Selección de rangos de fechas).
* **Exportación:** `jsPDF`, `jsPDF-AutoTable` y `SheetJS (XLSX)`.
* **Arquitectura:** Estructura modular (Servicios, Controladores, Utilidades).

## 🚀 Instalación y Uso Local

1. Clona este repositorio en tu máquina local:
   ```bash
   git clone [https://github.com/Dino154/TELESNACK.git]

2. Abre la carpeta del proyecto.

3. Al ser un proyecto basado íntegramente en tecnologías cliente (Frontend JS), puedes usar extensiones como Live Server en VS Code para ejecutarlo, o simplemente abrir el archivo index.html en tu navegador web.

4. Nota sobre el Backend: Las transacciones y la persistencia de datos están manejadas a través de DataService.js. Asegúrate de tener configurado correctamente tu proveedor de base de datos (Ej: Firebase / localStorage temporal) dentro de la carpeta services/.

Desarrollado con ❤️ por Diego Parodi
