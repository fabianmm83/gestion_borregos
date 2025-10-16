class SalesManager {
    constructor(app) {
        this.app = app;
        this.sales = [];
        this.initialized = false; // ✅ NUEVO: Control de inicialización
        this.init();
    }

    init() {
        if (this.initialized) {
            console.log('⚠️ SalesManager ya estaba inicializado');
            return;
        }
        
        console.log('💰 SalesManager inicializado');
        this.setupEventListeners();
        this.initialized = true;
    }

    setupEventListeners() {
        // ✅ CORREGIDO: Usar el método del app para conexión única
        this.app.setupFormHandler('sale-form', (form) => this.handleSaleSubmit(form));

        document.addEventListener('salesViewLoaded', () => {
            this.loadSales();
        });
    }

    async loadSales() {
        try {
            console.log('🔄 Cargando ventas...');
            this.app.showLoading(true);
            
            const response = await this.app.apiCall('/sales');
            
            // ✅ CORREGIDO: Manejar diferentes formatos de respuesta
            let salesArray = [];
            
            if (Array.isArray(response)) {
                salesArray = response;
            } else if (response && Array.isArray(response.data)) {
                salesArray = response.data;
            } else if (response && Array.isArray(response.sales)) {
                salesArray = response.sales;
            } else if (response && response.data && Array.isArray(response.data.sales)) {
                salesArray = response.data.sales;
            } else {
                console.warn('⚠️ Formato de respuesta inesperado para ventas:', response);
                salesArray = [];
            }
            
            this.sales = salesArray;
            
            this.renderSales();
            this.updateSalesStats();
            console.log(`✅ ${this.sales.length} ventas cargadas`);
            
        } catch (error) {
            console.error('❌ Error loading sales:', error);
            this.app.showAlert('Error al cargar ventas: ' + error.message, 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    renderSales() {
        const container = document.getElementById('sales-list');
        if (!container) return;

        if (this.sales.length === 0) {
            container.innerHTML = this.getEmptyState();
            return;
        }

        container.innerHTML = this.sales.map(sale => {
            const saleId = sale.id || sale._id || '';
            const animalEarTag = sale.animalEarTag || 'N/A';
            
            return `
                <div class="col-md-6 mb-4">
                    <div class="card sale-card h-100">
                        <div class="card-header bg-warning text-dark">
                            <div class="d-flex justify-content-between align-items-center">
                                <h6 class="card-title mb-0">
                                    <i class="fas fa-dollar-sign me-1"></i>Venta #${saleId ? saleId.slice(-6) : 'N/A'}
                                </h6>
                                <span class="badge bg-success">${this.app.formatCurrency(sale.salePrice || 0)}</span>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-6">
                                    <small class="text-muted">Animal:</small>
                                    <p class="mb-1 fw-bold">${this.escapeHtml(sale.animalName || 'N/A')}</p>
                                    <small class="text-muted">Arete: ${this.escapeHtml(animalEarTag)}</small>
                                </div>
                                <div class="col-6">
                                    <small class="text-muted">Fecha:</small>
                                    <p class="mb-1">${this.app.formatDate(sale.saleDate)}</p>
                                </div>
                            </div>
                            ${sale.weightAtSale ? `
                                <div class="row mt-2">
                                    <div class="col-6">
                                        <small class="text-muted">Peso al vender:</small>
                                        <p class="mb-1">${sale.weightAtSale} kg</p>
                                    </div>
                                </div>
                            ` : ''}
                            ${sale.buyerName ? `
                                <div class="row mt-2">
                                    <div class="col-12">
                                        <small class="text-muted">Comprador:</small>
                                        <p class="mb-1">${this.escapeHtml(sale.buyerName)}</p>
                                        ${sale.buyerContact ? `<small class="text-muted">Contacto: ${this.escapeHtml(sale.buyerContact)}</small>` : ''}
                                    </div>
                                </div>
                            ` : ''}
                            ${sale.notes ? `
                                <div class="mt-2">
                                    <small class="text-muted">Notas:</small>
                                    <p class="mb-1 small">${this.escapeHtml(sale.notes)}</p>
                                </div>
                            ` : ''}
                        </div>
                        <div class="card-footer bg-transparent">
                            <button class="btn btn-outline-danger btn-sm" onclick="salesManager.deleteSale('${saleId}', '${animalEarTag}')">
                                <i class="fas fa-trash me-1"></i>Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateSalesStats() {
        const totalTransactions = this.sales.length;
        const totalIncome = this.sales.reduce((sum, sale) => sum + (sale.salePrice || 0), 0);

        if (document.getElementById('total-transactions')) {
            document.getElementById('total-transactions').textContent = totalTransactions;
        }
        if (document.getElementById('total-income')) {
            document.getElementById('total-income').textContent = this.app.formatCurrency(totalIncome);
        }
    }

    getEmptyState() {
        return `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                No hay ventas registradas.
                <button class="btn btn-primary btn-sm ms-2" onclick="salesManager.showSaleForm()">
                    <i class="fas fa-plus me-1"></i>Registrar Primera Venta
                </button>
            </div>
        `;
    }

    showSaleForm(animalEarTag = null) {
        const form = document.getElementById('sale-form');
        if (form) {
            // ✅ CORREGIDO: Reset seguro del formulario
            this.app.resetForm(form);
            
            if (animalEarTag) {
                document.getElementById('sale-animalEarTag').value = animalEarTag;
                // Opcional: buscar y cargar datos del animal automáticamente
                this.loadAnimalData(animalEarTag);
            }
            
            // Establecer fecha actual por defecto
            const today = new Date().toISOString().split('T')[0];
            const dateInput = form.querySelector('#sale-saleDate');
            if (dateInput && !dateInput.value) {
                dateInput.value = today;
            }
            
            this.app.showModal('sale-form-modal', 'Registrar Venta');
        }
    }

    async loadAnimalData(animalEarTag) {
        try {
            const animals = await this.app.apiCall('/animals');
            const animal = animals.find(a => a.earTag === animalEarTag);
            
            if (animal) {
                // Autocompletar nombre del animal si existe
                const animalNameInput = document.getElementById('sale-animalName');
                if (animalNameInput && !animalNameInput.value) {
                    animalNameInput.value = animal.name || `Borrego ${animalEarTag}`;
                }
                
                // Autocompletar peso si existe
                const weightInput = document.getElementById('sale-weightAtSale');
                if (weightInput && !weightInput.value && animal.weight) {
                    weightInput.value = animal.weight;
                }
            }
        } catch (error) {
            console.log('No se pudo cargar datos del animal:', error);
        }
    }

    async handleSaleSubmit(form) {
        try {
            this.app.showLoading(true);
            const formData = this.app.getFormData(form);

            console.log('📝 Datos del formulario de venta:', formData);

            // Validaciones
            if (!formData.animalEarTag || !formData.salePrice) {
                this.app.showAlert('Número de arete y precio de venta son obligatorios', 'warning');
                return;
            }

            if (parseFloat(formData.salePrice) <= 0) {
                this.app.showAlert('El precio de venta debe ser mayor a 0', 'warning');
                return;
            }

            // Preparar datos para la API
            const saleData = {
                animalEarTag: formData.animalEarTag,
                animalName: formData.animalName || '',
                saleDate: formData.saleDate || new Date().toISOString().split('T')[0],
                buyerName: formData.buyerName || '',
                buyerContact: formData.buyerContact || '',
                salePrice: parseFloat(formData.salePrice),
                weightAtSale: formData.weightAtSale ? parseFloat(formData.weightAtSale) : 0,
                notes: formData.notes || ''
            };

            console.log('🚀 Enviando a API:', saleData);

            // ✅ PRIMERO: Actualizar el estado del animal a "sold"
            try {
                await this.updateAnimalStatus(formData.animalEarTag, 'sold');
                console.log('✅ Estado del animal actualizado a "sold"');
            } catch (animalError) {
                console.error('Error actualizando estado del animal:', animalError);
                // Continuar con la venta aunque falle la actualización del estado
            }

            // ✅ SEGUNDO: Crear la venta
            const result = await this.app.apiCall('/sales', {
                method: 'POST',
                body: saleData
            });

            console.log('✅ Respuesta de API:', result);

            this.app.showAlert('Venta registrada exitosamente', 'success');
            
            this.app.hideModal('sale-form-modal');
            
            await this.loadSales();

            // Recargar animales para actualizar estados
            if (window.animalsManager) {
                window.animalsManager.loadAnimals();
            }

        } catch (error) {
            console.error('❌ Error saving sale:', error);
            this.app.showAlert('Error al registrar venta: ' + error.message, 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    async updateAnimalStatus(animalEarTag, status) {
        try {
            // Primero obtener el animal por earTag
            const animals = await this.app.apiCall('/animals');
            const animal = animals.find(a => a.earTag === animalEarTag);
            
            if (animal && animal.id) {
                await this.app.apiCall(`/animals/${animal.id}`, {
                    method: 'PUT',
                    body: { status: status }
                });
            }
        } catch (error) {
            console.error('Error updating animal status:', error);
            throw error;
        }
    }

    async deleteSale(saleId, animalEarTag = null) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta venta? El animal volverá a estar disponible.')) {
            return;
        }

        try {
            this.app.showLoading(true);
            
            // ✅ PRIMERO: Restaurar el estado del animal a "active"
            if (animalEarTag && animalEarTag !== 'N/A') {
                try {
                    await this.updateAnimalStatus(animalEarTag, 'active');
                    console.log('✅ Estado del animal restaurado a "active"');
                } catch (animalError) {
                    console.error('Error restaurando estado del animal:', animalError);
                    // Continuar con la eliminación aunque falle la actualización del estado
                }
            }
            
            // ✅ SEGUNDO: Eliminar la venta
            await this.app.apiCall(`/sales/${saleId}`, {
                method: 'DELETE'
            });
            
            this.app.showAlert('Venta eliminada exitosamente. El animal está disponible nuevamente.', 'success');
            await this.loadSales();
            
            // Recargar animales para actualizar estados
            if (window.animalsManager) {
                window.animalsManager.loadAnimals();
            }
            
        } catch (error) {
            console.error('Error deleting sale:', error);
            this.app.showAlert('Error al eliminar venta: ' + error.message, 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    // Método para vender un animal específico
    async sellAnimal(animalEarTag) {
        this.showSaleForm(animalEarTag);
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
function initializeSalesManager() {
    if (!window.salesManager || !window.salesManager.initialized) {
        window.salesManager = new SalesManager(window.app);
    }
}

document.addEventListener('DOMContentLoaded', initializeSalesManager);
document.addEventListener('salesViewLoaded', initializeSalesManager);