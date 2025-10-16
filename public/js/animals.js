class AnimalsManager {
    constructor(app) {
        this.app = app;
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
            this.app.showLoading(true);
            
            const response = await this.app.apiCall('/animals');
            
            // ✅ CORRECCIÓN: Manejar diferentes formatos de respuesta
            let animalsArray = [];
            
            if (Array.isArray(response)) {
                animalsArray = response;
            } else if (response && Array.isArray(response.data)) {
                animalsArray = response.data;
            } else if (response && Array.isArray(response.animals)) {
                animalsArray = response.animals;
            } else if (response && response.data && Array.isArray(response.data.animals)) {
                animalsArray = response.data.animals;
            } else if (response && typeof response === 'object') {
                // Si es un objeto, intentar extraer arrays
                animalsArray = Object.values(response).find(val => Array.isArray(val)) || [];
            } else {
                console.warn('⚠️ Formato de respuesta inesperado para animales:', response);
                animalsArray = [];
            }
            
            this.animals = animalsArray;
            this.filteredAnimals = [...this.animals];
            
            this.renderAnimals();
            console.log(`✅ ${this.animals.length} animales cargados`);
            
        } catch (error) {
            console.error('❌ Error loading animals:', error);
            
            // ✅ CORRECCIÓN: No redirigir a login por errores de datos
            if (error.message.includes('Sesión expirada') || error.message.includes('401')) {
                // Ya se maneja en app.js, no hacer nada adicional
            } else {
                this.app.showAlert('Error al cargar animales: ' + error.message, 'warning');
                // Renderizar lista vacía
                this.animals = [];
                this.filteredAnimals = [];
                this.renderAnimals();
            }
        } finally {
            this.app.showLoading(false);
        }
    }

    renderAnimals() {
        const container = document.getElementById('animals-list');
        if (!container) {
            console.log('❌ Container animals-list no encontrado');
            return;
        }

        // ✅ CORRECCIÓN: Verificar que filteredAnimals sea un array
        if (!Array.isArray(this.filteredAnimals)) {
            console.warn('⚠️ filteredAnimals no es un array:', this.filteredAnimals);
            this.filteredAnimals = [];
        }

        if (this.filteredAnimals.length === 0) {
            container.innerHTML = this.app.createEmptyState(
                'No hay animales registrados', 
                'sheep', 
                { onclick: 'animalsManager.showAnimalForm()', label: 'Agregar Primer Animal' }
            );
            return;
        }

        container.innerHTML = this.filteredAnimals.map(animal => {
            // ✅ CORRECCIÓN: Verificar que animal sea un objeto válido
            if (!animal || typeof animal !== 'object') {
                console.warn('⚠️ Animal inválido:', animal);
                return '';
            }

            const animalId = animal.id || animal._id || '';
            const earTag = animal.earTag || 'N/A';
            const name = animal.name || `Borrego ${earTag}`;
            const breed = animal.breed || 'No especificada';
            const gender = animal.gender || 'unknown';
            const weight = animal.weight || 0;
            const status = animal.status || 'active';
            const birthDate = animal.birthDate;
            const notes = animal.notes;

            return `
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card animal-card h-100">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h6 class="card-title mb-0">
                                <i class="fas fa-sheep me-1"></i>${name}
                            </h6>
                            <span class="badge ${this.getStatusBadgeClass(status)}">
                                ${this.getStatusText(status)}
                            </span>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-6">
                                    <small class="text-muted">Arete:</small>
                                    <p class="mb-1 fw-bold">${earTag}</p>
                                </div>
                                <div class="col-6">
                                    <small class="text-muted">Raza:</small>
                                    <p class="mb-1">${breed}</p>
                                </div>
                            </div>
                            <div class="row mt-2">
                                <div class="col-6">
                                    <small class="text-muted">Género:</small>
                                    <p class="mb-1">${this.getGenderText(gender)}</p>
                                </div>
                                <div class="col-6">
                                    <small class="text-muted">Peso:</small>
                                    <p class="mb-1">${weight} kg</p>
                                </div>
                            </div>
                            ${birthDate ? `
                                <div class="row mt-2">
                                    <div class="col-12">
                                        <small class="text-muted">Nacimiento:</small>
                                        <p class="mb-1">${this.app.formatDate(birthDate)}</p>
                                    </div>
                                </div>
                            ` : ''}
                            ${notes ? `
                                <div class="mt-2">
                                    <small class="text-muted">Notas:</small>
                                    <p class="mb-1 small">${notes}</p>
                                </div>
                            ` : ''}
                        </div>
                        <div class="card-footer bg-transparent">
                            <div class="btn-group w-100">
                                <button class="btn btn-outline-primary btn-sm" onclick="animalsManager.editAnimal('${animalId}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                ${status === 'active' ? `
                                    <button class="btn btn-outline-warning btn-sm" onclick="salesManager.sellAnimal('${earTag}')">
                                        <i class="fas fa-dollar-sign"></i>
                                    </button>
                                ` : ''}
                                <button class="btn btn-outline-danger btn-sm" onclick="animalsManager.deleteAnimal('${animalId}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
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
        if (form) {
            form.reset();
            const photoPreview = document.getElementById('animal-photo-preview');
            if (photoPreview) {
                photoPreview.style.display = 'none';
            }
            
            // Si es edición, cargar datos
            if (animalId) {
                const animal = this.animals.find(a => (a.id === animalId || a._id === animalId));
                if (animal) {
                    this.app.populateForm(form, animal);
                }
            }
            
            this.app.showModal('animal-form-modal', modalTitle);
        }
    }

    async handleAnimalSubmit(e) {
        e.preventDefault();
        
        try {
            this.app.showLoading(true);
            const form = e.target;
            const formData = this.app.getFormData(form);
            
            // Validaciones
            if (!formData.earTag || !formData.breed) {
                this.app.showAlert('Número de arete y raza son obligatorios', 'warning');
                return;
            }

            let response;
            if (this.currentEditId) {
                // Actualizar animal existente
                response = await this.app.apiCall(`/animals/${this.currentEditId}`, {
                    method: 'PUT',
                    body: formData
                });
                this.app.showAlert('Animal actualizado exitosamente', 'success');
            } else {
                // Crear nuevo animal
                response = await this.app.apiCall('/animals', {
                    method: 'POST',
                    body: formData
                });
                this.app.showAlert('Animal agregado exitosamente', 'success');
            }

            // Cerrar modal y recargar lista
            this.app.hideModal('animal-form-modal');
            this.loadAnimals();
            
        } catch (error) {
            console.error('Error saving animal:', error);
            
            // ✅ CORRECCIÓN: No redirigir a login por errores de guardado
            if (error.message.includes('Sesión expirada') || error.message.includes('401')) {
                // Ya se maneja en app.js
            } else {
                this.app.showAlert('Error al guardar animal: ' + error.message, 'danger');
            }
        } finally {
            this.app.showLoading(false);
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
            this.app.showLoading(true);
            await this.app.apiCall(`/animals/${animalId}`, {
                method: 'DELETE'
            });
            
            this.app.showAlert('Animal eliminado exitosamente', 'success');
            this.loadAnimals();
            
        } catch (error) {
            console.error('Error deleting animal:', error);
            
            // ✅ CORRECCIÓN: No redirigir a login por errores de eliminación
            if (error.message.includes('Sesión expirada') || error.message.includes('401')) {
                // Ya se maneja en app.js
            } else {
                this.app.showAlert('Error al eliminar animal: ' + error.message, 'danger');
            }
        } finally {
            this.app.showLoading(false);
        }
    }

    filterAnimals() {
        const searchInput = document.getElementById('animal-search');
        const statusFilter = document.getElementById('animal-status-filter');
        
        if (!searchInput || !statusFilter) return;
        
        const searchTerm = searchInput.value.toLowerCase();
        const statusValue = statusFilter.value;
        
        this.filteredAnimals = this.animals.filter(animal => {
            const matchesSearch = !searchTerm || 
                (animal.name && animal.name.toLowerCase().includes(searchTerm)) ||
                (animal.earTag && animal.earTag.toLowerCase().includes(searchTerm)) ||
                (animal.breed && animal.breed.toLowerCase().includes(searchTerm));
            
            const matchesStatus = !statusValue || animal.status === statusValue;
            
            return matchesSearch && matchesStatus;
        });
        
        this.renderAnimals();
    }

    previewPhoto(event) {
        const input = event.target;
        const preview = document.getElementById('animal-photo-preview');
        
        if (input.files && input.files[0] && preview) {
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
            const response = await this.app.apiCall('/animals?status=active');
            
            // ✅ Mismo manejo de formato que en loadAnimals
            if (Array.isArray(response)) {
                return response.filter(animal => animal.status === 'active');
            } else if (response && Array.isArray(response.data)) {
                return response.data.filter(animal => animal.status === 'active');
            } else if (response && Array.isArray(response.animals)) {
                return response.animals.filter(animal => animal.status === 'active');
            }
            
            return [];
        } catch (error) {
            console.error('Error getting active animals:', error);
            return [];
        }
    }
}