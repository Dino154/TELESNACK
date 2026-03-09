import { DataService } from '../services/dataService.js'; 
import { Auth } from '../services/auth.js';

let carrito = [];
let productosGlobal = [];     
let productosFiltrados = [];  
let usuarioActual = null;

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', async () => {
    usuarioActual = Auth.getCurrentUser();
    if (!usuarioActual) {
        window.location.href = 'index.html';
        return;
    }

    // 1. Mostrar Info Usuario
    const infoDiv = document.getElementById('user-info');
    if (infoDiv) {
        infoDiv.innerHTML = `
            <i class="material-icons" style="font-size:16px; color:#aaa">person</i> 
            <b>${usuarioActual.nombre}</b> 
            <span style="color:#888; font-size:0.9rem;">(${usuarioActual.sede})</span>
        `;
    }

    // 2. Cargar Inventario
    await cargarInventario();

    // 3. Activar Buscador
    setupBuscador();

    // 4. Configurar Botón Pagar
    const btnCheckout = document.getElementById('btn-checkout');
    if (btnCheckout) {
        btnCheckout.addEventListener('click', () => abrirModalPago());
    }
});

// --- CARGA DE DATOS ---
async function cargarInventario() {
    const grid = document.getElementById('grid-productos');
    grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:50px; color:#999"><i class="material-icons fa-spin">refresh</i> Cargando catálogo...</div>';

    try {
        const sedeQuery = usuarioActual.sede === 'Global' ? null : usuarioActual.sede;
        productosGlobal = await DataService.getInventario(sedeQuery);
        
        productosGlobal.sort((a, b) => {
            if (a.stock > 0 && b.stock <= 0) return -1;
            if (a.stock <= 0 && b.stock > 0) return 1;
            if (a.condicion === 'REMATE' && b.condicion !== 'REMATE') return -1;
            return 0;
        });

        productosFiltrados = productosGlobal;
        renderGrid(productosFiltrados);
        renderCart(); 

    } catch (error) {
        console.error(error);
        grid.innerHTML = '<p style="color:red; text-align:center; grid-column:1/-1;">Error de conexión con el inventario</p>';
    }
}

// --- BUSCADOR ---
function setupBuscador() {
    const input = document.getElementById('shop-search');
    if (!input) return;

    input.addEventListener('input', (e) => {
        const termino = e.target.value.toLowerCase().trim();
        if (termino === '') {
            productosFiltrados = productosGlobal;
        } else {
            productosFiltrados = productosGlobal.filter(p => 
                p.nombre.toLowerCase().includes(termino)
            );
        }
        renderGrid(productosFiltrados);
    });
}

