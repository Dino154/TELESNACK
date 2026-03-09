// --- UTILIDADES GENERALES PARA GENERACIÓN DE REPORTES ---

/**
 * Generador de Reportes - PDF, CSV, Excel
 * Utilidad reutilizable para todos los tipos de reportes del sistema
 */
export class ReportGenerator {
    constructor() {
        // Polyfill para asegurar que jsPDF esté disponible
        this.setupJSPDFPolyfill();
        
        this.jsPDF = window.jspdf?.jsPDF || window.jspdf || window.jsPDF;
        this.autoTable = window.jspdf?.autoTable || window.jspdf?.AutoTable || window.autoTable || window.JsPDFAutoTable;
        
        console.log('Constructor ReportGenerator:', {
            jspdf: !!this.jsPDF,
            autoTable: !!this.autoTable,
            windowJspdf: !!window.jspdf,
            windowJspdfJsPDF: !!window.jspdf?.jsPDF,
            windowJsPDF: !!window.jsPDF,
            windowAutoTable: !!window.autoTable,
            windowJsPDFAutoTable: !!window.JsPDFAutoTable
        });
    }
    
    /**
     * Configura polyfill para jsPDF
     */
    setupJSPDFPolyfill() {
        console.log('Configurando polyfills para jsPDF...');
        
        // Verificar disponibilidad de AutoTable
        console.log('window.jspdf:', !!window.jspdf);
        console.log('window.jspdf.jsPDF:', !!window.jspdf?.jsPDF);
        console.log('window.jspdf.autoTable:', !!window.jspdf?.autoTable);
        console.log('window.jspdf.AutoTable:', !!window.jspdf?.AutoTable);
        console.log('window.autoTable:', !!window.autoTable);
        console.log('window.JsPDFAutoTable:', !!window.JsPDFAutoTable);
        
        // Si jsPDF está disponible como window.jspdf.jsPDF
        if (window.jspdf && window.jspdf.jsPDF && !window.jsPDF) {
            window.jsPDF = window.jspdf.jsPDF;
            console.log('✅ jsPDF polyfill aplicado');
        }
        
        // Intentar diferentes formas de acceder a AutoTable
        let autoTable = null;
        
        // Método 1: window.jspdf.autoTable
        if (window.jspdf?.autoTable) {
            autoTable = window.jspdf.autoTable;
            console.log('✅ AutoTable encontrado en window.jspdf.autoTable');
        }
        // Método 2: window.jspdf.AutoTable  
        else if (window.jspdf?.AutoTable) {
            autoTable = window.jspdf.AutoTable;
            console.log('✅ AutoTable encontrado en window.jspdf.AutoTable');
        }
        // Método 3: window.autoTable
        else if (window.autoTable) {
            autoTable = window.autoTable;
            console.log('✅ AutoTable encontrado en window.autoTable');
        }
        // Método 4: window.JsPDFAutoTable
        else if (window.JsPDFAutoTable) {
            autoTable = window.JsPDFAutoTable;
            console.log('✅ AutoTable encontrado en window.JsPDFAutoTable');
        }
        
        // Asignar AutoTable a todas las ubicaciones necesarias
        if (autoTable) {
            window.autoTable = autoTable;
            window.jspdf.autoTable = autoTable;
            window.jspdf.AutoTable = autoTable;
            
            // Asignar al constructor jsPDF si está disponible
            if (window.jspdf?.jsPDF) {
                window.jspdf.jsPDF.autoTable = autoTable;
                console.log('✅ AutoTable asignado a jsPDF');
            }
            
            console.log('✅ AutoTable polyfill aplicado correctamente');
        } else {
            console.error('❌ AutoTable no encontrado en ninguna ubicación');
        }
    }

    /**
     * Verifica que las librerías necesarias estén disponibles
     */
    checkLibraries() {
        console.log('Verificando bibliotecas PDF...');
        console.log('window.jspdf:', !!window.jspdf);
        console.log('window.jspdf.jsPDF:', !!window.jspdf?.jsPDF);
        console.log('window.jspdf.autoTable:', !!window.jspdf?.autoTable);
        console.log('window.jspdf.AutoTable:', !!window.jspdf?.AutoTable);
        console.log('window.autoTable:', !!window.autoTable);
        
        if (!this.jsPDF) {
            console.error('❌ jsPDF no está disponible. Carga la librería primero.');
            throw new Error('jsPDF no está disponible. Carga la librería primero.');
        }
        
        // AutoTable es opcional para PDFs básicos
        if (!this.autoTable) {
            console.warn('⚠️ AutoTable no está disponible. Los PDFs se generarán sin tablas.');
            console.warn('Para generar PDFs con tablas, carga la librería AutoTable primero.');
            // No lanzar error, solo advertir
        } else {
            console.log('✅ Bibliotecas PDF verificadas correctamente');
        }
        
        return true;
    }

