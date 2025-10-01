class FeedsManager {
    constructor(app) {
        this.app = app;
        this.init();
    }

    init() {
        this.app.setupFormHandler('feed-form', this.handleFeedSubmit.bind(this));
        document.addEventListener('feedsViewLoaded', () => this.loadFeeds());
    }

    async loadFeeds() {
        try {class FeedsManager {
    constructor() {
        this.currentEditId = null;
        this.init();
    }

    init() {
        console.log('🐑 FeedsManager inicializado');
        this.setupEventListeners();
        document.addEventListener('feedsViewLoaded', () => this.loadFeeds());
    }

    setupEventListeners() {
        // Formulario de alimentación
        const feedForm = document.getElementById('feed-form');
        if (feedForm) {
            feedForm.addEventListener('submit', (e) => this.handleFeedSubmit(e));
        }

        // Botones de acción
        document.addEventListener('click', (e) => {
            if (e.target.matches('.edit-feed-btn')) {
                this.editFeed(e.target.dataset.id);
            }
            if (e.target.matches('.delete-feed-btn')) {
                this.deleteFeed(e.target.dataset.id);
            }
        });

        // Filtros
        const filterForm = document.getElementById('filter-feeds-form');
        if (filterForm) {
            filterForm.addEventListener('submit', (e) => this.filterFeeds(e));
        }

        // Botón limpiar filtros
        const clearFiltersBtn = document.getElementById('clear-feed-filters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearFilters());
        }
    }

    async loadFeeds() {
        try {
            window.app.showLoading(true);
            const feeds = await window.app.apiCall('/feeds');
            this.renderFeeds(feeds);
            this.updateStats(feeds);
        } catch (error) {
            console.error('Error loading feeds:', error);
            window.app.showAlert('Error al cargar los registros de alimentación', 'danger');
        } finally {
            window.app.showLoading(false);
        }
    }

    renderFeeds(feeds) {
        const tbody = document.getElementById('feeds-tbody');
        if (!tbody) return;

        if (feeds.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-4">
                        <i class="fas fa-utensils fa-2x text-muted mb-2"></i>
                        <p class="text-muted">No hay registros de alimentación</p>
                        <button class="btn btn-primary" onclick="window.app.showModal('addFeedModal')">
                            <i class="fas fa-plus me-1"></i>Agregar Alimentación
                        </button>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = feeds.map(feed => `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <i class="fas fa-utensils text-warning me-2"></i>
                        <div>
                            <strong>${this.escapeHtml(feed.feedType)}</strong>
                            ${feed.animalEarTag ? `<br><small class="text-muted">Arete: ${this.escapeHtml(feed.animalEarTag)}</small>` : ''}
                        </div>
                    </div>
                </td>
                <td>${feed.quantity} ${feed.unit}</td>
                <td>
                    ${feed.animalName ? this.escapeHtml(feed.animalName) : 'General'}
                </td>
                <td>${window.app.formatDate(feed.feedingDate)}</td>
                <td>
                    <span class="badge bg-info">Registrado</span>
                </td>
                <td>${this.escapeHtml(feed.notes || 'Sin notas')}</td>
                <td>${window.app.formatDateTime(feed.createdAt)}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary edit-feed-btn" data-id="${feed.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger delete-feed-btn" data-id="${feed.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    updateStats(feeds) {
        // Actualizar estadísticas si existen en la UI
        const totalFeedsElement = document.getElementById('total-feeds');
        const todayFeedsElement = document.getElementById('today-feeds');
        
        if (totalFeedsElement) {
            totalFeedsElement.textContent = feeds.length;
        }

        if (todayFeedsElement) {
            const today = new Date().toDateString();
            const todayFeeds = feeds.filter(feed => {
                const feedDate = new Date(feed.feedingDate).toDateString();
                return feedDate === today;
            }).length;
            todayFeedsElement.textContent = todayFeeds;
        }
    }

    async handleFeedSubmit(e) {
        e.preventDefault();
        const form = e.target;
        
        try {
            window.app.showLoading(true);
            const formData = window.app.getFormData(form);

            // Validaciones
            if (!formData.feedType || !formData.quantity) {
                window.app.showAlert('Tipo y cantidad de alimento son obligatorios', 'warning');
                return;
            }

            if (this.currentEditId) {
                // Editar alimentación existente
                await window.app.apiCall(`/feeds/${this.currentEditId}`, {
                    method: 'PUT',
                    body: formData
                });
                window.app.showAlert('Alimentación actualizada exitosamente', 'success');
            } else {
                // Crear nueva alimentación
                await window.app.apiCall('/feeds', {
                    method: 'POST',
                    body: formData
                });
                window.app.showAlert('Alimentación registrada exitosamente', 'success');
            }

            // Cerrar modal y recargar datos
            window.app.hideModal('addFeedModal');
            this.currentEditId = null;
            window.app.resetForm(form);
            await this.loadFeeds();

        } catch (error) {
            console.error('Error saving feed:', error);
            window.app.showAlert('Error al guardar la alimentación: ' + error.message, 'danger');
        } finally {
            window.app.showLoading(false);
        }
    }

    async editFeed(feedId) {
        try {
            window.app.showLoading(true);
            const feed = await window.app.apiCall(`/feeds/${feedId}`);
            
            // Poblar formulario
            const form = document.getElementById('feed-form');
            window.app.populateForm(form, feed);
            
            // Configurar para edición
            this.currentEditId = feedId;
            const modalTitle = document.querySelector('#addFeedModal .modal-title');
            if (modalTitle) {
                modalTitle.textContent = 'Editar Alimentación';
            }
            
            // Mostrar modal
            window.app.showModal('addFeedModal');

        } catch (error) {
            console.error('Error loading feed for edit:', error);
            window.app.showAlert('Error al cargar la alimentación para editar', 'danger');
        } finally {
            window.app.showLoading(false);
        }
    }

    async deleteFeed(feedId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este registro de alimentación?')) {
            return;
        }

        try {
            window.app.showLoading(true);
            await window.app.apiCall(`/feeds/${feedId}`, {
                method: 'DELETE'
            });
            
            window.app.showAlert('Registro de alimentación eliminado exitosamente', 'success');
            await this.loadFeeds();

        } catch (error) {
            console.error('Error deleting feed:', error);
            window.app.showAlert('Error al eliminar el registro de alimentación', 'danger');
        } finally {
            window.app.showLoading(false);
        }
    }

    async filterFeeds(e) {
        e.preventDefault();
        // Implementar filtros si es necesario
        window.app.showAlert('Filtro aplicado', 'info');
    }

    clearFilters() {
        const filterForm = document.getElementById('filter-feeds-form');
        if (filterForm) {
            filterForm.reset();
        }
        this.loadFeeds();
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

    // Método para cargar animales en el select
    async loadAnimalsSelect() {
        try {
            const animals = await window.app.getActiveAnimals();
            const select = document.getElementById('feed-animal-id');
            if (select) {
                // Limpiar opciones excepto la primera
                while (select.options.length > 1) {
                    select.remove(1);
                }
                
                // Agregar animales
                animals.forEach(animal => {
                    const option = document.createElement('option');
                    option.value = animal.id;
                    option.textContent = `${animal.earTag} - ${animal.name}`;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading animals for select:', error);
        }
    }
}

// Inicialización
if (typeof window.feedsManager === 'undefined') {
    window.feedsManager = new FeedsManager();
}
            this.app.showLoading(true);
            const feeds = await this.app.apiCall('/api/feeds');
            this.renderFeeds(feeds);
        } catch (error) {
            console.error('Error loading feeds:', error);
        } finally {
            this.app.showLoading(false);
        }
    }

    renderFeeds(feeds) {
        const container = document.getElementById('feeds-list');
        if (!container) return;

        if (feeds.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    No hay registros de alimentación.
                </div>
            `;
            return;
        }

        container.innerHTML = feeds.map(feed => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-8">
                            <h5 class="card-title">
                                <i class="fas fa-utensils me-2"></i>${feed.feedType}
                            </h5>
                            <p class="card-text mb-1">
                                <strong>Cantidad:</strong> ${feed.quantity} ${feed.unit}
                            </p>
                            <p class="card-text mb-1">
                                <strong>Fecha:</strong> ${new Date(feed.feedingDate).toLocaleDateString()}
                            </p>
                            ${feed.animalEarTag ? `
                                <p class="card-text mb-1">
                                    <strong>Animal:</strong> ${feed.animalEarTag}
                                </p>
                            ` : ''}
                            ${feed.notes ? `
                                <p class="card-text">
                                    <strong>Notas:</strong> ${feed.notes}
                                </p>
                            ` : ''}
                        </div>
                        <div class="col-md-4 text-end">
                            <small class="text-muted">
                                ${new Date(feed.createdAt?.toDate?.() || feed.createdAt).toLocaleString()}
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async handleFeedSubmit(form) {
        try {
            this.app.showLoading(true);
            const formData = this.app.getFormData(form);
            
            await this.app.apiCall('/api/feeds', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            this.app.showAlert('Alimentación registrada exitosamente', 'success');
            this.app.resetForm(form);
            bootstrap.Modal.getInstance(form.closest('.modal')).hide();
            await this.loadFeeds();
            
        } catch (error) {
            console.error('Error saving feed:', error);
        } finally {
            this.app.showLoading(false);
        }
    }

    showFeedForm() {
        this.app.showModal('feed-form-modal', 'Registrar Alimentación');
    }
}

// Inicializar después de que App esté lista
document.addEventListener('DOMContentLoaded', () => {
    if (window.app) {
        window.feedsManager = new FeedsManager(window.app);
    }
});