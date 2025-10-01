class App {
    constructor() {
        // Configuraciones
        this.API_BASE_URL = 'https://us-central1-gestionborregos.cloudfunctions.net/api';
        this.FIREBASE_API_KEY = 'AIzaSyC7XrvX6AOAUP7dhd6yR4xIO0aqRwGe5nk';
        this.currentView = 'dashboard';
        this.currentUser = null;
        this.databaseInitialized = false; // Nueva bandera
        this.init();
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
            console.log('🔄 Verificando estado de la base de datos...');
            
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
                        this.loadDashboardData();
                    }
                } else {
                    console.log('✅ Base de datos ya inicializada o con datos existentes');
                }
            }, 2000); // Esperar 2 segundos después del login
            
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
        this.databaseInitialized = false; // Resetear bandera
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
                // No mostrar alerta para errores 404 de colecciones vacías
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
            // No mostrar error para dashboard vacío
            if (!error.message.includes('404') || !error.message.includes('no encontrado')) {
                this.showAlert('Error al cargar el dashboard: ' + error.message, 'danger');
            }
            // Actualizar UI con valores por defecto
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

    // ... (el resto del código permanece igual, manteniendo todas las otras funciones)

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

    // ... (mantener todas las otras funciones sin cambios)

}

// CONEXIÓN GARANTIZADA - Ejecutar después de que todo esté cargado
function initializeAppWithRetry() {
    console.log('🔄 Inicializando app con retry...');
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('📄 DOM completamente cargado');
            const app = App.init();
            
            setTimeout(() => {
                if (app && app.connectFormsManually) {
                    app.connectFormsManually();
                }
            }, 500);
        });
    } else {
        console.log('📄 DOM ya está cargado');
        const app = App.init();
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