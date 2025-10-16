class ReportsManager {
    constructor(app) {
        this.app = app;
        this.charts = {};
        this.initialized = false;
        this.init();
    }

    init() {
        if (this.initialized) {
            console.log('⚠️ ReportsManager ya estaba inicializado');
            return;
        }
        
        console.log('📊 ReportsManager inicializado');
        this.initialized = true;
    }

    async generateReports() {
        try {
            this.app.showLoading(true);
            console.log('📈 Generando reportes...');
            
            // Destruir gráficas existentes antes de crear nuevas
            this.destroyCharts();
            
            // Cargar datos para reportes con manejo de errores individual
            const [salesResponse, animalsResponse, inventoryResponse, feedsResponse] = await Promise.allSettled([
                this.app.apiCall('/sales').catch(() => ({ data: { sales: [] } })),
                this.app.apiCall('/animals').catch(() => ({ data: { animals: [] } })),
                this.app.apiCall('/inventory').catch(() => ({ data: { inventory: [] } })),
                this.app.apiCall('/feeds').catch(() => ({ data: { feeds: [] } }))
            ]);

            // Extraer datos de las respuestas
            const sales = this.extractData(salesResponse, 'sales');
            const animals = this.extractData(animalsResponse, 'animals');
            const inventory = this.extractData(inventoryResponse, 'inventory');
            const feeds = this.extractData(feedsResponse, 'feeds');

            console.log('📊 Datos cargados:', {
                sales: sales.length,
                animals: animals.length,
                inventory: inventory.length,
                feeds: feeds.length
            });

            // Generar todas las gráficas
            this.generateAllCharts(sales, animals, inventory, feeds);
            
            // Actualizar estadísticas rápidas
            this.updateQuickStats(sales, animals, inventory, feeds);
            
        } catch (error) {
            console.error('Error generating reports:', error);
            this.app.showAlert('Error al generar reportes: ' + error.message, 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    extractData(response, key) {
        if (response.status === 'fulfilled') {
            const value = response.value;
            if (Array.isArray(value)) return value;
            if (value && Array.isArray(value.data)) return value.data;
            if (value && value.data && Array.isArray(value.data[key])) return value.data[key];
            if (value && Array.isArray(value[key])) return value[key];
        }
        return [];
    }

    generateAllCharts(sales, animals, inventory, feeds) {
        this.generateSalesChart(sales);
        this.generateAnimalsStatusChart(animals);
        this.generateInventoryCategoryChart(inventory);
        this.generateFeedConsumptionChart(feeds);
        this.generateMonthlyComparisonChart(sales, feeds);
    }

    generateSalesChart(sales) {
        const ctx = document.getElementById('sales-purchases-chart');
        if (!ctx) return;

        const monthlyData = this.processMonthlySales(sales);

        // Si no hay datos, mostrar mensaje
        if (monthlyData.data.every(val => val === 0)) {
            ctx.closest('.card-body').innerHTML = this.getNoDataMessage('Ventas');
            return;
        }

        const chartData = {
            labels: monthlyData.labels,
            datasets: [{
                label: 'Ventas ($)',
                data: monthlyData.data,
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        };

        this.createChart('sales', ctx, 'line', chartData, 'Ventas Mensuales', 'Monto ($)');
    }

    generateAnimalsStatusChart(animals) {
        const ctx = document.getElementById('animals-status-chart');
        if (!ctx) return;

        const statusCount = this.countByStatus(animals, 'status');

        // Si no hay animales, mostrar mensaje
        if (Object.values(statusCount).every(val => val === 0)) {
            ctx.closest('.card-body').innerHTML = this.getNoDataMessage('Animales');
            return;
        }

        const chartData = {
            labels: ['Activos', 'Vendidos', 'Fallecidos', 'Transferidos', 'Desconocido'],
            datasets: [{
                data: [
                    statusCount.active || 0,
                    statusCount.sold || 0,
                    statusCount.deceased || 0,
                    statusCount.transferred || 0,
                    statusCount.unknown || 0
                ],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(255, 205, 86, 0.8)',
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(153, 102, 255, 0.8)',
                    'rgba(201, 203, 207, 0.8)'
                ],
                borderColor: [
                    'rgb(75, 192, 192)',
                    'rgb(255, 205, 86)',
                    'rgb(255, 99, 132)',
                    'rgb(153, 102, 255)',
                    'rgb(201, 203, 207)'
                ],
                borderWidth: 1
            }]
        };

        this.createChart('animals', ctx, 'doughnut', chartData, 'Estado de Animales');
    }

    generateInventoryCategoryChart(inventory) {
        const ctx = document.getElementById('inventory-category-chart');
        if (!ctx) return;

        const categoryCount = this.countByCategory(inventory);

        // Si no hay inventario, mostrar mensaje
        if (Object.values(categoryCount).every(val => val === 0)) {
            ctx.closest('.card-body').innerHTML = this.getNoDataMessage('Inventario');
            return;
        }

        const categoryLabels = {
            'medicine': 'Medicinas',
            'equipment': 'Equipos',
            'supplies': 'Insumos',
            'tools': 'Herramientas',
            'other': 'Otros'
        };

        const chartData = {
            labels: Object.keys(categoryCount).map(cat => categoryLabels[cat] || cat),
            datasets: [{
                label: 'Items por Categoría',
                data: Object.values(categoryCount),
                backgroundColor: 'rgba(255, 159, 64, 0.8)',
                borderColor: 'rgb(255, 159, 64)',
                borderWidth: 1
            }]
        };

        this.createChart('inventory', ctx, 'bar', chartData, 'Inventario por Categoría', 'Cantidad de Items');
    }

    generateFeedConsumptionChart(feeds) {
        const ctx = document.getElementById('feed-consumption-chart');
        if (!ctx) return;

        const monthlyConsumption = this.processMonthlyFeedConsumption(feeds);

        // Si no hay datos, mostrar mensaje
        if (monthlyConsumption.data.every(val => val === 0)) {
            ctx.closest('.card-body').innerHTML = this.getNoDataMessage('Consumo de Alimento');
            return;
        }

        const chartData = {
            labels: monthlyConsumption.labels,
            datasets: [{
                label: 'Consumo (kg)',
                data: monthlyConsumption.data,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        };

        this.createChart('feed', ctx, 'line', chartData, 'Consumo de Alimento Mensual', 'Kilogramos (kg)');
    }

    generateMonthlyComparisonChart(sales, feeds) {
        const ctx = document.getElementById('monthly-comparison-chart');
        if (!ctx) return;

        const monthlySales = this.processMonthlySales(sales);
        const monthlyFeeds = this.processMonthlyFeedConsumption(feeds);

        // Si no hay datos suficientes, mostrar mensaje
        if (monthlySales.data.every(val => val === 0) && monthlyFeeds.data.every(val => val === 0)) {
            ctx.closest('.card-body').innerHTML = this.getNoDataMessage('Comparación Mensual');
            return;
        }

        const chartData = {
            labels: monthlySales.labels,
            datasets: [
                {
                    label: 'Ventas ($)',
                    data: monthlySales.data,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    yAxisID: 'y',
                    tension: 0.4
                },
                {
                    label: 'Consumo Alimento (kg)',
                    data: monthlyFeeds.data,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    yAxisID: 'y1',
                    tension: 0.4
                }
            ]
        };

        this.createChart('comparison', ctx, 'line', chartData, 'Ventas vs Consumo Mensual', '', true);
    }

    createChart(key, ctx, type, data, title, yLabel = '', dualYAxis = false) {
        // Destruir gráfica existente si hay una
        if (this.charts[key]) {
            this.charts[key].destroy();
        }

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: title,
                    font: {
                        size: 16
                    }
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        };

        if (dualYAxis) {
            options.scales = {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Ventas ($)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Consumo (kg)'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            };
        } else if (yLabel) {
            options.scales = {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: yLabel
                    }
                }
            };
        }

        this.charts[key] = new Chart(ctx, {
            type: type,
            data: data,
            options: options
        });
    }

    processMonthlySales(sales) {
        const monthlyData = {};
        const last6Months = this.getLast6Months();
        
        // Inicializar últimos 6 meses
        last6Months.forEach(month => {
            monthlyData[month] = 0;
        });

        // Procesar ventas
        sales.forEach(sale => {
            if (sale.saleDate && sale.salePrice) {
                const date = new Date(sale.saleDate);
                const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                
                if (monthlyData[monthYear] !== undefined) {
                    monthlyData[monthYear] += sale.salePrice;
                }
            }
        });

        return {
            labels: last6Months.map(month => {
                const [year, monthNum] = month.split('-');
                const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                return `${months[parseInt(monthNum) - 1]} ${year}`;
            }),
            data: last6Months.map(month => monthlyData[month])
        };
    }

    processMonthlyFeedConsumption(feeds) {
        const monthlyData = {};
        const last6Months = this.getLast6Months();
        
        // Inicializar últimos 6 meses
        last6Months.forEach(month => {
            monthlyData[month] = 0;
        });

        // Procesar consumo de alimento
        feeds.forEach(feed => {
            if (feed.feedingDate && feed.quantity) {
                const date = new Date(feed.feedingDate);
                const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                
                if (monthlyData[monthYear] !== undefined) {
                    monthlyData[monthYear] += feed.quantity;
                }
            }
        });

        return {
            labels: last6Months.map(month => {
                const [year, monthNum] = month.split('-');
                const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                return `${months[parseInt(monthNum) - 1]} ${year}`;
            }),
            data: last6Months.map(month => monthlyData[month])
        };
    }

    countByStatus(items, statusKey) {
        const count = {
            active: 0,
            sold: 0,
            deceased: 0,
            transferred: 0,
            unknown: 0
        };

        items.forEach(item => {
            const status = item[statusKey] || 'unknown';
            count[status] = (count[status] || 0) + 1;
        });

        return count;
    }

    countByCategory(inventory) {
        const count = {
            medicine: 0,
            equipment: 0,
            supplies: 0,
            tools: 0,
            other: 0
        };

        inventory.forEach(item => {
            const category = item.category || 'other';
            count[category] = (count[category] || 0) + 1;
        });

        return count;
    }

    getLast6Months() {
        const months = [];
        const today = new Date();
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            months.push(`${year}-${month}`);
        }
        
        return months;
    }

    updateQuickStats(sales, animals, inventory, feeds) {
        // Ventas totales
        const totalSales = sales.reduce((sum, sale) => sum + (sale.salePrice || 0), 0);
        const salesElement = document.getElementById('total-sales');
        if (salesElement) salesElement.textContent = this.app.formatCurrency(totalSales);

        // Animales activos
        const activeAnimals = animals.filter(animal => animal.status === 'active').length;
        const animalsElement = document.getElementById('active-animals-count');
        if (animalsElement) animalsElement.textContent = activeAnimals;

        // Items en inventario
        const inventoryElement = document.getElementById('inventory-items-count');
        if (inventoryElement) inventoryElement.textContent = inventory.length;

        // Consumo total de alimento
        const totalFeed = feeds.reduce((sum, feed) => sum + (feed.quantity || 0), 0);
        const feedElement = document.getElementById('total-feed-consumption');
        if (feedElement) feedElement.textContent = `${totalFeed} kg`;
    }

    getNoDataMessage(chartType) {
        return `
            <div class="text-center py-4">
                <i class="fas fa-chart-line fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">No hay datos disponibles</h5>
                <p class="text-muted small">No se encontraron datos para ${chartType}</p>
            </div>
        `;
    }

    destroyCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};
    }

    // Métodos para exportar reportes
    exportSalesReport() {
        this.app.showAlert('Funcionalidad de exportación en desarrollo', 'info');
    }

    exportInventoryReport() {
        this.app.showAlert('Funcionalidad de exportación en desarrollo', 'info');
    }

    exportAnimalsReport() {
        this.app.showAlert('Funcionalidad de exportación en desarrollo', 'info');
    }

    refreshReports() {
        this.generateReports();
        this.app.showAlert('Reportes actualizados', 'success');
    }
}

// Inicialización optimizada
function initializeReportsManager() {
    if (!window.reportsManager || !window.reportsManager.initialized) {
        window.reportsManager = new ReportsManager(window.app);
    }
}

document.addEventListener('DOMContentLoaded', initializeReportsManager);
document.addEventListener('reportsViewLoaded', () => {
    if (window.reportsManager) {
        window.reportsManager.generateReports();
    }
});