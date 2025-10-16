class App {
    constructor() {
        // Configuraciones
        this.API_BASE_URL = 'https://us-central1-gestionborregos.cloudfunctions.net/api';
        this.FIREBASE_API_KEY = 'AIzaSyC7XrvX6AOAUP7dhd6yR4xIO0aqRwGe5nk';
        this.currentView = 'dashboard';
        this.currentUser = null;
        this.deferredPrompt = null;
        this.formsConnected = false; // ✅ Controlar conexión de formularios
        this.eventListenersSetup = false; // ✅ Controlar event listeners
        this.init();
    }

    init() {
        console.log('🚀 App inicializando...');
        this.createLoadingElement();
        this.setupPWA();
        
        // ✅ CONEXIÓN ÚNICA de event listeners
        if (!this.eventListenersSetup) {
            this.setupEventListeners();
            this.eventListenersSetup = true;
        }
        
        // Verificar autenticación al iniciar
        this.checkAuthAndLoad();
    }

    // ==================== PWA ====================

    setupPWA() {
        // Registrar service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => console.log('✅ Service Worker registrado'))
                .catch(error => console.log('❌ Service Worker registration failed:', error));
        }

        // Manejar instalación de PWA
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallPrompt();
        });

        // Detectar si la app está instalada
        window.addEventListener('appinstalled', () => {
            console.log('✅ PWA instalada');
            this.deferredPrompt = null;
            document.getElementById('pwa-install-prompt').style.display = 'none';
        });
    }

    showInstallPrompt() {
        const prompt = document.getElementById('pwa-install-prompt');
        if (prompt && this.deferredPrompt) {
            prompt.style.display = 'block';
        }
    }

    installPWA() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            this.deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('✅ Usuario aceptó instalar la PWA');
                    this.showAlert('¡App instalada correctamente!', 'success');
                } else {
                    console.log('❌ Usuario rechazó instalar la PWA');
                }
                this.deferredPrompt = null;
                document.getElementById('pwa-install-prompt').style.display = 'none';
            });
        }
    }

    // ==================== AUTENTICACIÓN MEJORADA ====================

    async checkAuthAndLoad() {
        const token = localStorage.getItem('authToken');
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (!token) {
            this.showLogin();
            return;
        }

        // Verificar expiración del token primero
        if (this.isTokenExpired(token)) {
            console.log('🔑 Token expirado, intentando refresh...');
            
            if (refreshToken) {
                try {
                    const newToken = await this.refreshToken(refreshToken);
                    if (newToken) {
                        localStorage.setItem('authToken', newToken);
                        await this.verifyTokenAndLoad(newToken);
                        return;
                    }
                } catch (error) {
                    console.log('❌ Error refrescando token:', error);
                }
            }
            
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            this.showLogin();
            return;
        }

        await this.verifyTokenAndLoad(token);
    }

    async refreshToken(refreshToken) {
        const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${this.FIREBASE_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `grant_type=refresh_token&refresh_token=${refreshToken}`
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('authToken', data.id_token);
            if (data.refresh_token) {
                localStorage.setItem('refreshToken', data.refresh_token);
            }
            return data.id_token;
        }
        return null;
    }

    async verifyTokenAndLoad(token) {
        try {
            const authResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${this.FIREBASE_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken: token })
            });

            const authData = await authResponse.json();
            
            if (authData.users?.[0]) {
                const user = authData.users[0];
                this.currentUser = {
                    uid: user.localId,
                    email: user.email,
                    name: user.displayName || user.email.split('@')[0]
                };
                
                this.showApp();
                this.loadDashboardData();
            } else {
                throw new Error('Token inválido');
            }
            
        } catch (error) {
            console.error('Error en verificación:', error);
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            this.showLogin();
            this.showAlert('Sesión expirada. Por favor, inicia sesión nuevamente.', 'warning');
        }
    }

    showLogin() {
        document.getElementById('app-container').style.display = 'none';
        document.getElementById('login-container').style.display = 'block';
        document.getElementById('register-container').style.display = 'none';
    }

    showApp() {
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('register-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
    }

    showRegister() {
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('register-container').style.display = 'block';
    }

    getAuthErrorMessage(errorCode) {
        const messages = {
            'EMAIL_EXISTS': 'Este correo electrónico ya está registrado',
            'OPERATION_NOT_ALLOWED': 'El registro con email/contraseña no está habilitado',
            'TOO_MANY_ATTEMPTS_TRY_LATER': 'Demasiados intentos. Intenta más tarde',
            'EMAIL_NOT_FOUND': 'Correo electrónico no encontrado',
            'INVALID_PASSWORD': 'Contraseña incorrecta',
            'USER_DISABLED': 'Esta cuenta ha sido deshabilitada',
            'INVALID_EMAIL': 'Correo electrónico inválido',
            'WEAK_PASSWORD': 'La contraseña es muy débil'
        };
        return messages[errorCode] || 'Error de autenticación: ' + errorCode;
    }

    async handleLogin(form) {
        try {
            this.showLoading(true);
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            console.log('Intentando login:', { email });

            const authResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${this.FIREBASE_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, returnSecureToken: true })
            });

            const authData = await authResponse.json();

            if (authData.error) {
                throw new Error(this.getAuthErrorMessage(authData.error.message));
            }

            console.log('✅ Login exitoso:', authData);

            // 🔥 GUARDAR TOKENS PERSISTENTES
            localStorage.setItem('authToken', authData.idToken);
            localStorage.setItem('refreshToken', authData.refreshToken);
            
            this.currentUser = {
                uid: authData.localId,
                email: authData.email,
                name: authData.displayName || email
            };

            // Verificar/crear perfil en Firestore
            try {
                console.log('🔄 Verificando/Creando perfil en Firestore...');
                const profileResponse = await this.apiCall('/auth/create-admin', {
                    method: 'POST',
                    body: { 
                        email, 
                        name: authData.displayName || email,
                        uid: authData.localId
                    }
                });
                console.log('✅ Perfil creado/verificado en Firestore:', profileResponse);
            } catch (profileError) {
                console.warn('⚠️ Error creando/verificando perfil:', profileError);
            }

            this.showAlert('¡Bienvenido!', 'success');
            this.showApp();
            this.loadDashboardData();
            
        } catch (error) {
            console.error('❌ Error en login:', error);
            this.showAlert('Error al iniciar sesión: ' + error.message, 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    async handleRegister(form) {
        try {
            this.showLoading(true);
            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;

            console.log('Intentando crear cuenta:', { name, email });

            const authResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${this.FIREBASE_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, returnSecureToken: true })
            });

            const authData = await authResponse.json();

            if (authData.error) {
                throw new Error(this.getAuthErrorMessage(authData.error.message));
            }

            console.log('✅ Usuario creado en Auth:', authData);

            // 🔥 GUARDAR TOKENS PERSISTENTES
            localStorage.setItem('authToken', authData.idToken);
            localStorage.setItem('refreshToken', authData.refreshToken);
            
            this.currentUser = {
                uid: authData.localId,
                email: authData.email,
                name: name
            };

            // Crear perfil en nuestro backend
            try {
                const profileResponse = await this.apiCall('/auth/create-admin', {
                    method: 'POST',
                    body: { 
                        email, 
                        name,
                        uid: authData.localId
                    }
                });
                console.log('✅ Perfil creado en backend:', profileResponse);
            } catch (profileError) {
                console.warn('⚠️ Error creando perfil:', profileError);
            }

            this.showAlert('¡Cuenta creada exitosamente!', 'success');
            this.showApp();
            this.loadDashboardData();
            
        } catch (error) {
            console.error('❌ Error completo al registrar:', error);
            this.showAlert('Error al crear cuenta: ' + error.message, 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        this.currentUser = null;
        this.showLogin();
        this.showAlert('Sesión cerrada correctamente', 'info');
    }

    isTokenExpired(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp * 1000 < Date.now();
        } catch (error) {
            return true;
        }
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

            if (token && !endpoint.includes('/auth/')) {
                config.headers['Authorization'] = `Bearer ${token}`;
            }

            if (config.body && typeof config.body === 'object') {
                config.body = JSON.stringify(config.body);
            }

            const response = await fetch(`${this.API_BASE_URL}${endpoint}`, config);
            
            if (response.status === 401) {
                localStorage.removeItem('authToken');
                this.currentUser = null;
                this.showLogin();
                throw new Error('Sesión expirada');
            }

            if (response.status === 404) {
                throw new Error('Recurso no encontrado');
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error ${response.status}: ${errorText}`);
            }

            return await response.json();

        } catch (error) {
            console.error(`API Call error [${endpoint}]:`, error);
            
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
            console.log('📊 Cargando datos del dashboard...');
            
            const response = await this.apiCall('/dashboard');
            
            let dashboardData = {};
            
            if (response && response.data) {
                if (response.data.summary) {
                    dashboardData = response.data.summary;
                    console.log('🎯 Usando response.data.summary:', dashboardData);
                } else {
                    dashboardData = response.data;
                    console.log('🎯 Usando response.data:', dashboardData);
                }
            } else {
                dashboardData = response;
                console.log('🎯 Usando response directamente:', dashboardData);
            }
            
            const finalData = {
                total_animals: dashboardData.total_animals || 0,
                active_animals: dashboardData.active_animals || 0,
                low_stock_items: dashboardData.low_stock_items || 0,
                total_inventory: dashboardData.total_inventory || 0
            };
            
            console.log('🎯 Datos finales para UI:', finalData);
            this.updateDashboardUI(finalData);
            
        } catch (error) {
            console.error('❌ Error loading dashboard:', error);
            this.showAlert('Error al cargar el dashboard. Mostrando datos básicos.', 'warning');
            this.updateDashboardUI({
                total_animals: 0,
                active_animals: 0,
                low_stock_items: 0,
                total_inventory: 0
            });
        } finally {
            this.showLoading(false);
        }
    }

    updateDashboardUI(data) {
        console.log('🎨 Actualizando UI del dashboard con:', data);
        
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        };

        updateElement('total-animals', data.total_animals || 0);
        updateElement('active-animals', data.active_animals || 0);
        updateElement('low-stock-items', data.low_stock_items || 0);
        updateElement('total-inventory', data.total_inventory || 0);
        
        updateElement('low-stock-alert', (data.low_stock_items || 0) + ' items');
        updateElement('active-animals-alert', (data.active_animals || 0) + ' animales');
        
        console.log('✅ Dashboard actualizado correctamente');
    }

    // ==================== NAVEGACIÓN Y VISTAS ====================

    showView(viewName) {
        if (!this.currentUser && viewName !== 'dashboard') {
            this.showLogin();
            return;
        }

        document.querySelectorAll('.view-container').forEach(view => {
            view.style.display = 'none';
        });

        const currentView = document.getElementById(`${viewName}-view`);
        if (currentView) {
            currentView.style.display = 'block';
            
            const event = new CustomEvent(`${viewName}ViewLoaded`);
            document.dispatchEvent(event);
        }

        this.currentView = viewName;
        this.updateActiveNav();
        this.loadViewData(viewName);
    }

    loadViewData(viewName) {
        switch (viewName) {
            case 'animals':
                if (window.animalsManager && !window.animalsManager.initialized) {
                    window.animalsManager.loadAnimals();
                }
                break;
            case 'sales':
                if (window.salesManager && !window.salesManager.initialized) {
                    window.salesManager.loadSales();
                }
                break;
            case 'feeds':
                if (window.feedsManager && !window.feedsManager.initialized) {
                    window.feedsManager.loadFeeds();
                }
                break;
            case 'inventory':
                if (window.inventoryManager && !window.inventoryManager.initialized) {
                    window.inventoryManager.loadInventory();
                }
                break;
            case 'purchases':
                if (window.purchasesManager && !window.purchasesManager.initialized) {
                    window.purchasesManager.loadPurchases();
                }
                break;
            case 'reports':
                if (window.reportsManager && !window.reportsManager.initialized) {
                    window.reportsManager.generateReports();
                }
                break;
        }
    }

    updateActiveNav() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-view="${this.currentView}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    // ==================== EVENT LISTENERS MEJORADOS ====================

    setupEventListeners() {
        console.log('🔧 Configurando event listeners...');
        
        // ✅ CONEXIÓN ÚNICA de formularios
        if (!this.formsConnected) {
            this.connectFormsManually();
            this.formsConnected = true;
        }

        // ✅ EVENT DELEGATION para toda la navegación
        document.addEventListener('click', (e) => {
            const target = e.target;
            
            // Navegación principal
            const navTarget = target.closest('[data-view]');
            if (navTarget) {
                const view = navTarget.getAttribute('data-view');
                this.showView(view);
                return;
            }
            
            // Refresh dashboard
            if (target.closest('#refresh-dashboard')) {
                this.loadDashboardData();
                return;
            }
            
            // Instalar PWA
            if (target.closest('#install-pwa-btn')) {
                this.installPWA();
                return;
            }
            
            // Logout
            if (target.closest('#logout-btn')) {
                this.logout();
                return;
            }
            
            // Navegación login/register
            if (target.matches('a[href="#"]')) {
                const onclickAttr = target.getAttribute('onclick') || '';
                if (onclickAttr.includes('showRegister')) {
                    e.preventDefault();
                    this.showRegister();
                } else if (onclickAttr.includes('showLogin')) {
                    e.preventDefault();
                    this.showLogin();
                }
            }
        });

        // Manejar tecla Escape para cerrar modales
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal.show');
                if (openModal) {
                    const modal = bootstrap.Modal.getInstance(openModal);
                    if (modal) modal.hide();
                }
            }
        });
    }

    // ✅ MÉTODO MEJORADO: Conexión única de formularios
    connectFormsManually() {
        console.log('🔗 Conectando formularios manualmente...');
        
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        
        if (loginForm) {
            // Remover event listeners existentes
            const newLoginForm = loginForm.cloneNode(true);
            loginForm.parentNode.replaceChild(newLoginForm, loginForm);
            
            newLoginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('🎯 Login form submitted - ÚNICO');
                await this.handleLogin(newLoginForm);
            }, { once: false }); // Permitir múltiples envíos pero no duplicar listeners
        }
        
        if (registerForm) {
            const newRegisterForm = registerForm.cloneNode(true);
            registerForm.parentNode.replaceChild(newRegisterForm, registerForm);
            
            newRegisterForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('🎯 Register form submitted - ÚNICO');
                await this.handleRegister(newRegisterForm);
            }, { once: false });
        }
    }

    // ==================== UTILIDADES UI ====================

    showAlert(message, type = 'info', duration = 5000) {
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
            // Remover event listeners existentes primero
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);
            
            newForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await submitCallback(newForm);
            });
        }
    }

    getFormData(form) {
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            if (value === '') continue;
            
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

    // ==================== UTILIDADES ADICIONALES ====================

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

    static init() {
        if (!window.app) {
            window.app = new App();
        }
        return window.app;
    }
}

// ==================== INICIALIZACIÓN GARANTIZADA ====================

function initializeManagers() {
    console.log('🔄 Inicializando managers...');
    
    if (window.animalsManager && window.salesManager) {
        console.log('✅ Managers ya estaban inicializados');
        return;
    }
    
    if (window.app) {
        window.animalsManager = new AnimalsManager(window.app);
        window.salesManager = new SalesManager(window.app);
        window.feedsManager = new FeedsManager(window.app);
        window.inventoryManager = new InventoryManager(window.app);
        window.purchasesManager = new PurchasesManager(window.app);
        window.reportsManager = new ReportsManager(window.app);
        
        console.log('✅ Todos los managers inicializados');
    } else {
        console.error('❌ App no está disponible');
    }
}

// ✅ INICIALIZACIÓN MEJORADA - Una sola instancia
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM cargado, inicializando app...');
    
    if (!window.app) {
        window.app = new App();
    }
    
    setTimeout(initializeManagers, 500);
});

// Hacer disponible globalmente
window.App = App;
window.formatCurrency = (amount) => {
    return window.app ? window.app.formatCurrency(amount) : `$${amount}`;
};

window.formatDate = (dateString) => {
    return window.app ? window.app.formatDate(dateString) : dateString;
};