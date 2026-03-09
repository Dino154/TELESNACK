import { DataService } from '../services/dataService.js';

let chartPay, chartProfit, chartTimeline;
let productosGlobal = []; 

// Variables globales
window.crearUsuarioGlobal = null; 
window.crearProductoGlobal = null;
window.listaGruposPendientes = []; 

// --- INICIALIZACIÓN ---
export async function initAdmin(user) {
    console.log('🚀 Admin Panel: Cargando datos silenciosamente...');
    const infoSpan = document.getElementById('admin-info');
    if (infoSpan) infoSpan.innerText = user.nombre;
    
    const btnInventario = document.querySelector('button[onclick="showSection(\'inventario\')"]');
    if (btnInventario) btnInventario.style.display = 'inline-block'; 

    try {
        const sedeQuery = user.rol === 'SuperAdmin' ? 'Global' : user.sede;
        
        const [ventas, usuarios, productos] = await Promise.all([
            DataService.getVentas(sedeQuery),
            DataService.getUsuarios(sedeQuery),
            DataService.getInventario(sedeQuery) 
        ]);

        productosGlobal = productos;
        window.__teleSnackVentasForReports = ventas;
        window.__teleSnackUserForReports = user;
        if (!window.DB) window.DB = {}; 
        window.DB.inventario = productos; 

        renderMetrics(ventas);
        initCharts(ventas);
        renderTransactionsList(ventas); 
        renderFinanceTable(ventas);
        renderUsuariosTable(usuarios, user);
        renderInventoryTable(productos, user); 
        
        window.crearUsuarioGlobal = () => crearUsuario(user);
        
        if (user.rol === 'AdminSede') {
            window.crearProductoGlobal = () => Swal.fire('Acceso Denegado', 'Solo el Jefe Supremo puede crear productos.', 'warning');
        } else {
            window.crearProductoGlobal = () => crearProducto(user);
        }

        setupSearchFilters(productos, usuarios, user);

    } catch (e) {
        console.error("Error al cargar Admin:", e);
        Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Error de red', showConfirmButton: false, timer: 2000 });
    }
}

// ====================================================================
// --- IMPRIMIR CATÁLOGO DE PRODUCTOS EN PDF ---
// ====================================================================
window.imprimirCatalogo = (adminUser) => {
    const termino = (document.getElementById('search-inventory')?.value || '').toLowerCase().trim();
    let lista = productosGlobal.filter(p => p.nombre.toLowerCase().includes(termino));

    if (lista.length === 0) return Swal.fire('Info', 'No hay productos para imprimir.', 'info');

    let htmlCards = lista.map(p => {
        const imgUrl = p.img || 'https://via.placeholder.com/150?text=Sin+Imagen';
        return `
            <div style="border: 1px solid #ddd; border-radius: 12px; padding: 15px; text-align: center; page-break-inside: avoid; display:flex; flex-direction:column; justify-content:space-between; background:#fff;">
                <div style="height:120px; display:flex; align-items:center; justify-content:center; margin-bottom:10px;">
                    <img src="${imgUrl}" style="max-height: 120px; max-width: 100%; object-fit: contain; border-radius: 8px;">
                </div>
                <div>
                    <h3 style="font-size: 1.1rem; color: #333; margin: 5px 0;">${p.nombre}</h3>
                    <p style="font-size: 1.3rem; font-weight: 800; color: #e74c3c; margin: 5px 0;">S/ ${parseFloat(p.precio).toFixed(2)}</p>
                    <p style="font-size: 0.9rem; color: #666; margin: 0; background:#f9f9f9; padding:5px; border-radius:5px;">
                        Stock: <b style="color:${p.stock <= 5 ? 'red' : 'green'}">${p.stock}</b> | ${p.sede}
                    </p>
                </div>
            </div>
        `;
    }).join('');

    const sedeTexto = adminUser.rol === 'SuperAdmin' ? 'Todas las Sedes' : adminUser.sede;

    const ventana = window.open('', '', 'height=800,width=1000');
    ventana.document.write(`
        <html>
        <head>
            <title>Catálogo de Productos - ${sedeTexto}</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; padding: 20px; color: #333; background: #fdf2f8; }
                h2 { text-align: center; color: #8e44ad; font-size: 2rem; margin-bottom: 5px; }
                .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; margin-top: 20px; }
                @media print {
                    body { padding: 0; background: white; }
                    .grid { grid-template-columns: repeat(4, 1fr); gap: 15px; } 
                    @page { margin: 1cm; }
                }
            </style>
        </head>
        <body>
            <h2>📦 Catálogo de Productos</h2>
            <p style="text-align:center; color:#777; font-weight:bold; font-size:1.1rem; margin-top:0;">Sede: ${sedeTexto}</p>
            <p style="text-align:center; color:#999; font-size:0.9rem;">Fecha de emisión: ${new Date().toLocaleString()}</p>
            
            <div class="grid">
                ${htmlCards}
            </div>
            <script>
                setTimeout(() => { window.print(); }, 1200);
            </script>
        </body>
        </html>
    `);
    ventana.document.close();
};


