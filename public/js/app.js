// Configuración global
const API_BASE_URL = '/api';
const FIREBASE_API_KEY = 'AIzaSyC7XrvX6AOAUP7dhd6yR4xIO0aqRwGe5nk';

class App {
    constructor() {
        this.currentView = 'dashboard';
        this.currentUser = null;
        this.init();
    }

    init() {
        this.createLoadingElement();
        this.setupEventListeners();
        
        // Verificar autenticación al iniciar
        this.checkAuthAndLoad();
    }

   // ==================== AUTENTICACIÓN ====================

async checkAuthAndLoad() {
    const token = localStorage.getItem('authToken');
    if (token) {
        try {
            const response = await this.apiCall('/auth/verify', {
                method: 'POST',
                body: { token }
            });
            
            if (response.valid) {
                this.currentUser = response.user;
                this.showApp();
                this.loadDashboardData();
            } else {
                this.showLogin();
            }
        } catch (error) {
            console.error('Auth check error:', error);
            this.showLogin();
        }
    } else {
        this.showLogin();
    }
}

showLogin() {
    // Ocultar aplicación y mostrar login
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('login-container').style.display = 'block';
    document.getElementById('register-container').style.display = 'none';
}

showApp() {
    // Ocultar login y mostrar aplicación
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('register-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
}

showRegister() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('register-container').style.display = 'block';
}

async handleRegister(form) {
    try {
        this.showLoading(true);
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        console.log('Intentando crear cuenta:', { name, email, password });

        // 1. Crear usuario en Firebase Auth
        const authResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password,
                returnSecureToken: true
            })
        });

        const authData = await authResponse.json();

        if (authData.error) {
            throw new Error(this.getAuthErrorMessage(authData.error.message));
        }

        console.log('Usuario creado en Auth:', authData);

        // 2. Crear perfil en nuestro backend (Firebase Functions)
        try {
            const profileResponse = await this.apiCall('/auth/create-admin', {
                method: 'POST',
                body: { 
                    email, 
                    name,
                    uid: authData.localId // Agregar el UID
                }
            });
            console.log('Perfil creado en backend:', profileResponse);
        } catch (profileError) {
            console.warn('Error creando perfil (puede ser normal):', profileError);
            // Continuamos aunque falle la creación del perfil
        }

        this.showAlert('¡Cuenta creada exitosamente! Ahora puedes iniciar sesión.', 'success');
        this.showLogin();
        
    } catch (error) {
        console.error('Error completo al registrar:', error);
        this.showAlert('Error al crear cuenta: ' + error.message, 'danger');
    } finally {
        this.showLoading(false);
    }
}

