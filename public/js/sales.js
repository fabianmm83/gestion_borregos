class SalesManager {
    constructor(app) {
        this.app = app;
        this.sales = [];
        this.init();
    }

    init() {
        console.log('💰 SalesManager inicializado');
        this.setupEventListeners();
    }

    setupEventListeners() {
        const saleForm = document.getElementById('sale-form');
        if (saleForm) {
            saleForm.addEventListener('submit', (e) => this.handleSaleSubmit(e));
        }

        document.addEventListener('salesViewLoaded', () => {
            this.loadSales();
        });
    }

    async loadSales() {
        try {
            console.log('🔄 Cargando ventas...');
            this.app.showLoading(true);
            
            const response = await this.app.apiCall('/sales');
            this.sales = response.data?.sales || [];
            
            this.renderSales();
            this.updateSalesStats(); // ✅ Ahora esta función existe
            console.log(`✅ ${this.sales.length} ventas cargadas`);
            
        } catch (error) {
            console.error('❌ Error loading sales:', error);
            this.app.showAlert('Error al cargar ventas: ' + error.message, 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    renderSales() {
        const container = document.getElementById('sales-list');
        if (!container) return;

        if (this.sales.length === 0) {
            container.innerHTML = this.getEmptyState();
            return;
        }

        container.innerHTML = this.sales.map(sale => `
            <div class="col-md-6 mb-4">
                <div class="card sale-card h-100">
                    <div class="card-header bg-warning text-dark">
                        <div class="d-flex justify-content-between align-items-center">
                            <h6 class="card-title mb-0">
                                <i class="fas fa-dollar-sign me-1"></i>Venta #${sale.id ? sale.id.slice(-6) : 'N/A'}
                            </h6>
                            <span class="badge bg-success">${this.app.formatCurrency(sale.salePrice || 0)}</span>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-6">
                                <small class="text-muted">Animal:</small>
                                <p class="mb-1 fw-bold">${this.escapeHtml(sale.animalName || 'N/A')}</p>
                                <small class="text-muted">Arete: ${this.escapeHtml(sale.animalEarTag || 'N/A')}</small>
                            </div>
                            <div class="col-6">
                                <small class="text-muted">Fecha:</small>
                                <p class="mb-1">${this.app.formatDate(sale.saleDate)}</p>
                            </div>
                        </div>
                        ${sale.weightAtSale ? `
                            <div class="row mt-2">
                                <div class="col-6">
                                    <small class="text-muted">Peso al vender:</small>
                                    <p class="mb-1">${sale.weightAtSale} kg</p>
                                </div>
                            </div>
                        ` : ''}
                        ${sale.buyerName ? `
                            <div class="row mt-2">
                                <div class="col-12">
                                    <small class="text-muted">Comprador:</small>
                                    <p class="mb-1">${this.escapeHtml(sale.buyerName)}</p>
                                    ${sale.buyerContact ? `<small class="text-muted">Contacto: ${this.escapeHtml(sale.buyerContact)}</small>` : ''}
                                </div>
                            </div>
                        ` : ''}
                        ${sale.notes ? `
                            <div class="mt-2">
                                <small class="text-muted">Notas:</small>
                                <p class="mb-1 small">${this.escapeHtml(sale.notes)}</p>
                            </div>
                        ` : ''}
                    </div>
                    <div class="card-footer bg-transparent">
                        <button class="btn btn-outline-danger btn-sm" onclick="salesManager.deleteSale('${sale.id}')">
                            <i class="fas fa-trash me-1"></i>Eliminar
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // ✅ AGREGAR: Función updateSalesStats que faltaba
    updateSalesStats() {
        const totalTransactions = this.sales.length;
        const totalIncome = this.sales.reduce((sum, sale) => sum + (sale.salePrice || 0), 0);

        if (document.getElementById('total-transactions')) {
            document.getElementById('total-transactions').textContent = totalTransactions;
        }
        if (document.getElementById('total-income')) {
            document.getElementById('total-income').textContent = this.app.formatCurrency(totalIncome);
        }
    }

    // ✅ AGREGAR: Función getEmptyState
    getEmptyState() {
        return `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                No hay ventas registradas.
                <button class="btn btn-primary btn-sm ms-2" onclick="salesManager.showSaleForm()">
                    <i class="fas fa-plus me-1"></i>Registrar Primera Venta
                </button>
            </div>
        `;
    }

    showSaleForm(animalEarTag = null) {
        const form = document.getElementById('sale-form');
        if (form) {
            form.reset();
            
            if (animalEarTag) {
                document.getElementById('sale-animalEarTag').value = animalEarTag;
            }
            
            // Establecer fecha actual por defecto
            const today = new Date().toISOString().split('T')[0];
            const dateInput = form.querySelector('#sale-saleDate');
            if (dateInput && !dateInput.value) {
                dateInput.value = today;
            }
            
            const modal = new bootstrap.Modal(document.getElementById('sale-form-modal'));
            modal.show();
        }
    }

    async handleSaleSubmit(e) {
        e.preventDefault();
        const form = e.target;
        
        try {
            this.app.showLoading(true);
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            console.log('📝 Datos del formulario de venta:', data);

            // Validaciones
            if (!data.animalEarTag || !data.salePrice) {
                this.app.showAlert('Número de arete y precio de venta son obligatorios', 'warning');
                return;
            }

            if (parseFloat(data.salePrice) <= 0) {
                this.app.showAlert('El precio de venta debe ser mayor a 0', 'warning');
                return;
            }

            // Preparar datos para la API
            const saleData = {
                animalEarTag: data.animalEarTag,
                animalName: data.animalName || '',
                saleDate: data.saleDate || new Date().toISOString().split('T')[0],
                buyerName: data.buyerName || '',
                buyerContact: data.buyerContact || '',
                salePrice: parseFloat(data.salePrice),
                weightAtSale: data.weightAtSale ? parseFloat(data.weightAtSale) : 0,
                notes: data.notes || ''
            };

            console.log('🚀 Enviando a API:', saleData);

            const result = await this.app.apiCall('/sales', {
                method: 'POST',
                body: saleData
            });

            console.log('✅ Respuesta de API:', result);

            this.app.showAlert('Venta registrada exitosamente', 'success');
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('sale-form-modal'));
            if (modal) {
                modal.hide();
            }
            form.reset();
            
            await this.loadSales();

            // Recargar animales para actualizar estados
            if (window.animalsManager) {
                window.animalsManager.loadAnimals();
            }

        } catch (error) {
            console.error('❌ Error saving sale:', error);
            this.app.showAlert('Error al registrar venta: ' + error.message, 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    async deleteSale(saleId) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta venta?')) {
            return;
        }

        try {
            this.app.showLoading(true);
            await this.app.apiCall(`/sales/${saleId}`, {
                method: 'DELETE'
            });
            
            this.app.showAlert('Venta eliminada exitosamente', 'success');
            await this.loadSales();
            
        } catch (error) {
            console.error('Error deleting sale:', error);
            this.app.showAlert('Error al eliminar venta: ' + error.message, 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    // Método para vender un animal específico
    async sellAnimal(animalEarTag) {
        this.showSaleForm(animalEarTag);
    }

    // ✅ AGREGAR: Función escapeHtml para seguridad
    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Inicialización corregida
document.addEventListener('DOMContentLoaded', () => {
    if (window.app) {
        window.salesManager = new SalesManager(window.app);
    }
});