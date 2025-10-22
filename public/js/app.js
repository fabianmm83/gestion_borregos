class App {
    constructor() {
        // Configuraciones
        this.API_BASE_URL = 'https://us-central1-gestionborregos.cloudfunctions.net/api';
        this.FIREBASE_API_KEY = 'AIzaSyC7XrvX6AOAUP7dhd6yR4xIO0aqRwGe5nk';
        this.currentView = 'dashboard';
        this.currentUser = null;
        this.deferredPrompt = null;
        this.formsConnected = false;
        this.eventListenersSetup = false;
        this.isInitialized = false;
        this.managersInitialized = false;
        
        this.init();
    }

    async init() {
        console.log('🚀 App inicializando...');
        this.createLoadingElement();
        this.setupPWA();
        
        // ✅ CONEXIÓN ÚNICA de event listeners
        if (!this.eventListenersSetup) {
            this.setupEventListeners();
            this.eventListenersSetup = true;
        }
        
        // Verificar autenticación al iniciar
        await this.checkAuthAndLoad();
        this.isInitialized = true;
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

  
    async checkAuthAndLoad() {
    console.log('🔐 Verificando autenticación...');
    const token = localStorage.getItem('authToken');
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!token) {
        console.log('❌ No hay token, mostrando login');
        this.showLogin();
        return;
    }

    try {
        console.log('🔍 Verificando token directamente con Firebase...');
        this.showLoading(true);
        
        // ⭐⭐ VERIFICACIÓN DIRECTA CON FIREBASE - NO LLAMA A TU API
        const authResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${this.FIREBASE_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: token })
        });

        if (!authResponse.ok) {
            // Si falla, verificar si es por token expirado
            if (authResponse.status === 400) {
                const errorData = await authResponse.json();
                if (errorData.error?.message === 'INVALID_ID_TOKEN') {
                    console.log('🔑 Token inválido/expirado, intentando refresh...');
                    
                    if (refreshToken) {
                        try {
                            const newToken = await this.refreshToken(refreshToken);
                            if (newToken) {
                                localStorage.setItem('authToken', newToken);
                                // Intentar nuevamente con el nuevo token
                                await this.checkAuthAndLoad();
                                return;
                            }
                        } catch (refreshError) {
                            console.log('❌ Error refrescando token:', refreshError);
                        }
                    }
                    
                    // Si no se pudo refrescar, limpiar y mostrar login
                    this.clearAuthData();
                    this.showLogin();
                    this.showAlert('Sesión expirada. Por favor, inicia sesión nuevamente.', 'warning');
                    return;
                }
            }
            throw new Error(`Token verification failed: ${authResponse.status}`);
        }

        const authData = await authResponse.json();
        
        if (authData.users?.[0]) {
            const user = authData.users[0];
            this.currentUser = {
                uid: user.localId,
                email: user.email,
                name: user.displayName || user.email.split('@')[0]
            };
            
            console.log('✅ Usuario autenticado:', this.currentUser.email);
            this.showApp();
            
            // Cargar datos iniciales
            await this.loadInitialData();
            
        } else {
            throw new Error('Token inválido - no user data');
        }
        
    } catch (error) {
        console.error('❌ Error en verificación de token:', error);
        this.clearAuthData();
        this.showLogin();
        
        if (!error.message.includes('Failed to fetch')) {
            this.showAlert('Error de autenticación. Por favor, inicia sesión nuevamente.', 'danger');
        }
    } finally {
        this.showLoading(false);
    }
}


    async refreshToken(refreshToken) {
    try {
        console.log('🔄 Refrescando token...');
        const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${this.FIREBASE_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `grant_type=refresh_token&refresh_token=${refreshToken}`
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        const data = await response.json();
        console.log('✅ Token refrescado exitosamente');
        
        localStorage.setItem('authToken', data.id_token);
        if (data.refresh_token) {
            localStorage.setItem('refreshToken', data.refresh_token);
        }
        
        return data.id_token;
    } catch (error) {
        console.error('❌ Error en refreshToken:', error);
        throw error;
    }
}
    

    isTokenExpired(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expTime = payload.exp * 1000;
            const currentTime = Date.now();
            const bufferTime = 5 * 60 * 1000; // 5 minutos de margen
            
            console.log(`⏰ Token expira en: ${new Date(expTime).toLocaleString()}`);
            console.log(`⏰ Hora actual: ${new Date(currentTime).toLocaleString()}`);
            console.log(`⏰ Diferencia: ${(expTime - currentTime) / 1000} segundos`);
            
            return (expTime - bufferTime) < currentTime;
        } catch (error) {
            console.error('❌ Error verificando token:', error);
            return true;
        }
    }

    clearAuthData() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        this.currentUser = null;
    }

    showLogin() {
        document.getElementById('app-container').style.display = 'none';
        document.getElementById('login-container').style.display = 'block';
        document.getElementById('register-container').style.display = 'none';
        this.currentView = 'login';
    }

    showApp() {
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('register-container').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        
        // Asegurar que la vista actual se muestre
        if (this.currentView && this.currentView !== 'login') {
            this.showView(this.currentView);
        } else {
            this.showView('dashboard');
        }
    }

    showRegister() {
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('register-container').style.display = 'block';
        this.currentView = 'register';
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

            console.log('🔐 Intentando login:', { email });

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
                name: authData.displayName || email.split('@')[0]
            };

            // Verificar/crear perfil en Firestore (OPCIONAL - no crítico)
            try {
                console.log('🔄 Verificando/Creando perfil en Firestore...');
                await this.apiCall('/auth/create-admin', {
                    method: 'POST',
                    body: { 
                        email, 
                        name: authData.displayName || email.split('@')[0],
                        uid: authData.localId
                    }
                });
                console.log('✅ Perfil creado/verificado en Firestore');
            } catch (profileError) {
                console.warn('⚠️ Error creando/verificando perfil:', profileError);
                // No es crítico, continuar
            }

            this.showAlert('¡Bienvenido!', 'success');
            this.showApp();
            await this.loadInitialData();
            
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

            console.log('👤 Intentando crear cuenta:', { name, email });

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

            // Crear perfil en nuestro backend (OPCIONAL - no crítico)
            try {
                await this.apiCall('/auth/create-admin', {
                    method: 'POST',
                    body: { 
                        email, 
                        name,
                        uid: authData.localId
                    }
                });
                console.log('✅ Perfil creado en backend');
            } catch (profileError) {
                console.warn('⚠️ Error creando perfil:', profileError);
                // No es crítico, continuar
            }

            this.showAlert('¡Cuenta creada exitosamente!', 'success');
            this.showApp();
            await this.loadInitialData();
            
        } catch (error) {
            console.error('❌ Error completo al registrar:', error);
            this.showAlert('Error al crear cuenta: ' + error.message, 'danger');
        } finally {
            this.showLoading(false);
        }
    }

    logout() {
        this.clearAuthData();
        this.showLogin();
        this.showAlert('Sesión cerrada correctamente', 'info');
    }

    // ==================== INICIALIZACIÓN DE MANAGERS MEJORADA ====================

    async loadInitialData() {
        try {
            console.log('📦 Cargando datos iniciales...');
            
            // Cargar dashboard
            await this.loadDashboardData();
            
            // Inicializar managers
            this.initializeManagers();
            
            console.log('✅ Todos los datos iniciales cargados');
        } catch (error) {
            console.error('❌ Error cargando datos iniciales:', error);
            // No mostrar alerta para no molestar al usuario
        }
    }

    initializeManagers() {
        if (this.managersInitialized) {
            console.log('✅ Managers ya inicializados');
            return;
        }

        console.log('🔄 Inicializando managers...');
        
        try {
            // Solo inicializar si no existen
            if (typeof AnimalsManager !== 'undefined' && !window.animalsManager) {
                window.animalsManager = new AnimalsManager(this);
                console.log('✅ AnimalsManager inicializado');
            }
            
            if (typeof SalesManager !== 'undefined' && !window.salesManager) {
                window.salesManager = new SalesManager(this);
                console.log('✅ SalesManager inicializado');
            }
            
            if (typeof FeedsManager !== 'undefined' && !window.feedsManager) {
                window.feedsManager = new FeedsManager(this);
                console.log('✅ FeedsManager inicializado');
            }
            
            if (typeof InventoryManager !== 'undefined' && !window.inventoryManager) {
                window.inventoryManager = new InventoryManager(this);
                console.log('✅ InventoryManager inicializado');
            }
            
            if (typeof PurchasesManager !== 'undefined' && !window.purchasesManager) {
                window.purchasesManager = new PurchasesManager(this);
                console.log('✅ PurchasesManager inicializado');
            }
            
            if (typeof ReportsManager !== 'undefined' && !window.reportsManager) {
                window.reportsManager = new ReportsManager(this);
                console.log('✅ ReportsManager inicializado');
            }
            
            this.managersInitialized = true;
            console.log('✅ Todos los managers inicializados correctamente');
        } catch (error) {
            console.error('❌ Error inicializando managers:', error);
        }
    }

    // ==================== COMUNICACIÓN CON API ====================

    async apiCall(endpoint, options = {}) {
        const token = localStorage.getItem('authToken');
        
        try {
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

            console.log(`🌐 API Call: ${endpoint}`);
            const response = await fetch(`${this.API_BASE_URL}${endpoint}`, config);
            
            if (response.status === 401) {
                console.log('🔐 Token inválido, limpiando sesión');
                this.clearAuthData();
                this.showLogin();
                throw new Error('Sesión expirada');
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log(`✅ API Call exitoso: ${endpoint}`);
            return data;

        } catch (error) {
            console.error(`❌ API Call error [${endpoint}]:`, error);
            
            if (error.message.includes('Sesión expirada')) {
                this.showAlert('Sesión expirada. Por favor, inicia sesión nuevamente.', 'warning');
            } else if (error.message.includes('Failed to fetch')) {
                this.showAlert('Error de conexión. Verifica tu internet.', 'danger');
            } else if (!error.message.includes('Sesión expirada')) {
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

    // ==================== NAVEGACIÓN Y VISTAS MEJORADA ====================

    showView(viewName) {
        console.log(`🔄 Cambiando a vista: ${viewName}`);
        
        if (!this.currentUser && viewName !== 'login' && viewName !== 'register') {
            console.log('❌ Usuario no autenticado, redirigiendo a login');
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
            this.currentView = viewName;
            
            console.log(`✅ Vista ${viewName} mostrada`);
            
            // Disparar evento personalizado
            const event = new CustomEvent(`${viewName}ViewLoaded`);
            document.dispatchEvent(event);
        } else {
            console.error(`❌ Vista ${viewName} no encontrada`);
        }

        this.updateActiveNav();
        this.loadViewData(viewName);
    }

    loadViewData(viewName) {
        console.log(`📊 Cargando datos para vista: ${viewName}`);
        
        // Pequeño delay para asegurar que la vista esté renderizada
        setTimeout(() => {
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
                case 'purchases':
                    if (window.purchasesManager) {
                        window.purchasesManager.loadPurchases();
                    }
                    break;
                case 'reports':
                    if (window.reportsManager) {
                        window.reportsManager.generateReports();
                    }
                    break;
            }
        }, 100);
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

        // Manejar recarga de página - PREVENIR DUPLICACIÓN
        window.addEventListener('beforeunload', () => {
            console.log('🔄 Página recargando...');
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
        
        if (loginForm && !loginForm.hasAttribute('data-connected')) {
            loginForm.setAttribute('data-connected', 'true');
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('🎯 Login form submitted - ÚNICO');
                await this.handleLogin(loginForm);
            });
        }
        
        if (registerForm && !registerForm.hasAttribute('data-connected')) {
            registerForm.setAttribute('data-connected', 'true');
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('🎯 Register form submitted - ÚNICO');
                await this.handleRegister(registerForm);
            });
        }
    }

    // ==================== UTILIDADES UI ====================

    showAlert(message, type = 'info', duration = 5000) {
        // Buscar contenedor de alertas existente o crear uno
        let alertContainer = document.getElementById('alert-container');
        if (!alertContainer) {
            alertContainer = document.createElement('div');
            alertContainer.id = 'alert-container';
            alertContainer.style.cssText = 'position: fixed; top: 80px; right: 20px; z-index: 1060; max-width: 400px;';
            document.body.appendChild(alertContainer);
        }

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            <i class="fas fa-${this.getAlertIcon(type)} me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        alertContainer.appendChild(alertDiv);

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
        if (form && !form.hasAttribute('data-connected')) {
            form.setAttribute('data-connected', 'true');
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

// ✅ INICIALIZACIÓN MEJORADA - Una sola instancia
let appInitialized = false;

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM cargado, inicializando app...');
    
    if (appInitialized) {
        console.log('✅ App ya estaba inicializada');
        return;
    }
    
    try {
        if (!window.app) {
            window.app = new App();
        }
        appInitialized = true;
        
    } catch (error) {
        console.error('❌ Error crítico al inicializar la app:', error);
        // Mostrar interfaz de login como fallback
        document.getElementById('login-container').style.display = 'block';
        document.getElementById('app-container').style.display = 'none';
    }
});



// 🔄 Detectar y manejar actualizaciones del Service Worker
if ('serviceWorker' in navigator) {
    let newServiceWorker;
    
    // Registrar el Service Worker
    navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
            console.log('✅ SW registrado:', registration);
            
            // Detectar cuando hay una nueva versión
            registration.addEventListener('updatefound', () => {
                newServiceWorker = registration.installing;
                console.log('🔄 Nueva versión del SW encontrada');
                
                newServiceWorker.addEventListener('statechange', () => {
                    if (newServiceWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // Nueva versión instalada, mostrar notificación
                        showUpdateNotification();
                    }
                });
            });
        })
        .catch((error) => {
            console.log('❌ Error registrando SW:', error);
        });
    
    // Detectar cuando el control cambia (nueva versión activa)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('🔄 Control cambiado, recargando...');
        window.location.reload();
    });
}

// 🔔 Mostrar notificación de actualización
function showUpdateNotification() {
    if (confirm('¡Nueva versión disponible! ¿Quieres actualizar ahora?')) {
        // Enviar mensaje al SW para saltar espera
        if (newServiceWorker) {
            newServiceWorker.postMessage({action: 'skipWaiting'});
        }
    }
}

// 🔄 Forzar actualización (para debugging)
function forceUpdate() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
            registrations.forEach((registration) => {
                registration.unregister().then(() => {
                    caches.keys().then((cacheNames) => {
                        cacheNames.forEach((cacheName) => {
                            caches.delete(cacheName);
                        });
                    }).then(() => {
                        window.location.reload(true);
                    });
                });
            });
        });
    }
}

// Hacer disponible globalmente
window.App = App;
window.formatCurrency = (amount) => {
    return window.app ? window.app.formatCurrency(amount) : `$${amount}`;
};

window.formatDate = (dateString) => {
    return window.app ? window.app.formatDate(dateString) : dateString;
};