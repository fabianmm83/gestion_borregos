class AnimalsManager {
    constructor(app) {
        this.app = app;
        this.currentEditId = null;
        this.init();
    }

    init() {
        console.log('🐑 AnimalsManager inicializado');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Formulario de animal
        const animalForm = document.getElementById('animal-form');
        if (animalForm) {
            animalForm.addEventListener('submit', (e) => this.handleAnimalSubmit(e));
        }
    }

    async loadAnimals() {
        try {
            this.app.showLoading(true);
            // Simular datos para demo - reemplazar con API real
            const animals = [
                {
                    id: 1,
                    name: "Borrego 1",
                    earTag: "A001",
                    breed: "Katahdin",
                    weight: 45.5,
                    gender: "male",
                    birthDate: "2023-05-15",
                    status: "active",
                    notes: "Primer borrego"
                }
            ];
            this.renderAnimals(animals);
        } catch (error) {
            console.error('Error loading animals:', error);
            this.app.showAlert('Error al cargar los animales', 'danger');
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
                </div>
            `;
            return;
        }

        container.innerHTML = animals.map(animal => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-8">
                            <h5 class="card-title">
                                <i class="fas fa-sheep me-2"></i>${this.escapeHtml(animal.name)}
                            </h5>
                            <p class="card-text mb-1">
                                <strong>Arete:</strong> ${this.escapeHtml(animal.earTag)}
                            </p>
                            <p class="card-text mb-1">
                                <strong>Raza:</strong> ${this.escapeHtml(animal.breed)}
                            </p>
                            <p class="card-text mb-1">
                                <strong>Peso:</strong> ${animal.weight} kg
                            </p>
                            <p class="card-text mb-1">
                                <strong>Género:</strong> ${this.getGenderText(animal.gender)}
                            </p>
                            ${animal.birthDate ? `
                                <p class="card-text mb-1">
                                    <strong>Nacimiento:</strong> ${new Date(animal.birthDate).toLocaleDateString()}
                                </p>
                            ` : ''}
                            ${animal.notes ? `
                                <p class="card-text">
                                    <strong>Notas:</strong> ${animal.notes}
                                </p>
                            ` : ''}
                        </div>
                        <div class="col-md-4 text-end">
                            <span class="badge ${this.getStatusBadge(animal.status)}">
                                ${this.getStatusText(animal.status)}
                            </span>
                            <div class="mt-2">
                                <button class="btn btn-sm btn-outline-primary edit-animal-btn" data-id="${animal.id}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger delete-animal-btn" data-id="${animal.id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Agregar event listeners a los botones
        this.attachAnimalEventListeners();
    }

    attachAnimalEventListeners() {
        document.querySelectorAll('.edit-animal-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.editAnimal(e.target.closest('button').dataset.id);
            });
        });

        document.querySelectorAll('.delete-animal-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.deleteAnimal(e.target.closest('button').dataset.id);
            });
        });
    }

    async handleAnimalSubmit(e) {
        e.preventDefault();
        const form = e.target;
        
        try {
            this.app.showLoading(true);
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);

            // Validaciones básicas
            if (!data.earTag || !data.breed) {
                this.app.showAlert('Número de arete y raza son obligatorios', 'warning');
                return;
            }

            // Simular guardado - reemplazar con API real
            console.log('Guardando animal:', data);
            
            this.app.showAlert('Animal guardado exitosamente', 'success');
            
            // Cerrar modal y recargar
            const modal = bootstrap.Modal.getInstance(document.getElementById('animal-form-modal'));
            modal.hide();
            form.reset();
            await this.loadAnimals();

        } catch (error) {
            console.error('Error saving animal:', error);
            this.app.showAlert('Error al guardar el animal', 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    async editAnimal(animalId) {
        try {
            this.app.showLoading(true);
            // Simular carga de animal - reemplazar con API real
            const animal = {
                id: animalId,
                name: "Borrego 1",
                earTag: "A001",
                breed: "Katahdin",
                weight: 45.5,
                gender: "male",
                birthDate: "2023-05-15",
                notes: "Primer borrego"
            };
            
            // Poblar formulario
            const form = document.getElementById('animal-form');
            Object.keys(animal).forEach(key => {
                const input = form.querySelector(`[name="${key}"]`);
                if (input) input.value = animal[key] || '';
            });
            
            this.currentEditId = animalId;
            
            // Mostrar modal
            const modal = new bootstrap.Modal(document.getElementById('animal-form-modal'));
            modal.show();

        } catch (error) {
            console.error('Error loading animal for edit:', error);
            this.app.showAlert('Error al cargar el animal', 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    async deleteAnimal(animalId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este animal?')) {
            return;
        }

        try {
            this.app.showLoading(true);
            // Simular eliminación - reemplazar con API real
            console.log('Eliminando animal:', animalId);
            
            this.app.showAlert('Animal eliminado exitosamente', 'success');
            await this.loadAnimals();

        } catch (error) {
            console.error('Error deleting animal:', error);
            this.app.showAlert('Error al eliminar el animal', 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    filterAnimals() {
        const searchTerm = document.getElementById('animal-search').value.toLowerCase();
        const statusFilter = document.getElementById('animal-status-filter').value;
        
        const cards = document.querySelectorAll('#animals-list .card');
        cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            const status = card.querySelector('.badge').textContent.toLowerCase();
            
            const matchesSearch = text.includes(searchTerm);
            const matchesStatus = !statusFilter || status.includes(statusFilter);
            
            card.style.display = matchesSearch && matchesStatus ? 'block' : 'none';
        });
    }

    showAnimalForm() {
        this.currentEditId = null;
        const form = document.getElementById('animal-form');
        form.reset();
        const modal = new bootstrap.Modal(document.getElementById('animal-form-modal'));
        modal.show();
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

    getGenderText(gender) {
        const texts = {
            'male': 'Macho',
            'female': 'Hembra',
            'unknown': 'Desconocido'
        };
        return texts[gender] || gender;
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
        window.animalsManager = new AnimalsManager(window.app);
    }
});