    /**
     * Crea un PDF con diseño TELESNACK profesional
     */
    createPDF(title, subtitle, user, filters = {}) {
        this.checkLibraries();
        
        const doc = new this.jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        // --- HEADER TELESNACK ---
        // Línea superior decorativa
        doc.setDrawColor(142, 68, 173);
        doc.setLineWidth(3);
        doc.line(20, 20, pageWidth - 20, 20);
        
        // Línea secundaria
        doc.setDrawColor(255, 107, 173);
        doc.setLineWidth(2);
        doc.line(20, 25, pageWidth - 20, 25);
        
        // Título principal TELESNACK
        doc.setFontSize(28);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(142, 68, 173);
        const telesnackWidth = doc.getTextWidth('TELESNACK');
        doc.text('TELESNACK', (pageWidth - telesnackWidth) / 2, 40);
        
        // Subtítulo del reporte
        doc.setFontSize(16);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        const subtitleWidth = doc.getTextWidth(subtitle);
        doc.text(subtitle, (pageWidth - subtitleWidth) / 2, 50);
        
        // Información del usuario y fecha
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        const userInfo = `Generado por: ${user.nombre} | Sede: ${user.sede || 'Global'} | Fecha: ${new Date().toLocaleDateString('es-PE')}`;
        const userWidth = doc.getTextWidth(userInfo);
        doc.text(userInfo, (pageWidth - userWidth) / 2, 58);
        
        // --- SECCIÓN DE FILTROS ---
        let currentY = 65;
        if (Object.keys(filters).length > 0) {
            doc.setFillColor(248, 240, 252);
            doc.rect(20, currentY, pageWidth - 40, 25, 'F');
            
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(142, 68, 173);
            doc.text('Filtros Aplicados:', 25, currentY + 10);
            
            doc.setFont(undefined, 'normal');
            doc.setTextColor(80, 80, 80);
            const filterText = this.formatFiltersText(filters);
            doc.setFontSize(10);
            doc.text(filterText, 25, currentY + 17);
            
            currentY += 30;
        }
        
        // Línea separadora
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(1);
        doc.line(20, currentY, pageWidth - 20, currentY);
        currentY += 10;
        
        return { 
            doc, 
            pageWidth, 
            currentY: currentY,
            pageHeight 
        };
    }

    /**
     * Agrega pie de página TELESNACK
     */
    addFooter(doc, pageNumber, totalPages) {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        // Línea inferior decorativa
        doc.setDrawColor(142, 68, 173);
        doc.setLineWidth(2);
        doc.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20);
        
        doc.setDrawColor(255, 107, 173);
        doc.setLineWidth(1);
        doc.line(20, pageHeight - 17, pageWidth - 20, pageHeight - 17);
        
