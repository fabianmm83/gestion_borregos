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
        const animalForm = document.getElementById('animal-form');
        if (animalForm) {
            animalForm.addEventListener('submit', (e) => this.handleAnimalSubmit(e));
        }
    }

    // Método para previsualizar foto
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
        } else {
            preview.style.display = 'none';
        }
    }

    async loadAnimals() {
        try {
            this.app.showLoading(true);
            console.log('🔄 Cargando animales desde API...');
            
            const animals = await this.app.apiCall('/animals');
            console.log('✅ Animales cargados:', animals);
            this.renderAnimals(animals);
            
        } catch (error) {
            console.error('Error loading animals:', error);
            
            // Mostrar datos de demo si la API falla
            if (error.message.includes('404') || error.message.includes('500')) {
                this.app.showAlert('Usando datos de demostración', 'info');
                const demoAnimals = this.getDemoAnimals();
                this.renderAnimals(demoAnimals);
            } else {
                this.app.showAlert('Error al cargar los animales: ' + error.message, 'danger');
            }
        } finally {
            this.app.showLoading(false);
        }
    }

    getDemoAnimals() {
        return [
            {
                id: "demo-1",
                name: "Borrego Demo",
                earTag: "A001",
                breed: "Katahdin",
                weight: 45.5,
                gender: "male",
                birthDate: "2023-05-15",
                status: "active",
                notes: "Animal de demostración",
                photoUrl: null
            }
        ];
    }

    renderAnimals(animals) {
        const container = document.getElementById('animals-list');
        if (!container) return;

        if (!animals || animals.length === 0) {
            container.innerHTML = `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    No hay animales registrados.
                    <button class="btn btn-primary btn-sm ms-2" onclick="animalsManager.showAnimalForm()">
                        <i class="fas fa-plus me-1"></i>Agregar Primer Animal
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = animals.map(animal => `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-8">
                            <div class="d-flex align-items-start">
                                ${animal.photoUrl ? `
                                    <div class="me-3">
                                        <img src="${animal.photoUrl}" alt="${this.escapeHtml(animal.name)}" 
                                             class="animal-photo-preview" style="max-width: 100px;">
                                    </div>
                                ` : ''}
                                <div>
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
                            </div>
                        </div>
                        <div class="col-md-4 text-end">
                            <span class="badge ${this.getStatusBadge(animal.status)}">
                                ${this.getStatusText(animal.status)}
                            </span>
                            <div class="mt-2">
                                <button class="btn btn-sm btn-outline-primary edit-animal-btn" data-id="${animal.id}">
                                    <i class="fas fa-edit"></i> Editar
                                </button>
                                <button class="btn btn-sm btn-outline-danger delete-animal-btn" data-id="${animal.id}">
                                    <i class="fas fa-trash"></i> Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

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

            console.log('📝 Datos del formulario:', data);

            // Validaciones básicas
            if (!data.earTag || !data.breed) {
                this.app.showAlert('Número de arete y raza son obligatorios', 'warning');
                return;
            }

            // Preparar datos para la API
            const animalData = {
                name: data.name || `Borrego ${data.earTag}`,
                earTag: data.earTag,
                breed: data.breed,
                gender: data.gender || 'unknown',
                birthDate: data.birthDate || null,
                weight: data.weight ? parseFloat(data.weight) : 0,
                notes: data.notes || '',
                status: 'active'
            };

            // Manejar foto si existe
            const photoInput = form.querySelector('#animal-photo');
            if (photoInput && photoInput.files[0]) {
                console.log('📸 Foto seleccionada:', photoInput.files[0]);
                // Aquí puedes implementar la subida de la foto
                // Por ahora, solo mostramos un mensaje
                this.app.showAlert('Foto seleccionada (función de subida en desarrollo)', 'info');
            }

            console.log('🚀 Enviando a API:', animalData);

            let result;
            if (this.currentEditId && this.currentEditId !== 'null') {
                // Editar animal existente
                result = await this.app.apiCall(`/animals/${this.currentEditId}`, {
                    method: 'PUT',
                    body: animalData
                });
            } else {
                // Crear nuevo animal
                result = await this.app.apiCall('/animals', {
                    method: 'POST',
                    body: animalData
                });
            }

            console.log('✅ Respuesta de API:', result);

            this.app.showAlert(
                this.currentEditId ? 'Animal actualizado exitosamente' : 'Animal guardado exitosamente', 
                'success'
            );
            
            // Cerrar modal y recargar
            const modal = bootstrap.Modal.getInstance(document.getElementById('animal-form-modal'));
            modal.hide();
            this.resetAnimalForm();
            this.currentEditId = null;
            
            await this.loadAnimals();

        } catch (error) {
            console.error('❌ Error saving animal:', error);
            this.app.showAlert('Error al guardar el animal: ' + error.message, 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    resetAnimalForm() {
        const form = document.getElementById('animal-form');
        form.reset();
        document.getElementById('animal-photo-preview').style.display = 'none';
    }

    async editAnimal(animalId) {
        try {
            this.app.showLoading(true);
            console.log('✏️ Editando animal:', animalId);
            
            const animal = await this.app.apiCall(`/animals/${animalId}`);
            console.log('📋 Animal cargado:', animal);
            
            // Poblar formulario
            const form = document.getElementById('animal-form');
            const fields = ['name', 'earTag', 'breed', 'weight', 'gender', 'birthDate', 'notes'];
            
            fields.forEach(field => {
                const input = form.querySelector(`[name="${field}"]`);
                if (input && animal[field] !== undefined && animal[field] !== null) {
                    input.value = animal[field];
                }
            });
            
            // Manejar foto si existe
            const preview = document.getElementById('animal-photo-preview');
            if (animal.photoUrl) {
                preview.src = animal.photoUrl;
                preview.style.display = 'block';
            } else {
                preview.style.display = 'none';
            }
            
            this.currentEditId = animalId;
            
            // Actualizar título del modal
            const modalTitle = document.querySelector('#animal-form-modal .modal-title');
            if (modalTitle) {
                modalTitle.innerHTML = '<i class="fas fa-edit me-2"></i>Editar Animal';
            }
            
            // Mostrar modal
            const modal = new bootstrap.Modal(document.getElementById('animal-form-modal'));
            modal.show();

        } catch (error) {
            console.error('Error loading animal for edit:', error);
            this.app.showAlert('Error al cargar el animal: ' + error.message, 'danger');
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
            
            await this.app.apiCall(`/animals/${animalId}`, {
                method: 'DELETE'
            });
            
            this.app.showAlert('Animal eliminado exitosamente', 'success');
            await this.loadAnimals();

        } catch (error) {
            console.error('Error deleting animal:', error);
            this.app.showAlert('Error al eliminar el animal: ' + error.message, 'danger');
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
            const statusBadge = card.querySelector('.badge');
            const status = statusBadge ? statusBadge.textContent.toLowerCase() : '';
            
            const matchesSearch = text.includes(searchTerm);
            const matchesStatus = !statusFilter || status.includes(statusFilter);
            
            card.style.display = matchesSearch && matchesStatus ? 'block' : 'none';
        });
    }

    showAnimalForm() {
        this.currentEditId = null;
        this.resetAnimalForm();
        
        // Restaurar título del modal
        const modalTitle = document.querySelector('#animal-form-modal .modal-title');
        if (modalTitle) {
            modalTitle.innerHTML = '<i class="fas fa-plus-circle me-2"></i>Agregar Animal';
        }
        
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