// ====================================================================
// --- ABONOS Y COBROS DE DEUDA ---
// ====================================================================
window.abonarDeudaParcial = async (index) => {
    const grupo = window.listaGruposPendientes[index];
    if (!grupo) return Swal.fire('Error', 'No se encontró el grupo.', 'error');

    const { value: montoStr } = await Swal.fire({
        title: 'Abonar a Deuda',
        html: `<p>Usuario: <b>${grupo.user}</b></p><p>Deuda Total: <b style="color:#e74c3c">S/ ${grupo.total.toFixed(2)}</b></p>`,
        input: 'number',
        inputAttributes: { min: 0.1, max: grupo.total, step: 0.1 },
        inputPlaceholder: 'Ej: 5.00',
        showCancelButton: true, confirmButtonText: 'Siguiente', cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
            if (!value || value <= 0) return 'Ingresa un monto válido';
            if (value > grupo.total) return `No puedes cobrar más de la deuda (S/ ${grupo.total.toFixed(2)})`;
        }
    });

    if (!montoStr) return;
    const montoAbono = parseFloat(montoStr);

    const { value: metodo } = await Swal.fire({
        title: `Cobrar S/ ${montoAbono.toFixed(2)}`,
        input: 'radio',
        inputOptions: { 'Yape': 'Yape (QR)', 'Efectivo': 'Efectivo' },
        inputValidator: (v) => !v && 'Selecciona un método',
        showCancelButton: true, confirmButtonColor: '#3498db'
    });

    if (!metodo) return;
    let codigoOperacion = '';

    if (metodo === 'Yape') {
        const { value: cod } = await Swal.fire({
            title: '<strong style="color:#8E44AD">Abonar con Yape</strong>',
            html: `<div style="text-align:center;background:#FFF0F6;padding:15px;border-radius:15px;"><p style="font-weight:bold;margin-bottom:10px;">Abono: <span style="color:#8E44AD">S/ ${montoAbono.toFixed(2)}</span></p><img src="https://static.wixstatic.com/media/db69a5_32ad714f297d4f03a19c4a5c79a355fd~mv2.jpeg" style="width:220px;border-radius:15px;border:4px solid #FF6BAD;box-shadow:0 5px 15px rgba(0,0,0,0.1);margin-bottom:15px;"><p style="color:#555;font-size:0.9rem;">Últimos 3 dígitos:</p><input id="swal-input-op-abono" class="swal2-input" type="number" placeholder="Ej: 930" maxlength="3" style="font-size:2rem;text-align:center;letter-spacing:5px;width:150px;margin:5px auto;border:2px solid #FF6BAD;color:#8E44AD;font-weight:bold;"></div>`,
            confirmButtonText: 'Registrar', confirmButtonColor: '#00C49A', showCancelButton: true,
            preConfirm: () => { const v = document.getElementById('swal-input-op-abono').value; if (!v || v.length < 3) Swal.showValidationMessage('Faltan dígitos'); return v; }
        });
        if (!cod) return;
        codigoOperacion = cod;
    }

    Swal.fire({ title: 'Registrando abono...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

    try {
        const fechaActual = new Date().toLocaleString();
        const ts = Date.now();

        await DataService.registrarVenta({
            user: grupo.user, sede: grupo.sede || 'Global', total: montoAbono, costoTotal: 0, metodo: metodo, codigoOperacion: codigoOperacion, items: [{ nombre: `Abono parcial de deuda`, cantidad: 1, precio: montoAbono, costo: 0 }], fecha: fechaActual, timestamp: ts
        });

        await DataService.registrarVenta({
            user: grupo.user, sede: grupo.sede || 'Global', total: -montoAbono, costoTotal: 0, metodo: 'Pendiente', codigoOperacion: '', items: [{ nombre: `Descuento por abono en ${metodo}`, cantidad: 1, precio: -montoAbono, costo: 0 }], fecha: fechaActual, timestamp: ts + 1 
        });

        await Swal.fire({ icon: 'success', title: '¡Abono Registrado!', text: `Se restaron S/ ${montoAbono.toFixed(2)} a la deuda.`, timer: 2500, showConfirmButton: false });
        initAdmin(window.__teleSnackUserForReports); // RECARGA SILENCIOSA

    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'Fallo al guardar el abono', 'error');
    }
};

