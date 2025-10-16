class FeedsManager {
    constructor(app) {
        this.app = app;
        this.feeds = [];
        this.currentEditId = null;
        this.initialized = false;
        this.init();
    }

    init() {
        if (this.initialized) {
            console.log('⚠️ FeedsManager ya estaba inicializado');
            return;
        }
        
        console.log('🥕 FeedsManager inicializado');
        this.setupEventListeners();
        this.initialized = true;
    }

    setupEventListeners() {
        // ✅ CORREGIDO: Usar el método del app para conexión única
        this.app.setupFormHandler('feed-form', (form) => this.handleFeedSubmit(form));

        document.addEventListener('feedsViewLoaded', () => {
            this.loadFeeds();
        });
    }

    async loadFeeds() {
        try {
            this.app.showLoading(true);
            console.log('🔄 Cargando alimentación desde API...');
            
            const response = await this.app.apiCall('/feeds');
            
            // ✅ CORREGIDO: Manejar diferentes formatos de respuesta
            let feedsArray = [];
            
            if (Array.isArray(response)) {
                feedsArray = response;
            } else if (response && Array.isArray(response.data)) {
                feedsArray = response.data;
            } else if (response && Array.isArray(response.feeds)) {
                feedsArray = response.feeds;
            } else if (response && response.data && Array.isArray(response.data.feeds)) {
                feedsArray = response.data.feeds;
            } else {
                console.warn('⚠️ Formato de respuesta inesperado para alimentación:', response);
                feedsArray = [];
            }
            
            this.feeds = feedsArray;
            this.renderFeeds();
            console.log(`✅ ${this.feeds.length} registros de alimentación cargados`);
            
        } catch (error) {
            console.error('Error loading feeds:', error);
            
            // Mostrar datos de demo si la API falla
            if (error.message.includes('404') || error.message.includes('500')) {
                this.app.showAlert('Usando datos de demostración', 'info');
                const demoFeeds = this.getDemoFeeds();
                this.renderFeeds(demoFeeds);
            } else {
                this.app.showAlert('Error al cargar los registros de alimentación: ' + error.message, 'danger');
                this.renderFeeds([]);
            }
        } finally {
            this.app.showLoading(false);
        }
    }
    
    getDemoFeeds() {
        return [
            {
                id: "demo-1",
                feedType: "Alfalfa",
                quantity: 50,
                unit: "kg",
                batchNumber: "LOTE-001",
                feedingDate: new Date().toISOString().split('T')[0],
                notes: "Lote nuevo de alfalfa premium"
            },
            {
                id: "demo-2", 
                feedType: "Maíz molido",
                quantity: 100,
                unit: "kg", 
                batchNumber: "LOTE-002",
                feedingDate: new Date().toISOString().split('T')[0],
                notes: "Mezcla para engorda"
            }
        ];
    }

    renderFeeds(feeds = this.feeds) {
        const container = document.getElementById('feeds-list');
        if (!container) return;

        if (!feeds || feeds.length === 0) {
            container.innerHTML = this.getEmptyState();
            return;
        }

        container.innerHTML = feeds.map(feed => {
            const feedId = feed.id || feed._id || '';
            
            return `
                <div class="col-md-6 mb-4">
                    <div class="card feed-card h-100" data-id="${feedId}">
                        <div class="card-header bg-success text-white">
                            <div class="d-flex justify-content-between align-items-center">
                                <h6 class="card-title mb-0">
                                    <i class="fas fa-utensils me-1"></i>${this.escapeHtml(feed.feedType)}
                                </h6>
                                <span class="badge bg-warning">${feed.quantity} ${feed.unit}</span>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-6">
                                    <small class="text-muted">Lote:</small>
                                    <p class="mb-1 fw-bold">${this.escapeHtml(feed.batchNumber || 'N/A')}</p>
                                </div>
                                <div class="col-6">
                                    <small class="text-muted">Fecha:</small>
                                    <p class="mb-1">${this.app.formatDate(feed.feedingDate)}</p>
                                </div>
                            </div>
                            ${feed.notes ? `
                                <div class="mt-2">
                                    <small class="text-muted">Notas:</small>
                                    <p class="mb-1 small">${this.escapeHtml(feed.notes)}</p>
                                </div>
                            ` : ''}
                        </div>
                        <div class="card-footer bg-transparent">
                            <div class="btn-group w-100">
                                <button class="btn btn-outline-primary btn-sm" onclick="feedsManager.editFeed('${feedId}')">
                                    <i class="fas fa-edit me-1"></i>Editar
                                </button>
                                <button class="btn btn-outline-danger btn-sm" onclick="feedsManager.deleteFeed('${feedId}')">
                                    <i class="fas fa-trash me-1"></i>Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    showFeedForm(feedId = null) {
        this.currentEditId = feedId;
        const form = document.getElementById('feed-form');
        
        if (form) {
            // ✅ CORREGIDO: Reset seguro del formulario
            this.app.resetForm(form);
            
            // Si es edición, cargar datos
            if (feedId) {
                const feed = this.feeds.find(f => (f.id === feedId || f._id === feedId));
                if (feed) {
                    this.app.populateForm(form, feed);
                }
            } else {
                // Establecer fecha actual por defecto para nuevo registro
                const today = new Date().toISOString().split('T')[0];
                const dateInput = form.querySelector('#feed-feedingDate');
                if (dateInput && !dateInput.value) {
                    dateInput.value = today;
                }
                
                // Generar número de lote automático para nuevo registro
                const batchInput = form.querySelector('#feed-batchNumber');
                if (batchInput && !batchInput.value) {
                    const batchNumber = `LOTE-${new Date().getTime().toString().slice(-6)}`;
                    batchInput.value = batchNumber;
                }
            }
            
            const modalTitle = feedId ? 'Editar Alimento' : 'Registrar Nuevo Lote';
            this.app.showModal('feed-form-modal', modalTitle);
        }
    }

    async handleFeedSubmit(form) {
        try {
            this.app.showLoading(true);
            const formData = this.app.getFormData(form);

            console.log('📝 Datos del formulario de alimentación:', formData);

            // Validaciones
            if (!formData.feedType || !formData.quantity || !formData.batchNumber) {
                this.app.showAlert('Tipo, cantidad y número de lote son obligatorios', 'warning');
                return;
            }

            if (parseFloat(formData.quantity) <= 0) {
                this.app.showAlert('La cantidad debe ser mayor a 0', 'warning');
                return;
            }

            // Preparar datos para la API
            const feedData = {
                feedType: formData.feedType,
                quantity: parseFloat(formData.quantity),
                unit: formData.unit || 'kg',
                batchNumber: formData.batchNumber,
                feedingDate: formData.feedingDate || new Date().toISOString().split('T')[0],
                notes: formData.notes || ''
            };

            console.log('🚀 Enviando a API:', feedData);

            let result;
            if (this.currentEditId) {
                // ✅ EDITAR: Usar PUT para actualizar
                result = await this.app.apiCall(`/feeds/${this.currentEditId}`, {
                    method: 'PUT',
                    body: feedData
                });
                
                // ✅ ACTUALIZAR LOCALMENTE sin recargar toda la lista
                this.updateLocalFeed(this.currentEditId, feedData);
            } else {
                // ✅ CREAR: Usar POST para nuevo registro
                result = await this.app.apiCall('/feeds', {
                    method: 'POST',
                    body: feedData
                });
                
                // ✅ AGREGAR LOCALMENTE sin recargar toda la lista
                this.addLocalFeed(result.data);
            }

            console.log('✅ Respuesta de API:', result);

            this.app.showAlert(
                this.currentEditId ? 'Alimento actualizado exitosamente' : 'Lote de alimento registrado exitosamente', 
                'success'
            );
            
            this.app.hideModal('feed-form-modal');
            this.currentEditId = null;

        } catch (error) {
            console.error('❌ Error saving feed:', error);
            this.app.showAlert('Error al guardar la alimentación: ' + error.message, 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    // ✅ NUEVO MÉTODO: Actualizar feed localmente
    updateLocalFeed(feedId, newData) {
        const container = document.getElementById('feeds-list');
        if (!container) return;

        const feedCard = container.querySelector(`[data-id="${feedId}"]`);
        if (feedCard) {
            // Actualizar la tarjeta existente con los nuevos datos
            const titleElement = feedCard.querySelector('.card-title');
            const quantityBadge = feedCard.querySelector('.badge');
            const batchElement = feedCard.querySelector('.fw-bold');
            const dateElement = feedCard.querySelector('.col-6:nth-child(2) p');
            const notesElement = feedCard.querySelector('.small');

            if (titleElement) {
                titleElement.innerHTML = `<i class="fas fa-utensils me-1"></i>${this.escapeHtml(newData.feedType)}`;
            }
            
            if (quantityBadge) {
                quantityBadge.textContent = `${newData.quantity} ${newData.unit}`;
            }
            
            if (batchElement) {
                batchElement.textContent = this.escapeHtml(newData.batchNumber || 'N/A');
            }
            
            if (dateElement) {
                dateElement.textContent = this.app.formatDate(newData.feedingDate);
            }
            
            if (notesElement && newData.notes) {
                notesElement.textContent = this.escapeHtml(newData.notes);
            } else if (notesElement && !newData.notes) {
                notesElement.closest('.mt-2').style.display = 'none';
            }
            
            console.log('✅ Feed actualizado localmente:', feedId);
        }
    }

    // ✅ NUEVO MÉTODO: Agregar feed localmente
    addLocalFeed(newFeed) {
        const container = document.getElementById('feeds-list');
        if (!container) return;

        // Si el container está vacío, limpiar el mensaje de "no hay registros"
        if (container.querySelector('.alert-info')) {
            container.innerHTML = '';
        }

        const feedId = newFeed.id || newFeed._id || '';
        
        const newFeedHTML = `
            <div class="col-md-6 mb-4">
                <div class="card feed-card h-100" data-id="${feedId}">
                    <div class="card-header bg-success text-white">
                        <div class="d-flex justify-content-between align-items-center">
                            <h6 class="card-title mb-0">
                                <i class="fas fa-utensils me-1"></i>${this.escapeHtml(newFeed.feedType)}
                            </h6>
                            <span class="badge bg-warning">${newFeed.quantity} ${newFeed.unit}</span>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-6">
                                <small class="text-muted">Lote:</small>
                                <p class="mb-1 fw-bold">${this.escapeHtml(newFeed.batchNumber || 'N/A')}</p>
                            </div>
                            <div class="col-6">
                                <small class="text-muted">Fecha:</small>
                                <p class="mb-1">${this.app.formatDate(newFeed.feedingDate)}</p>
                            </div>
                        </div>
                        ${newFeed.notes ? `
                            <div class="mt-2">
                                <small class="text-muted">Notas:</small>
                                <p class="mb-1 small">${this.escapeHtml(newFeed.notes)}</p>
                            </div>
                        ` : ''}
                    </div>
                    <div class="card-footer bg-transparent">
                        <div class="btn-group w-100">
                            <button class="btn btn-outline-primary btn-sm" onclick="feedsManager.editFeed('${feedId}')">
                                <i class="fas fa-edit me-1"></i>Editar
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="feedsManager.deleteFeed('${feedId}')">
                                <i class="fas fa-trash me-1"></i>Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Agregar el nuevo feed al principio de la lista
        container.insertAdjacentHTML('afterbegin', newFeedHTML);
        
        console.log('✅ Feed agregado localmente:', feedId);
    }

    async editFeed(feedId) {
        this.showFeedForm(feedId);
    }

    async deleteFeed(feedId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este registro de alimento?')) {
            return;
        }

        try {
            this.app.showLoading(true);
            
            // ✅ ELIMINACIÓN REAL: Usar el endpoint DELETE
            await this.app.apiCall(`/feeds/${feedId}`, {
                method: 'DELETE'
            });
            
            // ✅ ELIMINAR LOCALMENTE sin recargar toda la lista
            this.removeLocalFeed(feedId);
            
            this.app.showAlert('Registro de alimento eliminado exitosamente', 'success');

        } catch (error) {
            console.error('Error deleting feed:', error);
            this.app.showAlert('Error al eliminar el registro: ' + error.message, 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    // ✅ NUEVO MÉTODO: Eliminar feed localmente
    removeLocalFeed(feedId) {
        const container = document.getElementById('feeds-list');
        if (!container) return;

        const feedCard = container.querySelector(`[data-id="${feedId}"]`);
        if (feedCard) {
            feedCard.remove();
            console.log('✅ Feed eliminado localmente:', feedId);
            
            // Si no quedan feeds, mostrar estado vacío
            if (container.children.length === 0) {
                container.innerHTML = this.getEmptyState();
            }
        }
    }

    getEmptyState() {
        return `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                No hay registros de alimentación.
                <button class="btn btn-primary btn-sm ms-2" onclick="feedsManager.showFeedForm()">
                    <i class="fas fa-plus me-1"></i>Registrar Primer Lote
                </button>
            </div>
        `;
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
function initializeFeedsManager() {
    if (!window.feedsManager || !window.feedsManager.initialized) {
        window.feedsManager = new FeedsManager(window.app);
    }
}

document.addEventListener('DOMContentLoaded', initializeFeedsManager);
document.addEventListener('feedsViewLoaded', initializeFeedsManager);