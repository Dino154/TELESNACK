import { DataService } from '../services/dataService.js';
import { Auth } from '../services/auth.js';

// --- VARIABLES GLOBALES ---
let ventasCargadas = []; 
window.kardexCurrentView = 'transactions';
window.calendarState = {
    selectedDates: [],
    flatpickrInstance: null,
    isExpanded: true,
    currentDate: new Date(),
    dateFrom: null,
    dateTo: null
};

// Guardará la data filtrada activa en todo momento para que el PDF sepa qué imprimir
window.currentKardexData = []; 

// --- INICIALIZACIÓN AUTOMÁTICA ---
document.addEventListener('DOMContentLoaded', () => {
    const user = Auth.getCurrentUser();
    if (!user) return;
});

// --- FUNCIÓN PRINCIPAL DE INICIO ---
async function initKardex() {
    console.log('🚀 Inicializando Kardex Cloud...');
    
    const user = Auth.getCurrentUser();
    const content = document.getElementById('kardex-content');
    
    if (content) content.innerHTML = '<div style="text-align:center; padding:50px; color:#888;"><i class="material-icons fa-spin" style="font-size:30px">refresh</i><br><br>Cargando historial...</div>';

    const sede = user.rol === 'SuperAdmin' ? 'Global' : user.sede;
    try {
        ventasCargadas = await DataService.getVentas(sede);
    } catch (e) {
        if(content) content.innerHTML = '<p style="color:#e74c3c; text-align:center">Error de conexión</p>';
        return;
    }

    const filters = document.getElementById('kardex-filters-container');
    if (filters) filters.classList.remove('hidden');
    
    const addSafeListener = (id, eventType, fn) => {
        const el = document.getElementById(id);
        if (el) {
            el.removeEventListener(eventType, fn); 
            el.addEventListener(eventType, fn);
        }
    };

    const resetButtonAndListen = (id, fn) => {
        const oldEl = document.getElementById(id);
        if (oldEl) {
            const newEl = oldEl.cloneNode(true);
            oldEl.parentNode.replaceChild(newEl, oldEl);
            newEl.addEventListener('click', fn);
        }
    };

    ['kardex-filter-user', 'kardex-filter-product', 'kardex-filter-method'].forEach(id => {
        addSafeListener(id, 'change', loadKardexData);
    });

    addSafeListener('apply-kardex-filters', 'click', loadKardexData);
    addSafeListener('clear-kardex-filters', 'click', clearKardexFilters);
    
    ['transactions', 'entries', 'exits'].forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (el) el.onclick = () => switchKardexView(v);
    });

    resetButtonAndListen('kardex-export-csv', exportKardexCSVByView);
    resetButtonAndListen('kardex-export-excel', exportKardexCSVByView); 
    resetButtonAndListen('kardex-export-pdf', exportKardexPDFByView);

    populateKardexFilters();
    initCalendar();
    loadKardexData();
}

// --- CALENDARIO ---
function initCalendar() {
    const calendarInput = document.getElementById('kardex-calendar');
    if (!calendarInput || !window.flatpickr) return;
    
    if (calendarInput._flatpickr) calendarInput._flatpickr.destroy();
    
    const fp = flatpickr(calendarInput, {
        mode: 'range',
        dateFormat: 'Y-m-d',
        locale: 'es',
        maxDate: new Date().fp_incr(365),
        onChange: (dates) => {
            if (dates.length === 2) {
                window.calendarState.dateFrom = dates[0].toISOString().split('T')[0];
                window.calendarState.dateTo = dates[1].toISOString().split('T')[0];
                loadKardexData();
            } else if (dates.length === 1) {
                const d = dates[0].toISOString().split('T')[0];
                window.calendarState.dateFrom = d; window.calendarState.dateTo = d;
                loadKardexData();
            }
        }
    });
    calendarInput._flatpickr = fp;
}

