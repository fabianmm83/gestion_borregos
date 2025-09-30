class SalesManager {
    constructor(app) {
        this.app = app;
        this.init();
    }

    init() {
        this.app.setupFormHandler('sale-form', this.handleSaleSubmit.bind(this));
        document.addEventListener('salesViewLoaded', () => this.loadSales());
    }

    async loadSales() {
        try {
            this.app.showLoading(true);
            const sales = await this.app.apiCall('/sales');
            this.renderSales(sales);
        } catch (error) {
            console.error('Error loading sales:', error);
        } finally {
            this.app.showLoading(false);
        }
    }

    renderSales(sales) {
        const container = document.getElementById('sales-list');
        if (!container) return;

        if (sales.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    No hay ventas registradas.
                </div>
            `;
            return;
        }

        // Calcular total de ventas
        const totalSales = sales.reduce((sum, sale) => sum + (sale.salePrice || 0), 0);

        container.innerHTML = `
            <div class="alert alert-success mb-3">
                <i class="fas fa-chart-line me-2"></i>
                <strong>Total en ventas:</strong> $${totalSales.toFixed(2)}
            </div>
            ${sales.map(sale => `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-8">
                                <h5 class="card-title text-success">
                                    <i class="fas fa-dollar-sign me-2"></i>Venta #${sale.id.slice(-6)}
                                </h5>
                                <p class="card-text mb-1">
                                    <strong>Animal:</strong> ${sale.animalName} (${sale.animalEarTag})
                                </p>
                                <p class="card-text mb-1">
                                    <strong>Precio:</strong> $${sale.salePrice.toFixed(2)} |
                                    <strong>Peso:</strong> ${sale.weightAtSale} kg
                                </p>
                                <p class="card-text mb-1">
                                    <strong>Comprador:</strong> ${sale.buyerName || 'No especificado'}
                                </p>
                                <p class="card-text mb-1">
                                    <strong>Fecha:</strong> ${new Date(sale.saleDate).toLocaleDateString()}
                                </p>
                                ${sale.notes ? `
                                    <p class="card-text">
                                        <strong>Notas:</strong> ${sale.notes}
                                    </p>
                                ` : ''}
                            </div>
                            <div class="col-md-4 text-end">
                                <div class="mb-2">
                                    <span class="badge bg-success fs-6">$${sale.salePrice.toFixed(2)}</span>
                                </div>
                                <small class="text-muted">
                                    ${new Date(sale.createdAt?.toDate?.() || sale.createdAt).toLocaleString()}
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        `;
    }

    async handleSaleSubmit(form) {
        try {
            this.app.showLoading(true);
            const formData = this.app.getFormData(form);
            
            await this.app.apiCall('/sales', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            this.app.showAlert('Venta registrada exitosamente', 'success');
            this.app.resetForm(form);
            bootstrap.Modal.getInstance(form.closest('.modal')).hide();
            await this.loadSales();
            // Recargar dashboard para actualizar estadísticas
            this.app.loadDashboardData();
            
        } catch (error) {
            console.error('Error saving sale:', error);
        } finally {
            this.app.showLoading(false);
        }
    }

    showSaleForm() {
        this.app.showModal('sale-form-modal', 'Registrar Venta');
    }
}

// Inicializar después de que App esté lista
document.addEventListener('DOMContentLoaded', () => {
    if (window.app) {
        window.salesManager = new SalesManager(window.app);
    }
});