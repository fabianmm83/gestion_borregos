class App {
    constructor() {
        // Configuraciones
        this.API_BASE_URL = 'https://us-central1-gestionborregos.cloudfunctions.net/api';
        this.FIREBASE_API_KEY = 'AIzaSyC7XrvX6AOAUP7dhd6yR4xIO0aqRwGe5nk';
        this.currentView = 'dashboard';
        this.currentUser = null;
        this.databaseInitialized = false;
    }

    // Método estático para crear instancia
    static create() {
        if (!window.app) {
            window.app = new App();
            window.app.init();
        }
        return window.app;
    }

    init() {
        console.log('🚀 App inicializando...');
        this.createLoadingElement();
        this.setupEventListeners();
        
        // Verificar autenticación al iniciar
        this.checkAuthAndLoad();
    }

    // ==================== INICIALIZACIÓN DE BASE DE DATOS ====================

    async initializeDatabase() {
        try {
            this.showLoading(true);
            console.log('🔄 Inicializando base de datos...');
            
            // Verificar si ya existen datos
            const hasData = await this.checkExistingData();
            if (hasData) {
                console.log('✅ La base de datos ya tiene datos, omitiendo inicialización');
                this.databaseInitialized = true;
                return true;
            }

            console.log('📊 Creando datos de ejemplo...');

            // Crear colecciones
            await this.createAnimalsCollection();
            await this.createFeedsCollection();
            await this.createSalesCollection();
            await this.createInventoryCollection();
            
            console.log('🎉 Base de datos inicializada exitosamente');
            this.databaseInitialized = true;
            this.showAlert('Base de datos inicializada con datos de ejemplo', 'success');
            return true;
            
        } catch (error) {
            console.error('❌ Error inicializando base de datos:', error);
            this.showAlert('Error al inicializar base de datos: ' + error.message, 'danger');
            return false;
        } finally {
            this.showLoading(false);
        }
    }

    async checkExistingData() {
        try {
            // Verificar si ya hay animales
            const animals = await this.apiCall('/animals');
            const hasAnimals = animals && animals.length > 0;
            console.log('📊 Verificando datos existentes:', { hasAnimals, animalCount: animals?.length });
            return hasAnimals;
        } catch (error) {
            console.log('📊 No hay datos existentes o error al verificar:', error.message);
            return false;
        }
    }

    async createAnimalsCollection() {
        const animals = [
            {
                name: "Borrego Blanco",
                earTag: "A001",
                breed: "Katahdin",
                gender: "male",
                birthDate: "2023-05-15",
                weight: 45.5,
                status: "active",
                notes: "Borrego saludable y activo",
                createdAt: new Date().toISOString()
            },
            {
                name: "Borrego Negro",
                earTag: "A002",
                breed: "Dorper",
                gender: "female",
                birthDate: "2023-06-20",
                weight: 42.0,
                status: "active",
                notes: "Hembra reproductora",
                createdAt: new Date().toISOString()
            },
            {
                name: "Borrego Grande",
                earTag: "A003",
                breed: "Suffolk",
                gender: "male",
                birthDate: "2023-04-10",
                weight: 52.5,
                status: "active",
                notes: "Para venta próxima",
                createdAt: new Date().toISOString()
            }
        ];

        for (const animal of animals) {
            await this.apiCall('/animals', {
                method: 'POST',
                body: animal
            });
            console.log(`✅ Animal creado: ${animal.name}`);
        }
    }

    async createFeedsCollection() {
        const feeds = [
            {
                feedType: "Alfalfa",
                quantity: 10,
                unit: "kg",
                animalEarTag: "A001",
                animalName: "Borrego Blanco",
                feedingDate: new Date().toISOString().split('T')[0],
                notes: "Alimentación matutina",
                createdAt: new Date().toISOString()
            },
            {
                feedType: "Concentrado",
                quantity: 5,
                unit: "kg",
                feedingDate: new Date().toISOString().split('T')[0],
                notes: "Alimentación general del rebaño",
                createdAt: new Date().toISOString()
            }
        ];

        for (const feed of feeds) {
            await this.apiCall('/feeds', {
                method: 'POST',
                body: feed
            });
            console.log(`✅ Alimentación creada: ${feed.feedType}`);
        }
    }

    async createSalesCollection() {
        const sales = [
            {
                animalEarTag: "A001",
                animalName: "Borrego Blanco",
                salePrice: 2500.00,
                weightAtSale: 48.5,
                buyerName: "Juan Pérez",
                buyerContact: "555-1234",
                saleDate: "2024-01-10",
                notes: "Venta directa en granja",
                createdAt: new Date().toISOString()
            },
            {
                animalEarTag: "A002", 
                animalName: "Borrego Negro",
                salePrice: 2300.00,
                weightAtSale: 45.0,
                buyerName: "María García",
                buyerContact: "555-5678",
                saleDate: "2024-01-08",
                notes: "Venta por contrato",
                createdAt: new Date().toISOString()
            }
        ];

        for (const sale of sales) {
            await this.apiCall('/sales', {
                method: 'POST',
                body: sale
            });
            console.log(`✅ Venta creada: ${sale.animalName}`);
        }
    }

    async createInventoryCollection() {
        const inventory = [
            {
                item_type: "medicine",
                itemName: "Antibiótico Ovinos",
                currentStock: 5,
                minStock: 10,
                unit: "unidades",
                price: 150.00,
                supplier: "Farmacia Veterinaria SA",
                purchase_date: "2024-01-01",
                expiration_date: "2024-12-31",
                notes: "Antibiótico de amplio espectro",
                createdAt: new Date().toISOString()
            },
            {
                item_type: "supplies",
                itemName: "Alimento Concentrado",
                currentStock: 500,
                minStock: 100,
                unit: "kg",
                price: 25.50,
                supplier: "Alimentos Premium",
                purchase_date: "2024-01-05",
                expiration_date: "2024-06-30",
                notes: "Alimento para crecimiento",
                createdAt: new Date().toISOString()
            },
            {
                item_type: "tools",
                itemName: "Tijeras de Esquila",
                currentStock: 2,
                minStock: 1,
                unit: "unidades",
                price: 450.00,
                supplier: "Herramientas Agro",
                purchase_date: "2023-12-15",
                notes: "Tijeras profesionales para esquila",
                createdAt: new Date().toISOString()
            }
        ];

        for (const item of inventory) {
            await this.apiCall('/inventory', {
                method: 'POST',
                body: item
            });
            console.log(`✅ Inventario creado: ${item.itemName}`);
        }
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
                    
                    // Inicializar base de datos automáticamente después del login
                    this.initializeDatabaseAfterLogin();
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

    async initializeDatabaseAfterLogin() {
        try {
            console.log('🔄 Verificando estado de la base de datos después del login...');
            
            // Esperar un poco para que la UI se estabilice
            setTimeout(async () => {
                const hasData = await this.checkExistingData();
                
                if (!hasData && !this.databaseInitialized) {
                    console.log('📊 Base de datos vacía, inicializando automáticamente...');
                    
                    // Mostrar mensaje al usuario
                    this.showAlert('Inicializando base de datos con datos de ejemplo...', 'info');
                    
                    // Inicializar base de datos
                    const success = await this.initializeDatabase();
                    
                    if (success) {
                        // Recargar el dashboard para mostrar los nuevos datos
                        setTimeout(() => {
                            this.loadDashboardData();
                        }, 1000);
                    }
                } else {
                    console.log('✅ Base de datos ya inicializada o con datos existentes');
                }
            }, 3000);
            
        } catch (error) {
            console.error('Error en inicialización automática:', error);
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

    async handleRegister(form) {
        try {
            this.showLoading(true);
            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;

            console.log('Intentando crear cuenta:', { name, email });

            // 1. Crear usuario en Firebase Auth
            const authResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${this.FIREBASE_API_KEY}`, {
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

            console.log('✅ Usuario creado en Auth:', authData);

            // 2. Guardar el token inmediatamente
            localStorage.setItem('authToken', authData.idToken);
            this.currentUser = {
                uid: authData.localId,
                email: authData.email,
                name: name
            };

            // 3. Crear perfil en nuestro backend
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
            
            // Inicializar base de datos después del registro
            this.initializeDatabaseAfterLogin();
            
        } catch (error) {
            console.error('❌ Error completo al registrar:', error);
            this.showAlert('Error al crear cuenta: ' + error.message, 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    async handleLogin(form) {
        try {
            this.showLoading(true);
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            console.log('Intentando login:', { email });

            // Login con Firebase Auth
            const authResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${this.FIREBASE_API_KEY}`, {
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

            console.log('✅ Login exitoso:', authData);

            // Guardar token y usuario
            localStorage.setItem('authToken', authData.idToken);
            this.currentUser = {
                uid: authData.localId,
                email: authData.email,
                name: authData.displayName || email
            };

            // Crear/verificar perfil en Firestore
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
                this.showAlert('Login exitoso, pero hubo un problema con el perfil. Puede que algunas funciones no estén disponibles.', 'warning');
            }

            this.showAlert('¡Bienvenido!', 'success');
            this.showApp();
            this.loadDashboardData();
            
            // Inicializar base de datos después del login
            this.initializeDatabaseAfterLogin();
            
        } catch (error) {
            console.error('❌ Error en login:', error);
            this.showAlert('Error al iniciar sesión: ' + error.message, 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    logout() {
        localStorage.removeItem('authToken');
        this.currentUser = null;
        this.databaseInitialized = false;
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

            if (token && !endpoint.includes('/auth/') && endpoint !== '/health') {
                config.headers['Authorization'] = `Bearer ${token}`;
            }

            if (config.body && typeof config.body === 'object') {
                config.body = JSON.stringify(config.body);
            }

            console.log('🌐 API Call:', endpoint, config);

            const response = await fetch(`${this.API_BASE_URL}${endpoint}`, config);

            if (response.status === 401) {
                this.showLogin();
                throw new Error('Sesión expirada');
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error ${response.status}: ${errorText || response.statusText}`);
            }

            const result = await response.json();
            console.log('✅ API Response:', result);
            return result;

        } catch (error) {
            console.error('❌ API Call error:', error);
            
            if (!error.message.includes('Sesión expirada')) {
                if (!error.message.includes('404') || !error.message.includes('no encontrado')) {
                    this.showAlert('Error en la conexión: ' + error.message, 'danger');
                }
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
            if (!error.message.includes('404') || !error.message.includes('no encontrado')) {
                this.showAlert('Error al cargar el dashboard: ' + error.message, 'danger');
            }
            this.updateDashboardUI({});
        } finally {
            this.showLoading(false);
        }
    }

    updateDashboardUI(data) {
        const elements = {
            'total-animals': data.total_animals || 0,
            'active-animals': data.active_animals || 0,
            'low-stock-items': data.low_stock_items || 0,
            'total-inventory': data.total_inventory || 0,
            'low-stock-alert': (data.low_stock_items || 0) + ' items',
            'active-animals-alert': (data.active_animals || 0) + ' animales'
        };

        Object.keys(elements).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = elements[id];
            }
        });
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
                if (window.animalsManager) window.animalsManager.loadAnimals();
                break;
            case 'sales':
                if (window.salesManager) window.salesManager.loadSales();
                break;
            case 'feeds':
                if (window.feedsManager) window.feedsManager.loadFeeds();
                break;
            case 'inventory':
                if (window.inventoryManager) window.inventoryManager.loadInventory();
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

    // ==================== EVENT LISTENERS ====================

    setupEventListeners() {
        console.log('🔧 Configurando event listeners...');
        this.connectFormsManually();

        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-view]') || e.target.closest('[data-view]')) {
                const target = e.target.matches('[data-view]') ? e.target : e.target.closest('[data-view]');
                const view = target.getAttribute('data-view');
                this.showView(view);
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.matches('#refresh-dashboard') || e.target.closest('#refresh-dashboard')) {
                this.loadDashboardData();
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideModal(e.target.id);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal.show');
                if (openModal) {
                    this.hideModal(openModal.id);
                }
            }
        });
    }

    connectFormsManually() {
        console.log('🔗 Conectando formularios manualmente...');
        
        // Formulario de LOGIN
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            console.log('✅ Login form encontrado, conectando...');
            loginForm.onsubmit = async (e) => {
                e.preventDefault();
                console.log('🎯 Login form submitted - MANUAL');
                await this.handleLogin(loginForm);
            };
        } else {
            console.log('❌ Login form NO encontrado');
        }
        
        // Formulario de REGISTRO
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            console.log('✅ Register form encontrado, conectando...');
            registerForm.onsubmit = async (e) => {
                e.preventDefault();
                console.log('🎯 Register form submitted - MANUAL');
                await this.handleRegister(registerForm);
            };
        } else {
            console.log('❌ Register form NO encontrado');
        }
        
        // Botones de navegación login/register
        const showRegisterLinks = document.querySelectorAll('a[href="#"][onclick*="showRegister"]');
        showRegisterLinks.forEach(link => {
            link.onclick = (e) => {
                e.preventDefault();
                console.log('🔄 Mostrando registro');
                this.showRegister();
            };
        });
        
        const showLoginLinks = document.querySelectorAll('a[href="#"][onclick*="showLogin"]');
        showLoginLinks.forEach(link => {
            link.onclick = (e) => {
                e.preventDefault();
                console.log('🔄 Mostrando login');
                this.showLogin();
            };
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
}

// CONEXIÓN GARANTIZADA - Ejecutar después de que todo esté cargado
function initializeAppWithRetry() {
    console.log('🔄 Inicializando app con retry...');
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('📄 DOM completamente cargado');
            const app = App.create();
            
            setTimeout(() => {
                if (app && app.connectFormsManually) {
                    app.connectFormsManually();
                }
            }, 500);
        });
    } else {
        console.log('📄 DOM ya está cargado');
        const app = App.create();
        setTimeout(() => {
            if (app && app.connectFormsManually) {
                app.connectFormsManually();
            }
        }, 500);
    }
}

// Inicializar la aplicación
initializeAppWithRetry();

// Hacer disponible globalmente para otros scripts
window.App = App;

// Utilidades globales de formato
window.formatCurrency = (amount) => {
    return window.app ? window.app.formatCurrency(amount) : `$${amount}`;
};

window.formatDate = (dateString) => {
    return window.app ? window.app.formatDate(dateString) : dateString;
};

// Función global para inicializar base de datos (desde consola del navegador)
window.initializeDatabase = function() {
    if (window.app) {
        window.app.initializeDatabase();
    } else {
        console.error('App no está inicializada');
    }
};

// Función para forzar inicialización (útil para debugging)
window.forceInitializeDatabase = async function() {
    if (window.app) {
        console.log('🔧 Forzando inicialización de base de datos...');
        await window.app.initializeDatabase();
    } else {
        console.error('App no está inicializada');
    }
};