        // Texto del pie
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('© 2024 TELESNACK - Sistema de Gestión', pageWidth / 2, pageHeight - 12, { align: 'center' });
        doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    }

    /**
     * Formatea texto de filtros
     */
    formatFiltersText(filters) {
        const parts = [];
        
        if (filters.dateFrom || filters.dateTo) {
            const dateRange = filters.dateFrom === filters.dateTo 
                ? filters.dateFrom 
                : `${filters.dateFrom || 'desde inicio'} al ${filters.dateTo || 'hoy'}`;
            parts.push(`Fechas: ${dateRange}`);
        }
        
        if (filters.user) {
            parts.push(`Usuario: ${filters.user}`);
        }
        
        if (filters.product) {
            parts.push(`Producto: ${filters.product}`);
        }
        
        if (filters.method) {
            parts.push(`Método: ${filters.method}`);
        }
        
        if (filters.sede) {
            parts.push(`Sede: ${filters.sede}`);
        }
        
        return parts.length > 0 ? parts.join(' | ') : 'Todos los datos';
    }

    /**
     * Agrega una tabla al PDF con estilo TELESNACK
     */
    addTable(doc, headers, data, startY, options = {}) {
        const defaultOptions = {
            startY: startY,
            head: [headers],
            body: data,
            theme: 'grid',
            styles: {
                fontSize: 9,
                cellPadding: 4,
                fillColor: [255, 255, 255],
                textColor: [52, 73, 94],
                lineColor: [200, 200, 200]
            },
            headStyles: {
                fillColor: [142, 68, 173],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                lineColor: [142, 68, 173]
            },
            alternateRowStyles: {
                fillColor: [248, 240, 252],
                textColor: [52, 73, 94]
            },
            margin: { left: 20, right: 20 }
        };

        const finalOptions = { ...defaultOptions, ...options };
        
        if (this.autoTable) {
            console.log('✅ Usando AutoTable para generar tabla');
            this.autoTable(doc, finalOptions);
            return doc.lastAutoTable.finalY || startY + 20;
        } else {
            // Fallback: generar tabla manualmente
            console.log('⚠️ AutoTable no disponible, generando tabla manualmente');
            return this.generateManualTable(doc, headers, data, startY);
        }
    }

    /**
     * Genera tabla manualmente cuando AutoTable no está disponible
     */
    generateManualTable(doc, headers, data, startY) {
        const pageWidth = doc.internal.pageSize.getWidth();
        const cellPadding = 4;
        const fontSize = 9;
        const rowHeight = 12;
        let currentY = startY;
        
        console.log('📊 Generando tabla manual con', headers.length, 'columnas y', data.length, 'filas');
        
        // Configurar fuente
        doc.setFontSize(fontSize);
        
        // Calcular anchos de columnas
        const colWidth = (pageWidth - 40) / headers.length;
        
        // Dibujar encabezado
        doc.setFillColor(142, 68, 173);
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        
        headers.forEach((header, index) => {
            const x = 20 + (index * colWidth);
            doc.rect(x, currentY, colWidth, rowHeight, 'F');
            doc.text(header, x + cellPadding, currentY + 8);
        });
        
        currentY += rowHeight;
        
        // Dibujar filas de datos
        doc.setTextColor(52, 73, 94);
        doc.setFont(undefined, 'normal');
        
        data.forEach((row, rowIndex) => {
            // Alternar colores de fondo
            if (rowIndex % 2 === 0) {
                doc.setFillColor(255, 255, 255);
            } else {
                doc.setFillColor(248, 240, 252);
            }
            
            row.forEach((cell, cellIndex) => {
                const x = 20 + (cellIndex * colWidth);
                doc.rect(x, currentY, colWidth, rowHeight, 'F');
                doc.text(cell.toString(), x + cellPadding, currentY + 8);
            });
            
            currentY += rowHeight;
            
            // Nueva página si es necesario
            if (currentY > doc.internal.pageSize.height - 40) {
                doc.addPage();
                currentY = 20;
                
                // Repetir encabezado en nueva página
                doc.setFillColor(142, 68, 173);
                doc.setTextColor(255, 255, 255);
                doc.setFont(undefined, 'bold');
                
                headers.forEach((header, index) => {
                    const x = 20 + (index * colWidth);
                    doc.rect(x, currentY, colWidth, rowHeight, 'F');
                    doc.text(header, x + cellPadding, currentY + 8);
                });
                
                currentY += rowHeight;
                doc.setTextColor(52, 73, 94);
                doc.setFont(undefined, 'normal');
            }
        });
        
        console.log('✅ Tabla manual generada, altura final:', currentY);
        return currentY;
    }

    /**
     * Agrega una tarjeta de resumen al PDF con estilo TELESNACK
     */
    addSummaryCard(doc, title, value, color = [142, 68, 173], y) {
        const pageWidth = doc.internal.pageSize.getWidth();
        
        // Fondo de la tarjeta
        doc.setFillColor(248, 240, 252);
        doc.rect(20, y, pageWidth - 40, 35, 'F');
        
        // Borde decorativo - usar color RGB válido
        const colorRgb = Array.isArray(color) ? color : [142, 68, 173];
        doc.setDrawColor(colorRgb[0], colorRgb[1], colorRgb[2]);
        doc.setLineWidth(2);
        doc.rect(20, y, pageWidth - 40, 35, 'S');
        
        // Título
        doc.setTextColor(142, 68, 173);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(title, 30, y + 15);
        
        // Valor - usar color RGB válido
        doc.setTextColor(colorRgb[0], colorRgb[1], colorRgb[2]);
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text(value, pageWidth - 30, y + 22, { align: 'right' });
        
        return y + 45;
    }

    /**
     * Genera y descarga el PDF con pie de página TELESNACK
     */
    savePDF(doc, filename) {
        try {
            // Agregar pie de página a todas las páginas
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                this.addFooter(doc, i, totalPages);
            }
            
            doc.save(filename);
            console.log('PDF guardado como:', filename);
            return true;
        } catch (error) {
            console.error('Error al guardar PDF:', error);
            throw error;
        }
    }

    /**
     * Genera CSV genérico
     */
    generateCSV(headers, data, filename) {
        let csv = headers.join(',') + '\n';
        
        data.forEach(row => {
            const csvRow = row.map(cell => {
                // Escapar comillas y envolver en comillas si contiene comas o comillas
                if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
                    return `"${cell.replace(/"/g, '""')}"`;
                }
                return cell;
            }).join(',');
            csv += csvRow + '\n';
        });

        this.downloadFile(csv, filename, 'text/csv');
        return true;
    }

    /**
     * Genera Excel (XLSX) básico - NOTA: Requiere librería SheetJS
     */
    generateExcel(headers, data, filename) {
        if (typeof XLSX === 'undefined') {
            console.warn('SheetJS no disponible. Generando CSV en su lugar.');
            return this.generateCSV(headers, data, filename.replace('.xlsx', '.csv'));
        }

        try {
            const ws_data = [headers, ...data];
            const ws = XLSX.utils.aoa_to_sheet(ws_data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Reporte");
            XLSX.writeFile(wb, filename);
            return true;
        } catch (error) {
            console.error('Error generando Excel:', error);
            return this.generateCSV(headers, data, filename.replace('.xlsx', '.csv'));
        }
    }

    /**
     * Genera Excel avanzado con múltiples hojas
     */
    generateAdvancedExcel(data, sheets, filename) {
        if (typeof XLSX === 'undefined') {
            console.warn('SheetJS no disponible. Generando CSV en su lugar.');
            return this.generateCSV(data[0].headers || [], data[0].data || [], filename.replace('.xlsx', '.csv'));
        }

        try {
            const wb = XLSX.utils.book_new();
            
            sheets.forEach((sheet, index) => {
                const sheetData = data[index] || data[0];
                const ws_data = [sheetData.headers || [], ...(sheetData.data || [])];
                const ws = XLSX.utils.aoa_to_sheet(ws_data);
                XLSX.utils.book_append_sheet(wb, ws, sheet.name || `Hoja${index + 1}`);
            });
            
            XLSX.writeFile(wb, filename);
            return true;
        } catch (error) {
            console.error('Error generando Excel avanzado:', error);
            return false;
        }
    }

    /**
     * Utilidad para descargar archivos
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType + ';charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    /**
     * Formatea moneda para reportes
     */
    formatCurrency(amount) {
        return `S/ ${parseFloat(amount).toFixed(2)}`;
    }

    /**
     * Formatea fecha para reportes
     */
    formatDate(date, format = 'es-PE') {
        if (typeof date === 'string') {
            date = new Date(date);
        }
        return date.toLocaleDateString(format);
    }

    /**
     * Genera colores para badges según método de pago
     */
    getPaymentMethodColor(method) {
        const colors = {
            'Yape': [0, 210, 211],
            'Efectivo': [46, 204, 113],
            'Pendiente': [255, 159, 67],
            'Transferencia': [52, 152, 219],
            'Tarjeta': [155, 89, 182]
        };
        return colors[method] || [108, 117, 125];
    }
}

