class AnimalsManager {
    constructor(app) {
        this.app = app;
        this.currentEditId = null;
        this.init();
    }

    init() {
        console.log('🐑 AnimalsManager inicializado');
        this.setupEventListeners();
        document.addEventListener('animalsViewLoaded', () => this.loadAnimals());
    }

    setupEventListeners() {
        // Formulario de animal
        const animalForm = document.getElementById('animal-form');
        if (animalForm) {
            animalForm.addEventListener('submit', (e) => this.handleAnimalSubmit(e));
        }

        // Botones de acción
        document.addEventListener('click', (e) => {
            if (e.target.matches('.edit-animal-btn')) {
                this.editAnimal(e.target.dataset.id);
            }
            if (e.target.matches('.delete-animal-btn')) {
                this.deleteAnimal(e.target.dataset.id);
            }
            if (e.target.matches('.view-animal-btn')) {
                this.viewAnimal(e.target.dataset.id);
            }
        });

        // Filtros
        const filterForm = document.getElementById('filter-animals-form');
        if (filterForm) {
            filterForm.addEventListener('submit', (e) => this.filterAnimals(e));
        }

        // Botón limpiar filtros
        const clearFiltersBtn = document.getElementById('clear-animal-filters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearFilters());
        }
    }

    async loadAnimals() {
        try {
            this.app.showLoading(true);
            const animals = await this.app.apiCall('/animals');
            this.renderAnimals(animals);
            this.updateStats(animals);
        } catch (error) {
            console.error('Error loading animals:', error);
            this.app.showAlert('Error al cargar los animales', 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    renderAnimals(animals) {
        const tbody = document.getElementById('animals-tbody');
        if (!tbody) return;

        if (animals.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-4">
                        <i class="fas fa-sheep fa-2x text-muted mb-2"></i>
                        <p class="text-muted">No hay animales registrados</p>
                        <button class="btn btn-primary" onclick="this.app.showModal('addAnimalModal')">
                            <i class="fas fa-plus me-1"></i>Agregar Animal
                        </button>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = animals.map(animal => `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <i class="fas fa-sheep text-primary me-2"></i>
                        <div>
                            <strong>${this.escapeHtml(animal.name)}</strong>
                            <br>
                            <small class="text-muted">${this.escapeHtml(animal.breed)}</small>
                        </div>
                    </div>
                </td>
                <td>${this.escapeHtml(animal.earTag)}</td>
                <td>${this.escapeHtml(animal.breed)}</td>
                <td>${animal.weight ? `${animal.weight} kg` : 'N/A'}</td>
                <td>${this.getGenderText(animal.gender)}</td>
                <td>${animal.birthDate ? this.app.formatDate(animal.birthDate) : 'N/A'}</td>
                <td>
                    <span class="badge ${this.getStatusBadge(animal.status)}">
                        ${this.getStatusText(animal.status)}
                    </span>
                </td>
                <td>${this.escapeHtml(animal.notes || 'Sin notas')}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-info view-animal-btn" data-id="${animal.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-primary edit-animal-btn" data-id="${animal.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger delete-animal-btn" data-id="${animal.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    updateStats(animals) {
        const totalAnimalsElement = document.getElementById('total-animals');
        const activeAnimalsElement = document.getElementById('active-animals');
        const averageWeightElement = document.getElementById('average-weight');

        if (totalAnimalsElement) {
            totalAnimalsElement.textContent = animals.length;
        }

        if (activeAnimalsElement) {
            const activeAnimals = animals.filter(animal => 
                animal.status === 'active' || !animal.status
            ).length;
            activeAnimalsElement.textContent = activeAnimals;
        }

        if (averageWeightElement) {
            const animalsWithWeight = animals.filter(animal => animal.weight && animal.weight > 0);
            if (animalsWithWeight.length > 0) {
                const averageWeight = animalsWithWeight.reduce((sum, animal) => 
                    sum + parseFloat(animal.weight), 0) / animalsWithWeight.length;
                averageWeightElement.textContent = `${averageWeight.toFixed(1)} kg`;
            } else {
                averageWeightElement.textContent = 'N/A';
            }
        }
    }

    async handleAnimalSubmit(e) {
        e.preventDefault();
        const form = e.target;
        
        try {
            this.app.showLoading(true);
            const formData = this.app.getFormData(form);

            // Validaciones
            if (!formData.earTag || !formData.breed) {
                this.app.showAlert('Número de arete y raza son obligatorios', 'warning');
                return;
            }

            if (this.currentEditId) {
                // Editar animal existente
                await this.app.apiCall(`/animals/${this.currentEditId}`, {
                    method: 'PUT',
                    body: formData
                });
                this.app.showAlert('Animal actualizado exitosamente', 'success');
            } else {
                // Crear nuevo animal
                await this.app.apiCall('/animals', {
                    method: 'POST',
                    body: formData
                });
                this.app.showAlert('Animal agregado exitosamente', 'success');
            }

            // Cerrar modal y recargar datos
            this.app.hideModal('addAnimalModal');
            this.currentEditId = null;
            this.app.resetForm(form);
            await this.loadAnimals();

        } catch (error) {
            console.error('Error saving animal:', error);
            this.app.showAlert('Error al guardar el animal: ' + error.message, 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    async editAnimal(animalId) {
        try {
            this.app.showLoading(true);
            const animal = await this.app.apiCall(`/animals/${animalId}`);
            
            // Poblar formulario
            const form = document.getElementById('animal-form');
            this.app.populateForm(form, animal);
            
            // Configurar para edición
            this.currentEditId = animalId;
            const modalTitle = document.querySelector('#addAnimalModal .modal-title');
            if (modalTitle) {
                modalTitle.textContent = 'Editar Animal';
            }
            
            // Mostrar modal
            this.app.showModal('addAnimalModal');

        } catch (error) {
            console.error('Error loading animal for edit:', error);
            this.app.showAlert('Error al cargar el animal para editar', 'danger');
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
            this.app.showAlert('Error al eliminar el animal', 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    async viewAnimal(animalId) {
        try {
            this.app.showLoading(true);
            const animal = await this.app.apiCall(`/animals/${animalId}`);
            
            // Mostrar detalles en un modal
            const modalBody = `
                <div class="row">
                    <div class="col-md-6">
                        <h6>Información Básica</h6>
                        <p><strong>Nombre:</strong> ${this.escapeHtml(animal.name)}</p>
                        <p><strong>Número de Arete:</strong> ${this.escapeHtml(animal.earTag)}</p>
                        <p><strong>Raza:</strong> ${this.escapeHtml(animal.breed)}</p>
                        <p><strong>Género:</strong> ${this.getGenderText(animal.gender)}</p>
                    </div>
                    <div class="col-md-6">
                        <h6>Detalles</h6>
                        <p><strong>Peso:</strong> ${animal.weight ? `${animal.weight} kg` : 'N/A'}</p>
                        <p><strong>Fecha de Nacimiento:</strong> ${animal.birthDate ? this.app.formatDate(animal.birthDate) : 'N/A'}</p>
                        <p><strong>Estado:</strong> <span class="badge ${this.getStatusBadge(animal.status)}">${this.getStatusText(animal.status)}</span></p>
                        <p><strong>Edad:</strong> ${this.calculateAge(animal.birthDate)}</p>
                    </div>
                </div>
                <div class="row mt-3">
                    <div class="col-12">
                        <h6>Notas</h6>
                        <p>${this.escapeHtml(animal.notes || 'Sin notas')}</p>
                    </div>
                </div>
                <div class="row mt-3">
                    <div class="col-12">
                        <h6>Información del Sistema</h6>
                        <p><strong>Creado:</strong> ${this.app.formatDateTime(animal.createdAt)}</p>
                        <p><strong>Actualizado:</strong> ${this.app.formatDateTime(animal.updatedAt)}</p>
                    </div>
                </div>
            `;

            // Crear modal temporal para mostrar detalles
            this.showDetailModal('Detalles del Animal', modalBody);

        } catch (error) {
            console.error('Error loading animal details:', error);
            this.app.showAlert('Error al cargar los detalles del animal', 'danger');
        } finally {
            this.app.showLoading(false);
        }
    }

    calculateAge(birthDate) {
        if (!birthDate) return 'N/A';
        
        const birth = new Date(birthDate);
        const now = new Date();
        const diffTime = Math.abs(now - birth);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 30) {
            return `${diffDays} días`;
        } else if (diffDays < 365) {
            const months = Math.floor(diffDays / 30);
            return `${months} mes${months !== 1 ? 'es' : ''}`;
        } else {
            const years = Math.floor(diffDays / 365);
            const remainingMonths = Math.floor((diffDays % 365) / 30);
            return `${years} año${years !== 1 ? 's' : ''}${remainingMonths > 0 ? ` y ${remainingMonths} mes${remainingMonths !== 1 ? 'es' : ''}` : ''}`;
        }
    }

    showDetailModal(title, content) {
        // Crear modal temporal
        const modalId = 'animalDetailModal';
        let modalElement = document.getElementById(modalId);
        
        if (!modalElement) {
            modalElement = document.createElement('div');
            modalElement.id = modalId;
            modalElement.className = 'modal fade';
            modalElement.innerHTML = `
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title"></h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body"></div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modalElement);
        }

        modalElement.querySelector('.modal-title').textContent = title;
        modalElement.querySelector('.modal-body').innerHTML = content;
        
        const modal = new bootstrap.Modal(modalElement);
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

    async filterAnimals(e) {
        e.preventDefault();
        // Implementar filtros si es necesario
        this.app.showAlert('Filtro aplicado', 'info');
    }

    clearFilters() {
        const filterForm = document.getElementById('filter-animals-form');
        if (filterForm) {
            filterForm.reset();
        }
        this.loadAnimals();
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
}

// Inicialización
if (typeof window.animalsManager === 'undefined') {
    // Esperar a que la app esté lista
    if (window.app) {
        window.animalsManager = new AnimalsManager(window.app);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            if (window.app) {
                window.animalsManager = new AnimalsManager(window.app);
            }
        });
    }
}