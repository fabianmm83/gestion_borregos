class InventoryManager {
    constructor(app) {
        this.app = app;
        this.currentEditId = null;
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
    }

    async loadInventory() {
        try {
            this.app.showLoading(true);
            console.log('🔄 Cargando inventario desde API...');
            
            const response = await this.app.apiCall('/inventory');
            const inventory = response.data?.inventory || [];
            console.log('✅ Inventario cargado:', inventory);
            this.renderInventory(inventory);
            this.updateStats(inventory);
            
        } catch (error) {
            console.error('Error loading inventory:', error);
            
            // Mostrar datos de demo si la API falla
            if (error.message.includes('404') || error.message.includes('500')) {
                this.app.showAlert('Usando datos de demostración', 'info');
                const demoInventory = this.getDemoInventory();
                this.renderInventory(demoInventory);
                this.updateStats(demoInventory);
            } else {
                this.app.showAlert('Error al cargar el inventario: ' + error.message, 'danger');
            }
        } finally {
            this.app.showLoading(false);
        }
    }

    getDemoInventory() {
        return [
            {
                id: "demo-1",
                itemName: "Antibiótico Ovinos",
                category: "medicine",
                currentStock: 5,
                minStock: 10,
                unit: "unidades",
                price: 150.00,
                supplier: "Farmacia Veterinaria SA",
                notes: "Antibiótico de amplio espectro"
            }
        ];
    }

    renderInventory(inventory) {
        const container = document.getElementById('inventory-list');
        if (!container) return;

        if (!inventory || inventory.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    No hay items en el inventario.
                    <button class="btn btn-primary btn-sm ms-2" onclick="inventoryManager.showInventoryForm()">
                        <i class="fas fa-plus me-1"></i>Agregar Primer Item
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = inventory.map(item => {
            const isLowStock = item.currentStock <= item.minStock;
            const stockClass = isLowStock ? 'bg-danger' : 'bg-success';
            const stockText = isLowStock ? 'Stock Bajo' : 'Stock OK';
            const itemTypeText = this.getItemTypeText(item.category);

            return `
                <div class="card mb-3 ${isLowStock ? 'border-warning' : ''}">
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-8">
                                <h5 class="card-title">
                                    <i class="${this.getItemTypeIcon(item.category)} me-2"></i>
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
                                    <strong>Precio:</strong> $${parseFloat(item.price || 0).toLocaleString()}
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
                                        <strong>Descripcion:</strong> ${item.notes}
                                    </p>
                                ` : ''}
                            </div>
                            <div class="col-md-4 text-end">
                                <div class="mb-2">
                                    <span class="badge ${stockClass}">${stockText}</span>
                                </div>
                                <div class="btn-group-vertical">
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

            console.log('📝 Datos del formulario de inventario:', data);

            // Validaciones
            if (!data.item_type || !data.itemName || !data.currentStock || !data.minStock) {
                this.app.showAlert('Todos los campos obligatorios deben ser completados', 'warning');
                return;
            }

            if (parseInt(data.currentStock) < 0 || parseInt(data.minStock) < 0) {
                this.app.showAlert('Los valores de stock no pueden ser negativos', 'warning');
                return;
            }

            // Preparar datos para la API
            const inventoryData = {
                itemName: data.itemName,
                category: data.item_type,
                currentStock: parseInt(data.currentStock),
                minStock: parseInt(data.minStock),
                unit: data.unit || 'unidad',
                price: data.price ? parseFloat(data.price) : 0,
                supplier: data.supplier || '',
                notes: data.notes || ''
            };

            console.log('🚀 Enviando a API:', inventoryData);

            let result;
            if (this.currentEditId && this.currentEditId !== 'null') {
                // ✅ EDITAR: Usar PUT para actualizar el item completo
                result = await this.app.apiCall(`/inventory/${this.currentEditId}`, {
                    method: 'PUT',
                    body: inventoryData
                });
            } else {
                // ✅ CREAR: Usar POST para nuevo item
                result = await this.app.apiCall('/inventory', {
                    method: 'POST',
                    body: inventoryData
                });
            }

            console.log('✅ Respuesta de API:', result);

            this.app.showAlert(
                this.currentEditId ? 'Item actualizado exitosamente' : 'Item agregado al inventario exitosamente', 
                'success'
            );
            
            // Cerrar modal y recargar
            const modal = bootstrap.Modal.getInstance(document.getElementById('inventory-form-modal'));
            modal.hide();
            form.reset();
            this.currentEditId = null;
            
            await this.loadInventory();

        } catch (error) {
            console.error('❌ Error saving inventory item:', error);
            this.app.showAlert('Error al guardar el item: ' + error.message, 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    async editInventory(itemId) {
        try {
            this.app.showLoading(true);
            console.log('✏️ Editando item:', itemId);
            
            // ✅ CORREGIDO: Usar el endpoint GET individual
            const response = await this.app.apiCall(`/inventory/${itemId}`);
            const item = response.data;
            
            if (!item) {
                this.app.showAlert('Item no encontrado en el inventario', 'warning');
                return;
            }

            console.log('📋 Item cargado:', item);
            
            // Poblar formulario
            const form = document.getElementById('inventory-form');
            const fields = ['itemName', 'currentStock', 'minStock', 'unit', 'price', 'supplier', 'notes'];
            
            fields.forEach(field => {
                const input = form.querySelector(`[name="${field}"]`);
                if (input && item[field] !== undefined && item[field] !== null) {
                    input.value = item[field];
                }
            });

            // Establecer el tipo de item
            const typeSelect = form.querySelector('[name="item_type"]');
            if (typeSelect && item.category) {
                typeSelect.value = item.category;
            }
            
            this.currentEditId = itemId;
            
            // Actualizar título del modal
            const modalTitle = document.querySelector('#inventory-form-modal .modal-title');
            if (modalTitle) {
                modalTitle.innerHTML = '<i class="fas fa-edit me-2"></i>Editar Item';
            }
            
            // Mostrar modal
            const modal = new bootstrap.Modal(document.getElementById('inventory-form-modal'));
            modal.show();

        } catch (error) {
            console.error('Error loading inventory item for edit:', error);
            this.app.showAlert('Error al cargar el item: ' + error.message, 'danger');
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
            
            // ✅ ELIMINACIÓN REAL: Usar el endpoint DELETE
            await this.app.apiCall(`/inventory/${itemId}`, {
                method: 'DELETE'
            });
            
            this.app.showAlert('Item eliminado del inventario exitosamente', 'success');
            await this.loadInventory();

        } catch (error) {
            console.error('Error deleting inventory item:', error);
            this.app.showAlert('Error al eliminar el item: ' + error.message, 'danger');
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
        
        // Restaurar título del modal
        const modalTitle = document.querySelector('#inventory-form-modal .modal-title');
        if (modalTitle) {
            modalTitle.innerHTML = '<i class="fas fa-plus-circle me-2"></i>Agregar al Inventario';
        }
        
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