/**
 * Funciones específicas para reportes de TeleSnack
 */
export class TeleSnackReports extends ReportGenerator {
    /**
     * Reporte de Finanzas (PDF) - Diseño visual de tarjetas por venta
     */
    async generateFinanceReport(ventas, user = {}, filters = {}) {
        const { doc, pageWidth, currentY } = this.createPDF(
            'Reporte Contable', 
            `Análisis Financiero - ${user.sede || 'Global'}`, 
            user,
            filters
        );

        let yPosition = currentY;
        let gananciaTotal = 0;
        let totalVentas = 0;
        let totalCostos = 0;

        // Agrupar por venta completa (no por producto individual)
        const ventasPorTicket = {};
        
        ventas.forEach(venta => {
            if (!ventasPorTicket[venta.id]) {
                ventasPorTicket[venta.id] = {
                    ventaId: venta.id,
                    fecha: venta.fecha.split(',')[0],
                    vendedor: venta.user,
                    metodo: venta.metodo,
                    codigoOperacion: venta.codigoOperacion || (venta.metodo === 'Yape' ? venta.codigoOperacion : 'N/A'),
                    total: venta.total,
                    costoTotal: venta.costoTotal || 0,
                    items: venta.items || [],
                    ganancia: venta.total - (venta.costoTotal || 0)
                };
                
                gananciaTotal += ventasPorTicket[venta.id].ganancia;
                totalVentas += venta.total;
                totalCostos += ventasPorTicket[venta.id].costoTotal;
            }
        });

        // Generar cada ticket como una tarjeta visual
        Object.values(ventasPorTicket).forEach((venta, index) => {
            // Verificar si necesitamos nueva página
            if (yPosition > doc.internal.pageSize.height - 150) {
                doc.addPage();
                yPosition = 20;
            }
            
            // Diseño del ticket como tarjeta
            yPosition = this.generateFinanceTicketCard(doc, venta, yPosition, pageWidth);
            
            // Espacio entre tickets
            yPosition += 15;
        });

        // Agregar resúmenes al final
        yPosition = this.addSummaryCard(
            doc, 
            'TOTAL VENTAS:', 
            this.formatCurrency(totalVentas),
            [142, 68, 173],
            yPosition + 20
        );

        yPosition = this.addSummaryCard(
            doc, 
            'COSTO TOTAL:', 
            this.formatCurrency(totalCostos),
            [255, 159, 67], // Naranja para costos
            yPosition + 10
        );

        yPosition = this.addSummaryCard(
            doc, 
            'GANANCIA NETA:', 
            this.formatCurrency(gananciaTotal),
            [46, 204, 113], // Verde para ganancias
            yPosition + 10
        );

        // Guardar PDF
        const filename = `Reporte_Contable_${user.sede || 'Global'}_${new Date().toISOString().split('T')[0]}.pdf`;
        return this.savePDF(doc, filename);
    }

    /**
     * Genera una tarjeta visual de ticket financiero (por venta completa)
     */
    generateFinanceTicketCard(doc, venta, yPosition, pageWidth) {
        const cardWidth = pageWidth - 40;
        const cardHeight = 140; // Más altura para mostrar múltiples productos
        
        // Fondo de la tarjeta
        doc.setFillColor(255, 255, 255);
        doc.rect(20, yPosition, cardWidth, cardHeight, 'F');
        
        // Borde de la tarjeta
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(1);
        doc.rect(20, yPosition, cardWidth, cardHeight, 'S');
        
        // Header con información de venta
        doc.setFillColor(142, 68, 173);
        doc.rect(20, yPosition, cardWidth, 25, 'F');
        
        // ID de venta y fecha
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`VENTA #${venta.ventaId}`, 30, yPosition + 17);
        
        doc.setFontSize(10);
        doc.text(`${venta.fecha} | ${venta.metodo}`, pageWidth - 30, yPosition + 17, { align: 'right' });
        
        // Información del vendedor
        let currentY = yPosition + 35;
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text('Vendedor:', 30, currentY);
        
        doc.setTextColor(52, 73, 94);
        doc.setFont(undefined, 'bold');
        doc.text(venta.vendedor, 90, currentY);
        
        // Código de operación si es Yape
        if (venta.metodo === 'Yape' && venta.codigoOperacion) {
            currentY += 12;
            doc.setTextColor(100, 100, 100);
            doc.setFont(undefined, 'normal');
            doc.text('Código Op.:', 30, currentY);
            
            doc.setTextColor(52, 73, 94);
            doc.setFont(undefined, 'bold');
            doc.text(venta.codigoOperacion, 100, currentY);
        }
        
        // Productos
        currentY += 15;
        doc.setTextColor(100, 100, 100);
        doc.setFont(undefined, 'normal');
        doc.text('Productos:', 30, currentY);
        
