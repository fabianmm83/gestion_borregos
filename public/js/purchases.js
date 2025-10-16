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
    // ✅ CORREGIDO: Usar handlePurchaseSubmit (sin "Form")
    this.app.setupFormHandler('purchase-form', (form) => this.handlePurchaseSubmit(form));

    document.addEventListener('purchasesViewLoaded', () => {
        this.loadPurchases();
    });
}

    async loadPurchases() {
    try {
        console.log('🔄 Cargando compras desde API...');
        const response = await this.app.apiCall('/api/purchases');
        
        console.log('📋 Respuesta completa:', response);
        console.log('🔍 Estructura de data:', response.data); // ← NUEVO
        console.log('🔍 Keys de data:', response.data ? Object.keys(response.data) : 'No data'); // ← NUEVO
        
        // MANEJO MEJORADO DE FORMATOS DE RESPUESTA
        let purchases = [];
        
        if (Array.isArray(response)) {
            purchases = response;
        } else if (response.purchases && Array.isArray(response.purchases)) {
            purchases = response.purchases;
        } else if (response.data && Array.isArray(response.data)) {
            purchases = response.data;
        } else if (response.data && response.data.purchases && Array.isArray(response.data.purchases)) {
            purchases = response.data.purchases;
        } else if (response.data && Array.isArray(response.data.purchases)) {
            purchases = response.data.purchases;
        } else {
            console.warn('⚠️ Formato de respuesta inesperado para compras:', response);
            // INTENTAR ENCONTRAR EL ARRAY EN CUALQUIER LUGAR
            purchases = this.findPurchasesArray(response);
        }
        
        console.log(`🛒 Compras extraídas:`, purchases);
        this.purchases = purchases;
        console.log(`✅ ${purchases.length} compras cargadas`);
        this.renderPurchases();
        
    } catch (error) {
        console.error('Error loading purchases:', error);
        this.app.showAlert('Error al cargar compras: ' + error.message, 'danger');
    }
}

// NUEVO MÉTODO PARA BUSCAR EL ARRAY EN CUALQUIER LUGAR
findPurchasesArray(obj) {
    if (!obj || typeof obj !== 'object') return [];
    
    // Buscar recursivamente un array que contenga compras
    for (let key in obj) {
        if (Array.isArray(obj[key])) {
            console.log(`🔍 Encontrado array en key: ${key}`, obj[key]);
            // Verificar si parece ser un array de compras
            if (obj[key].length > 0 && obj[key][0].itemName !== undefined) {
                return obj[key];
            }
        } else if (typeof obj[key] === 'object') {
            const found = this.findPurchasesArray(obj[key]);
            if (found.length > 0) return found;
        }
    }
    return [];
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

    

    
    async handlePurchaseSubmit(formElement) {
    try {
        // ✅ EXTRAER DATOS del formulario
        const formData = new FormData(formElement);
        const data = Object.fromEntries(formData.entries());
        
        console.log('📝 Datos del formulario de compra:', data);
        
        // Asegurar que los campos numéricos sean números
        const purchaseData = {
            type: data.type,
            itemName: data.itemName,
            quantity: parseFloat(data.quantity) || 0,
            unit: data.unit || 'unidad',
            unitCost: data.unitCost ? parseFloat(data.unitCost) : 0,
            totalCost: parseFloat(data.totalCost) || 0,
            purchaseDate: data.purchaseDate,
            supplier: data.supplier || '',
            notes: data.notes || ''
        };

        console.log('📦 Enviando compra:', purchaseData);
        
        const response = await this.app.apiCall('/api/purchases', 'POST', purchaseData);
        console.log('✅ Compra registrada:', response);
        
        // Cerrar modal y recargar lista
        bootstrap.Modal.getInstance(document.getElementById('purchase-form-modal')).hide();
        await this.loadPurchases();
        
        this.app.showAlert('Compra registrada exitosamente', 'success');
        
    } catch (error) {
        console.error('❌ Error registrando compra:', error);
        this.app.showAlert('Error al registrar compra: ' + error.message, 'danger');
    }
}
    async deletePurchase(purchaseId) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta compra?')) {
        return;
    }

    try {
        this.app.showLoading(true);
        await this.app.apiCall(`/api/purchases/${purchaseId}`, 'DELETE');
        
        // ✅ CORREGIDO: Usar showAlert
        this.app.showAlert('Compra eliminada exitosamente', 'success');
        await this.loadPurchases();
        
    } catch (error) {
        console.error('Error deleting purchase:', error);
        // ✅ CORREGIDO: Usar showAlert
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