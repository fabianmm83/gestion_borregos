class FeedsManager {
    constructor(app) {
        this.app = app;
        this.init();
    }

    init() {
        console.log('🥕 FeedsManager inicializado');
        this.setupEventListeners();
    }

    setupEventListeners() {
        const feedForm = document.getElementById('feed-form');
        if (feedForm) {
            feedForm.addEventListener('submit', (e) => this.handleFeedSubmit(e));
        }
    }

    async loadFeeds() {
        try {
            this.app.showLoading(true);
            // Simular datos para demo
            const feeds = [
                {
                    id: 1,
                    feedType: "Alfalfa",
                    quantity: 10,
                    unit: "kg",
                    animalEarTag: "A001",
                    feedingDate: "2024-01-15",
                    notes: "Alimentación matutina"
                }
            ];
            this.renderFeeds(feeds);
        } catch (error) {
            console.error('Error loading feeds:', error);
            this.app.showAlert('Error al cargar los registros de alimentación', 'danger');
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
                                <i class="fas fa-utensils me-2"></i>${this.escapeHtml(feed.feedType)}
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
                                ${new Date().toLocaleString()}
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async handleFeedSubmit(e) {
        e.preventDefault();
        const form = e.target;
        
        try {
            this.app.showLoading(true);
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            if (!data.feedType || !data.quantity) {
                this.app.showAlert('Tipo y cantidad de alimento son obligatorios', 'warning');
                return;
            }

            // Simular guardado
            console.log('Guardando alimentación:', data);
            
            this.app.showAlert('Alimentación registrada exitosamente', 'success');
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('feed-form-modal'));
            modal.hide();
            form.reset();
            await this.loadFeeds();

        } catch (error) {
            console.error('Error saving feed:', error);
            this.app.showAlert('Error al guardar la alimentación', 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    showFeedForm() {
        const form = document.getElementById('feed-form');
        form.reset();
        const modal = new bootstrap.Modal(document.getElementById('feed-form-modal'));
        modal.show();
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
        window.feedsManager = new FeedsManager(window.app);
    }
});