class AnimalsManager {
    constructor(app) {
        this.app = app;
        this.init();
    }

    init() {
        this.app.setupFormHandler('animal-form', this.handleAnimalSubmit.bind(this));
    }

    async loadAnimals() {
        try {
            this.app.showLoading(true);
            const animals = await this.app.apiCall('/api/animals');
            this.renderAnimals(animals);
        } catch (error) {
            console.error('Error loading animals:', error);
        } finally {
            this.app.showLoading(false);
        }
    }

    renderAnimals(animals) {
        const container = document.getElementById('animals-list');
        if (!container) return;

        if (animals.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    No hay animales registrados. 
                    <a href="#" class="alert-link" onclick="app.showAnimalForm()">Agregar el primero</a>
                </div>
            `;
            return;
        }

        container.innerHTML = animals.map(animal => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-8">
                            <h5 class="card-title">${animal.name}</h5>
                            <p class="card-text mb-1">
                                <strong>Arete:</strong> ${animal.earTag} | 
                                <strong>Raza:</strong> ${animal.breed} |
                                <strong>Peso:</strong> ${animal.weight} kg
                            </p>
                            <p class="card-text mb-1">
                                <strong>Estado:</strong> 
                                <span class="badge ${this.getStatusBadge(animal.status)}">
                                    ${this.getStatusText(animal.status)}
                                </span>
                            </p>
                        </div>
                        <div class="col-md-4 text-end">
                            <button class="btn btn-outline-primary btn-sm" onclick="animalsManager.editAnimal('${animal.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="animalsManager.deleteAnimal('${animal.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async handleAnimalSubmit(form) {
        try {
            this.app.showLoading(true);
            const formData = this.app.getFormData(form);
            
            if (form.dataset.editId) {
                // Editar animal existente
                await this.app.apiCall(`/api/animals/${form.dataset.editId}`, {
                    method: 'PUT',
                    body: JSON.stringify(formData)
                });
                this.app.showAlert('Animal actualizado exitosamente', 'success');
            } else {
                // Crear nuevo animal
                await this.app.apiCall('/api/animals', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
                this.app.showAlert('Animal agregado exitosamente', 'success');
            }

            this.app.resetForm(form);
            bootstrap.Modal.getInstance(form.closest('.modal')).hide();
            await this.loadAnimals();
            
        } catch (error) {
            console.error('Error saving animal:', error);
        } finally {
            this.app.showLoading(false);
        }
    }

    getStatusBadge(status) {
        const badges = {
            'active': 'bg-success',
            'sold': 'bg-warning',
            'deceased': 'bg-danger',
            'inactive': 'bg-secondary'
        };
        return badges[status] || 'bg-secondary';
    }

    getStatusText(status) {
        const texts = {
            'active': 'Activo',
            'sold': 'Vendido',
            'deceased': 'Fallecido',
            'inactive': 'Inactivo'
        };
        return texts[status] || status;
    }
}

// Inicializar después de que App esté lista
document.addEventListener('DOMContentLoaded', () => {
    if (window.app) {
        window.animalsManager = new AnimalsManager(window.app);
    }
});