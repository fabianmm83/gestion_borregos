class SalesManager {
    constructor(app) {
        this.app = app;
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

        // Filtro de búsqueda
        const searchInput = document.getElementById('animal-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterSales());
        }
    }

    async loadSales() {
        try {
            this.app.showLoading(true);
            // Simular datos para demo
            const sales = [
                {
                    id: 1,
                    animalEarTag: "A001",
                    animalName: "Borrego 1",
                    salePrice: 2500.00,
                    weightAtSale: 48.5,
                    buyerName: "Juan Pérez",
                    buyerContact: "555-1234",
                    saleDate: "2024-01-10",
                    notes: "Venta directa en granja"
                },
                {
                    id: 2,
                    animalEarTag: "A002",
                    animalName: "Borrego 2",
                    salePrice: 2300.00,
                    weightAtSale: 45.0,
                    buyerName: "María García",
                    buyerContact: "555-5678",
                    saleDate: "2024-01-08",
                    notes: ""
                }
            ];
            this.renderSales(sales);
            this.updateStats(sales);
        } catch (error) {
            console.error('Error loading sales:', error);
            this.app.showAlert('Error al cargar las ventas', 'danger');
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

        container.innerHTML = sales.map(sale => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-8">
                            <h5 class="card-title text-success">
                                <i class="fas fa-dollar-sign me-2"></i>Venta #${sale.id}
                            </h5>
                            <p class="card-text mb-1">
                                <strong>Animal:</strong> ${this.escapeHtml(sale.animalName)} (Arete: ${this.escapeHtml(sale.animalEarTag)})
                            </p>
                            <p class="card-text mb-1">
                                <strong>Precio:</strong> <span class="text-success fw-bold">$${parseFloat(sale.salePrice).toLocaleString()}</span>
                            </p>
                            <p class="card-text mb-1">
                                <strong>Peso al vender:</strong> ${sale.weightAtSale} kg
                            </p>
                            <p class="card-text mb-1">
                                <strong>Comprador:</strong> ${this.escapeHtml(sale.buyerName || 'N/A')}
                            </p>
                            <p class="card-text mb-1">
                                <strong>Contacto:</strong> ${this.escapeHtml(sale.buyerContact || 'N/A')}
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
                            <span class="badge bg-success">Completada</span>
                            <div class="mt-2">
                                <button class="btn btn-sm btn-outline-danger delete-sale-btn" data-id="${sale.id}">
                                    <i class="fas fa-trash"></i> Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Agregar event listeners a los botones
        this.attachSalesEventListeners();
    }

    attachSalesEventListeners() {
        document.querySelectorAll('.delete-sale-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.deleteSale(e.target.closest('button').dataset.id);
            });
        });
    }

    updateStats(sales) {
        const totalTransactions = document.getElementById('total-transactions');
        const totalIncome = document.getElementById('total-income');

        if (totalTransactions) {
            totalTransactions.textContent = sales.length;
        }

        if (totalIncome) {
            const total = sales.reduce((sum, sale) => sum + parseFloat(sale.salePrice), 0);
            totalIncome.textContent = `$${total.toLocaleString()}`;
        }
    }

    async handleSaleSubmit(e) {
        e.preventDefault();
        const form = e.target;
        
        try {
            this.app.showLoading(true);
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            // Validaciones
            if (!data.animalEarTag || !data.salePrice) {
                this.app.showAlert('Número de arete y precio de venta son obligatorios', 'warning');
                return;
            }

            if (parseFloat(data.salePrice) <= 0) {
                this.app.showAlert('El precio de venta debe ser mayor a 0', 'warning');
                return;
            }

            // Simular guardado
            console.log('Registrando venta:', data);
            
            this.app.showAlert('Venta registrada exitosamente', 'success');
            
            // Cerrar modal y recargar
            const modal = bootstrap.Modal.getInstance(document.getElementById('sale-form-modal'));
            modal.hide();
            form.reset();
            await this.loadSales();

        } catch (error) {
            console.error('Error saving sale:', error);
            this.app.showAlert('Error al registrar la venta', 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    async deleteSale(saleId) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta venta? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            this.app.showLoading(true);
            // Simular eliminación
            console.log('Eliminando venta:', saleId);
            
            this.app.showAlert('Venta eliminada exitosamente', 'success');
            await this.loadSales();

        } catch (error) {
            console.error('Error deleting sale:', error);
            this.app.showAlert('Error al eliminar la venta', 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    filterSales() {
        const searchTerm = document.getElementById('animal-search').value.toLowerCase();
        
        const cards = document.querySelectorAll('#sales-list .card');
        cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            const matchesSearch = text.includes(searchTerm);
            card.style.display = matchesSearch ? 'block' : 'none';
        });
    }

    showSaleForm() {
        const form = document.getElementById('sale-form');
        form.reset();
        
        // Establecer fecha actual por defecto
        const today = new Date().toISOString().split('T')[0];
        const dateInput = form.querySelector('#sale-saleDate');
        if (dateInput && !dateInput.value) {
            dateInput.value = today;
        }
        
        const modal = new bootstrap.Modal(document.getElementById('sale-form-modal'));
        modal.show();
    }

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

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    if (window.app) {
        window.salesManager = new SalesManager(window.app);
    }
});