        currentY += 8;
        if (venta.items && venta.items.length > 0) {
            venta.items.forEach((item, index) => {
                if (currentY > yPosition + cardHeight - 20) return; // No salir de la tarjeta
                
                doc.setTextColor(52, 73, 94);
                doc.setFontSize(9);
                const productoText = `${item.cantidad}x ${item.nombre} @ S/.${item.precio.toFixed(2)}`;
                doc.text(productoText, 40, currentY);
                
                currentY += 7;
            });
        }
        
        // Línea separadora
        currentY = yPosition + cardHeight - 35;
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(1);
        doc.line(30, currentY, pageWidth - 30, currentY);
        
        // Totales
        currentY += 8;
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(10);
        doc.text('Total:', 30, currentY);
        
        doc.setTextColor(142, 68, 173);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(12);
        doc.text(this.formatCurrency(venta.total), pageWidth - 30, currentY, { align: 'right' });
        
        // Costo total
        currentY += 10;
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        doc.text('Costo Total:', 30, currentY);
        
        doc.setTextColor(255, 159, 67); // Naranja para costos
        doc.setFont(undefined, 'bold');
        doc.text(this.formatCurrency(venta.costoTotal || 0), pageWidth - 30, currentY, { align: 'right' });
        
        // Ganancia
        currentY += 10;
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        doc.text('Ganancia:', 30, currentY);
        
        const ganancia = venta.total - (venta.costoTotal || 0);
        // Usar valores RGB individuales en lugar de arrays
        const gananciaColor = ganancia >= 0 ? [46, 204, 113] : [231, 76, 60];
        doc.setTextColor(gananciaColor[0], gananciaColor[1], gananciaColor[2]);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(12);
        doc.text(this.formatCurrency(ganancia), pageWidth - 30, currentY, { align: 'right' });
        
