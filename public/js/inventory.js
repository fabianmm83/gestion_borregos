class InventoryManager {
    constructor(app) {
        this.app = app;
        this.currentEditId = null;
        this.currentStockUpdateId = null;
        this.init();
    }

    init() {
        console.log('📦 InventoryManager inicializado');
        this.setupEventListeners();
    }

    setupEventListeners() {
        const inventoryForm = document.getElementById('inventory-form');
        if (inventoryForm) {
            inventoryForm.addEventListener('submit', (e) => this.handleInventorySubmit(e));
        }

        const stockUpdateForm = document.getElementById('stock-update-form');
        if (stockUpdateForm) {
            stockUpdateForm.addEventListener('submit', (e) => this.handleStockUpdate(e));
        }

        // Filtros
        const typeFilter = document.getElementById('inventory-type-filter');
        if (typeFilter) {
            typeFilter.addEventListener('change', () => this.filterInventory());
        }
    }

    async loadInventory() {
        try {
            this.app.showLoading(true);
            // Simular datos para demo
            const inventory = [
                {
                    id: 1,
                    item_type: "medicine",
                    itemName: "Antibiótico Ovinos",
                    currentStock: 5,
                    minStock: 10,
                    unit: "unidades",
                    price: 150.00,
                    supplier: "Farmacia Veterinaria SA",
                    purchase_date: "2024-01-01",
                    expiration_date: "2024-12-31",
                    notes: "Antibiótico de amplio espectro"
                },
                {
                    id: 2,
                    item_type: "supplies",
                    itemName: "Alimento Concentrado",
                    currentStock: 500,
                    minStock: 100,
                    unit: "kg",
                    price: 25.50,
                    supplier: "Alimentos Premium",
                    purchase_date: "2024-01-05",
                    expiration_date: "2024-06-30",
                    notes: "Alimento para crecimiento"
                },
                {
                    id: 3,
                    item_type: "tools",
                    itemName: "Tijeras de Esquila",
                    currentStock: 2,
                    minStock: 1,
                    unit: "unidades",
                    price: 450.00,
                    supplier: "Herramientas Agro",
                    purchase_date: "2023-12-15",
                    notes: "Tijeras profesionales para esquila"
                }
            ];
            this.renderInventory(inventory);
            this.updateStats(inventory);
        } catch (error) {
            console.error('Error loading inventory:', error);
            this.app.showAlert('Error al cargar el inventario', 'danger');
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
                </div>
            `;
            return;
        }

        container.innerHTML = inventory.map(item => {
            const isLowStock = item.currentStock <= item.minStock;
            const stockClass = isLowStock ? 'bg-danger' : 'bg-success';
            const stockText = isLowStock ? 'Stock Bajo' : 'Stock OK';
            const itemTypeText = this.getItemTypeText(item.item_type);

            return `
                <div class="card mb-3 ${isLowStock ? 'border-warning' : ''}">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-8">
                                <h5 class="card-title">
                                    <i class="${this.getItemTypeIcon(item.item_type)} me-2"></i>
                                    ${this.escapeHtml(item.itemName)}
                                </h5>
                                <p class="card-text mb-1">
                                    <strong>Tipo:</strong> 
                                    <span class="badge bg-secondary">${itemTypeText}</span>
                                </p>
                                <p class="card-text mb-1">
                                    <strong>Stock:</strong> 
                                    <span class="badge ${stockClass}">${item.currentStock} ${item.unit}</span>
                                    ${isLowStock ? '<i class="fas fa-exclamation-triangle text-warning ms-1"></i>' : ''}
                                </p>
                                <p class="card-text mb-1">
                                    <strong>Stock Mínimo:</strong> ${item.minStock} ${item.unit}
                                </p>
                                <p class="card-text mb-1">
                                    <strong>Precio:</strong> $${parseFloat(item.price).toLocaleString()}
                                </p>
                                <p class="card-text mb-1">
                                    <strong>Proveedor:</strong> ${this.escapeHtml(item.supplier || 'N/A')}
                                </p>
                                ${item.expiration_date ? `
                                    <p class="card-text mb-1">
                                        <strong>Caducidad:</strong> ${new Date(item.expiration_date).toLocaleDateString()}
                                    </p>
                                ` : ''}
                                ${item.notes ? `
                                    <p class="card-text">
                                        <strong>Descripción:</strong> ${item.notes}
                                    </p>
                                ` : ''}
                            </div>
                            <div class="col-md-4 text-end">
                                <div class="mb-2">
                                    <span class="badge ${stockClass}">${stockText}</span>
                                </div>
                                <div class="btn-group-vertical">
                                    <button class="btn btn-sm btn-outline-success adjust-stock-btn" data-id="${item.id}">
                                        <i class="fas fa-edit"></i> Ajustar Stock
                                    </button>
                                    <button class="btn btn-sm btn-outline-primary edit-inventory-btn" data-id="${item.id}">
                                        <i class="fas fa-edit"></i> Editar
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger delete-inventory-btn" data-id="${item.id}">
                                        <i class="fas fa-trash"></i> Eliminar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Agregar event listeners
        this.attachInventoryEventListeners();
    }

    attachInventoryEventListeners() {
        document.querySelectorAll('.edit-inventory-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.editInventory(e.target.closest('button').dataset.id);
            });
        });

        document.querySelectorAll('.delete-inventory-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.deleteInventory(e.target.closest('button').dataset.id);
            });
        });

        document.querySelectorAll('.adjust-stock-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.showStockUpdate(e.target.closest('button').dataset.id);
            });
        });
    }

    updateStats(inventory) {
        const totalInventory = document.getElementById('total-inventory');
        const lowStockItems = document.getElementById('low-stock-items');
        const inventoryLowStock = document.getElementById('inventory-low-stock');

        if (totalInventory) {
            totalInventory.textContent = inventory.length;
        }

        if (lowStockItems || inventoryLowStock) {
            const lowStockCount = inventory.filter(item => item.currentStock <= item.minStock).length;
            if (lowStockItems) lowStockItems.textContent = lowStockCount;
            if (inventoryLowStock) inventoryLowStock.textContent = lowStockCount;
        }
    }

    async handleInventorySubmit(e) {
        e.preventDefault();
        const form = e.target;
        
        try {
            this.app.showLoading(true);
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            // Validaciones
            if (!data.item_type || !data.itemName || !data.currentStock || !data.minStock) {
                this.app.showAlert('Todos los campos obligatorios deben ser completados', 'warning');
                return;
            }

            if (parseInt(data.currentStock) < 0 || parseInt(data.minStock) < 0) {
                this.app.showAlert('Los valores de stock no pueden ser negativos', 'warning');
                return;
            }

            // Simular guardado
            console.log('Guardando item de inventario:', data);
            
            this.app.showAlert('Item guardado en inventario exitosamente', 'success');
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('inventory-form-modal'));
            modal.hide();
            form.reset();
            await this.loadInventory();

        } catch (error) {
            console.error('Error saving inventory item:', error);
            this.app.showAlert('Error al guardar el item', 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    async editInventory(itemId) {
        try {
            this.app.showLoading(true);
            // Simular carga de item - reemplazar con API real
            const item = {
                id: itemId,
                item_type: "medicine",
                itemName: "Antibiótico Ovinos",
                currentStock: 5,
                minStock: 10,
                unit: "unidades",
                price: 150.00,
                supplier: "Farmacia Veterinaria SA",
                purchase_date: "2024-01-01",
                expiration_date: "2024-12-31",
                notes: "Antibiótico de amplio espectro"
            };
            
            // Poblar formulario
            const form = document.getElementById('inventory-form');
            Object.keys(item).forEach(key => {
                const input = form.querySelector(`[name="${key}"]`);
                if (input) input.value = item[key] || '';
            });
            
            this.currentEditId = itemId;
            
            const modal = new bootstrap.Modal(document.getElementById('inventory-form-modal'));
            modal.show();

        } catch (error) {
            console.error('Error loading inventory item for edit:', error);
            this.app.showAlert('Error al cargar el item', 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    async deleteInventory(itemId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este item del inventario?')) {
            return;
        }

        try {
            this.app.showLoading(true);
            // Simular eliminación
            console.log('Eliminando item:', itemId);
            
            this.app.showAlert('Item eliminado del inventario exitosamente', 'success');
            await this.loadInventory();

        } catch (error) {
            console.error('Error deleting inventory item:', error);
            this.app.showAlert('Error al eliminar el item', 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    async showStockUpdate(itemId) {
        try {
            this.app.showLoading(true);
            // Simular carga de item
            const item = {
                id: itemId,
                itemName: "Antibiótico Ovinos",
                currentStock: 5,
                unit: "unidades"
            };
            
            // Configurar modal
            document.getElementById('update-current-stock').value = item.currentStock;
            this.currentStockUpdateId = itemId;
            
            const modal = new bootstrap.Modal(document.getElementById('stock-update-modal'));
            modal.show();

        } catch (error) {
            console.error('Error loading item for stock update:', error);
            this.app.showAlert('Error al cargar el item', 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    async handleStockUpdate(e) {
        e.preventDefault();
        const form = e.target;
        
        try {
            this.app.showLoading(true);
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            const currentStock = parseInt(document.getElementById('update-current-stock').value);
            const quantity = parseInt(data.quantity);
            let newStock = currentStock;

            switch (data.operation) {
                case 'add':
                    newStock = currentStock + quantity;
                    break;
                case 'subtract':
                    newStock = currentStock - quantity;
                    if (newStock < 0) {
                        this.app.showAlert('No se puede tener stock negativo', 'warning');
                        return;
                    }
                    break;
                case 'set':
                    newStock = quantity;
                    break;
            }

            // Simular actualización
            console.log(`Actualizando stock del item ${this.currentStockUpdateId}: ${currentStock} -> ${newStock}`);
            
            this.app.showAlert('Stock actualizado exitosamente', 'success');
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('stock-update-modal'));
            modal.hide();
            form.reset();
            await this.loadInventory();

        } catch (error) {
            console.error('Error updating stock:', error);
            this.app.showAlert('Error al actualizar el stock', 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    filterInventory() {
        const typeFilter = document.getElementById('inventory-type-filter').value;
        
        const cards = document.querySelectorAll('#inventory-list .card');
        cards.forEach(card => {
            const itemType = card.querySelector('.badge.bg-secondary').textContent.toLowerCase();
            const matchesType = !typeFilter || 
                this.getItemTypeKey(itemType).includes(typeFilter);
            
            card.style.display = matchesType ? 'block' : 'none';
        });
    }

    showInventoryForm() {
        this.currentEditId = null;
        const form = document.getElementById('inventory-form');
        form.reset();
        const modal = new bootstrap.Modal(document.getElementById('inventory-form-modal'));
        modal.show();
    }

    getItemTypeIcon(type) {
        const icons = {
            'medicine': 'fas fa-pills',
            'equipment': 'fas fa-tools',
            'supplies': 'fas fa-box-open',
            'tools': 'fas fa-wrench',
            'other': 'fas fa-cube'
        };
        return icons[type] || 'fas fa-cube';
    }

    getItemTypeText(type) {
        const texts = {
            'medicine': 'Medicina',
            'equipment': 'Equipo',
            'supplies': 'Insumos',
            'tools': 'Herramientas',
            'other': 'Otro'
        };
        return texts[type] || type;
    }

    getItemTypeKey(text) {
        const keys = {
            'medicina': 'medicine',
            'equipo': 'equipment',
            'insumos': 'supplies',
            'herramientas': 'tools',
            'otro': 'other'
        };
        return keys[text.toLowerCase()] || text;
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
        window.inventoryManager = new InventoryManager(window.app);
    }
});