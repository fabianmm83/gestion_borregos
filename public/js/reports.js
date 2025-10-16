class ReportsManager {
    constructor(app) {
        this.app = app;
        this.charts = {}; // Objeto para almacenar instancias de gráficas
        this.init();
    }

    init() {
        console.log('📊 ReportsManager inicializado');
    }

    async generateReports() {
        try {
            this.app.showLoading(true);
            
            // Destruir gráficas existentes antes de crear nuevas
            this.destroyCharts();
            
            // Cargar datos para reportes (manejar errores individualmente)
            const [salesResponse, animalsResponse, inventoryResponse] = await Promise.allSettled([
                this.app.apiCall('/sales'),
                this.app.apiCall('/animals'),
                this.app.apiCall('/inventory')
            ]);

            // Extraer datos de las respuestas exitosas
            const sales = salesResponse.status === 'fulfilled' ? salesResponse.value.data?.sales || [] : [];
            const animals = animalsResponse.status === 'fulfilled' ? animalsResponse.value.data?.animals || [] : [];
            const inventory = inventoryResponse.status === 'fulfilled' ? inventoryResponse.value.data?.inventory || [] : [];

            this.generateCharts(sales, animals, inventory);
            
        } catch (error) {
            console.error('Error generating reports:', error);
            this.app.showAlert('Error al generar reportes: ' + error.message, 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    // ✅ NUEVO MÉTODO: Destruir gráficas existentes
    destroyCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};
    }

    generateCharts(sales, animals, inventory) {
        this.generateSalesChart(sales);
        this.generateAnimalsStatusChart(animals);
        this.generateInventoryCategoryChart(inventory);
        this.generateFeedConsumptionChart(); // Agregar gráfica de consumo
    }

    generateSalesChart(sales) {
        const ctx = document.getElementById('sales-purchases-chart');
        if (!ctx) return;

        // Procesar datos reales de ventas
        const monthlySales = this.processMonthlySales(sales);

        const chartData = {
            labels: monthlySales.labels,
            datasets: [{
                label: 'Ventas ($)',
                data: monthlySales.data,
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                fill: true
            }]
        };

        // Destruir gráfica existente si hay una
        if (this.charts.sales) {
            this.charts.sales.destroy();
        }

        this.charts.sales = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Ventas Mensuales'
                    },
                    legend: {
                        display: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Monto ($)'
                        }
                    }
                }
            }
        });
    }

    // ✅ NUEVO MÉTODO: Procesar ventas mensuales
    processMonthlySales(sales) {
        const monthlyData = {};
        
        sales.forEach(sale => {
            if (sale.saleDate && sale.salePrice) {
                const date = new Date(sale.saleDate);
                const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                
                if (!monthlyData[monthYear]) {
                    monthlyData[monthYear] = 0;
                }
                monthlyData[monthYear] += sale.salePrice;
            }
        });

        // Ordenar por fecha y limitar a últimos 6 meses
        const sortedMonths = Object.keys(monthlyData).sort().slice(-6);
        
        return {
            labels: sortedMonths.map(month => {
                const [year, monthNum] = month.split('-');
                const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                return `${months[parseInt(monthNum) - 1]} ${year}`;
            }),
            data: sortedMonths.map(month => monthlyData[month])
        };
    }

    generateAnimalsStatusChart(animals) {
        const ctx = document.getElementById('animals-status-chart');
        if (!ctx) return;

        // Contar animales por estado
        const statusCount = {
            active: 0,
            sold: 0,
            deceased: 0,
            transferred: 0,
            unknown: 0
        };

        animals.forEach(animal => {
            const status = animal.status || 'unknown';
            statusCount[status] = (statusCount[status] || 0) + 1;
        });

        const chartData = {
            labels: ['Activos', 'Vendidos', 'Fallecidos', 'Transferidos', 'Desconocido'],
            datasets: [{
                data: [
                    statusCount.active,
                    statusCount.sold,
                    statusCount.deceased,
                    statusCount.transferred,
                    statusCount.unknown
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

        if (this.charts.animals) {
            this.charts.animals.destroy();
        }

        this.charts.animals = new Chart(ctx, {
            type: 'doughnut',
            data: chartData,
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Estado de Animales'
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    generateInventoryCategoryChart(inventory) {
        const ctx = document.getElementById('inventory-category-chart');
        if (!ctx) return;

        // Contar items por categoría
        const categoryCount = {};
        inventory.forEach(item => {
            const category = item.category || 'other';
            categoryCount[category] = (categoryCount[category] || 0) + 1;
        });

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

        if (this.charts.inventory) {
            this.charts.inventory.destroy();
        }

        this.charts.inventory = new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Inventario por Categoría'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Cantidad de Items'
                        }
                    }
                }
            }
        });
    }

    generateFeedConsumptionChart() {
        const ctx = document.getElementById('feed-consumption-chart');
        if (!ctx) return;

        // Datos de ejemplo para consumo de alimento
        const chartData = {
            labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
            datasets: [{
                label: 'Consumo (kg)',
                data: [120, 150, 180, 200, 170, 190],
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2,
                fill: true
            }]
        };

        if (this.charts.feed) {
            this.charts.feed.destroy();
        }

        this.charts.feed = new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Consumo de Alimento Mensual'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Kilogramos (kg)'
                        }
                    }
                }
            }
        });
    }

    // Métodos para exportar reportes
    exportSalesReport() {
        this.app.showAlert('Exportación de reportes en desarrollo', 'info');
    }

    exportPurchasesReport() {
        this.app.showAlert('Exportación de reportes en desarrollo', 'info');
    }

    exportInventoryReport() {
        this.app.showAlert('Exportación de reportes en desarrollo', 'info');
    }

    exportAnimalsReport() {
        this.app.showAlert('Exportación de reportes en desarrollo', 'info');
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    if (window.app) {
        window.reportsManager = new ReportsManager(window.app);
    }
});