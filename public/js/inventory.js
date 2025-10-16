class InventoryManager {
    constructor(app) {
        this.app = app;
        this.inventory = [];
        this.currentEditId = null;
        this.initialized = false;
        this.init();
    }

    init() {
        if (this.initialized) {
            console.log('⚠️ InventoryManager ya estaba inicializado');
            return;
        }
        
        console.log('📦 InventoryManager inicializado');
        this.setupEventListeners();
        this.initialized = true;
    }

    setupEventListeners() {
        // ✅ CORREGIDO: Usar el método del app para conexión única
        this.app.setupFormHandler('inventory-form', (form) => this.handleInventorySubmit(form));

        document.addEventListener('inventoryViewLoaded', () => {
            this.loadInventory();
        });

        // Filtro de categoría
        const typeFilter = document.getElementById('inventory-type-filter');
        if (typeFilter) {
            typeFilter.addEventListener('change', () => this.filterInventory());
        }
    }

    async loadInventory() {
        try {
            this.app.showLoading(true);
            console.log('🔄 Cargando inventario desde API...');
            
            const response = await this.app.apiCall('/inventory');
            
            // ✅ CORREGIDO: Manejar diferentes formatos de respuesta
            let inventoryArray = [];
            
            if (Array.isArray(response)) {
                inventoryArray = response;
            } else if (response && Array.isArray(response.data)) {
                inventoryArray = response.data;
            } else if (response && Array.isArray(response.inventory)) {
                inventoryArray = response.inventory;
            } else if (response && response.data && Array.isArray(response.data.inventory)) {
                inventoryArray = response.data.inventory;
            } else {
                console.warn('⚠️ Formato de respuesta inesperado para inventario:', response);
                inventoryArray = [];
            }
            
            this.inventory = inventoryArray;
            this.renderInventory();
            this.updateStats();
            console.log(`✅ ${this.inventory.length} items cargados en inventario`);
            
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
                this.renderInventory([]);
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
            },
            {
                id: "demo-2",
                itemName: "Alfalfa Premium",
                category: "supplies",
                currentStock: 200,
                minStock: 50,
                unit: "kg",
                price: 25.00,
                supplier: "Forrajes del Norte",
                notes: "Alfalfa de alta calidad"
            }
        ];
    }

    renderInventory(inventory = this.inventory) {
        const container = document.getElementById('inventory-list');
        if (!container) return;

        if (!inventory || inventory.length === 0) {
            container.innerHTML = this.getEmptyState();
            return;
        }

        container.innerHTML = inventory.map(item => {
            const itemId = item.id || item._id || '';
            const isLowStock = item.currentStock <= item.minStock;
            const stockClass = isLowStock ? 'bg-danger' : 'bg-success';
            const stockText = isLowStock ? 'Stock Bajo' : 'Stock OK';
            const itemTypeText = this.getItemTypeText(item.category);

            return `
                <div class="col-md-6 mb-4">
                    <div class="card inventory-card h-100 ${isLowStock ? 'border-warning' : ''}" data-id="${itemId}">
                        <div class="card-header ${isLowStock ? 'bg-warning text-dark' : 'bg-primary text-white'}">
                            <div class="d-flex justify-content-between align-items-center">
                                <h6 class="card-title mb-0">
                                    <i class="${this.getItemTypeIcon(item.category)} me-1"></i>
                                    ${this.escapeHtml(item.itemName)}
                                </h6>
                                <span class="badge ${stockClass}">${stockText}</span>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-6">
                                    <small class="text-muted">Tipo:</small>
                                    <p class="mb-1">
                                        <span class="badge bg-secondary">${itemTypeText}</span>
                                    </p>
                                </div>
                                <div class="col-6">
                                    <small class="text-muted">Stock Actual:</small>
                                    <p class="mb-1 fw-bold">
                                        <span class="badge ${stockClass}">${item.currentStock} ${item.unit}</span>
                                        ${isLowStock ? '<i class="fas fa-exclamation-triangle text-warning ms-1"></i>' : ''}
                                    </p>
                                </div>
                            </div>
                            <div class="row mt-2">
                                <div class="col-6">
                                    <small class="text-muted">Stock Mínimo:</small>
                                    <p class="mb-1">${item.minStock} ${item.unit}</p>
                                </div>
                                <div class="col-6">
                                    <small class="text-muted">Precio:</small>
                                    <p class="mb-1">${this.app.formatCurrency(item.price || 0)}</p>
                                </div>
                            </div>
                            <div class="row mt-2">
                                <div class="col-12">
                                    <small class="text-muted">Proveedor:</small>
                                    <p class="mb-1">${this.escapeHtml(item.supplier || 'N/A')}</p>
                                </div>
                            </div>
                            ${item.notes ? `
                                <div class="mt-2">
                                    <small class="text-muted">Descripción:</small>
                                    <p class="mb-1 small">${this.escapeHtml(item.notes)}</p>
                                </div>
                            ` : ''}
                        </div>
                        <div class="card-footer bg-transparent">
                            <div class="btn-group w-100">
                                <button class="btn btn-outline-primary btn-sm" onclick="inventoryManager.editInventory('${itemId}')">
                                    <i class="fas fa-edit me-1"></i>Editar
                                </button>
                                <button class="btn btn-outline-danger btn-sm" onclick="inventoryManager.deleteInventory('${itemId}')">
                                    <i class="fas fa-trash me-1"></i>Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateStats(inventory = this.inventory) {
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

    async handleInventorySubmit(form) {
        try {
            this.app.showLoading(true);
            const formData = this.app.getFormData(form);

            console.log('📝 Datos del formulario de inventario:', formData);

            // Validaciones
            if (!formData.item_type || !formData.itemName || !formData.currentStock || !formData.minStock) {
                this.app.showAlert('Todos los campos obligatorios deben ser completados', 'warning');
                return;
            }

            if (parseInt(formData.currentStock) < 0 || parseInt(formData.minStock) < 0) {
                this.app.showAlert('Los valores de stock no pueden ser negativos', 'warning');
                return;
            }

            // Preparar datos para la API
            const inventoryData = {
                itemName: formData.itemName,
                category: formData.item_type,
                currentStock: parseInt(formData.currentStock),
                minStock: parseInt(formData.minStock),
                unit: formData.unit || 'unidad',
                price: formData.price ? parseFloat(formData.price) : 0,
                supplier: formData.supplier || '',
                notes: formData.notes || ''
            };

            console.log('🚀 Enviando a API:', inventoryData);

            let result;
            if (this.currentEditId) {
                // ✅ EDITAR: Usar PUT para actualizar
                result = await this.app.apiCall(`/inventory/${this.currentEditId}`, {
                    method: 'PUT',
                    body: inventoryData
                });
                
                // ✅ ACTUALIZAR LOCALMENTE sin recargar toda la lista
                this.updateLocalItem(this.currentEditId, { ...inventoryData, id: this.currentEditId });
            } else {
                // ✅ CREAR: Usar POST para nuevo item
                result = await this.app.apiCall('/inventory', {
                    method: 'POST',
                    body: inventoryData
                });
                
                // ✅ AGREGAR LOCALMENTE sin recargar toda la lista
                this.addLocalItem(result.data || inventoryData);
            }

            console.log('✅ Respuesta de API:', result);

            this.app.showAlert(
                this.currentEditId ? 'Item actualizado exitosamente' : 'Item agregado al inventario exitosamente', 
                'success'
            );
            
            this.app.hideModal('inventory-form-modal');
            this.currentEditId = null;

        } catch (error) {
            console.error('❌ Error saving inventory item:', error);
            this.app.showAlert('Error al guardar el item: ' + error.message, 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    // ✅ NUEVO MÉTODO: Actualizar item localmente
    updateLocalItem(itemId, newData) {
        const container = document.getElementById('inventory-list');
        if (!container) return;

        const itemCard = container.querySelector(`[data-id="${itemId}"]`);
        if (itemCard) {
            // Re-renderizar la tarjeta completa
            const isLowStock = newData.currentStock <= newData.minStock;
            const stockClass = isLowStock ? 'bg-danger' : 'bg-success';
            const stockText = isLowStock ? 'Stock Bajo' : 'Stock OK';
            const itemTypeText = this.getItemTypeText(newData.category);

            const newItemHTML = `
                <div class="card inventory-card h-100 ${isLowStock ? 'border-warning' : ''}" data-id="${itemId}">
                    <div class="card-header ${isLowStock ? 'bg-warning text-dark' : 'bg-primary text-white'}">
                        <div class="d-flex justify-content-between align-items-center">
                            <h6 class="card-title mb-0">
                                <i class="${this.getItemTypeIcon(newData.category)} me-1"></i>
                                ${this.escapeHtml(newData.itemName)}
                            </h6>
                            <span class="badge ${stockClass}">${stockText}</span>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-6">
                                <small class="text-muted">Tipo:</small>
                                <p class="mb-1">
                                    <span class="badge bg-secondary">${itemTypeText}</span>
                                </p>
                            </div>
                            <div class="col-6">
                                <small class="text-muted">Stock Actual:</small>
                                <p class="mb-1 fw-bold">
                                    <span class="badge ${stockClass}">${newData.currentStock} ${newData.unit}</span>
                                    ${isLowStock ? '<i class="fas fa-exclamation-triangle text-warning ms-1"></i>' : ''}
                                </p>
                            </div>
                        </div>
                        <div class="row mt-2">
                            <div class="col-6">
                                <small class="text-muted">Stock Mínimo:</small>
                                <p class="mb-1">${newData.minStock} ${newData.unit}</p>
                            </div>
                            <div class="col-6">
                                <small class="text-muted">Precio:</small>
                                <p class="mb-1">${this.app.formatCurrency(newData.price || 0)}</p>
                            </div>
                        </div>
                        <div class="row mt-2">
                            <div class="col-12">
                                <small class="text-muted">Proveedor:</small>
                                <p class="mb-1">${this.escapeHtml(newData.supplier || 'N/A')}</p>
                            </div>
                        </div>
                        ${newData.notes ? `
                            <div class="mt-2">
                                <small class="text-muted">Descripción:</small>
                                <p class="mb-1 small">${this.escapeHtml(newData.notes)}</p>
                            </div>
                        ` : ''}
                    </div>
                    <div class="card-footer bg-transparent">
                        <div class="btn-group w-100">
                            <button class="btn btn-outline-primary btn-sm" onclick="inventoryManager.editInventory('${itemId}')">
                                <i class="fas fa-edit me-1"></i>Editar
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="inventoryManager.deleteInventory('${itemId}')">
                                <i class="fas fa-trash me-1"></i>Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            `;

            itemCard.outerHTML = newItemHTML;
            console.log('✅ Item actualizado localmente:', itemId);
            
            // Actualizar estadísticas
            this.updateStats();
        }
    }

    // ✅ NUEVO MÉTODO: Agregar item localmente
    addLocalItem(newItem) {
        const container = document.getElementById('inventory-list');
        if (!container) return;

        // Si el container está vacío, limpiar el mensaje de "no hay items"
        if (container.querySelector('.alert-info')) {
            container.innerHTML = '';
        }

        const itemId = newItem.id || newItem._id || `temp-${Date.now()}`;
        const isLowStock = newItem.currentStock <= newItem.minStock;
        const stockClass = isLowStock ? 'bg-danger' : 'bg-success';
        const stockText = isLowStock ? 'Stock Bajo' : 'Stock OK';
        const itemTypeText = this.getItemTypeText(newItem.category);

        const newItemHTML = `
            <div class="col-md-6 mb-4">
                <div class="card inventory-card h-100 ${isLowStock ? 'border-warning' : ''}" data-id="${itemId}">
                    <div class="card-header ${isLowStock ? 'bg-warning text-dark' : 'bg-primary text-white'}">
                        <div class="d-flex justify-content-between align-items-center">
                            <h6 class="card-title mb-0">
                                <i class="${this.getItemTypeIcon(newItem.category)} me-1"></i>
                                ${this.escapeHtml(newItem.itemName)}
                            </h6>
                            <span class="badge ${stockClass}">${stockText}</span>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-6">
                                <small class="text-muted">Tipo:</small>
                                <p class="mb-1">
                                    <span class="badge bg-secondary">${itemTypeText}</span>
                                </p>
                            </div>
                            <div class="col-6">
                                <small class="text-muted">Stock Actual:</small>
                                <p class="mb-1 fw-bold">
                                    <span class="badge ${stockClass}">${newItem.currentStock} ${newItem.unit}</span>
                                    ${isLowStock ? '<i class="fas fa-exclamation-triangle text-warning ms-1"></i>' : ''}
                                </p>
                            </div>
                        </div>
                        <div class="row mt-2">
                            <div class="col-6">
                                <small class="text-muted">Stock Mínimo:</small>
                                <p class="mb-1">${newItem.minStock} ${newItem.unit}</p>
                            </div>
                            <div class="col-6">
                                <small class="text-muted">Precio:</small>
                                <p class="mb-1">${this.app.formatCurrency(newItem.price || 0)}</p>
                            </div>
                        </div>
                        <div class="row mt-2">
                            <div class="col-12">
                                <small class="text-muted">Proveedor:</small>
                                <p class="mb-1">${this.escapeHtml(newItem.supplier || 'N/A')}</p>
                            </div>
                        </div>
                        ${newItem.notes ? `
                            <div class="mt-2">
                                <small class="text-muted">Descripción:</small>
                                <p class="mb-1 small">${this.escapeHtml(newItem.notes)}</p>
                            </div>
                        ` : ''}
                    </div>
                    <div class="card-footer bg-transparent">
                        <div class="btn-group w-100">
                            <button class="btn btn-outline-primary btn-sm" onclick="inventoryManager.editInventory('${itemId}')">
                                <i class="fas fa-edit me-1"></i>Editar
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="inventoryManager.deleteInventory('${itemId}')">
                                <i class="fas fa-trash me-1"></i>Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Agregar el nuevo item al principio de la lista
        container.insertAdjacentHTML('afterbegin', newItemHTML);
        
        // Actualizar estadísticas
        this.inventory.unshift({ ...newItem, id: itemId });
        this.updateStats();
        
        console.log('✅ Item agregado localmente:', itemId);
    }

    async editInventory(itemId) {
        try {
            this.app.showLoading(true);
            console.log('✏️ Editando item:', itemId);
            
            // Buscar el item en el inventario local primero
            const localItem = this.inventory.find(item => 
                item.id === itemId || item._id === itemId
            );
            
            if (localItem) {
                console.log('📋 Item encontrado localmente:', localItem);
                this.populateEditForm(localItem, itemId);
                return;
            }

            // Si no está localmente, cargar desde API
            const response = await this.app.apiCall(`/inventory/${itemId}`);
            const item = response.data || response;
            
            if (!item) {
                this.app.showAlert('Item no encontrado en el inventario', 'warning');
                return;
            }

            console.log('📋 Item cargado desde API:', item);
            this.populateEditForm(item, itemId);

        } catch (error) {
            console.error('Error loading inventory item for edit:', error);
            this.app.showAlert('Error al cargar el item: ' + error.message, 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    populateEditForm(item, itemId) {
        const form = document.getElementById('inventory-form');
        if (!form) return;

        // Poblar formulario
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
        
        this.app.showModal('inventory-form-modal', 'Editar Item del Inventario');
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
            
            // ✅ ELIMINAR LOCALMENTE sin recargar toda la lista
            this.removeLocalItem(itemId);
            
            this.app.showAlert('Item eliminado del inventario exitosamente', 'success');

        } catch (error) {
            console.error('Error deleting inventory item:', error);
            this.app.showAlert('Error al eliminar el item: ' + error.message, 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    // ✅ NUEVO MÉTODO: Eliminar item localmente
    removeLocalItem(itemId) {
        const container = document.getElementById('inventory-list');
        if (!container) return;

        const itemCard = container.querySelector(`[data-id="${itemId}"]`);
        if (itemCard) {
            itemCard.remove();
            
            // Actualizar array local
            this.inventory = this.inventory.filter(item => 
                item.id !== itemId && item._id !== itemId
            );
            
            // Actualizar estadísticas
            this.updateStats();
            
            // Si no quedan items, mostrar estado vacío
            if (container.children.length === 0) {
                container.innerHTML = this.getEmptyState();
            }
            
            console.log('✅ Item eliminado localmente:', itemId);
        }
    }

    filterInventory() {
        const typeFilter = document.getElementById('inventory-type-filter');
        if (!typeFilter) return;

        const selectedType = typeFilter.value;
        const container = document.getElementById('inventory-list');
        if (!container) return;

        const items = container.querySelectorAll('.inventory-card');
        
        items.forEach(item => {
            const itemType = item.querySelector('.badge.bg-secondary').textContent.toLowerCase();
            const matchesType = !selectedType || 
                this.getItemTypeKey(itemType) === selectedType;
            
            item.closest('.col-md-6').style.display = matchesType ? 'block' : 'none';
        });
    }

    showInventoryForm() {
        this.currentEditId = null;
        const form = document.getElementById('inventory-form');
        if (form) {
            this.app.resetForm(form);
            this.app.showModal('inventory-form-modal', 'Agregar al Inventario');
        }
    }

    getEmptyState() {
        return `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                No hay items en el inventario.
                <button class="btn btn-primary btn-sm ms-2" onclick="inventoryManager.showInventoryForm()">
                    <i class="fas fa-plus me-1"></i>Agregar Primer Item
                </button>
            </div>
        `;
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

// ✅ CORREGIDO: Inicialización mejorada
function initializeInventoryManager() {
    if (!window.inventoryManager || !window.inventoryManager.initialized) {
        window.inventoryManager = new InventoryManager(window.app);
    }
}

document.addEventListener('DOMContentLoaded', initializeInventoryManager);
document.addEventListener('inventoryViewLoaded', initializeInventoryManager);