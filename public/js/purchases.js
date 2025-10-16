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
            const purchases = await this.app.apiCall('/purchases');
            this.renderPurchases(purchases);
            this.updateStats(purchases);
        } catch (error) {
            console.error('Error loading purchases:', error);
            // Manejar error
        } finally {
            this.app.showLoading(false);
        }
    }

    renderPurchases(purchases) {
        const container = document.getElementById('purchases-list');
        if (!container) return;

        if (!purchases || purchases.length === 0) {
            container.innerHTML = this.getEmptyState();
            return;
        }

        container.innerHTML = purchases.map(purchase => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-8">
                            <h5 class="card-title">
                                <i class="fas fa-shopping-cart me-2"></i>${purchase.itemName}
                            </h5>
                            <p class="card-text mb-1">
                                <strong>Tipo:</strong> ${this.getTypeText(purchase.type)}
                            </p>
                            <p class="card-text mb-1">
                                <strong>Cantidad:</strong> ${purchase.quantity} ${purchase.unit}
                            </p>
                            <p class="card-text mb-1">
                                <strong>Precio:</strong> $${parseFloat(purchase.price).toLocaleString()}
                            </p>
                            <p class="card-text mb-1">
                                <strong>Proveedor:</strong> ${purchase.supplier || 'N/A'}
                            </p>
                            <p class="card-text mb-1">
                                <strong>Fecha:</strong> ${new Date(purchase.date).toLocaleDateString()}
                            </p>
                        </div>
                        <div class="col-md-4 text-end">
                            <button class="btn btn-sm btn-outline-danger" onclick="purchasesManager.deletePurchase('${purchase.id}')">
                                <i class="fas fa-trash"></i> Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Resto de métodos para purchases...
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    if (window.app) {
        window.purchasesManager = new PurchasesManager(window.app);
    }
});