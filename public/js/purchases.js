class PurchasesManager {
    constructor(app) {
        this.app = app;
        this.purchases = [];
        this.initialized = false;
        this.init();
    }

    init() {
        if (this.initialized) {
            console.log('⚠️ PurchasesManager ya estaba inicializado');
            return;
        }
        
        console.log('🛒 PurchasesManager inicializado');
        this.setupEventListeners();
        this.initialized = true;
    }

    setupEventListeners() {
        // ✅ CORREGIDO: Usar el método del app para conexión única
        this.app.setupFormHandler('purchase-form', (form) => this.handlePurchaseSubmit(form));

        document.addEventListener('purchasesViewLoaded', () => {
            this.loadPurchases();
        });
    }

    async loadPurchases() {
        try {
            this.app.showLoading(true);
            console.log('🔄 Cargando compras desde API...');
            
            const response = await this.app.apiCall('/purchases');
            
            // ✅ CORREGIDO: Manejar diferentes formatos de respuesta
            let purchasesArray = [];
            
            if (Array.isArray(response)) {
                purchasesArray = response;
            } else if (response && Array.isArray(response.data)) {
                purchasesArray = response.data;
            } else if (response && Array.isArray(response.purchases)) {
                purchasesArray = response.purchases;
            } else {
                console.warn('⚠️ Formato de respuesta inesperado para compras:', response);
                purchasesArray = [];
            }
            
            this.purchases = purchasesArray;
            this.renderPurchases();
            console.log(`✅ ${this.purchases.length} compras cargadas`);
            
        } catch (error) {
            console.error('Error loading purchases:', error);
            
            if (error.message.includes('404')) {
                // Si no existe el endpoint, mostrar estado vacío
                this.renderPurchases([]);
            } else {
                this.app.showAlert('Error al cargar compras: ' + error.message, 'danger');
                this.renderPurchases([]);
            }
        } finally {
            this.app.showLoading(false);
        }
    }

    renderPurchases(purchases = this.purchases) {
        const container = document.getElementById('purchases-list');
        if (!container) return;

        if (!purchases || purchases.length === 0) {
            container.innerHTML = this.getEmptyState();
            return;
        }

        container.innerHTML = purchases.map(purchase => {
            const purchaseId = purchase.id || purchase._id || '';
            
            return `
                <div class="col-md-6 mb-4">
                    <div class="card purchase-card h-100">
                        <div class="card-header bg-info text-white">
                            <div class="d-flex justify-content-between align-items-center">
                                <h6 class="card-title mb-0">
                                    <i class="fas fa-shopping-cart me-1"></i>${this.escapeHtml(purchase.itemName || 'Compra')}
                                </h6>
                                <span class="badge bg-success">${this.app.formatCurrency(purchase.totalCost || 0)}</span>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-6">
                                    <small class="text-muted">Tipo:</small>
                                    <p class="mb-1">${this.getTypeText(purchase.type)}</p>
                                </div>
                                <div class="col-6">
                                    <small class="text-muted">Fecha:</small>
                                    <p class="mb-1">${this.app.formatDate(purchase.purchaseDate)}</p>
                                </div>
                            </div>
                            <div class="row mt-2">
                                <div class="col-6">
                                    <small class="text-muted">Cantidad:</small>
                                    <p class="mb-1">${purchase.quantity || 1} ${purchase.unit || 'unidad'}</p>
                                </div>
                                <div class="col-6">
                                    <small class="text-muted">Proveedor:</small>
                                    <p class="mb-1">${this.escapeHtml(purchase.supplier || 'N/A')}</p>
                                </div>
                            </div>
                            ${purchase.notes ? `
                                <div class="mt-2">
                                    <small class="text-muted">Notas:</small>
                                    <p class="mb-1 small">${this.escapeHtml(purchase.notes)}</p>
                                </div>
                            ` : ''}
                        </div>
                        <div class="card-footer bg-transparent">
                            <button class="btn btn-outline-danger btn-sm" onclick="purchasesManager.deletePurchase('${purchaseId}')">
                                <i class="fas fa-trash me-1"></i>Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    showPurchaseForm() {
        const form = document.getElementById('purchase-form');
        if (form) {
            // ✅ CORREGIDO: Reset seguro del formulario
            this.app.resetForm(form);
            
            // Establecer fecha actual por defecto
            const today = new Date().toISOString().split('T')[0];
            const dateInput = form.querySelector('#purchase-purchaseDate');
            if (dateInput && !dateInput.value) {
                dateInput.value = today;
            }
            
            this.app.showModal('purchase-form-modal', 'Registrar Compra');
        }
    }

    async handlePurchaseSubmit(form) {
        try {
            this.app.showLoading(true);
            const formData = this.app.getFormData(form);

            console.log('📝 Datos del formulario de compra:', formData);

            // Validaciones
            if (!formData.itemName || !formData.totalCost) {
                this.app.showAlert('Nombre del item y costo total son obligatorios', 'warning');
                return;
            }

            if (parseFloat(formData.totalCost) <= 0) {
                this.app.showAlert('El costo total debe ser mayor a 0', 'warning');
                return;
            }

            // Preparar datos para la API
            const purchaseData = {
                itemName: formData.itemName,
                type: formData.type || 'supplies',
                quantity: formData.quantity ? parseInt(formData.quantity) : 1,
                unit: formData.unit || 'unidad',
                unitCost: formData.unitCost ? parseFloat(formData.unitCost) : 0,
                totalCost: parseFloat(formData.totalCost),
                purchaseDate: formData.purchaseDate || new Date().toISOString().split('T')[0],
                supplier: formData.supplier || '',
                notes: formData.notes || ''
            };

            console.log('🚀 Enviando a API:', purchaseData);

            const result = await this.app.apiCall('/purchases', {
                method: 'POST',
                body: purchaseData
            });

            console.log('✅ Respuesta de API:', result);

            this.app.showAlert('Compra registrada exitosamente', 'success');
            
            this.app.hideModal('purchase-form-modal');
            await this.loadPurchases();

        } catch (error) {
            console.error('❌ Error saving purchase:', error);
            this.app.showAlert('Error al registrar compra: ' + error.message, 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    async deletePurchase(purchaseId) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta compra?')) {
            return;
        }

        try {
            this.app.showLoading(true);
            await this.app.apiCall(`/purchases/${purchaseId}`, {
                method: 'DELETE'
            });
            
            this.app.showAlert('Compra eliminada exitosamente', 'success');
            await this.loadPurchases();
            
        } catch (error) {
            console.error('Error deleting purchase:', error);
            this.app.showAlert('Error al eliminar compra: ' + error.message, 'danger');
        } finally {
            this.app.showLoading(false);
        }
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
            'feed': 'Alimento',
            'tools': 'Herramientas',
            'other': 'Otro'
        };
        return texts[type] || type;
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
function initializePurchasesManager() {
    if (!window.purchasesManager || !window.purchasesManager.initialized) {
        window.purchasesManager = new PurchasesManager(window.app);
    }
}

document.addEventListener('DOMContentLoaded', initializePurchasesManager);
document.addEventListener('purchasesViewLoaded', initializePurchasesManager);