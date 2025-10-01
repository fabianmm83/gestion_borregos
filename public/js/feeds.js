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
        try {
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