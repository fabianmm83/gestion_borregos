class InventoryManager {
    constructor() {
        this.currentEditId = null;
        this.init();
    }

    init() {
        console.log('📦 InventoryManager inicializado');
        this.setupEventListeners();
        document.addEventListener('inventoryViewLoaded', () => this.loadInventory());
    }

    setupEventListeners() {
        // Formulario de inventario
        const inventoryForm = document.getElementById('inventory-form');
        if (inventoryForm) {
            inventoryForm.addEventListener('submit', (e) => this.handleInventorySubmit(e));
        }

        // Formulario de ajuste de stock
        const stockForm = document.getElementById('stock-form');
        if (stockForm) {
            stockForm.addEventListener('submit', (e) => this.handleStockAdjustment(e));
        }

        // Botones de acción
        document.addEventListener('click', (e) => {
            if (e.target.matches('.edit-inventory-btn')) {
                this.editInventory(e.target.dataset.id);
            }
            if (e.target.matches('.delete-inventory-btn')) {
                this.deleteInventory(e.target.dataset.id);
            }
            if (e.target.matches('.adjust-stock-btn')) {
                this.showStockAdjustment(e.target.dataset.id);
            }
        });

        // Filtros
        const filterForm = document.getElementById('filter-inventory-form');
        if (filterForm) {
            filterForm.addEventListener('submit', (e) => this.filterInventory(e));
        }
    }

    async loadInventory() {
        try {
            window.app.showLoading(true);
            const inventory = await window.app.apiCall('/inventory');
            this.renderInventory(inventory);
            this.updateStats(inventory);
        } catch (error) {
            console.error('Error loading inventory:', error);
            window.app.showAlert('Error al cargar el inventario', 'danger');
        } finally {
            window.app.showLoading(false);
        }
    }

    renderInventory(inventory) {
        const tbody = document.getElementById('inventory-tbody');
        if (!tbody) return;

        if (inventory.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-4">
                        <i class="fas fa-boxes fa-2x text-muted mb-2"></i>
                        <p class="text-muted">No hay items en el inventario</p>
                        <button class="btn btn-primary" onclick="window.app.showModal('addInventoryModal')">
                            <i class="fas fa-plus me-1"></i>Agregar Item
                        </button>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = inventory.map(item => {
            const isLowStock = item.currentStock <= item.minStock;
            const stockStatus = isLowStock ? 'bg-danger' : 'bg-success';
            const stockText = isLowStock ? 'Stock Bajo' : 'Stock OK';

            return `
                <tr class="${isLowStock ? 'table-warning' : ''}">
                    <td>
                        <div class="d-flex align-items-center">
                            <i class="fas fa-box text-primary me-2"></i>
                            <div>
                                <strong>${this.escapeHtml(item.itemName)}</strong>
                                <br>
                                <small class="text-muted">${this.escapeHtml(item.category)}</small>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="badge ${stockStatus}">${item.currentStock} ${item.unit}</span>
                    </td>
                    <td>${item.minStock} ${item.unit}</td>
                    <td>${window.app.formatCurrency(item.price)}</td>
                    <td>${this.escapeHtml(item.supplier || 'N/A')}</td>
                    <td>${this.escapeHtml(item.notes || 'Sin notas')}</td>
                    <td>${window.app.formatDate(item.lastUpdated)}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-success adjust-stock-btn" data-id="${item.id}">
                                <i class="fas fa-edit"></i> Stock
                            </button>
                            <button class="btn btn-outline-primary edit-inventory-btn" data-id="${item.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger delete-inventory-btn" data-id="${item.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    updateStats(inventory) {
        const totalItemsElement = document.getElementById('total-inventory-items');
        const lowStockItemsElement = document.getElementById('low-stock-items');
        const totalValueElement = document.getElementById('total-inventory-value');

        if (totalItemsElement) {
            totalItemsElement.textContent = inventory.length;
        }

        if (lowStockItemsElement) {
            const lowStockCount = inventory.filter(item => item.currentStock <= item.minStock).length;
            lowStockItemsElement.textContent = lowStockCount;
        }

        if (totalValueElement) {
            const totalValue = inventory.reduce((sum, item) => {
                return sum + (item.currentStock * item.price);
            }, 0);
            totalValueElement.textContent = window.app.formatCurrency(totalValue);
        }
    }

    async handleInventorySubmit(e) {
        e.preventDefault();
        const form = e.target;
        
        try {
            window.app.showLoading(true);
            const formData = window.app.getFormData(form);

            // Validaciones
            if (!formData.itemName || !formData.category) {
                window.app.showAlert('Nombre y categoría del item son obligatorios', 'warning');
                return;
            }

            if (this.currentEditId) {
                // Editar item existente
                await window.app.apiCall(`/inventory/${this.currentEditId}`, {
                    method: 'PUT',
                    body: formData
                });
                window.app.showAlert('Item actualizado exitosamente', 'success');
            } else {
                // Crear nuevo item
                await window.app.apiCall('/inventory', {
                    method: 'POST',
                    body: formData
                });
                window.app.showAlert('Item agregado al inventario exitosamente', 'success');
            }

            // Cerrar modal y recargar datos
            window.app.hideModal('addInventoryModal');
            this.currentEditId = null;
            window.app.resetForm(form);
            await this.loadInventory();

        } catch (error) {
            console.error('Error saving inventory item:', error);
            window.app.showAlert('Error al guardar el item: ' + error.message, 'danger');
        } finally {
            window.app.showLoading(false);
        }
    }

    async editInventory(itemId) {
        try {
            window.app.showLoading(true);
            const item = await window.app.apiCall(`/inventory/${itemId}`);
            
            // Poblar formulario
            const form = document.getElementById('inventory-form');
            window.app.populateForm(form, item);
            
            // Configurar para edición
            this.currentEditId = itemId;
            const modalTitle = document.querySelector('#addInventoryModal .modal-title');
            if (modalTitle) {
                modalTitle.textContent = 'Editar Item de Inventario';
            }
            
            // Mostrar modal
            window.app.showModal('addInventoryModal');

        } catch (error) {
            console.error('Error loading inventory item for edit:', error);
            window.app.showAlert('Error al cargar el item para editar', 'danger');
        } finally {
            window.app.showLoading(false);
        }
    }

    async deleteInventory(itemId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este item del inventario?')) {
            return;
        }

        try {
            window.app.showLoading(true);
            await window.app.apiCall(`/inventory/${itemId}`, {
                method: 'DELETE'
            });
            
            window.app.showAlert('Item eliminado del inventario exitosamente', 'success');
            await this.loadInventory();

        } catch (error) {
            console.error('Error deleting inventory item:', error);
            window.app.showAlert('Error al eliminar el item del inventario', 'danger');
        } finally {
            window.app.showLoading(false);
        }
    }

    async showStockAdjustment(itemId) {
        try {
            window.app.showLoading(true);
            const item = await window.app.apiCall(`/inventory/${itemId}`);
            
            // Configurar modal de ajuste de stock
            document.getElementById('adjust-stock-item-name').textContent = item.itemName;
            document.getElementById('adjust-stock-current').textContent = `${item.currentStock} ${item.unit}`;
            document.getElementById('stock-item-id').value = itemId;
            
            // Mostrar modal
            window.app.showModal('adjustStockModal');

        } catch (error) {
            console.error('Error loading item for stock adjustment:', error);
            window.app.showAlert('Error al cargar el item para ajuste de stock', 'danger');
        } finally {
            window.app.showLoading(false);
        }
    }

    async handleStockAdjustment(e) {
        e.preventDefault();
        const form = e.target;
        
        try {
            window.app.showLoading(true);
            const formData = window.app.getFormData(form);
            const itemId = formData.itemId;
            const operation = formData.operation;
            const quantity = parseFloat(formData.quantity);

            if (!quantity || quantity <= 0) {
                window.app.showAlert('La cantidad debe ser mayor a 0', 'warning');
                return;
            }

            await window.app.apiCall(`/inventory/${itemId}/stock`, {
                method: 'PUT',
                body: {
                    operation: operation,
                    quantity: quantity
                }
            });

            window.app.showAlert('Stock actualizado exitosamente', 'success');
            window.app.hideModal('adjustStockModal');
            window.app.resetForm(form);
            await this.loadInventory();

        } catch (error) {
            console.error('Error adjusting stock:', error);
            window.app.showAlert('Error al ajustar el stock: ' + error.message, 'danger');
        } finally {
            window.app.showLoading(false);
        }
    }

    async filterInventory(e) {
        e.preventDefault();
        // Implementar filtros si es necesario
        window.app.showAlert('Filtro aplicado', 'info');
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Inicialización
if (typeof window.inventoryManager === 'undefined') {
    window.inventoryManager = new InventoryManager();
}