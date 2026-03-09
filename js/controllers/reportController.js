import { Auth } from '../services/auth.js';
import { TeleSnackReports } from '../utils/reportGenerator.js';

/**
 * Controlador de Reportes - Gestiona toda la lógica de generación de reportes
 * PDF, CSV, Excel para todo el sistema TeleSnack (Versión Cloud)
 */
export class ReportController {
    constructor() {
        this.reportGenerator = new TeleSnackReports();
        this.currentFilters = {
            dateFrom: null,
            dateTo: null,
            user: '',
            product: '',
            method: '',
            sede: ''
        };
    }

    /**
     * Inicializa el controlador de reportes
     */
    init() {
        console.log('ReportController inicializado (Modo Cloud)');
        this.setupEventListeners();
        this.setupGlobalFunctions();
    }

    /**
     * Configura los event listeners para botones de exportación
     */
    setupEventListeners() {
        // Botones del admin.html
        this.setupButtonListener('btn-finance-pdf', () => this.generateFinanceReport());
        this.setupButtonListener('btn-finance-csv', () => this.generateFinanceCSV());
        this.setupButtonListener('btn-finance-excel', () => this.generateFinanceExcel());
        this.setupButtonListener('btn-tickets-pdf', () => this.generateTicketsReport());
        this.setupButtonListener('btn-tickets-csv', () => this.generateTicketsCSV());
        this.setupButtonListener('btn-tickets-excel', () => this.generateTicketsExcel());

        // Botones del kardex.html
        this.setupButtonListener('kardex-export-pdf', () => this.generateKardexReport());
        this.setupButtonListener('kardex-export-csv', () => this.generateKardexCSV());
        this.setupButtonListener('kardex-export-excel', () => this.generateKardexExcel());
    }