// --- POBLAR FILTROS ---
function populateKardexFilters() {
    const uFilter = document.getElementById('kardex-filter-user');
    const pFilter = document.getElementById('kardex-filter-product');
    const mFilter = document.getElementById('kardex-filter-method'); 
    
    if (uFilter) {
        const rawUsers = [...new Set(ventasCargadas.map(v => v.user || 'Anónimo'))];
        const cleanUsers = [...new Set(rawUsers.map(u => u.replace(/['"]/g, '').trim()))].sort();
        uFilter.innerHTML = '<option value="">Todos los usuarios</option>' + cleanUsers.map(u => `<option value="${u}">${u}</option>`).join('');
    }
    
    if (pFilter) {
        const prods = [...new Set(ventasCargadas.flatMap(v => v.items || []).map(i => i.nombre))].sort();
        pFilter.innerHTML = '<option value="">Todos los productos</option>' + prods.map(p => `<option value="${p}">${p}</option>`).join('');
    }

    if (mFilter) {
        const methods = [...new Set(ventasCargadas.map(v => v.metodo || 'Efectivo'))].filter(Boolean).sort();
        mFilter.innerHTML = '<option value="">Todos los métodos</option>' + methods.map(m => `<option value="${m}">${m}</option>`).join('');
    }
}

// --- FILTRADO DE DATOS ---
function loadKardexData() {
    const userF = (document.getElementById('kardex-filter-user')?.value || '').toLowerCase().trim();
    const prodF = (document.getElementById('kardex-filter-product')?.value || '').toLowerCase().trim();
    const methF = (document.getElementById('kardex-filter-method')?.value || '').toLowerCase().trim();
    const { dateFrom, dateTo } = window.calendarState;

    let filtered = ventasCargadas.filter(v => {
        const uVentaLimpio = (v.user || 'Anónimo').replace(/['"]/g, '').trim().toLowerCase();
        const vMetodo = (v.metodo || '').trim().toLowerCase();

        if (userF && uVentaLimpio !== userF) return false;
        if (methF && vMetodo !== methF) return false;
        if (prodF && (!v.items || !v.items.some(i => i.nombre.toLowerCase().trim() === prodF))) return false;

        if (dateFrom || dateTo) {
            let vDateISO;
            if(v.fecha && v.fecha.includes('/')) {
                const parts = v.fecha.split(',')[0].split('/'); 
                vDateISO = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`; 
            } else if(v.fecha) {
                try { 
                    const d = new Date(v.fecha);
                    vDateISO = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); 
                } catch(e) {}
            }
            if (vDateISO) {
                if (dateFrom && vDateISO < dateFrom) return false;
                if (dateTo && vDateISO > dateTo) return false;
            }
        }
        return true;
    });

    filtered.sort((a,b) => {
        const timeA = a.timestamp || convertToDate(a.fecha).getTime();
        const timeB = b.timestamp || convertToDate(b.fecha).getTime();
        return timeB - timeA; 
    });

    // GUARDAMOS GLOBAL PARA QUE EL BOTON DE PDF SEPA QUÉ IMPRIMIR
    window.currentKardexData = filtered; 

    renderKardexData(filtered);
    
    const total = filtered.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
    const ops = document.getElementById('kardex-total-ops');
    const amt = document.getElementById('kardex-total-amount');
    if(ops) ops.textContent = filtered.length;
    if(amt) amt.textContent = `S/ ${total.toFixed(2)}`;
    
    setTimeout(() => updateKardexChart(filtered), 100);
}

function convertToDate(fechaStr) {
    if(!fechaStr) return new Date(0);
    if(fechaStr.includes('/')) {
        const parts = fechaStr.split(',')[0].split('/');
        return new Date(parts[2], parseInt(parts[1]) - 1, parts[0]);
    }
    return new Date(fechaStr);
}

// --- RENDERIZADO VISUAL ---
function renderKardexData(data) {
    const view = window.kardexCurrentView || 'transactions';
    const content = document.getElementById('kardex-content');
    if (!content) return;
    
    let html = `
        <div id="kardex-chart-container" style="background:white; padding:15px; border-radius:12px; margin-bottom:20px; height:220px; box-shadow:0 2px 10px rgba(0,0,0,0.03);">
            <canvas id="kardex-chart"></canvas>
        </div>
        <div id="kardex-table-container">
    `;
    
    if(view === 'transactions') html += renderTransactionsTable(data);
    else if(view === 'entries') html += renderEntriesTable(data);
    else html += renderExitsTable(data);
    
    html += `</div>`;
    content.innerHTML = html;
}

// ====================================================================
// --- TABLA HISTORIAL: AGRUPADA POR MES CON DESPLEGABLES ---
// ====================================================================
function renderTransactionsTable(data) {
    if (data.length === 0) return '<div style="text-align:center; padding:40px; color:#999; background:white; border-radius:12px;">Sin datos coincidentes. Intenta borrar los filtros.</div>';
    
    let rows = '';
    let mesActualRenderizado = '';
    const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    // Obtenemos el mes real del sistema actual
    const fechaSistema = new Date();
    const mesSistemaStr = `${nombresMeses[fechaSistema.getMonth()]} ${fechaSistema.getFullYear()}`;
    let primerMesProcesado = false;

    data.forEach(v => {
        const fechaSola = v.fecha.split(',')[0].trim(); // Ej: 19/2/2026
        const parts = fechaSola.split('/');
        let etiquetaMes = '';
        
        if (parts.length === 3) {
            const indexMes = parseInt(parts[1]) - 1;
            etiquetaMes = `${nombresMeses[indexMes]} ${parts[2]}`;
        }

        // Si detectamos un cambio de mes
        if (etiquetaMes && etiquetaMes !== mesActualRenderizado) {
            // Si ya había un tbody abierto, lo cerramos
            if (mesActualRenderizado !== '') {
                rows += `</tbody>`;
            }

            mesActualRenderizado = etiquetaMes;
            const safeId = mesActualRenderizado.replace(/\s+/g, ''); // "Marzo2026"
            
            // Lógica: Mantiene abierto solo el mes actual de nuestro calendario OR el primero de la lista
            const abrirPorDefecto = (mesActualRenderizado === mesSistemaStr) || (!primerMesProcesado);
            
            const displayStyle = abrirPorDefecto ? '' : 'none';
            const rotateIcon = abrirPorDefecto ? 'rotate(180deg)' : 'rotate(0deg)';

            // Creamos un <tbody> para el encabezado del acordeón y otro para los datos
            rows += `
                <tbody>
                    <tr onclick="window.toggleKardexMonth('${safeId}')" 
                        onmouseover="this.style.backgroundColor='#fce4ec'" 
                        onmouseout="this.style.backgroundColor='#fdf2f8'"
                        style="background-color: #fdf2f8; border-top: 2px solid #d660a9; cursor: pointer; transition: background 0.2s;">
                        <td colspan="7" style="padding: 12px 15px; font-weight: 800; color: #8e44ad; font-size: 1.05rem; text-align: left;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span>📅 ${mesActualRenderizado}</span>
                                <i id="icon-kx-${safeId}" class="material-icons" style="color: #a55eea; transition: transform 0.3s; transform: ${rotateIcon};">expand_more</i>
                            </div>
                        </td>
                    </tr>
                </tbody>
                <tbody id="tbody-kx-${safeId}" style="display: ${displayStyle};">
            `;
            primerMesProcesado = true;
        }

        // --- RENDERIZADO DE LAS FILAS DE DATOS ---
        if(v.items) v.items.forEach(i => {
            const nombreItem = i.nombre.toLowerCase();
            const esAbono = nombreItem.includes('abono') || nombreItem.includes('descuento');
            const rowStyle = esAbono ? 'background-color: #f0f8ff; border-left: 4px solid #3498db;' : '';
            const colorProd = esAbono ? '#2980b9' : '#8e44ad';
            const uLimpio = (v.user || '').replace(/['"]/g, '').trim();
            const totalItem = i.precio * i.cantidad;

            rows += `
                <tr style="height:50px; border-bottom:1px solid #f0f0f0; ${rowStyle}">
                    <td style="color:#666; font-size:0.9rem;">${fechaSola}</td>
                    <td style="font-weight:500;">${uLimpio}</td>
                    <td style="color:${colorProd}; font-weight:${esAbono ? 'bold' : 'normal'};">
                        ${esAbono ? '<i class="material-icons" style="font-size:14px; vertical-align:middle;">receipt_long</i> ' : ''}
                        ${i.nombre}
                    </td>
                    <td style="text-align:center;">${i.cantidad}</td>
                    <td>S/ ${parseFloat(i.precio).toFixed(2)}</td>
                    <td style="font-weight:bold; color:${totalItem < 0 ? '#e74c3c' : (esAbono ? '#2ecc71' : '#333')}">S/ ${totalItem.toFixed(2)}</td>
                    <td><span class="badge-role" style="background:${v.metodo==='Yape'?'#e0f7fa':(v.metodo==='Efectivo'?'#e8f5e9':'#fff3e0')}; color:${v.metodo==='Yape'?'#006064':(v.metodo==='Efectivo'?'#1b5e20':'#e65100')}; font-size:0.8rem; padding:4px 8px; border-radius:12px;">${v.metodo}</span></td>
                </tr>`;
        });
    });

    // Cerramos el último tbody
    if (mesActualRenderizado !== '') rows += `</tbody>`;

    return `
        <div class="card" style="border:none; box-shadow:0 4px 15px rgba(0,0,0,0.05);">
            <h3 style="color:#8e44ad; margin-bottom:15px; font-size:1.1rem;">Historial de Movimientos</h3>
            <div class="table-wrapper">
                <table id="kardex-table" style="width:100%; border-collapse:collapse;">
                    <thead><tr style="background:#f9f9f9; color:#666; text-align:left;">
                        <th style="padding:10px;">Fecha</th>
                        <th style="padding:10px;">Usuario</th>
                        <th style="padding:10px;">Producto / Detalle</th>
                        <th style="padding:10px; text-align:center;">Cant</th>
                        <th style="padding:10px;">Unit</th>
                        <th style="padding:10px;">Total</th>
                        <th style="padding:10px;">Método</th>
                    </tr></thead>
                    ${rows} 
                </table>
            </div>
        </div>`;
}

function renderEntriesTable(data) {
    const entries = simulateEntriesFromSales(data);
    if(entries.length === 0) return '<div style="text-align:center; padding:30px; color:#999; background:white;">Sin registros</div>';
    let rows = entries.map(e => `<tr style="height:50px; border-bottom:1px solid #f0f0f0;"><td>${e.fecha}</td><td>${e.producto}</td><td style="text-align:center">${e.cantidad}</td><td>S/ ${e.costoUnitario.toFixed(2)}</td><td>S/ ${e.total.toFixed(2)}</td></tr>`).join('');
    return `<div class="card" style="border:none; box-shadow:0 4px 15px rgba(0,0,0,0.05);"><h3>Entradas Valorizadas (Costo)</h3><div class="table-wrapper"><table style="width:100%"><thead><tr style="background:#f9f9f9"><th>Fecha</th><th>Producto</th><th>Cant Vendida</th><th>Costo Unit</th><th>Costo Total</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}

function renderExitsTable(data) {
    const exits = simulateExitsFromSales(data);
    if(exits.length === 0) return '<div style="text-align:center; padding:30px; color:#999; background:white;">Sin salidas</div>';
    let rows = exits.map(e => `<tr style="height:50px; border-bottom:1px solid #f0f0f0;"><td>${e.fecha}</td><td>${e.producto}</td><td style="text-align:center">${e.cantidad}</td><td>${e.motivo}</td><td>${e.responsable}</td></tr>`).join('');
    return `<div class="card" style="border:none; box-shadow:0 4px 15px rgba(0,0,0,0.05);"><h3>Salidas de Inventario</h3><div class="table-wrapper"><table style="width:100%"><thead><tr style="background:#f9f9f9"><th>Fecha</th><th>Producto</th><th>Cant</th><th>Motivo</th><th>Responsable</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}

// --- GRÁFICO DEL KARDEX: CORTADO A 7 DÍAS ---
function updateKardexChart(data) {
    const canvas = document.getElementById('kardex-chart');
    if (!canvas) return;
    
    const sales = {};
    data.forEach(v => {
        if (v.total < 0 && v.metodo === 'Pendiente') return; 

        let d;
        if(v.fecha.includes('/')) {
            const parts = v.fecha.split(',')[0].split('/');
            d = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
        } else {
            d = v.fecha.split('T')[0];
        }
        if (!sales[d]) sales[d] = 0;
        sales[d] += parseFloat(v.total) || 0;
    });
    
    let labels = Object.keys(sales).sort();
    
    // --- AQUÍ CORTAMOS PARA QUE MUESTRE SOLO LOS ÚLTIMOS 7 DÍAS ---
    labels = labels.slice(-7);
    
    const values = labels.map(d => sales[d]);

    if (window.kardexChartInstance) window.kardexChartInstance.destroy();
    
    window.kardexChartInstance = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: { labels: labels, datasets: [{ label: 'Movimientos (S/)', data: values, backgroundColor: 'rgba(142, 68, 173, 0.6)', borderColor: 'rgb(142, 68, 173)', borderWidth: 1, borderRadius: 5 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: {display:false} }, scales: { y: { beginAtZero: true } } }
    });
}

// --- EXPORTACIÓN ---
function exportKardexPDFByView() {
    if (!window.currentKardexData || window.currentKardexData.length === 0) {
        return Swal.fire('Info', 'No hay datos para exportar. Limpia los filtros e intenta de nuevo.', 'info');
    }
    
    const view = window.kardexCurrentView;
    let filas = '';
    let totalSum = 0;
    let heads = '';
    let title = '';

    if (view === 'transactions') {
        title = 'Historial de Movimientos';
        heads = '<th>Fecha</th><th>Usuario</th><th>Producto</th><th>Cant</th><th>Unitario</th><th>Total</th><th>Método</th>';
        window.currentKardexData.forEach(v => {
            if(v.items) v.items.forEach(i => {
                const isAbono = i.nombre.toLowerCase().includes('abono') || i.nombre.toLowerCase().includes('descuento');
                const t = i.precio * i.cantidad; 
                totalSum += t;
                filas += `<tr style="${isAbono ? 'background-color:#f0f8ff;' : ''}"><td>${v.fecha.split(',')[0]}</td><td>${(v.user||'').replace(/['"]/g,'')}</td><td style="${isAbono ? 'color:#2980b9; font-weight:bold;' : ''}">${i.nombre}</td><td style="text-align:center">${i.cantidad}</td><td>S/ ${parseFloat(i.precio).toFixed(2)}</td><td style="font-weight:bold; color:${t < 0 ? '#e74c3c' : '#333'}">S/ ${t.toFixed(2)}</td><td>${v.metodo}</td></tr>`;
            });
        });
    } else if (view === 'entries') {
        title = 'Entradas Valorizadas';
        heads = '<th>Fecha</th><th>Producto</th><th>Cant Vendida</th><th>Costo Unit</th><th>Costo Total</th>';
        const entries = simulateEntriesFromSales(window.currentKardexData);
        entries.forEach(e => {
            totalSum += e.total;
            filas += `<tr><td>${e.fecha}</td><td>${e.producto}</td><td style="text-align:center">${e.cantidad}</td><td>S/ ${e.costoUnitario.toFixed(2)}</td><td>S/ ${e.total.toFixed(2)}</td></tr>`;
        });
    } else {
        title = 'Salidas de Inventario';
        heads = '<th>Fecha</th><th>Producto</th><th>Cant</th><th>Motivo</th><th>Responsable</th>';
        const exits = simulateExitsFromSales(window.currentKardexData);
        exits.forEach(e => {
            filas += `<tr><td>${e.fecha}</td><td>${e.producto}</td><td style="text-align:center">${e.cantidad}</td><td>${e.motivo}</td><td>${e.responsable}</td></tr>`;
        });
    }

    const totalRow = view !== 'exits' ? `<div class="total">Total Filtrado: S/ ${totalSum.toFixed(2)}</div>` : '';

    const ventana = window.open('', '', 'height=800,width=1000');
    ventana.document.write(`
        <html><head><title>Reporte_${title.replace(/\s/g, '_')}</title>
        <style>
            body { font-family: 'Segoe UI', sans-serif; padding: 20px; color: #333; } 
            h2 { text-align: center; color: #8e44ad; } 
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 0.9rem; } 
            th { background: #f8f9fa; padding: 10px; text-align: left; border-bottom: 2px solid #ddd; color:#555; } 
            td { padding: 8px; border-bottom: 1px solid #eee; } 
            .total { text-align: right; font-size: 1.2rem; font-weight: bold; margin-top: 20px; color: #8e44ad; }
            @media print { body { padding:0; } }
        </style>
        </head><body>
        <h2>📊 Reporte: ${title}</h2>
        <p style="text-align:center;color:#777; margin-top:0;">Fecha de emisión: ${new Date().toLocaleString()}</p>
        <table><thead><tr>${heads}</tr></thead><tbody>${filas}</tbody></table>
        ${totalRow}
        <script>setTimeout(() => { window.print(); }, 800);</script>
        </body></html>
    `);
    ventana.document.close();
}

function exportKardexCSVByView() {
    if (!window.currentKardexData || window.currentKardexData.length === 0) return Swal.fire('Info', 'No hay datos para exportar.', 'info');
    
    const view = window.kardexCurrentView;
    let csv = '';
    
    if(view === 'transactions') {
        csv += 'Fecha,Usuario,Producto,Cantidad,Precio Unitario,Total,Metodo\n';
        window.currentKardexData.forEach(v => {
            if(v.items) v.items.forEach(i => {
                csv += `"${v.fecha.split(',')[0]}","${(v.user||'').replace(/['"]/g,'')}","${i.nombre}",${i.cantidad},${i.precio},${(i.precio*i.cantidad)},"${v.metodo}"\n`;
            });
        });
    } else if (view === 'entries') {
        csv += 'Fecha,Producto,Cantidad,Costo Unitario,Costo Total\n';
        simulateEntriesFromSales(window.currentKardexData).forEach(e => {
            csv += `"${e.fecha}","${e.producto}",${e.cantidad},${e.costoUnitario},${e.total}\n`;
        });
    } else {
        csv += 'Fecha,Producto,Cantidad,Motivo,Responsable\n';
        simulateExitsFromSales(window.currentKardexData).forEach(e => {
            csv += `"${e.fecha}","${e.producto}",${e.cantidad},"${e.motivo}","${e.responsable}"\n`;
        });
    }

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Reporte_Kardex_${view}.csv`;
    link.click();
}

// --- AUXILIARES ---
function simulateEntriesFromSales(ventas) {
    const map = new Map();
    ventas.forEach(v => {
        if(v.items) v.items.forEach(i => {
            if (i.nombre.toLowerCase().includes('abono') || i.nombre.toLowerCase().includes('descuento')) return; 
            if(!map.has(i.nombre)) map.set(i.nombre, {cant:0, costo: i.costo||i.precio*0.6});
            const d = map.get(i.nombre);
            d.cant += i.cantidad;
        });
    });
    const entries = [];
    map.forEach((val, key) => entries.push({ fecha: new Date().toISOString().split('T')[0], producto: key, cantidad: val.cant, costoUnitario: val.costo, total: val.cant*val.costo }));
    return entries;
}

function simulateExitsFromSales(ventas) {
    const exits = [];
    ventas.forEach(v => {
        if(v.items) v.items.forEach(i => {
            if (i.nombre.toLowerCase().includes('abono') || i.nombre.toLowerCase().includes('descuento')) return; 
            exits.push({ fecha: v.fecha.split(',')[0], producto: i.nombre, cantidad: i.cantidad, motivo: 'Venta', responsable: (v.user || '').replace(/['"]/g, '') });
        });
    });
    return exits;
}

function clearKardexFilters() {
    ['kardex-filter-user','kardex-filter-product','kardex-filter-method'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = '';
    });
    window.calendarState = { dateFrom: null, dateTo: null };
    const cal = document.getElementById('kardex-calendar');
    if(cal && cal._flatpickr) cal._flatpickr.clear();
    loadKardexData();
}

function switchKardexView(view) {
    window.kardexCurrentView = view;
    ['transactions','entries','exits'].forEach(v => {
        const btn = document.getElementById('view-'+v);
        if(btn) { if(v===view) btn.classList.add('active'); else btn.classList.remove('active'); }
    });
    loadKardexData();
}

// --- FUNCIÓN GLOBAL PARA EL ACORDEÓN ---
window.toggleKardexMonth = function(id) {
    const cuerpoDatos = document.getElementById('tbody-kx-' + id);
    const icono = document.getElementById('icon-kx-' + id);
    
    if (cuerpoDatos && cuerpoDatos.style.display === 'none') {
        cuerpoDatos.style.display = '';
        if(icono) icono.style.transform = 'rotate(180deg)';
    } else if (cuerpoDatos) {
        cuerpoDatos.style.display = 'none';
        if(icono) icono.style.transform = 'rotate(0deg)';
    }
};

window.initKardex = initKardex;
window.loadKardexData = loadKardexData;