        return yPosition + cardHeight;
    }

    /**
     * Genera una tarjeta visual de producto financiero
     */
    generateFinanceCard(doc, item, yPosition, pageWidth) {
        const cardWidth = pageWidth - 40;
        const cardHeight = 100;
        
        // Fondo de la tarjeta
        doc.setFillColor(255, 255, 255);
        doc.rect(20, yPosition, cardWidth, cardHeight, 'F');
        
        // Borde de la tarjeta
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(1);
        doc.rect(20, yPosition, cardWidth, cardHeight, 'S');
        
        // Header con información de venta
        doc.setFillColor(142, 68, 173);
        doc.rect(20, yPosition, cardWidth, 25, 'F');
        
        // ID de venta y fecha
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`VENTA #${item.ventaId}`, 30, yPosition + 17);
        
        doc.setFontSize(10);
        doc.text(`${item.fecha} | ${item.metodo}`, pageWidth - 30, yPosition + 17, { align: 'right' });
        
        // Información del vendedor
        let currentY = yPosition + 35;
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text('Vendedor:', 30, currentY);
        
        doc.setTextColor(52, 73, 94);
        doc.setFont(undefined, 'bold');
        doc.text(item.vendedor, 90, currentY);
        
        // Producto
        currentY += 12;
        doc.setTextColor(100, 100, 100);
        doc.setFont(undefined, 'normal');
        doc.text('Producto:', 30, currentY);
        
        doc.setTextColor(52, 73, 94);
        doc.setFont(undefined, 'bold');
        doc.text(item.producto, 90, currentY);
        
        // Línea separadora
        currentY += 12;
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(1);
        doc.line(30, currentY, pageWidth - 30, currentY);
        
        // Detalles financieros
        currentY += 8;
        
        // Cantidad y precios
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        doc.text('Cantidad:', 30, currentY);
        doc.text(`${item.cantidad} unidades`, 90, currentY);
        
        currentY += 8;
        doc.text('Precio Venta:', 30, currentY);
        doc.setTextColor(52, 73, 94);
        doc.setFont(undefined, 'bold');
        doc.text(this.formatCurrency(item.precioUnitario), 120, currentY);
        
        currentY += 8;
        doc.setTextColor(100, 100, 100);
        doc.setFont(undefined, 'normal');
        doc.text('Costo Unitario:', 30, currentY);
        doc.setTextColor(255, 159, 67); // Naranja para costos
        doc.text(this.formatCurrency(item.costoUnitario), 120, currentY);
        
        // Línea separadora final
        currentY = yPosition + cardHeight - 15;
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(1);
        doc.line(30, currentY, pageWidth - 30, currentY);
        
        // Ganancia
        currentY += 8;
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(10);
        doc.text('Ganancia:', 30, currentY);
        
        // Usar valores RGB individuales en lugar de arrays
        const gananciaColor = item.ganancia >= 0 ? [46, 204, 113] : [231, 76, 60];
        doc.setTextColor(gananciaColor[0], gananciaColor[1], gananciaColor[2]);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(12);
        doc.text(this.formatCurrency(item.ganancia), pageWidth - 30, currentY, { align: 'right' });
        
        return yPosition + cardHeight;
    }

    /**
     * Reporte de Tickets/Ventas (PDF) - Diseño visual de tickets
     */
    async generateTicketsReport(ventas, user = {}, filters = {}) {
        const { doc, pageWidth, currentY } = this.createPDF(
            'Historial de Tickets', 
            `Registro Completo de Ventas - ${user.sede || 'Global'}`, 
            user,
            filters
        );

        let yPosition = currentY;
        let totalVentas = 0;
        let totalCostos = 0;
        let totalGanancia = 0;

        // Generar cada ticket como una tarjeta visual
        ventas.forEach((venta, index) => {
            const ticketId = venta.id.toString();
            const ganancia = venta.total - (venta.costoTotal || 0);
            
            totalVentas += venta.total;
            totalCostos += venta.costoTotal || 0;
            totalGanancia += ganancia;
            
            // Verificar si necesitamos nueva página
            if (yPosition > doc.internal.pageSize.height - 150) {
                doc.addPage();
                yPosition = 20;
            }
            
            // Diseño del ticket como tarjeta
            yPosition = this.generateTicketCard(doc, venta, yPosition, pageWidth);
            
            // Espacio entre tickets
            yPosition += 15;
        });

        // Agregar resúmenes al final
        yPosition = this.addSummaryCard(
            doc, 
            'TOTAL VENTAS:', 
            this.formatCurrency(totalVentas),
            [142, 68, 173],
            yPosition + 20
        );

        yPosition = this.addSummaryCard(
            doc, 
            'COSTO TOTAL:', 
            this.formatCurrency(totalCostos),
            [255, 159, 67], // Naranja para costos
            yPosition + 10
        );

        yPosition = this.addSummaryCard(
            doc, 
            'GANANCIA NETA:', 
            this.formatCurrency(totalGanancia),
            [46, 204, 113], // Verde para ganancias
            yPosition + 10
        );

        // Guardar PDF
        const filename = `Tickets_Visuales_${user.sede || 'Global'}_${new Date().toISOString().split('T')[0]}.pdf`;
        return this.savePDF(doc, filename);
    }

    /**
     * Genera una tarjeta visual de ticket individual
     */
    generateTicketCard(doc, venta, yPosition, pageWidth) {
        const cardWidth = pageWidth - 40;
        const cardHeight = 120;
        const padding = 15;
        
        // Fondo de la tarjeta
        doc.setFillColor(255, 255, 255);
        doc.rect(20, yPosition, cardWidth, cardHeight, 'F');
        
        // Borde del ticket
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(1);
        doc.rect(20, yPosition, cardWidth, cardHeight, 'S');
        
        // Header del ticket con número
        doc.setFillColor(142, 68, 173);
        doc.rect(20, yPosition, cardWidth, 25, 'F');
        
        // Número de ticket
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`TICKET #${venta.id}`, 30, yPosition + 17);
        
        // Fecha y método en el header
        doc.setFontSize(10);
        doc.text(`${venta.fecha.split(',')[0]} | ${venta.metodo}`, pageWidth - 30, yPosition + 17, { align: 'right' });
        
        // Información del vendedor
        let currentY = yPosition + 35;
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text('Vendedor:', 30, currentY);
        
        doc.setTextColor(52, 73, 94);
        doc.setFont(undefined, 'bold');
        doc.text(venta.user, 80, currentY);
        
        // Código de operación si es Yape
        if (venta.metodo === 'Yape' && venta.codigoOperacion) {
            currentY += 12;
            doc.setTextColor(100, 100, 100);
            doc.setFont(undefined, 'normal');
            doc.text('Código Op.:', 30, currentY);
            
            doc.setTextColor(52, 73, 94);
            doc.setFont(undefined, 'bold');
            doc.text(venta.codigoOperacion, 100, currentY);
        }
        
        // Productos
        currentY += 15;
        doc.setTextColor(100, 100, 100);
        doc.setFont(undefined, 'normal');
        doc.text('Productos:', 30, currentY);
        
        currentY += 8;
        if (venta.items && venta.items.length > 0) {
            venta.items.forEach((item, index) => {
                if (currentY > yPosition + cardHeight - 20) return; // No salir de la tarjeta
                
                doc.setTextColor(52, 73, 94);
                doc.setFontSize(9);
                const productoText = `${item.cantidad}x ${item.nombre} @ S/.${item.precio.toFixed(2)}`;
                doc.text(productoText, 40, currentY);
                
                currentY += 7;
            });
        }
        
        // Línea separadora
        currentY = yPosition + cardHeight - 25;
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(1);
        doc.line(30, currentY, pageWidth - 30, currentY);
        
        // Totales
        currentY += 8;
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(10);
        doc.text('Total:', 30, currentY);
        
        doc.setTextColor(142, 68, 173);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(12);
        doc.text(this.formatCurrency(venta.total), pageWidth - 30, currentY, { align: 'right' });
        
        // Ganancia
        currentY += 10;
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        doc.text('Ganancia:', 30, currentY);
        
        const ganancia = venta.total - (venta.costoTotal || 0);
        // Usar valores RGB individuales en lugar de arrays
        const gananciaColor = ganancia >= 0 ? [46, 204, 113] : [231, 76, 60];
        doc.setTextColor(gananciaColor[0], gananciaColor[1], gananciaColor[2]);
        doc.setFont(undefined, 'bold');
        doc.text(this.formatCurrency(ganancia), pageWidth - 30, currentY, { align: 'right' });
        
        return yPosition + cardHeight;
    }

    /**
     * Reporte de Kardex General (PDF) - Diseño visual de movimientos
     */
    async generateKardexReport(ventas, user = {}, filters = {}) {
        const { doc, pageWidth, currentY } = this.createPDF(
            'Reporte de Kardex', 
            `Movimientos de Inventario - ${user.sede || 'Global'}`, 
            user,
            filters
        );

        let yPosition = currentY;
        let totalAmount = 0;
        let totalOps = 0;

        // Agrupar por movimiento para mostrar como tarjetas
        const movimientosAgrupados = [];
        
        ventas.forEach(venta => {
            if (venta.items && Array.isArray(venta.items)) {
                venta.items.forEach(item => {
                    movimientosAgrupados.push({
                        ventaId: venta.id,
                        fecha: venta.fecha.split(',')[0],
                        vendedor: venta.user,
                        metodo: venta.metodo,
                        producto: item.nombre,
                        cantidad: item.cantidad,
                        precioUnitario: item.precio,
                        total: item.precio * item.cantidad
                    });
                    
                    totalAmount += item.precio * item.cantidad;
                    totalOps++;
                });
            }
        });

        // Generar cada tarjeta de movimiento
        movimientosAgrupados.forEach((movimiento, index) => {
            // Verificar si necesitamos nueva página
            if (yPosition > doc.internal.pageSize.height - 150) {
                doc.addPage();
                yPosition = 20;
            }
            
            // Diseño de la tarjeta de movimiento
            yPosition = this.generateKardexCard(doc, movimiento, yPosition, pageWidth);
            
            // Espacio entre tarjetas
            yPosition += 15;
        });

        // Agregar métricas
        yPosition = this.addSummaryCard(
            doc, 
            'TOTAL OPERACIONES:', 
            totalOps.toString(),
            [99, 102, 241],
            yPosition + 20
        );

        yPosition = this.addSummaryCard(
            doc, 
            'MONTO TOTAL:', 
            this.formatCurrency(totalAmount),
            [46, 204, 113],
            yPosition + 10
        );

        // Guardar PDF
        const filename = `Kardex_Visual_${user.sede || 'Global'}_${new Date().toISOString().split('T')[0]}.pdf`;
        return this.savePDF(doc, filename);
    }

    /**
     * Genera una tarjeta visual de movimiento de kardex
     */
    generateKardexCard(doc, movimiento, yPosition, pageWidth) {
        const cardWidth = pageWidth - 40;
        const cardHeight = 90;
        
        // Fondo de la tarjeta
        doc.setFillColor(255, 255, 255);
        doc.rect(20, yPosition, cardWidth, cardHeight, 'F');
        
        // Borde de la tarjeta
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(1);
        doc.rect(20, yPosition, cardWidth, cardHeight, 'S');
        
        // Header con información de movimiento
        doc.setFillColor(99, 102, 241); // Azul para kardex
        doc.rect(20, yPosition, cardWidth, 25, 'F');
        
        // ID de venta y fecha
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`MOVIMIENTO #${movimiento.ventaId}`, 30, yPosition + 17);
        
        doc.setFontSize(10);
        doc.text(movimiento.fecha, pageWidth - 30, yPosition + 17, { align: 'right' });
        
        // Información del vendedor
        let currentY = yPosition + 35;
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text('Vendedor:', 30, currentY);
        
        doc.setTextColor(52, 73, 94);
        doc.setFont(undefined, 'bold');
        doc.text(movimiento.vendedor, 90, currentY);
        
        // Producto
        currentY += 12;
        doc.setTextColor(100, 100, 100);
        doc.setFont(undefined, 'normal');
        doc.text('Producto:', 30, currentY);
        
        doc.setTextColor(52, 73, 94);
        doc.setFont(undefined, 'bold');
        doc.text(movimiento.producto, 90, currentY);
        
        // Línea separadora
        currentY += 12;
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(1);
        doc.line(30, currentY, pageWidth - 30, currentY);
        
        // Detalles del movimiento
        currentY += 8;
        
        // Cantidad y precios
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        doc.text('Cantidad:', 30, currentY);
        doc.text(`${movimiento.cantidad} unidades`, 90, currentY);
        
        currentY += 8;
        doc.text('Precio Unitario:', 30, currentY);
        doc.setTextColor(52, 73, 94);
        doc.setFont(undefined, 'bold');
        doc.text(this.formatCurrency(movimiento.precioUnitario), 120, currentY);
        
        currentY += 8;
        doc.setTextColor(100, 100, 100);
        doc.setFont(undefined, 'normal');
        doc.text('Total:', 30, currentY);
        
        // Usar valores RGB individuales en lugar de arrays
        const kardexColor = [99, 102, 241]; // Azul para kardex
        doc.setTextColor(kardexColor[0], kardexColor[1], kardexColor[2]);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(12);
        doc.text(this.formatCurrency(movimiento.total), pageWidth - 30, currentY, { align: 'right' });
        
        return yPosition + cardHeight;
    }

    /**
     * Exportación CSV de Kardex
     */
    exportKardexCSV(ventas, user = {}, filters = {}) {
        const headers = ['Fecha', 'Usuario', 'Producto', 'Cantidad', 'Precio Unit.', 'Total', 'Método'];
        const data = [];

        ventas.forEach(venta => {
            if (venta.items && Array.isArray(venta.items)) {
                venta.items.forEach(item => {
                    data.push([
                        venta.fecha.split(',')[0],
                        venta.user,
                        item.nombre,
                        item.cantidad.toString(),
                        item.precio.toFixed(2),
                        (item.precio * item.cantidad).toFixed(2),
                        venta.metodo
                    ]);
                });
            }
        });

        const filename = `Kardex_${user.sede || 'Global'}_${new Date().toISOString().split('T')[0]}.csv`;
        return this.generateCSV(headers, data, filename);
    }

    /**
     * Exportar a Excel - Finanzas
     */
    exportFinanceExcel(ventas, user = {}, filters = {}) {
        const headers = ['Fecha', 'Producto', 'Cantidad', 'Costo U.', 'Venta U.', 'Ganancia'];
        const data = [];

        ventas.forEach(venta => {
            if (venta.items) {
                venta.items.forEach(item => {
                    // Usar window.DB en lugar de DB para evitar errores de referencia
                    const producto = window.DB?.inventario?.find(p => p.nombre === item.nombre);
                    const costo = item.costo || (producto ? producto.costo : item.precio * 0.6);
                    const ganancia = (item.precio - costo) * item.cantidad;

                    data.push([
                        venta.fecha.split(' ')[0],
                        item.nombre,
                        item.cantidad.toString(),
                        this.formatCurrency(costo),
                        this.formatCurrency(item.precio),
                        this.formatCurrency(ganancia)
                    ]);
                });
            }
        });

        const filename = `Reporte_Contable_${user.sede || 'Global'}_${new Date().toISOString().split('T')[0]}.xlsx`;
        return this.generateExcel(headers, data, filename);
    }

    /**
     * Exportar a Excel - Tickets
     */
    exportTicketsExcel(ventas, user = {}, filters = {}) {
        const headers = ['ID', 'Fecha', 'Usuario', 'Método', 'Total', 'Detalle'];
        const data = [];

        ventas.forEach(venta => {
            const detalle = venta.items 
                ? venta.items.map(i => `${i.cantidad}x ${i.nombre}`).join('|')
                : '';

            data.push([
                venta.id.toString(),
                venta.fecha,
                venta.user,
                venta.metodo,
                venta.total.toFixed(2),
                detalle
            ]);
        });

        const filename = `Tickets_${user.sede || 'Global'}_${new Date().toISOString().split('T')[0]}.xlsx`;
        return this.generateExcel(headers, data, filename);
    }

    /**
     * Exportar a Excel - Kardex
     */
    exportKardexExcel(ventas, user = {}, filters = {}) {
        const headers = ['Fecha', 'Usuario', 'Producto', 'Cantidad', 'Precio Unit.', 'Total', 'Método'];
        const data = [];

        ventas.forEach(venta => {
            if (venta.items && Array.isArray(venta.items)) {
                venta.items.forEach(item => {
                    data.push([
                        venta.fecha.split(',')[0],
                        venta.user,
                        item.nombre,
                        item.cantidad.toString(),
                        item.precio.toFixed(2),
                        (item.precio * item.cantidad).toFixed(2),
                        venta.metodo
                    ]);
                });
            }
        });

        const filename = `Kardex_${user.sede || 'Global'}_${new Date().toISOString().split('T')[0]}.xlsx`;
        return this.generateExcel(headers, data, filename);
    }

    /**
     * Exportar a CSV - Tickets
     */
    exportTicketsCSV(ventas, user = {}, filters = {}) {
        const headers = ['ID', 'Fecha', 'Usuario', 'Método', 'Total', 'Detalle'];
        const data = [];

        ventas.forEach(venta => {
            const detalle = venta.items 
                ? venta.items.map(i => `${i.cantidad}x ${i.nombre}`).join('|')
                : '';

            data.push([
                venta.id.toString(),
                venta.fecha,
                venta.user,
                venta.metodo,
                venta.total.toFixed(2),
                detalle
            ]);
        });

        const filename = `Tickets_${user.sede || 'Global'}_${new Date().toISOString().split('T')[0]}.csv`;
        return this.generateCSV(headers, data, filename);
    }

    /**
     * Exportar a CSV - Finanzas/Contable
     */
    exportFinanceCSV(ventas, user = {}, filters = {}) {
        const headers = ['Fecha', 'Producto', 'Cantidad', 'Costo U.', 'Venta U.', 'Ganancia'];
        const data = [];

        ventas.forEach(venta => {
            if (venta.items) {
                venta.items.forEach(item => {
                    const producto = window.DB?.inventario?.find(p => p.nombre === item.nombre);
                    const costo = item.costo || (producto ? producto.costo : item.precio * 0.6);
                    const ganancia = (item.precio - costo) * item.cantidad;

                    data.push([
                        venta.fecha.split(' ')[0],
                        item.nombre,
                        item.cantidad.toString(),
                        this.formatCurrency(costo),
                        this.formatCurrency(item.precio),
                        this.formatCurrency(ganancia)
                    ]);
                });
            }
        });

        const filename = `Reporte_Contable_${user.sede || 'Global'}_${new Date().toISOString().split('T')[0]}.csv`;
        return this.generateCSV(headers, data, filename);
    }
}

// Instancia global para uso fácil
window.teleSnackReports = new TeleSnackReports();

// Exportar funciones individuales para compatibilidad con código existente
window.exportFinancePDF = (ventas, user) => window.teleSnackReports.generateFinanceReport(ventas, user);
window.exportTicketsPDF = (ventas, user) => window.teleSnackReports.generateTicketsReport(ventas, user);
window.exportFinanceCSV = (ventas, user) => window.teleSnackReports.exportFinanceCSV(ventas, user);
window.exportTicketsCSV = (ventas, user) => window.teleSnackReports.exportTicketsCSV(ventas, user);

console.log('ReportGenerator cargado. Usa window.teleSnackReports para acceder a todas las funciones.');