    setupButtonListener(buttonId, callback) {
        const button = document.getElementById(buttonId);
        if (button) {
            // Clonamos el botón para eliminar listeners antiguos y asegurar limpieza
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            newButton.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    await callback();
                } catch (error) {
                    console.error(`Error en ${buttonId}:`, error);
                    this.showError('Error al generar el reporte.');
                }
            });
        }
    }

    setupGlobalFunctions() {
        window.exportFinancePDF = (ventas, user) => this.generateFinanceReportWithData(ventas, user);
        window.exportTicketsPDF = (ventas, user) => this.generateTicketsReportWithData(ventas, user);
        window.exportFinanceCSV = (ventas) => this.generateFinanceCSVWithData(ventas);
        window.exportTicketsCSV = (ventas) => this.generateTicketsCSVWithData(ventas);
        window.exportToExcel = (data, filename) => this.exportToExcel(data, filename);
        window.generateAdvancedReport = (type, options) => this.generateAdvancedReport(type, options);
    }

    // --- MÉTODOS PRINCIPALES ---

    async generateFinanceReport() {
        const ventas = this.getFilteredData();
        const user = Auth.getCurrentUser();

        if (!ventas || ventas.length === 0) return this.handleEmptyData('Reporte Contable', user);

        this.showLoading('Generando reporte financiero...');
        // Pequeño timeout para que el UI de Swal se renderice antes del proceso pesado
        setTimeout(async () => {
            try {
                await this.reportGenerator.generateFinanceReport(ventas, user);
                this.showSuccess('PDF exportado exitosamente');
            } catch (e) { this.showError(e.message); }
        }, 300);
    }

    async generateFinanceCSV() {
        const ventas = this.getFilteredData();
        if (!ventas || ventas.length === 0) return this.handleEmptyData('Reporte Contable', null, 'csv');

        this.showLoading('Exportando CSV...');
        const user = Auth.getCurrentUser();
        this.reportGenerator.exportFinanceCSV(ventas, user);
        this.showSuccess('CSV exportado exitosamente');
    }

    async generateFinanceExcel() {
        const ventas = this.getFilteredData();
        const user = Auth.getCurrentUser();
        
        if (!ventas || ventas.length === 0) return this.handleEmptyData('Reporte Contable', null, 'excel');

        this.showLoading('Exportando Excel...');
        this.reportGenerator.exportFinanceExcel(ventas, user);
        this.showSuccess('Excel exportado');
    }

    async generateTicketsReport() {
        const ventas = this.getFilteredData();
        const user = Auth.getCurrentUser();

        if (!ventas || ventas.length === 0) return this.handleEmptyData('Historial Tickets', user);

        this.showLoading('Generando reporte de tickets...');
        setTimeout(async () => {
            try {
                await this.reportGenerator.generateTicketsReport(ventas, user);
                this.showSuccess('PDF exportado exitosamente');
            } catch(e) { this.showError(e.message); }
        }, 300);
    }

    async generateTicketsCSV() {
        const ventas = this.getFilteredData();
        if (!ventas || ventas.length === 0) return this.handleEmptyData('Tickets', null, 'csv');

        this.showLoading('Exportando CSV...');
        const user = Auth.getCurrentUser();
        this.reportGenerator.exportTicketsCSV(ventas, user);
        this.showSuccess('CSV exportado exitosamente');
    }

    async generateTicketsExcel() {
        const ventas = this.getFilteredData();
        const user = Auth.getCurrentUser();
        if (!ventas || ventas.length === 0) return this.handleEmptyData('Tickets', null, 'excel');

        this.showLoading('Exportando Excel...');
        this.reportGenerator.exportTicketsExcel(ventas, user);
        this.showSuccess('Excel exportado');
    }

    async generateKardexReport() {
        const ventas = this.getKardexFilteredData();
        const user = Auth.getCurrentUser();

        if (!ventas || ventas.length === 0) return this.handleEmptyData('Kardex', user);

        this.showLoading('Generando reporte kardex...');
        setTimeout(async () => {
            try {
                await this.reportGenerator.generateKardexReport(ventas, user, this.currentFilters);
                this.showSuccess('PDF exportado exitosamente');
            } catch(e) { this.showError(e.message); }
        }, 300);
    }

    async generateKardexExcel() {
        const ventas = this.getKardexFilteredData();
        const user = Auth.getCurrentUser();

        if (!ventas || ventas.length === 0) return this.handleEmptyData('Kardex', null, 'excel');

        this.showLoading('Exportando Excel...');
        this.reportGenerator.exportKardexExcel(ventas, user, this.currentFilters);
        this.showSuccess('Excel exportado');
    }

    async generateKardexCSV() {
        const ventas = this.getKardexFilteredData();
        const user = Auth.getCurrentUser();

        if (!ventas || ventas.length === 0) return this.handleEmptyData('Kardex', null, 'csv');

        this.showLoading('Exportando CSV...');
        this.reportGenerator.exportKardexCSV(ventas, user, this.currentFilters);
        this.showSuccess('CSV exportado');
    }

    // --- REPORTE AVANZADO (CORREGIDO) ---
    async generateAdvancedReport(type, options = {}) {
        const { format = 'pdf', filters = {}, columns = [], title = '' } = options;
        
        // CORRECCIÓN: Usamos getFilteredData() y luego aplicamos filtros extra si es necesario
        // en lugar de usar DB.ventas directamente.
        let data = this.getFilteredData();
        
        // Aplicar filtros adicionales si vienen en opciones
        if (filters && Object.keys(filters).length > 0) {
            data = this.applyFilters(data, filters);
        }
        
        if (!data || data.length === 0) {
            this.showWarning('No hay datos disponibles para el reporte solicitado');
            return;
        }

        this.showLoading(`Generando reporte avanzado...`);

        try {
            switch (format) {
                case 'pdf':
                    await this.generateCustomPDF(data, { title, columns });
                    break;
                case 'csv':
                    this.generateCustomCSV(data, { title, columns });
                    break;
                case 'excel':
                    this.generateCustomExcel(data, { title, columns });
                    break;
                default:
                    throw new Error(`Formato no soportado: ${format}`);
            }
            this.showSuccess(`Reporte generado`);
        } catch (error) {
            console.error('Error:', error);
            this.showError('Error al generar reporte avanzado');
        }
    }

    // --- GESTIÓN DE DATOS (CLOUD COMPATIBLE) ---

    /**
     * Obtiene datos desde la memoria global cargada por AdminController/Firebase
     */
    getFilteredData() {
        // 1. Datos cargados por AdminController desde Firebase
        if (window.__teleSnackVentasForReports && window.__teleSnackVentasForReports.length > 0) {
            return window.__teleSnackVentasForReports;
        }
        
        // 2. Fallback: window.DB (si se definió dinámicamente)
        if (window.DB && window.DB.ventas) {
            return window.DB.ventas;
        }

        console.warn('ReportController: No se encontraron datos cargados.');
        return [];
    }

    /**
     * Obtiene datos para Kardex aplicando los filtros visuales actuales
     */
    getKardexFilteredData() {
        const ventas = this.getFilteredData();
        return this.applyKardexFilters(ventas);
    }

    applyKardexFilters(ventas) {
        const userFilter = document.getElementById('kardex-filter-user')?.value || '';
        const productFilter = document.getElementById('kardex-filter-product')?.value || '';
        const methodFilter = document.getElementById('kardex-filter-method')?.value || '';
        const dateFrom = window.calendarState?.dateFrom;
        const dateTo = window.calendarState?.dateTo;

        // Guardar para uso en títulos
        this.currentFilters = { user: userFilter, product: productFilter, method: methodFilter, dateFrom, dateTo };

        return ventas.filter(v => {
            if (userFilter && v.user !== userFilter) return false;
            if (methodFilter && v.metodo !== methodFilter) return false;
            if (productFilter && v.items && !v.items.some(item => item.nombre === productFilter)) return false;
            
            if (dateFrom || dateTo) {
                let vDateISO;
                // Soporte robusto de fechas (DD/MM/YYYY o ISO)
                if(v.fecha && v.fecha.includes('/')) {
                    const parts = v.fecha.split(',')[0].split('/'); 
                    vDateISO = `${parts[2]}-${parts[1]}-${parts[0]}`;
                } else if(v.fecha) {
                    vDateISO = new Date(v.fecha).toISOString().split('T')[0];
                } else {
                    return false;
                }

                if (dateFrom && vDateISO < dateFrom) return false;
                if (dateTo && vDateISO > dateTo) return false;
            }
            return true;
        });
    }

    applyFilters(data, filters) {
        return data.filter(item => {
            return Object.entries(filters).every(([key, value]) => {
                if (!value) return true;
                return item[key] === value || (typeof item[key] === 'string' && item[key].includes(value));
            });
        });
    }

    // --- UTILIDADES DE GENERACIÓN CUSTOM ---

    async generateCustomPDF(data, options) {
        const { title, columns, filename } = options;
        const user = Auth.getCurrentUser();
        const { doc, currentY } = this.reportGenerator.createPDF(title, '', user);
        
        const headers = columns.length > 0 ? columns : Object.keys(data[0]);
        const tableData = data.map(item => headers.map(header => item[header] || ''));
        
        this.reportGenerator.addTable(doc, headers, tableData, currentY);
        const fName = filename || `${title.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
        this.reportGenerator.savePDF(doc, fName);
    }

    generateCustomCSV(data, options) {
        const { title, columns, filename } = options;
        const headers = columns.length > 0 ? columns : Object.keys(data[0]);
        const tableData = data.map(item => headers.map(header => item[header] || ''));
        const fName = filename || `${title.replace(/\s+/g, '_')}_${Date.now()}.csv`;
        this.reportGenerator.generateCSV(headers, tableData, fName);
    }

    generateCustomExcel(data, options) {
        const { title, columns, filename } = options;
        const headers = columns.length > 0 ? columns : Object.keys(data[0]);
        const tableData = data.map(item => headers.map(header => item[header] || ''));
        const fName = filename || `${title.replace(/\s+/g, '_')}_${Date.now()}.xlsx`;
        this.reportGenerator.generateExcel(headers, tableData, fName);
    }

    // --- UTILIDADES UI & COMPATIBILIDAD ---

    handleEmptyData(reportType, user, type = 'pdf') {
        const msg = 'No hay datos disponibles.';
        this.showWarning(msg);
        
        if (type === 'pdf' && user) {
            // Generar PDF vacío para que el usuario vea algo
            const { doc, currentY } = this.reportGenerator.createPDF(reportType, msg, user);
            const pageWidth = doc.internal.pageSize.getWidth();
            doc.setFontSize(14);
            doc.setTextColor(100);
            doc.text(msg, pageWidth / 2, currentY + 40, { align: 'center' });
            this.reportGenerator.savePDF(doc, `${reportType}_Vacio.pdf`);
        } else if (type === 'csv' || type === 'excel') {
            // CSV/Excel vacío con cabeceras genéricas
            const ext = type === 'excel' ? 'xlsx' : 'csv';
            const headers = ['Mensaje'];
            const data = [[msg]];
            if(type === 'csv') this.reportGenerator.generateCSV(headers, data, `${reportType}_Vacio.csv`);
            else this.reportGenerator.generateExcel(headers, data, `${reportType}_Vacio.xlsx`);
        }
    }

    exportToExcel(data, filename = 'reporte.xlsx') {
        if (!data || data.length === 0) return this.showWarning('Sin datos');
        this.showLoading('Exportando Excel...');
        const headers = Object.keys(data[0]);
        const tableData = [headers, ...data.map(row => headers.map(h => row[h] || ''))];
        this.reportGenerator.generateExcel(headers, tableData, filename);
        this.showSuccess('Excel generado');
    }

    // Wrappers de compatibilidad
    async generateFinanceReportWithData(ventas, user) { return await this.reportGenerator.generateFinanceReport(ventas, user); }
    async generateTicketsReportWithData(ventas, user) { return await this.reportGenerator.generateTicketsReport(ventas, user); }
    generateFinanceCSVWithData(ventas) { const user = Auth.getCurrentUser(); return this.reportGenerator.exportFinanceCSV(ventas, user); }
    generateTicketsCSVWithData(ventas) { const user = Auth.getCurrentUser(); return this.reportGenerator.exportTicketsCSV(ventas, user); }

    showLoading(msg) { if(typeof Swal!=='undefined') Swal.fire({title:msg, allowOutsideClick:false, didOpen:()=>Swal.showLoading()}); }
    showSuccess(msg) { if(typeof Swal!=='undefined') Swal.fire({icon:'success', title:'¡Éxito!', text:msg, timer:1500, showConfirmButton:false}); }
    showError(msg) { if(typeof Swal!=='undefined') Swal.fire({icon:'error', title:'Error', text:msg}); }
    showWarning(msg) { if(typeof Swal!=='undefined') Swal.fire({icon:'warning', title:'Atención', text:msg}); }
}

// Instancia global
window.reportController = new ReportController();

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', () => {
    window.reportController.init();
});