window.cobrarDeudaAgrupada = async (index) => {
    const grupo = window.listaGruposPendientes[index];
    if (!grupo) return Swal.fire('Error', 'Error identificando cobro.', 'error');

    const { value: metodo } = await Swal.fire({
        title: `Cobrar Todo`, text: grupo.user,
        html: `<h2 style="color:#e74c3c;font-weight:bold;margin-top:10px;">S/ ${grupo.total.toFixed(2)}</h2><p style="color:#888;">Liquidar <b>${grupo.ids.length}</b> tickets.</p>`,
        input: 'radio', inputOptions: { 'Yape': 'Yape (QR)', 'Efectivo': 'Efectivo' },
        inputValidator: (v) => !v && 'Selecciona una opción',
        showCancelButton: true, confirmButtonColor: '#2ecc71', confirmButtonText: 'Siguiente'
    });

    if (!metodo) return;
    let codigoOperacion = '';

    if (metodo === 'Yape') {
        const { value: cod } = await Swal.fire({
            title: '<strong style="color:#8E44AD">Cobrar con Yape</strong>',
            html: `<div style="text-align:center;background:#FFF0F6;padding:15px;border-radius:15px;"><p style="font-weight:bold;margin-bottom:10px;">Total: <span style="color:#8E44AD">S/ ${grupo.total.toFixed(2)}</span></p><img src="https://static.wixstatic.com/media/db69a5_32ad714f297d4f03a19c4a5c79a355fd~mv2.jpeg" style="width:220px;border-radius:15px;border:4px solid #FF6BAD;box-shadow:0 5px 15px rgba(0,0,0,0.1);margin-bottom:15px;"><p style="color:#555;font-size:0.9rem;">Últimos 3 dígitos:</p><input id="swal-input-op" class="swal2-input" type="number" placeholder="Ej: 930" maxlength="3" style="font-size:2rem;text-align:center;letter-spacing:5px;width:150px;margin:5px auto;border:2px solid #FF6BAD;color:#8E44AD;font-weight:bold;"></div>`,
            confirmButtonText: 'Registrar', confirmButtonColor: '#00C49A', showCancelButton: true,
            preConfirm: () => { const v = document.getElementById('swal-input-op').value; if (!v || v.length < 3) Swal.showValidationMessage('Faltan dígitos'); return v; }
        });
        if (!cod) return;
        codigoOperacion = cod;
    }

    Swal.fire({ title: 'Procesando...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
    try {
        const fechaPago = new Date().toLocaleString();
        await Promise.all(grupo.ids.map(id => DataService.actualizarVenta(id, { metodo, codigoOperacion, fechaPago })));
        
        await Swal.fire({ icon: 'success', title: '¡Liquidado!', text: `Cobrado: S/ ${grupo.total.toFixed(2)}`, timer: 2000, showConfirmButton: false });
        initAdmin(window.__teleSnackUserForReports); // RECARGA SILENCIOSA
    } catch (e) { Swal.fire('Error', 'Fallo al guardar', 'error'); }
};

// --- LISTA DE TICKETS ---
function renderTransactionsList(ventas) {
    const container = document.getElementById('transaction-list');
    if (!container) return;
    if (!ventas.length) { container.innerHTML = '<div style="text-align:center;padding:30px;color:#888">Sin movimientos</div>'; return; }

    const porMetodo = { 'Yape': [], 'Efectivo': [], 'Pendiente': [] };
    ventas.forEach(v => { if (porMetodo[v.metodo]) porMetodo[v.metodo].push(v); else porMetodo['Efectivo'].push(v); });

    const agrupados = {};
    porMetodo['Pendiente'].forEach(v => {
        const u = v.user || "Anónimo";
        if (!agrupados[u]) agrupados[u] = { user: u, total: 0, ids: [], items: [], sede: v.sede };
        agrupados[u].total += (parseFloat(v.total) || 0);
        agrupados[u].ids.push(v.id);
        if (v.items) v.items.forEach(i => agrupados[u].items.push(`${i.cantidad} ${i.nombre}`));
    });

    window.listaGruposPendientes = Object.values(agrupados).filter(g => g.total > 0);

    let html = '';
    ['Pendiente', 'Efectivo', 'Yape'].forEach(metodo => {
        const color = metodo === 'Yape' ? '#00d2d3' : (metodo === 'Efectivo' ? '#2ecc71' : '#ff9f43');
        const display = metodo === 'Pendiente' ? 'block' : 'none'; 
        const icon = metodo === 'Pendiente' ? 'rotate(180deg)' : 'rotate(0deg)';
        const count = metodo === 'Pendiente' ? window.listaGruposPendientes.length : porMetodo[metodo].length;
        if (count === 0) return;

        html += `<div style="margin-bottom:15px;">
            <div onclick="toggleCategory('${metodo}')" style="background:white;padding:15px;border-radius:10px;border-left:5px solid ${color};display:flex;align-items:center;cursor:pointer;box-shadow:0 2px 5px rgba(0,0,0,0.05);">
                <div style="flex:1;font-weight:bold;color:#444;">${metodo} (${count})</div>
                <i id="icon-${metodo}" class="material-icons" style="color:#ccc;transform:${icon}">expand_more</i>
            </div>
            <div id="cat-${metodo}" style="display:${display};padding-top:10px;">`;

        if (metodo === 'Pendiente') {
            html += `<div style="text-align:right; margin-bottom:10px;"><button onclick="window.imprimirReporteDeudas()" style="background:#34495e; color:white; border:none; padding:8px 15px; border-radius:5px; cursor:pointer; font-size:0.85rem; display:inline-flex; align-items:center; gap:5px;"><i class="material-icons" style="font-size:16px">print</i> Imprimir Reporte</button></div>`;

            window.listaGruposPendientes.forEach((g, idx) => {
                html += `
                    <div style="background:white;padding:15px;margin-bottom:8px;border-radius:8px;border:1px solid #eee;border-left:4px solid #ff9f43;">
                        <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
                            <span style="font-weight:bold;font-size:1.1rem;color:#333">${g.user.replace(/['"]/g, '')}</span>
                            <div style="text-align:right;"><span style="font-weight:800;font-size:1.2rem;color:#e74c3c">S/ ${g.total.toFixed(2)}</span></div>
                        </div>
                        <div style="font-size:0.85rem;color:#666;background:#fff8e1;padding:8px;border-radius:5px;"><i class="material-icons" style="font-size:12px;">shopping_basket</i> ${g.items.slice(0,4).join(', ')}${g.items.length>4?'...':''}</div>
                        <div style="margin-top:12px; display:flex; justify-content:flex-end; gap:10px;">
                            <button onclick="window.abonarDeudaParcial(${idx})" style="background:#3498db;color:white;border:none;padding:8px 15px;border-radius:50px;font-weight:bold;cursor:pointer;display:inline-flex;align-items:center;gap:5px;box-shadow:0 4px 10px rgba(52,152,219,0.3);"><i class="material-icons" style="font-size:16px">payments</i> ABONAR</button>
                            <button onclick="window.cobrarDeudaAgrupada(${idx})" style="background:#2ecc71;color:white;border:none;padding:8px 15px;border-radius:50px;font-weight:bold;cursor:pointer;display:inline-flex;align-items:center;gap:5px;box-shadow:0 4px 10px rgba(46,204,113,0.3);"><i class="material-icons" style="font-size:16px">price_check</i> COBRAR TODO</button>
                        </div>
                    </div>`;
            });
        } else {
            porMetodo[metodo].sort((a,b) => (b.id||'').localeCompare(a.id||''));
            porMetodo[metodo].forEach(v => {
                const op = (metodo === 'Yape' && v.codigoOperacion) ? `<div style="font-size:0.8rem;color:#00d2d3;font-weight:bold;text-align:right;">Op: ${v.codigoOperacion}</div>` : '';
                html += `<div style="background:white;padding:15px;margin-bottom:8px;border-radius:8px;border:1px solid #eee;"><div style="display:flex;justify-content:space-between;margin-bottom:5px;"><span style="font-weight:bold;color:#333">${(v.user||'').replace(/['"]/g, '')}</span><div style="text-align:right;"><span style="font-weight:bold;color:${color}">S/ ${v.total.toFixed(2)}</span>${op}</div></div><div style="font-size:0.8rem;color:#888;">${v.fecha}</div><div style="font-size:0.85rem;color:#666;background:#f9f9f9;padding:5px;margin-top:5px;">${v.items?v.items.map(i=>`${i.cantidad}x ${i.nombre}`).join(', '):''}</div></div>`;
            });
        }
        html += `</div></div>`;
    });
    container.innerHTML = html;
    window.toggleCategory = (m) => { const d=document.getElementById(`cat-${m}`),i=document.getElementById(`icon-${m}`); if(d.style.display==='none'){d.style.display='block';i.style.transform='rotate(180deg)';}else{d.style.display='none';i.style.transform='rotate(0deg)';}};
}

// --- IMPRIMIR REPORTE DEUDAS ---
window.imprimirReporteDeudas = () => {
    if (window.listaGruposPendientes.length === 0) return Swal.fire('Info', 'No hay deudas pendientes.', 'info');
    let totalGeneral = 0;
    const filas = window.listaGruposPendientes.map((g, i) => {
        totalGeneral += g.total;
        return `<tr><td style="padding:10px;">${i + 1}</td><td style="padding:10px; font-weight:bold;">${g.user.replace(/['"]/g, '')}</td><td style="padding:10px; color:#555; font-size:0.9rem;">${g.items.slice(0, 5).join(', ')} ${g.items.length > 5 ? '...' : ''}</td><td style="padding:10px; text-align:right; font-weight:bold; color:#e74c3c;">S/ ${g.total.toFixed(2)}</td></tr>`;
    }).join('');
    const ventana = window.open('', '', 'height=600,width=800');
    ventana.document.write(`<html><head><title>Reporte de Deudas</title><style>body { font-family: 'Segoe UI', sans-serif; padding: 20px; } h2 { color: #2c3e50; text-align: center; } table { width: 100%; border-collapse: collapse; margin-top: 20px; } th { background: #f8f9fa; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; } .total-box { margin-top: 20px; text-align: right; font-size: 1.5rem; font-weight: bold; color: #e74c3c; }</style></head><body><h2>📑 Reporte de Cuentas por Cobrar</h2><p style="text-align:center; color:#777;">Fecha de emisión: ${new Date().toLocaleString()}</p><table><thead><tr><th width="5%">#</th><th width="30%">Usuario</th><th width="45%">Detalle Resumido</th><th width="20%" style="text-align:right">Deuda Total</th></tr></thead><tbody>${filas}</tbody></table><div class="total-box">Total por Cobrar: S/ ${totalGeneral.toFixed(2)}</div><script>window.print();</script></body></html>`);
    ventana.document.close();
};

// ====================================================================
// --- GRÁFICOS Y TABLAS ---
// ====================================================================
function initCharts(ventas) {
    if (window.chartInstPayment) window.chartInstPayment.destroy();
    if (window.chartInstProfit) window.chartInstProfit.destroy();
    if (window.chartInstTimeline) window.chartInstTimeline.destroy();

    const c1 = document.getElementById('chartPayment'); if(c1) { window.chartInstPayment = new Chart(c1.getContext('2d'), { type:'bar', data:{labels:['Yape','Efectivo','Pendiente'], datasets:[{label:'S/', data:[ventas.filter(x=>x.metodo==='Yape').reduce((s,x)=>s+(parseFloat(x.total)||0),0), ventas.filter(x=>x.metodo==='Efectivo').reduce((s,x)=>s+(parseFloat(x.total)||0),0), ventas.filter(x=>x.metodo==='Pendiente').reduce((s,x)=>s+(parseFloat(x.total)||0),0)], backgroundColor:['#00d2d3','#2ecc71','#ff9f43'], borderRadius:5}]}, options:{plugins:{legend:{display:false}}, maintainAspectRatio:false} }); }
    
    const c2 = document.getElementById('chartProfit'); if(c2) { 
        const vOk = ventas.filter(x=>x.metodo!=='Pendiente');
        const tv = vOk.reduce((s,x)=>s+(parseFloat(x.total)||0),0);
        const tc = vOk.reduce((s,x)=>s+(parseFloat(x.costoTotal)||parseFloat(x.total)*0.65||0),0);
        window.chartInstProfit = new Chart(c2.getContext('2d'), { type:'doughnut', data:{labels:['Costo','Ganancia'], datasets:[{data:[tc, tv-tc], backgroundColor:['#bdc3c7','#1dd1a1']}]}, options:{maintainAspectRatio:false, cutout:'70%'} });
    }
    
    const c3 = document.getElementById('chartTimeline'); if(c3) {
        const sales = {}; 
        ventas.forEach(x => { 
            if(x.metodo !== 'Pendiente') { 
                const d = x.fecha.split(',')[0]; 
                sales[d] = (sales[d] || 0) + (parseFloat(x.total) || 0); 
            } 
        });

        let labels = Object.keys(sales).sort((a,b)=> { 
            const [da,ma,ya]=a.split('/'); 
            const [db,mb,yb]=b.split('/'); 
            return new Date(ya,ma-1,da) - new Date(yb,mb-1,db); 
        });

        labels = labels.slice(-7);

        window.chartInstTimeline = new Chart(c3.getContext('2d'), { 
            type:'line', 
            data:{
                labels: labels, 
                datasets:[{
                    label:'Ventas', 
                    data: labels.map(l=>sales[l]), 
                    borderColor:'#8e44ad', 
                    backgroundColor:'rgba(142,68,173,0.1)', 
                    fill:true, 
                    tension:0.3
                }]
            }, 
            options:{maintainAspectRatio:false} 
        });
    }
}

// ====================================================================
// --- GESTIÓN DE USUARIOS (CON BLOQUEO DE CUENTA Y FIADO) ---
// ====================================================================
function renderUsuariosTable(lista, adminUser) {
    const tbody = document.getElementById('tabla-usuarios').querySelector('tbody'); if (!tbody) return;
    
    tbody.innerHTML = lista.map(u => {
        let acc = (u.rol==='SuperAdmin') ? '<i class="material-icons" style="color:#ccc">lock</i>' : `<div style="display:flex;gap:8px;"><button class="btn-icon-pretty edit" onclick="window.editarUsuario('${u.id}')" title="Editar Permisos"><i class="material-icons">edit</i></button><button class="btn-icon-pretty key" onclick="window.cambiarPin('${u.id}','${u.nombre.replace(/'/g,"\\'")}')" title="Cambiar PIN"><i class="material-icons">vpn_key</i></button></div>`;
        
        // --- BADGES VISUALES ---
        const badgeFiar = u.puedeFiar === false 
            ? `<span style="font-size:0.7rem; background:#ffebee; color:#c62828; padding:2px 6px; border-radius:4px; margin-left:5px;">🚫 Sin Fiado</span>` 
            : `<span style="font-size:0.7rem; background:#e8f5e9; color:#2e7d32; padding:2px 6px; border-radius:4px; margin-left:5px;">✅ Fiado OK</span>`;
            
        const badgeActivo = u.activo === false
            ? `<span style="font-size:0.7rem; background:#555; color:white; padding:2px 6px; border-radius:4px; display:inline-block; margin-top:3px;">INACTIVO</span>`
            : `<span style="font-size:0.7rem; background:#e3f2fd; color:#2980b9; padding:2px 6px; border-radius:4px; display:inline-block; margin-top:3px;">ACTIVO</span>`;

        return `<tr>
            <td style="font-weight:bold; color:#555;">${u.user}</td>
            <td>
                <div style="font-weight:500;">${u.nombre.replace(/['"]/g, '')}</div>
                <div>${badgeActivo} ${badgeFiar}</div>
            </td>
            <td><span class="badge-role sede">${u.sede}</span></td>
            <td><span class="badge-role" style="background:#f3e5f5;color:#8e44ad">${u.rol}</span></td>
            <td>${acc}</td>
        </tr>`;
    }).join('');

    window.editarUsuario = async (id) => {
        const u = lista.find(x=>x.id===id); if(!u || u.rol==='SuperAdmin') return;
        const sedes = ['Jauja','Huancayo','Oroya','Almacen'];
        const optionsSede = sedes.map(s => `<option value="${s}" ${u.sede === s ? 'selected' : ''}>${s}</option>`).join('');
        const roles = ['Usuario','AdminSede'].map(r=>`<option value="${r}" ${u.rol===r?'selected':''}>${r}</option>`).join('');
        const sHtml = adminUser.rol==='SuperAdmin' ? `<select id="e-s" class="swal2-select">${optionsSede}</select>` : `<select id="e-s" class="swal2-select" disabled>${optionsSede}</select>`;
        
        // Verificamos estado actual
        const esActivo = u.activo !== false; 
        const puedeFiar = u.puedeFiar !== false;

        const {value:v} = await Swal.fire({ 
            title:'Editar Usuario y Permisos', 
            html:`
                <label style="display:block;text-align:left;color:#666;font-size:0.9rem;margin-top:10px;">Nombre Completo:</label>
                <input id="e-n" class="swal2-input" value='${u.nombre.replace(/['"]/g, '')}'>
                
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    <div>
                        <label style="display:block;text-align:left;color:#666;font-size:0.9rem;margin-top:10px;">Sede:</label>${sHtml}
                    </div>
                    <div>
                        <label style="display:block;text-align:left;color:#666;font-size:0.9rem;margin-top:10px;">Rol:</label><select id="e-r" class="swal2-select" style="width:100%">${roles}</select>
                    </div>
                </div>

                <div style="margin-top:20px; padding-top:15px; border-top:1px solid #eee;">
                    <label style="display:block;text-align:left;color:#8e44ad;font-weight:bold;margin-bottom:5px;">⚙️ Accesos y Permisos</label>
                    <div style="display:flex; justify-content:space-between; align-items:center; background:#f9f9f9; padding:10px; border-radius:8px; margin-bottom:10px;">
                        <span style="font-size:0.9rem;">Cuenta Activa (Acceso al sistema)</span>
                        <input type="checkbox" id="e-act" style="width:20px; height:20px;" ${esActivo ? 'checked' : ''}>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; background:#f9f9f9; padding:10px; border-radius:8px;">
                        <span style="font-size:0.9rem;">Permitir compras "Fiadas"</span>
                        <input type="checkbox" id="e-fiar" style="width:20px; height:20px;" ${puedeFiar ? 'checked' : ''}>
                    </div>
                </div>
            `, 
            preConfirm:()=>({
                nombre: document.getElementById('e-n').value, 
                sede: document.getElementById('e-s').value, 
                rol: document.getElementById('e-r').value,
                activo: document.getElementById('e-act').checked,
                puedeFiar: document.getElementById('e-fiar').checked
            }) 
        });
        
        if(v) { 
            Swal.fire({ title: 'Guardando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            try {
                await DataService.actualizarUsuario(id,v); 
                await Swal.fire({ icon: 'success', title: 'Listo', text: 'Usuario actualizado.', timer: 1500, showConfirmButton: false });
                initAdmin(adminUser); // RECARGA SILENCIOSA
            } catch (e) {
                console.error(e);
                Swal.fire('Error', 'Fallo al editar usuario', 'error');
            }
        }
    };
    
    window.cambiarPin = async (id,nom) => {
        const {value:p} = await Swal.fire({ title:`PIN para ${nom}`, input:'password', inputAttributes:{maxlength:6,pattern:'[0-9]*',inputmode:'numeric'}, showCancelButton:true });
        if(p && /^\d{6}$/.test(p)) { 
            Swal.fire({ title: 'Guardando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            try {
                await DataService.actualizarUsuario(id,{pin:p}); 
                await Swal.fire({ icon: 'success', title: 'Listo', text: 'PIN actualizado.', timer: 1500, showConfirmButton: false });
                initAdmin(adminUser); // RECARGA SILENCIOSA
            } catch (e) {
                console.error(e);
                Swal.fire('Error', 'Fallo al cambiar PIN', 'error');
            }
        }
    };
}

async function crearUsuario(u) {
    if (u.rol !== 'SuperAdmin' && u.rol !== 'AdminSede') return;
    let s = u.rol === 'SuperAdmin' ? `<select id="n-s" class="swal2-select"><option>Jauja</option><option>Huancayo</option><option>Oroya</option><option>Almacen</option></select>` : `<select id="n-s" class="swal2-select" disabled><option selected>${u.sede}</option></select>`;
    const {value:d} = await Swal.fire({ title:'Nuevo Usuario', html:`<input id="n-n" placeholder="Nombre" class="swal2-input"><input id="n-u" placeholder="Usuario" class="swal2-input"><input id="n-p" type="password" placeholder="PIN (6)" class="swal2-input">${s}`, preConfirm:()=>[document.getElementById('n-n').value, document.getElementById('n-u').value, document.getElementById('n-p').value, document.getElementById('n-s').value] });
    
    if (d) { 
        Swal.fire({ title: 'Creando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
            // Se le agrega puedeFiar: true y activo: true por defecto
            await DataService.crearUsuario({nombre:d[0], user:d[1], pin:d[2], sede:d[3], rol:'Usuario', activo:true, puedeFiar:true}); 
            await Swal.fire({ icon: 'success', title: '¡Creado!', text: 'Usuario agregado.', timer: 1500, showConfirmButton: false });
            initAdmin(u); // RECARGA SILENCIOSA
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'No se pudo crear el usuario.', 'error');
        }
    }
}

// ====================================================================
// --- GESTIÓN DE INVENTARIO CON RECARGA SILENCIOSA ---
// ====================================================================
function renderInventoryTable(lista, adminUser) {
    const tbody = document.getElementById('tabla-inventario').querySelector('tbody'); if (!tbody) return;
    
    tbody.innerHTML = lista.map(p => {
        let accionesHtml = '';
        if (adminUser.rol === 'AdminSede') {
            accionesHtml = `<span style="color:#aaa; font-style:italic; font-size: 0.85rem;"><i class="material-icons" style="font-size:14px; vertical-align:middle;">visibility</i> Solo lectura</span>`;
        } else {
            accionesHtml = `<div class="action-btn-group"><button class="btn-icon-pretty edit" onclick="window.editarProducto('${p.id}')" title="Editar"><i class="material-icons">edit</i></button><button class="btn-icon-pretty delete" onclick="window.eliminarProducto('${p.id}','${p.nombre.replace(/'/g,"\\'")}')" title="Eliminar"><i class="material-icons">delete</i></button></div>`;
        }

        return `<tr><td><img src="${p.img||'img/no-image.png'}" style="width:40px;height:40px;object-fit:cover;border-radius:5px;"></td><td>${p.nombre}</td><td>S/${parseFloat(p.precio).toFixed(2)}</td><td style="font-weight:bold;color:${p.stock<5?'red':'green'}">${p.stock}</td><td>${p.sede}</td><td><span style="font-size:0.8rem;padding:2px 6px;border-radius:4px;background:${p.condicion==='REMATE'?'#ffebee':'#e8f5e9'};color:${p.condicion==='REMATE'?'#c62828':'#2e7d32'}">${p.condicion}</span></td><td>${accionesHtml}</td></tr>`;
    }).join('');

    window.editarProducto = async (id) => {
        if(adminUser.rol === 'AdminSede') return Swal.fire('Error', 'No tienes permisos para editar.', 'error');
        const p = lista.find(x=>x.id===id); if(!p) return;
        const sedes = ['Jauja','Huancayo','Oroya','Almacen'].map(s=>`<option value="${s}" ${p.sede===s?'selected':''}>${s}</option>`).join('');
        const sHtml = adminUser.rol==='SuperAdmin' ? `<select id="e-s" class="swal2-select">${sedes}</select>` : `<select id="e-s" class="swal2-select" disabled><option>${p.sede}</option></select>`;
        const {value:f} = await Swal.fire({ title:'Editar', html:`<input id="e-img" class="swal2-input" value="${p.img||''}"><input id="e-nom" class="swal2-input" value="${p.nombre}"><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"><input id="e-cos" type="number" step="0.1" class="swal2-input" value="${p.costo||0}"><input id="e-pre" type="number" step="0.1" class="swal2-input" value="${p.precio}"></div><input id="e-stk" type="number" class="swal2-input" value="${p.stock}">${sHtml}<select id="e-c" class="swal2-select"><option value="NORMAL" ${p.condicion==='NORMAL'?'selected':''}>Normal</option><option value="REMATE" ${p.condicion==='REMATE'?'selected':''}>Remate</option></select>`, preConfirm:()=>({img:document.getElementById('e-img').value, nombre:document.getElementById('e-nom').value, costo:parseFloat(document.getElementById('e-cos').value), precio:parseFloat(document.getElementById('e-pre').value), stock:parseInt(document.getElementById('e-stk').value), sede:document.getElementById('e-s').value, condicion:document.getElementById('e-c').value}) });
        
        if (f) { 
            Swal.fire({ title: 'Guardando cambios...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            try {
                await DataService.actualizarProducto(id,f); 
                await Swal.fire({ icon: 'success', title: '¡Guardado!', text: 'El producto se actualizó.', timer: 1500, showConfirmButton: false });
                initAdmin(adminUser); // RECARGA SILENCIOSA
            } catch (e) {
                console.error(e);
                Swal.fire('Error', 'Hubo un problema de conexión al editar.', 'error');
            }
        }
    };

    window.eliminarProducto = async (id, nom) => {
        if(adminUser.rol === 'AdminSede') return Swal.fire('Error', 'No tienes permisos para eliminar.', 'error');
        
        const r = await Swal.fire({
            title: '¿Confirmar eliminación?', text: `Se borrará: ${nom}`, icon: 'warning', 
            showCancelButton: true, confirmButtonColor: '#e74c3c', cancelButtonColor: '#95a5a6',
            confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar'
        });
        
        if (r.isConfirmed) { 
            Swal.fire({ title: 'Eliminando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            try {
                await DataService.eliminarProducto(id); 
                await Swal.fire({ icon: 'success', title: '¡Borrado!', text: 'Producto eliminado correctamente.', timer: 1500, showConfirmButton: false });
                initAdmin(adminUser); // RECARGA SILENCIOSA
            } catch (e) {
                console.error("Error al eliminar producto:", e);
                Swal.fire('Error', 'No se pudo eliminar. Revisa la conexión.', 'error');
            }
        }
    };
}

async function crearProducto(u) {
    if(u.rol === 'AdminSede') return Swal.fire('Error', 'No tienes permisos.', 'error');
    const sHtml = `<select id="n-s" class="swal2-select"><option>Jauja</option><option>Huancayo</option><option>Oroya</option><option>Almacen</option></select>`;
    const {value:d} = await Swal.fire({ title:'Nuevo Producto', html:`<input id="n-i" placeholder="Img URL" class="swal2-input"><input id="n-n" placeholder="Nombre" class="swal2-input"><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"><input id="n-c" placeholder="Costo" type="number" class="swal2-input"><input id="n-p" placeholder="Precio" type="number" class="swal2-input"></div><input id="n-k" placeholder="Stock" type="number" class="swal2-input">${sHtml}<select id="n-co" class="swal2-select"><option value="NORMAL">Normal</option><option value="REMATE">Remate</option></select>`, preConfirm:()=>({img:document.getElementById('n-i').value, nombre:document.getElementById('n-n').value, costo:parseFloat(document.getElementById('n-c').value)||0, precio:parseFloat(document.getElementById('n-p').value)||0, stock:parseInt(document.getElementById('n-k').value)||0, sede:document.getElementById('n-s').value, condicion:document.getElementById('n-co').value}) });
    
    if (d && d.nombre) { 
        Swal.fire({ title: 'Guardando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
            await DataService.crearProducto(d); 
            await Swal.fire({ icon: 'success', title: '¡Creado!', text: 'Producto agregado al inventario.', timer: 1500, showConfirmButton: false });
            initAdmin(u); // RECARGA SILENCIOSA
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'Fallo al crear el producto.', 'error');
        }
    }
}

function renderFinanceTable(v){
    const t = document.querySelector('#tabla-finanzas tbody'); if(!t) return;
    let sg=0;
    t.innerHTML = v.filter(x=>x.metodo!=='Pendiente').map(x=>{
        if(!x.items) return '';
        return x.items.map(i=>{
            const p = productosGlobal.find(z=>z.nombre===i.nombre);
            const c = i.costo||(p?p.costo:0); const g=(i.precio-c)*i.cantidad; sg+=g;
            return `<tr><td>${x.fecha.split(',')[0]}</td><td>${(i.nombre || '').replace(/['"]/g, '')}</td><td>${i.cantidad}</td><td>${c.toFixed(2)}</td><td>${i.precio.toFixed(2)}</td><td>${g.toFixed(2)}</td></tr>`;
        }).join('');
    }).join('');
    if(document.getElementById('ft-ganancia')) document.getElementById('ft-ganancia').innerText=`S/ ${sg.toFixed(2)}`;
}

window.renderMetrics = function(v){ 
    let t=0,y=0,c=0,p=0; v.forEach(x=>{ if(x.metodo==='Pendiente') p+=parseFloat(x.total)||0; else { t+=parseFloat(x.total)||0; if(x.metodo==='Yape')y+=parseFloat(x.total)||0; else c+=parseFloat(x.total)||0; } }); 
    ['m-total','m-yape','m-cash','m-pending'].forEach((id,i)=> { const el=document.getElementById(id); if(el) el.innerText=`S/ ${[t,y,c,p][i].toFixed(2)}`; });
};

function setupSearchFilters(p, u, admin) {
    const si = document.getElementById('search-inventory');
    const su = document.getElementById('search-users');
    
    if (si) {
        si.onkeyup = (e) => { 
            renderInventoryTable(p.filter(x => x.nombre.toLowerCase().includes(e.target.value.toLowerCase())), admin); 
        }
        
        if (!document.getElementById('btn-print-catalog')) {
            const btnPrint = document.createElement('button');
            btnPrint.id = 'btn-print-catalog';
            btnPrint.innerHTML = '<i class="material-icons" style="font-size:16px; vertical-align:middle;">picture_as_pdf</i> Imprimir Catálogo';
            btnPrint.style.cssText = 'background:#8e44ad; color:white; border:none; padding:10px 20px; border-radius:50px; font-weight:bold; cursor:pointer; margin-left:10px; box-shadow: 0 4px 10px rgba(142, 68, 173, 0.3); transition: transform 0.2s;';
            btnPrint.onclick = () => window.imprimirCatalogo(admin);
            
            si.parentNode.insertBefore(btnPrint, si.nextSibling);
        }
    }
    
    if (su) {
        su.onkeyup = (e) => renderUsuariosTable(u.filter(x => x.nombre.toLowerCase().includes(e.target.value.toLowerCase())), admin);
    }
}

document.addEventListener('click', (e)=>{ if(e.target.id === 'btn-finance-pdf') window.reportController.generateFinanceReport(); });