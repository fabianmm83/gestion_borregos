class InventoryManager {
    constructor(app) {
        this.app = app;
        this.init();
    }

    init() {
        this.app.setupFormHandler('inventory-form', this.handleInventorySubmit.bind(this));
        this.app.setupFormHandler('stock-update-form', this.handleStockUpdate.bind(this));
        document.addEventListener('inventoryViewLoaded', () => this.loadInventory());
    }

    async loadInventory() {
        try {
            this.app.showLoading(true);
            const inventory = await this.app.apiCall('/api/inventory');
            this.renderInventory(inventory);
        } catch (error) {
            console.error('Error loading inventory:', error);
        } finally {
            this.app.showLoading(false);
        }
    }

    renderInventory(inventory) {
        const container = document.getElementById('inventory-list');
        if (!container) return;

        if (inventory.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    No hay items en el inventario.
                    <a href="#" class="alert-link" onclick="inventoryManager.showInventoryForm()">Agregar el primero</a>
                </div>
            `;
            return;
        }

        container.innerHTML = inventory.map(item => `
            <div class="card mb-3 ${item.currentStock <= item.minStock ? 'border-warning' : ''}">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-6">
                            <h5 class="card-title">
                                <i class="fas fa-box me-2"></i>${item.itemName}
                                ${item.currentStock <= item.minStock ? 
                                    '<span class="badge bg-warning ms-2"><i class="fas fa-exclamation-triangle"></i> Stock Bajo</span>' : 
                                    ''}
                            </h5>
                            <p class="card-text mb-1">
                                <strong>Categoría:</strong> ${item.category} |
                                <strong>Unidad:</strong> ${item.unit}
                            </p>
                            <p class="card-text mb-1">
                                <strong>Stock:</strong> 
                                <span class="${item.currentStock <= item.minStock ? 'text-warning fw-bold' : ''}">
                                    ${item.currentStock}
                                </span>
                                / ${item.minStock} mínimo
                            </p>
                            ${item.price > 0 ? `
                                <p class="card-text mb-1">
                                    <strong>Precio:</strong> $${item.price.toFixed(2)}
                                </p>
                            ` : ''}
                            ${item.supplier ? `
                                <p class="card-text mb-1">
                                    <strong>Proveedor:</strong> ${item.supplier}
                                </p>
                            ` : ''}
                        </div>
                        <div class="col-md-6 text-end">
                            <div class="btn-group">
                                <button class="btn btn-outline-primary btn-sm" onclick="inventoryManager.updateStock('${item.id}', ${item.currentStock})">
                                    <i class="fas fa-edit"></i> Actualizar Stock
                                </button>
                                <button class="btn btn-outline-success btn-sm" onclick="inventoryManager.addStock('${item.id}')">
                                    <i class="fas fa-plus"></i> Agregar
                                </button>
                                <button class="btn btn-outline-warning btn-sm" onclick="inventoryManager.removeStock('${item.id}')">
                                    <i class="fas fa-minus"></i> Quitar
                                </button>
                            </div>
                            <div class="mt-2">
                                <small class="text-muted">
                                    Actualizado: ${new Date(item.lastUpdated?.toDate?.() || item.lastUpdated).toLocaleDateString()}
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async handleInventorySubmit(form) {
        try {
            this.app.showLoading(true);
            const formData = this.app.getFormData(form);
            
            await this.app.apiCall('/api/inventory', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            this.app.showAlert('Item agregado al inventario exitosamente', 'success');
            this.app.resetForm(form);
            bootstrap.Modal.getInstance(form.closest('.modal')).hide();
            await this.loadInventory();
            
        } catch (error) {
            console.error('Error saving inventory item:', error);
        } finally {
            this.app.showLoading(false);
        }
    }

    async handleStockUpdate(form) {
        try {
            this.app.showLoading(true);
            const formData = this.app.getFormData(form);
            const itemId = form.dataset.itemId;
            
            await this.app.apiCall(`/api/inventory/${itemId}/stock`, {
                method: 'PUT',
                body: JSON.stringify(formData)
            });

            this.app.showAlert('Stock actualizado exitosamente', 'success');
            this.app.resetForm(form);
            bootstrap.Modal.getInstance(form.closest('.modal')).hide();
            await this.loadInventory();
            
        } catch (error) {
            console.error('Error updating stock:', error);
        } finally {
            this.app.showLoading(false);
        }
    }

    showInventoryForm() {
        this.app.showModal('inventory-form-modal', 'Agregar Item al Inventario');
    }

    updateStock(itemId, currentStock) {
        const form = document.getElementById('stock-update-form');
        form.dataset.itemId = itemId;
        document.getElementById('update-current-stock').value = currentStock;
        this.app.showModal('stock-update-modal', 'Actualizar Stock');
    }

    addStock(itemId) {
        const form = document.getElementById('stock-update-form');
        form.dataset.itemId = itemId;
        document.getElementById('update-operation').value = 'add';
        document.getElementById('update-quantity').value = '';
        this.app.showModal('stock-update-modal', 'Agregar Stock');
    }

    removeStock(itemId) {
        const form = document.getElementById('stock-update-form');
        form.dataset.itemId = itemId;
        document.getElementById('update-operation').value = 'subtract';
        document.getElementById('update-quantity').value = '';
        this.app.showModal('stock-update-modal', 'Quitar Stock');
    }
}

// Inicializar después de que App esté lista
document.addEventListener('DOMContentLoaded', () => {
    if (window.app) {
        window.inventoryManager = new InventoryManager(window.app);
    }
});