// Actualiza también el método logout
logout() {
    localStorage.removeItem('authToken');
    this.currentUser = null;
    this.showLogin();
    this.showAlert('Sesión cerrada correctamente', 'info');
}

    // ==================== COMUNICACIÓN CON API ====================

    async apiCall(endpoint, options = {}) {
        try {
            const token = localStorage.getItem('authToken');
            const config = {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            };

            // Agregar token de autenticación si existe y no es endpoint público
            if (token && !endpoint.includes('/auth/') && endpoint !== '/health') {
                config.headers['Authorization'] = `Bearer ${token}`;
            }

            if (config.body && typeof config.body === 'object') {
                config.body = JSON.stringify(config.body);
            }

            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

            if (response.status === 401) {
                // Token inválido, redirigir a login
                this.showLogin();
                throw new Error('Sesión expirada');
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error ${response.status}: ${errorText || response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Call error:', error);
            
            // No mostrar alerta para errores de autenticación (ya se manejan arriba)
            if (!error.message.includes('Sesión expirada')) {
                this.showAlert('Error en la conexión: ' + error.message, 'danger');
            }
            
            throw error;
        }
    }

    // ==================== DASHBOARD ====================

    async loadDashboardData() {
        try {
            this.showLoading(true);
            const data = await this.apiCall('/dashboard');
            this.updateDashboardUI(data);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            this.showLoading(false);
        }
    }

    updateDashboardUI(data) {
        // Actualizar tarjetas de estadísticas
        if (document.getElementById('total-animals')) {
            document.getElementById('total-animals').textContent = data.total_animals || 0;
        }
        if (document.getElementById('active-animals')) {
            document.getElementById('active-animals').textContent = data.active_animals || 0;
        }
        if (document.getElementById('low-stock-items')) {
            document.getElementById('low-stock-items').textContent = data.low_stock_items || 0;
        }
        if (document.getElementById('total-inventory')) {
            document.getElementById('total-inventory').textContent = data.total_inventory || 0;
        }
        
        // Actualizar alertas
        if (document.getElementById('low-stock-alert')) {
            document.getElementById('low-stock-alert').textContent = (data.low_stock_items || 0) + ' items';
        }
        if (document.getElementById('active-animals-alert')) {
            document.getElementById('active-animals-alert').textContent = (data.active_animals || 0) + ' animales';
        }
    }

    // ==================== NAVEGACIÓN Y VISTAS ====================

    showView(viewName) {
        // Verificar autenticación antes de mostrar vista
        if (!this.currentUser && viewName !== 'dashboard') {
            this.showLogin();
            return;
        }

        // Ocultar todas las vistas
        document.querySelectorAll('.view-container').forEach(view => {
            view.style.display = 'none';
        });

        // Mostrar vista actual
        const currentView = document.getElementById(`${viewName}-view`);
        if (currentView) {
            currentView.style.display = 'block';
            
            // Disparar evento cuando se carga una vista
            const event = new CustomEvent(`${viewName}ViewLoaded`);
            document.dispatchEvent(event);
        }

        this.currentView = viewName;
        this.updateActiveNav();

        // Cargar datos específicos de la vista
        this.loadViewData(viewName);
    }

    loadViewData(viewName) {
        switch (viewName) {
            case 'animals':
                if (window.animalsManager) {
                    window.animalsManager.loadAnimals();
                }
                break;
            case 'sales':
                if (window.salesManager) {
                    window.salesManager.loadSales();
                }
                break;
            case 'feeds':
                if (window.feedsManager) {
                    window.feedsManager.loadFeeds();
                }
                break;
            case 'inventory':
                if (window.inventoryManager) {
                    window.inventoryManager.loadInventory();
                }
                break;
        }
    }

    updateActiveNav() {
        // Actualizar navegación activa
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-view="${this.currentView}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    // ==================== UTILIDADES UI ====================

    showAlert(message, type = 'info', duration = 5000) {
        // Remover alertas existentes del mismo tipo
        const existingAlerts = document.querySelectorAll('.alert-dismissible');
        existingAlerts.forEach(alert => {
            if (alert.textContent.includes(message.substring(0, 20))) {
                alert.remove();
            }
        });

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            <i class="fas fa-${this.getAlertIcon(type)} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        const container = document.querySelector('.container');
        if (container) {
            container.insertBefore(alertDiv, container.firstChild);
        }

        if (duration > 0) {
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, duration);
        }
    }

    getAlertIcon(type) {
        const icons = {
            'success': 'check-circle',
            'danger': 'exclamation-triangle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    showLoading(show = true) {
        const loadingElement = document.getElementById('loading-spinner');
        if (loadingElement) {
            loadingElement.style.display = show ? 'flex' : 'none';
        }
    }

    createLoadingElement() {
        if (document.getElementById('loading-spinner')) return;

        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-spinner';
        loadingDiv.className = 'loading-spinner';
        loadingDiv.innerHTML = `
            <div class="text-center">
                <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status">
                    <span class="visually-hidden">Cargando...</span>
                </div>
                <p class="mt-2 text-white">Cargando...</p>
            </div>
        `;
        loadingDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;
        document.body.appendChild(loadingDiv);
    }

    // ==================== MANEJO DE FORMULARIOS ====================

    setupFormHandler(formId, submitCallback) {
        const form = document.getElementById(formId);
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await submitCallback(form);
            });
        }
    }

    getFormData(form) {
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            if (value === '') continue;
            
            // Convertir números y valores booleanos
            if (key.includes('price') || key.includes('weight') || 
                key.includes('stock') || key.includes('quantity') ||
                key.includes('amount')) {
                data[key] = value ? parseFloat(value) : 0;
            } else if (key.includes('date')) {
                data[key] = value || new Date().toISOString().split('T')[0];
            } else {
                data[key] = value;
            }
        }
        
        return data;
    }

    resetForm(form) {
        form.reset();
        // Limpiar datos de edición
        if (form.dataset.editId) {
            delete form.dataset.editId;
        }
    }

    populateForm(form, data) {
        Object.keys(data).forEach(key => {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = data[key];
                } else if (input.type === 'radio') {
                    const radio = form.querySelector(`[name="${key}"][value="${data[key]}"]`);
                    if (radio) radio.checked = true;
                } else {
                    input.value = data[key];
                }
            }
        });
    }

    // ==================== MANEJO DE MODALES ====================

    showModal(modalId, title = '') {
        const modalElement = document.getElementById(modalId);
        if (!modalElement) {
            console.error(`Modal ${modalId} no encontrado`);
            return;
        }

        if (title) {
            const modalTitle = modalElement.querySelector('.modal-title');
            if (modalTitle) modalTitle.textContent = title;
        }

        const modal = new bootstrap.Modal(modalElement);
        modal.show();

        // Enfocar el primer campo del formulario cuando se muestra el modal
        modalElement.addEventListener('shown.bs.modal', () => {
            const firstInput = modalElement.querySelector('input, select, textarea');
            if (firstInput) firstInput.focus();
        });
    }

    hideModal(modalId) {
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
        }
    }

    // ==================== VALIDACIONES ====================

    validateRequiredFields(form, requiredFields) {
        const errors = [];
        const formData = this.getFormData(form);

        requiredFields.forEach(field => {
            if (!formData[field] || formData[field].toString().trim() === '') {
                errors.push(`El campo ${field} es requerido`);
            }
        });

        if (errors.length > 0) {
            this.showAlert(errors.join('<br>'), 'warning');
            return false;
        }

        return true;
    }

    validateNumber(value, min = 0, max = Infinity) {
        const num = parseFloat(value);
        return !isNaN(num) && num >= min && num <= max;
    }

    // ==================== FORMATO DE DATOS ====================

    formatCurrency(amount) {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount);
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('es-MX');
    }

    formatDateTime(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('es-MX');
    }

    // ==================== EVENT LISTENERS ====================

    setupEventListeners() {
        // Navegación principal
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-view]') || e.target.closest('[data-view]')) {
                const target = e.target.matches('[data-view]') ? e.target : e.target.closest('[data-view]');
                const view = target.getAttribute('data-view');
                this.showView(view);
            }
        });

        // Botón de refresh del dashboard
        document.addEventListener('click', (e) => {
            if (e.target.matches('#refresh-dashboard') || e.target.closest('#refresh-dashboard')) {
                this.loadDashboardData();
            }
        });

        // Cerrar modales al hacer click fuera
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal(e.target.id);
            }
        });

        // Manejar tecla Escape para cerrar modales
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal.show');
                if (openModal) {
                    this.hideModal(openModal.id);
                }
            }
        });
    }

    // ==================== MÉTODOS PARA DATOS GLOBALES ====================

    async getActiveAnimals() {
        try {
            const animals = await this.apiCall('/animals');
            return animals.filter(animal => 
                animal.status === 'active' || !animal.status
            );
        } catch (error) {
            console.error('Error getting active animals:', error);
            return [];
        }
    }

    async getInventoryItems() {
        try {
            return await this.apiCall('/inventory');
        } catch (error) {
            console.error('Error getting inventory:', error);
            return [];
        }
    }

    // ==================== UTILIDADES DE RENDERING ====================

    createCard(title, content, options = {}) {
        const { type = 'default', icon = '', actions = [] } = options;
        
        const typeClasses = {
            'default': '',
            'success': 'border-success',
            'warning': 'border-warning',
            'danger': 'border-danger',
            'info': 'border-info'
        };

        return `
            <div class="card ${typeClasses[type]} mb-3">
                <div class="card-body">
                    <h5 class="card-title">
                        ${icon ? `<i class="${icon} me-2"></i>` : ''}
                        ${title}
                    </h5>
                    <div class="card-text">${content}</div>
                    ${actions.length > 0 ? `
                        <div class="mt-3">
                            ${actions.map(action => 
                                `<button class="btn btn-${action.type} btn-sm me-2" 
                                 onclick="${action.onclick}">${action.label}</button>`
                            ).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    createBadge(text, type = 'secondary') {
        return `<span class="badge bg-${type}">${text}</span>`;
    }

    createEmptyState(message, icon = 'info-circle', action = null) {
        return `
            <div class="text-center py-5">
                <i class="fas fa-${icon} fa-3x text-muted mb-3"></i>
                <p class="text-muted">${message}</p>
                ${action ? `
                    <button class="btn btn-primary mt-2" onclick="${action.onclick}">
                        ${action.label}
                    </button>
                ` : ''}
            </div>
        `;
    }

    // ==================== MANEJO DE ERRORES ====================

    handleError(error, context = '') {
        console.error(`Error en ${context}:`, error);
        
        let userMessage = 'Ocurrió un error inesperado';
        
        if (error.message.includes('404')) {
            userMessage = 'Recurso no encontrado';
        } else if (error.message.includes('500')) {
            userMessage = 'Error del servidor';
        } else if (error.message.includes('NetworkError')) {
            userMessage = 'Error de conexión. Verifica tu internet.';
        }
        
        this.showAlert(`${context ? context + ': ' : ''}${userMessage}`, 'danger');
    }

    // ==================== INICIALIZACIÓN ====================

    static init() {
        if (!window.app) {
            window.app = new App();
        }
        return window.app;
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar la aplicación principal
    const app = App.init();
    
    // Configurar manejo de errores globales
    window.addEventListener('error', (event) => {
        console.error('Error global:', event.error);
        app.showAlert('Ocurrió un error inesperado en la aplicación', 'danger');
    });
    
    // Manejar promesas no capturadas
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Promesa no capturada:', event.reason);
        app.showAlert('Error en la aplicación: ' + event.reason.message, 'danger');
    });
});

// Hacer disponible globalmente para otros scripts
window.App = App;

// Utilidades globales de formato
window.formatCurrency = (amount) => {
    return window.app ? window.app.formatCurrency(amount) : `$${amount}`;
};

window.formatDate = (dateString) => {
    return window.app ? window.app.formatDate(dateString) : dateString;
};