// --- RENDERIZADO DE PRODUCTOS ---
function renderGrid(lista) {
    const grid = document.getElementById('grid-productos');
    grid.innerHTML = '';

    if (lista.length === 0) {
        grid.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:40px; color:#999;">
                <i class="material-icons" style="font-size:48px; margin-bottom:10px; opacity:0.3">search_off</i>
                <p>No encontramos productos con ese nombre.</p>
            </div>`;
        return;
    }

    lista.forEach(prod => {
        const esRemate = prod.condicion === 'REMATE';
        const sinStock = prod.stock <= 0;
        const imgUrl = prod.img || 'img/no-image.png'; 
        
        let badgeHTML = '';
        if (!sinStock) {
            badgeHTML = esRemate 
                ? `<div class="offer-badge fire"><i class="material-icons" style="font-size:14px">local_fire_department</i> ¡REMATE!</div>` 
                : `<div class="offer-badge" style="background:#2ecc71">NUEVO</div>`;
        } else {
            badgeHTML = `<div class="offer-badge" style="background:#999">AGOTADO</div>`;
        }

        const botonHTML = sinStock 
            ? `<button class="btn-disabled" disabled>Agotado</button>`
            : `<button class="btn-icon-action" 
                       style="background:#FF6BAD; color:white; border:none; width:40px; height:40px; border-radius:12px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 10px rgba(255, 107, 173, 0.3); transition:transform 0.2s;" 
                       onclick="window.addToCart('${prod.id}')">
                 <i class="material-icons">add_shopping_cart</i>
               </button>`; 

        const card = document.createElement('div');
        card.className = `product-card ${sinStock ? 'no-stock' : ''}`;
        card.innerHTML = `
            ${badgeHTML}
            <div class="prod-img-box">
                <img src="${imgUrl}" alt="${prod.nombre}" onerror="this.src='img/no-image.png'">
            </div>
            <div class="card-info">
                <h3>${prod.nombre}</h3>
                <p class="stock">Stock: <strong style="color:${sinStock ? 'red' : '#2ecc71'}">${prod.stock}</strong></p>
                <div style="margin-top:auto; display:flex; justify-content:space-between; align-items:center;">
                    <div class="price-tag" style="margin:0; font-size:1.3rem;">S/ ${parseFloat(prod.precio).toFixed(2)}</div>
                    ${botonHTML}
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- LÓGICA DEL CARRITO ---
window.addToCart = (id) => {
    const prod = productosGlobal.find(p => p.id === id);
    if(!prod) return;
    if(prod.stock <= 0) return Swal.fire({ icon:'error', title:'Agotado', text:'Sin stock', timer:1000, showConfirmButton:false });

    const itemEnCarrito = carrito.find(item => item.id === id);
    const cantidadActual = itemEnCarrito ? itemEnCarrito.cantidad : 0;
    
    if (cantidadActual + 1 > prod.stock) {
        return Swal.fire({ icon: 'warning', title: 'Stock Límite', text: `Solo quedan ${prod.stock}`, timer: 1500, showConfirmButton: false });
    }

    if (itemEnCarrito) {
        itemEnCarrito.cantidad++;
    } else {
        carrito.push({ ...prod, cantidad: 1 });
    }
    
    renderCart();
    const Toast = Swal.mixin({ toast: true, position: 'bottom-end', showConfirmButton: false, timer: 1000, background: '#fff' });
    Toast.fire({ icon: 'success', title: `Agregado: ${prod.nombre}` });
};

window.restarCantidad = (id) => {
    const item = carrito.find(i => i.id === id);
    if (item) {
        item.cantidad--;
        if (item.cantidad <= 0) carrito = carrito.filter(i => i.id !== id);
        renderCart();
    }
};

window.eliminarDelCarrito = (id) => {
    carrito = carrito.filter(i => i.id !== id);
    renderCart();
};

function renderCart() {
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    if(!container) return;

    if (carrito.length === 0) { 
        container.innerHTML = `
            <div style="text-align:center; color:#ccc; margin-top:40px;">
                <i class="material-icons" style="font-size:48px; margin-bottom:10px; opacity:0.3;">shopping_basket</i>
                <p>Tu canasta está vacía</p>
            </div>`; 
        if(totalEl) totalEl.innerText = '0.00'; 
        return; 
    }

    let totalGlobal = 0;
    container.innerHTML = carrito.map(item => {
        const subtotal = item.precio * item.cantidad;
        totalGlobal += subtotal;
        
        return `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div style="display:flex; justify-content:space-between; width:100%">
                        <h4 style="margin:0; color:#333;">${item.nombre}</h4>
                        <button onclick="window.eliminarDelCarrito('${item.id}')" style="background:none; border:none; color:#ff5252; cursor:pointer;"><i class="material-icons" style="font-size:18px">close</i></button>
                    </div>
                    <small style="color:#888;">Unitario: S/ ${parseFloat(item.precio).toFixed(2)}</small>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:5px;">
                    <div class="qty-controls" style="display:flex; align-items:center; gap:5px; background:#f0f0f0; border-radius:5px; padding:2px;">
                        <button onclick="window.restarCantidad('${item.id}')" style="width:25px; height:25px; border:none; background:white; border-radius:4px; cursor:pointer; font-weight:bold;">-</button>
                        <span style="font-size:0.9rem; min-width:20px; text-align:center;">${item.cantidad}</span>
                        <button onclick="window.addToCart('${item.id}')" style="width:25px; height:25px; border:none; background:white; border-radius:4px; cursor:pointer; font-weight:bold; color:#8e44ad;">+</button>
                    </div>
                    <span style="font-weight:bold; color:#333;">S/ ${subtotal.toFixed(2)}</span>
                </div>
            </div>`;
    }).join('');

    if(totalEl) totalEl.innerText = totalGlobal.toFixed(2);
}

// --- PAGO CON QR YAPE MEJORADO (DISEÑO ADMIN) ---
async function abrirModalPago() {
    if (carrito.length === 0) return Swal.fire('Carrito vacío', 'Agrega productos antes de pagar.', 'warning');
    
    const totalVenta = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const costoTotal = carrito.reduce((sum, item) => sum + ((item.costo || 0) * item.cantidad), 0);

    // 1. Selección de Método
    const { value: metodo } = await Swal.fire({
        title: `Total: S/ ${totalVenta.toFixed(2)}`,
        html: '<p style="color:#888">Selecciona tu forma de pago</p>',
        input: 'radio',
        inputOptions: { 
            'Yape': 'Yape (QR)', 
            'Efectivo': 'Efectivo', 
            'Pendiente': 'Fiado / Pendiente' 
        },
        inputValidator: (val) => !val && 'Debes elegir una opción',
        confirmButtonColor: '#8E44AD',
        confirmButtonText: 'Continuar',
        showCancelButton: true,
        cancelButtonText: 'Cancelar'
    });

    if (!metodo) return;

    let codigoOperacion = '';

    // 2. Lógica QR Yape con Imagen (ESTA ES LA PARTE QUE CAMBIA)
    if (metodo === 'Yape') {
        const { value: codigo } = await Swal.fire({
            title: '<strong style="color:#8E44AD">¡Yapea aquí!</strong>',
            html: `
                <div style="text-align:center; background: #FFF0F6; padding: 15px; border-radius: 15px;">
                    <p style="font-size: 1.1rem; font-weight: bold; margin-bottom: 10px;">
                        Monto a pagar: <span style="color:#8E44AD">S/ ${totalVenta.toFixed(2)}</span>
                    </p>

                    <img src="https://static.wixstatic.com/media/db69a5_32ad714f297d4f03a19c4a5c79a355fd~mv2.jpeg" 
                         style="width: 220px; border-radius: 15px; border: 4px solid #FF6BAD; box-shadow: 0 5px 15px rgba(0,0,0,0.1); margin-bottom: 15px;">
                    
                    <p style="color:#555; font-size: 0.9rem; margin-bottom: 5px;">
                        Escanea y escribe los <b>últimos 3 dígitos</b>:
                    </p>
                    
                    <input id="yape-code" class="swal2-input" type="number" placeholder="Ej: 930" maxlength="3" 
                           style="font-size:2rem; text-align:center; letter-spacing: 5px; width:150px; margin: 5px auto; border: 2px solid #FF6BAD; color: #8E44AD; font-weight:bold;">
                </div>
            `,
            confirmButtonText: 'Confirmar Pago',
            confirmButtonColor: '#00C49A', // Color menta Yape
            showCancelButton: true,
            cancelButtonText: 'Atrás',
            preConfirm: () => {
                const val = document.getElementById('yape-code').value;
                if (!val || val.length < 3) {
                    Swal.showValidationMessage('¡Faltan los 3 dígitos de operación!');
                }
                return val;
            }
        });

        if (!codigo) return; // Si cancela o cierra
        codigoOperacion = codigo;
    }

    // 3. Estructura de datos
    const itemsResumen = carrito.map(item => ({ 
        nombre: item.nombre, 
        precio: item.precio, 
        cantidad: item.cantidad, 
        costo: item.costo || 0 
    }));
    
    const ventaData = {
        user: usuarioActual.nombre,
        sede: usuarioActual.sede,
        total: totalVenta,
        costoTotal: costoTotal,
        metodo: metodo,
        codigoOperacion: codigoOperacion || '',
        items: itemsResumen,
        fecha: new Date().toLocaleString(),
        timestamp: Date.now()
    };

    // 4. Guardar Venta
    Swal.fire({ title: 'Procesando...', html: 'Registrando venta...', didOpen: () => Swal.showLoading() });
    
    try {
        await DataService.registrarVenta(ventaData);
        
        await Swal.fire({ 
            icon: 'success', 
            title: '¡Venta Exitosa!', 
            text: 'Registrado correctamente 🍬',
            timer: 2000, 
            showConfirmButton: false 
        });
        
        // Limpiar
        carrito = [];
        renderCart();
        await cargarInventario(); 

    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'No se pudo procesar la venta.', 'error');
    }
}
