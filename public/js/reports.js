class ReportsManager {
    constructor(app) {
        this.app = app;
        this.charts = {};
        this.init();
    }

    init() {
        console.log('📊 ReportsManager inicializado');
    }

    async generateReports() {
        try {
            this.app.showLoading(true);
            
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

    generateCharts(sales, animals, inventory) {
        this.generateSalesChart(sales);
        this.generateAnimalsStatusChart(animals);
        this.generateInventoryCategoryChart(inventory);
    }

    generateSalesChart(sales) {
        const ctx = document.getElementById('sales-purchases-chart');
        if (!ctx) return;

        // Datos de ejemplo para la gráfica
        const chartData = {
            labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
            datasets: [{
                label: 'Ventas',
                data: [65, 59, 80, 81, 56, 55],
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        };

        // Si hay datos reales de ventas, usarlos
        if (sales.length > 0) {
            // Procesar datos reales aquí
        }

        new Chart(ctx, {
            type: 'bar',
            data: chartData,
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Ventas Mensuales'
                    }
                }
            }
        });
    }

    generateAnimalsStatusChart(animals) {
        const ctx = document.getElementById('animals-status-chart');
        if (!ctx) return;

        // Lógica para gráfica de estados de animales
        // Implementar según los datos disponibles
    }

    generateInventoryCategoryChart(inventory) {
        const ctx = document.getElementById('inventory-category-chart');
        if (!ctx) return;

        // Lógica para gráfica de categorías de inventario
        // Implementar según los datos disponibles
    }

    // Métodos para exportar reportes
    exportSalesReport() {
        this.app.showAlert('Exportación de reportes en desarrollo', 'info');
    }

    exportPurchasesReport() {
        this.app.showAlert('Exportación de reportes en desarrollo', 'info');
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    if (window.app) {
        window.reportsManager = new ReportsManager(window.app);
    }
});