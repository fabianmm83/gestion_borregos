class PurchasesManager {
    constructor(app) {
        this.app = app;
        this.init();
    }

    init() {
        console.log('🛒 PurchasesManager inicializado');
        this.setupEventListeners();
    }

    setupEventListeners() {
        const purchaseForm = document.getElementById('purchase-form');
        if (purchaseForm) {
            purchaseForm.addEventListener('submit', (e) => this.handlePurchaseSubmit(e));
        }
    }

    async loadPurchases() {
        try {
            this.app.showLoading(true);
            // TEMPORAL: Mostrar mensaje de que no está implementado
            this.renderPurchases([]);
            this.app.showAlert('Módulo de compras no implementado aún', 'info');
            
        } catch (error) {
            console.error('Error loading purchases:', error);
            this.app.showAlert('Error al cargar compras: ' + error.message, 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    renderPurchases(purchases) {
        const container = document.getElementById('purchases-list');
        if (!container) return;

        container.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                Módulo de compras en desarrollo.
                <button class="btn btn-primary btn-sm ms-2" onclick="purchasesManager.showPurchaseForm()">
                    <i class="fas fa-plus me-1"></i>Agregar Compra
                </button>
            </div>
        `;
    }

    showPurchaseForm() {
        this.app.showAlert('Funcionalidad en desarrollo', 'info');
    }

    async handlePurchaseSubmit(e) {
        e.preventDefault();
        this.app.showAlert('Funcionalidad en desarrollo', 'info');
    }

    getEmptyState() {
        return `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                No hay compras registradas.
                <button class="btn btn-primary btn-sm ms-2" onclick="purchasesManager.showPurchaseForm()">
                    <i class="fas fa-plus me-1"></i>Registrar Primera Compra
                </button>
            </div>
        `;
    }

    getTypeText(type) {
        const texts = {
            'medicine': 'Medicina',
            'equipment': 'Equipo',
            'supplies': 'Insumos',
            'tools': 'Herramientas',
            'other': 'Otro'
        };
        return texts[type] || type;
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    if (window.app) {
        window.purchasesManager = new PurchasesManager(window.app);
    }
});