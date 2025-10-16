class AnimalsManager {
    constructor() {
        this.animals = [];
        this.filteredAnimals = [];
        this.currentEditId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Formulario de animales
        const animalForm = document.getElementById('animal-form');
        if (animalForm) {
            animalForm.addEventListener('submit', (e) => this.handleAnimalSubmit(e));
        }

        // Eventos para cuando se carga la vista de animales
        document.addEventListener('animalsViewLoaded', () => {
            this.loadAnimals();
        });
    }

    async loadAnimals() {
        try {
            console.log('🔄 Cargando animales...');
            app.showLoading(true);
            
            const response = await app.apiCall('/animals');
            // CORRECCIÓN: La respuesta viene en response.data.animals
            this.animals = response.data?.animals || [];
            this.filteredAnimals = [...this.animals];
            
            this.renderAnimals();
            console.log(`✅ ${this.animals.length} animales cargados`);
            
        } catch (error) {
            console.error('❌ Error loading animals:', error);
            app.showAlert('Error al cargar animales: ' + error.message, 'danger');
        } finally {
            app.showLoading(false);
        }
    }

    renderAnimals() {
        const container = document.getElementById('animals-list');
        if (!container) return;

        if (this.filteredAnimals.length === 0) {
            container.innerHTML = app.createEmptyState(
                'No hay animales registrados', 
                'sheep', 
                { onclick: 'animalsManager.showAnimalForm()', label: 'Agregar Primer Animal' }
            );
            return;
        }

        container.innerHTML = this.filteredAnimals.map(animal => `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card animal-card h-100">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h6 class="card-title mb-0">
                            <i class="fas fa-sheep me-1"></i>${animal.name || `Borrego ${animal.earTag}`}
                        </h6>
                        <span class="badge ${this.getStatusBadgeClass(animal.status)}">
                            ${this.getStatusText(animal.status)}
                        </span>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-6">
                                <small class="text-muted">Arete:</small>
                                <p class="mb-1 fw-bold">${animal.earTag}</p>
                            </div>
                            <div class="col-6">
                                <small class="text-muted">Raza:</small>
                                <p class="mb-1">${animal.breed}</p>
                            </div>
                        </div>
                        <div class="row mt-2">
                            <div class="col-6">
                                <small class="text-muted">Género:</small>
                                <p class="mb-1">${this.getGenderText(animal.gender)}</p>
                            </div>
                            <div class="col-6">
                                <small class="text-muted">Peso:</small>
                                <p class="mb-1">${animal.weight || 0} kg</p>
                            </div>
                        </div>
                        ${animal.birthDate ? `
                            <div class="row mt-2">
                                <div class="col-12">
                                    <small class="text-muted">Nacimiento:</small>
                                    <p class="mb-1">${app.formatDate(animal.birthDate)}</p>
                                </div>
                            </div>
                        ` : ''}
                        ${animal.notes ? `
                            <div class="mt-2">
                                <small class="text-muted">Notas:</small>
                                <p class="mb-1 small">${animal.notes}</p>
                            </div>
                        ` : ''}
                    </div>
                    <div class="card-footer bg-transparent">
                        <div class="btn-group w-100">
                            <button class="btn btn-outline-primary btn-sm" onclick="animalsManager.editAnimal('${animal.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            ${animal.status === 'active' ? `
                                <button class="btn btn-outline-warning btn-sm" onclick="salesManager.sellAnimal('${animal.earTag}')">
                                    <i class="fas fa-dollar-sign"></i>
                                </button>
                            ` : ''}
                            <button class="btn btn-outline-danger btn-sm" onclick="animalsManager.deleteAnimal('${animal.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    getStatusBadgeClass(status) {
        const classes = {
            'active': 'bg-success',
            'sold': 'bg-warning',
            'deceased': 'bg-danger',
            'transferred': 'bg-info'
        };
        return classes[status] || 'bg-secondary';
    }

    getStatusText(status) {
        const texts = {
            'active': 'Activo',
            'sold': 'Vendido',
            'deceased': 'Fallecido',
            'transferred': 'Transferido'
        };
        return texts[status] || 'Desconocido';
    }

    getGenderText(gender) {
        const texts = {
            'male': 'Macho',
            'female': 'Hembra',
            'unknown': 'Desconocido'
        };
        return texts[gender] || 'Desconocido';
    }

    showAnimalForm(animalId = null) {
        this.currentEditId = animalId;
        const modalTitle = animalId ? 'Editar Animal' : 'Agregar Animal';
        
        // Resetear formulario
        const form = document.getElementById('animal-form');
        form.reset();
        document.getElementById('animal-photo-preview').style.display = 'none';
        
        // Si es edición, cargar datos
        if (animalId) {
            const animal = this.animals.find(a => a.id === animalId);
            if (animal) {
                app.populateForm(form, animal);
            }
        }
        
        app.showModal('animal-form-modal', modalTitle);
    }

    async handleAnimalSubmit(e) {
        e.preventDefault();
        
        try {
            app.showLoading(true);
            const form = e.target;
            const formData = app.getFormData(form);
            
            // Validaciones
            if (!formData.earTag || !formData.breed) {
                app.showAlert('Número de arete y raza son obligatorios', 'warning');
                return;
            }

            let response;
            if (this.currentEditId) {
                // Actualizar animal existente
                response = await app.apiCall(`/animals/${this.currentEditId}`, {
                    method: 'PUT',
                    body: formData
                });
                app.showAlert('Animal actualizado exitosamente', 'success');
            } else {
                // Crear nuevo animal
                response = await app.apiCall('/animals', {
                    method: 'POST',
                    body: formData
                });
                app.showAlert('Animal agregado exitosamente', 'success');
            }

            // Cerrar modal y recargar lista
            app.hideModal('animal-form-modal');
            this.loadAnimals();
            
        } catch (error) {
            console.error('Error saving animal:', error);
            app.showAlert('Error al guardar animal: ' + error.message, 'danger');
        } finally {
            app.showLoading(false);
        }
    }

    async editAnimal(animalId) {
        this.showAnimalForm(animalId);
    }

    async deleteAnimal(animalId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este animal?')) {
            return;
        }

        try {
            app.showLoading(true);
            await app.apiCall(`/animals/${animalId}`, {
                method: 'DELETE'
            });
            
            app.showAlert('Animal eliminado exitosamente', 'success');
            this.loadAnimals();
            
        } catch (error) {
            console.error('Error deleting animal:', error);
            app.showAlert('Error al eliminar animal: ' + error.message, 'danger');
        } finally {
            app.showLoading(false);
        }
    }

    filterAnimals() {
        const searchTerm = document.getElementById('animal-search').value.toLowerCase();
        const statusFilter = document.getElementById('animal-status-filter').value;
        
        this.filteredAnimals = this.animals.filter(animal => {
            const matchesSearch = !searchTerm || 
                animal.name?.toLowerCase().includes(searchTerm) ||
                animal.earTag?.toLowerCase().includes(searchTerm) ||
                animal.breed?.toLowerCase().includes(searchTerm);
            
            const matchesStatus = !statusFilter || animal.status === statusFilter;
            
            return matchesSearch && matchesStatus;
        });
        
        this.renderAnimals();
    }

    previewPhoto(event) {
        const input = event.target;
        const preview = document.getElementById('animal-photo-preview');
        
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                preview.src = e.target.result;
                preview.style.display = 'block';
            };
            
            reader.readAsDataURL(input.files[0]);
        }
    }

    // Método para obtener animales activos (usado en ventas)
    async getActiveAnimals() {
        try {
            const response = await app.apiCall('/animals?status=active');
            return response.animals || [];
        } catch (error) {
            console.error('Error getting active animals:', error);
            return [];
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.animalsManager = new AnimalsManager();
});