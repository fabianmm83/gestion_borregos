const { onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// Configurar opciones globales para Gen 2
setGlobalOptions({
  region: 'us-central1',
  maxInstances: 10,
  memory: '256MiB',
  timeoutSeconds: 60
});

// Inicializar Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Configuración mejorada de Firestore
db.settings({ 
    ignoreUndefinedProperties: true,
    timeout: 30000 
});

const app = express();

// ==================== CONFIGURACIONES DE SEGURIDAD ====================

// ⭐⭐ PRIMERO: Headers de seguridad (CRÍTICO)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'DENY');
    res.header('X-XSS-Protection', '1; mode=block');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// ⭐⭐ SEGUNDO: Configuración de CORS
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

app.options('*', cors());

// ⭐⭐ TERCERO: Middleware para parsear JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// ==================== UTILIDADES Y CONSTANTES ====================

const COLLECTIONS = {
    USERS: 'users',
    ANIMALS: 'animals',
    SALES: 'sales',
    FEEDS: 'feeds',
    INVENTORY: 'inventory',
    PURCHASES: 'purchases'
};

const ANIMAL_STATUS = {
    ACTIVE: 'active',
    SOLD: 'sold',
    DECEASED: 'deceased',
    TRANSFERRED: 'transferred'
};

// Función de utilidad para respuestas estandarizadas
const createResponse = (success, data = null, message = '', error = null) => {
    return {
        success,
        data,
        message,
        error,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    };
};

// Función de utilidad para logging
const logger = {
    info: (message, data = null) => {
        console.log(`ℹ️ [INFO] ${message}`, data ? JSON.stringify(data) : '');
    },
    error: (message, error = null) => {
        console.error(`❌ [ERROR] ${message}`, error ? error.stack : '');
    },
    warn: (message, data = null) => {
        console.warn(`⚠️ [WARN] ${message}`, data ? JSON.stringify(data) : '');
    }
};

// ==================== MIDDLEWARE MEJORADO ====================

// Middleware de autenticación
const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json(
                createResponse(false, null, 'No token provided', 'MISSING_TOKEN')
            );
        }

        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        
        logger.info(`Usuario autenticado: ${decodedToken.email}`, { uid: decodedToken.uid });
        next();
    } catch (error) {
        logger.error('Error en autenticación', error);
        const errorCode = error.code === 'auth/id-token-expired' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
        return res.status(401).json(
            createResponse(false, null, 'Token inválido o expirado', errorCode)
        );
    }
};

// ==================== ENDPOINTS PÚBLICOS ====================

app.get('/', (req, res) => {
    res.json(createResponse(true, {
        status: 'API funcionando',
        message: 'Sistema de Gestión de Borregos - Versión Mejorada',
        endpoints: [
            'GET    /health',
            'POST   /auth/create-admin',
            'POST   /auth/verify',
            'POST   /auth/logout',
            'POST   /initialize',
            'GET    /dashboard',
            'GET    /animals',
            'POST   /animals',
            'GET    /animals/:id',
            'PUT    /animals/:id',
            'DELETE /animals/:id',
            'GET    /sales',
            'POST   /sales',
            'DELETE /sales/:id',
            'GET    /feeds',
            'POST   /feeds',
            'PUT    /feeds/:id',
            'DELETE /feeds/:id',
            'GET    /inventory',
            'POST   /inventory',
            'GET    /inventory/:id',
            'PUT    /inventory/:id',
            'DELETE /inventory/:id',
            'PUT    /inventory/:id/stock',
            'GET    /purchases',
            'POST   /purchases',
            'PUT    /purchases/:id',
            'DELETE /purchases/:id'
        ]
    }, 'Bienvenido al Sistema de Gestión de Borregos'));
});

app.get('/health', (req, res) => {
    res.json(createResponse(true, {
        status: 'OK',
        serverTime: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    }, 'Sistema funcionando correctamente'));
});

// ==================== ENDPOINTS DE AUTENTICACIÓN MEJORADOS ====================

app.post('/auth/create-admin', async (req, res) => {
    try {
        const { email, name, uid } = req.body;

        logger.info('Solicitud de creación de administrador', { email, name });

        if (!email) {
            return res.status(400).json(
                createResponse(false, null, 'Email es requerido', 'MISSING_EMAIL')
            );
        }

        let userId = uid;
        
        // Crear usuario en Firebase Auth si no existe
        if (!userId) {
            try {
                const userRecord = await admin.auth().createUser({
                    email,
                    displayName: name,
                    emailVerified: true,
                    password: Math.random().toString(36).slice(-12) + 'A1!'
                });
                userId = userRecord.uid;
                logger.info('Usuario creado en Firebase Auth', { userId });
            } catch (authError) {
                if (authError.code === 'auth/email-already-exists') {
                    const userRecord = await admin.auth().getUserByEmail(email);
                    userId = userRecord.uid;
                    logger.info('Usuario ya existe en Firebase Auth', { userId });
                } else {
                    throw authError;
                }
            }
        }

        // Crear perfil en Firestore
        const userProfile = {
            email,
            name: name || 'Administrador',
            role: 'admin',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastLogin: null
        };

        await db.collection(COLLECTIONS.USERS).doc(userId).set(userProfile, { merge: true });
        logger.info('Perfil de administrador creado en Firestore', { userId });

        res.status(201).json(createResponse(true, {
            userId,
            profile: userProfile
        }, 'Usuario administrador creado/actualizado exitosamente'));

    } catch (error) {
        logger.error('Error en creación de administrador', error);
        res.status(500).json(createResponse(false, null, 'Error al crear usuario administrador', {
            code: error.code,
            message: error.message
        }));
    }
});

// Verificar y refrescar token - MEJORADO
app.post('/auth/verify', async (req, res) => {
    try {
        const { token, refreshToken } = req.body;
        
        if (!token && !refreshToken) {
            return res.status(400).json(
                createResponse(false, null, 'Token o refresh token requerido', 'MISSING_TOKEN')
            );
        }

        let decodedToken;
        let newToken;

        // Intentar verificar el token principal primero
        if (token) {
            try {
                decodedToken = await admin.auth().verifyIdToken(token);
            } catch (tokenError) {
                // Si el token expiró, usar refresh token
                if (tokenError.code === 'auth/id-token-expired' && refreshToken) {
                    try {
                        // Buscar sesión por refresh token
                        const userRefreshDoc = await db.collection('user_sessions')
                            .where('refreshToken', '==', refreshToken)
                            .limit(1)
                            .get();
                            
                        if (!userRefreshDoc.empty) {
                            const sessionData = userRefreshDoc.docs[0].data();
                            // Verificar que la sesión no haya expirado
                            if (sessionData.expiresAt && new Date(sessionData.expiresAt.toDate()) > new Date()) {
                                const userRecord = await admin.auth().getUser(sessionData.uid);
                                decodedToken = {
                                    uid: sessionData.uid,
                                    email: userRecord.email,
                                    name: userRecord.displayName
                                };
                                // Marcar que necesitamos generar nuevo token
                                newToken = true;
                            } else {
                                // Eliminar sesión expirada
                                await db.collection('user_sessions').doc(sessionData.uid).delete();
                                throw new Error('Refresh token expirado');
                            }
                        } else {
                            throw new Error('Refresh token inválido');
                        }
                    } catch (refreshError) {
                        return res.status(401).json(
                            createResponse(false, null, 'Sesión expirada', 'SESSION_EXPIRED')
                        );
                    }
                } else {
                    throw tokenError;
                }
            }
        } else if (refreshToken) {
            // Solo tenemos refresh token
            try {
                const userRefreshDoc = await db.collection('user_sessions')
                    .where('refreshToken', '==', refreshToken)
                    .limit(1)
                    .get();
                    
                if (!userRefreshDoc.empty) {
                    const sessionData = userRefreshDoc.docs[0].data();
                    // Verificar expiración
                    if (sessionData.expiresAt && new Date(sessionData.expiresAt.toDate()) > new Date()) {
                        const userRecord = await admin.auth().getUser(sessionData.uid);
                        decodedToken = {
                            uid: sessionData.uid,
                            email: userRecord.email,
                            name: userRecord.displayName
                        };
                        newToken = true;
                    } else {
                        await db.collection('user_sessions').doc(sessionData.uid).delete();
                        throw new Error('Refresh token expirado');
                    }
                } else {
                    return res.status(401).json(
                        createResponse(false, null, 'Sesión inválida', 'INVALID_SESSION')
                    );
                }
            } catch (refreshError) {
                return res.status(401).json(
                    createResponse(false, null, 'Error al refrescar sesión', 'REFRESH_ERROR')
                );
            }
        }

        // Obtener información del usuario desde Firestore
        const userDoc = await db.collection(COLLECTIONS.USERS).doc(decodedToken.uid).get();
        const userData = userDoc.exists ? userDoc.data() : {};

        // Generar nuevo refresh token si es necesario
        const newRefreshToken = newToken ? require('crypto').randomBytes(32).toString('hex') : null;

        // Guardar sesión si hay nuevo refresh token
        if (newRefreshToken) {
            await db.collection('user_sessions').doc(decodedToken.uid).set({
                uid: decodedToken.uid,
                refreshToken: newRefreshToken,
                lastRefresh: admin.firestore.FieldValue.serverTimestamp(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
            });
        }

        // Actualizar último login
        if (userDoc.exists) {
            await db.collection(COLLECTIONS.USERS).doc(decodedToken.uid).update({
                lastLogin: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        res.json(createResponse(true, {
            valid: true,
            token: token, // Mantener el token original o indicar que se necesita uno nuevo
            refreshToken: newRefreshToken || refreshToken,
            user: {
                uid: decodedToken.uid,
                email: decodedToken.email,
                name: decodedToken.name || userData.name || decodedToken.email,
                role: userData.role || 'user',
                lastLogin: userData.lastLogin?.toDate?.() || null
            }
        }, newToken ? 'Sesión refrescada exitosamente' : 'Token válido'));

    } catch (error) {
        logger.error('Error en verificación de token', error);
        res.status(401).json(createResponse(false, null, 'Token inválido', 'INVALID_TOKEN'));
    }
});

// Cerrar sesión (invalidar refresh token)
app.post('/auth/logout', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        
        // Eliminar sesión
        await db.collection('user_sessions').doc(userId).delete();
        
        logger.info('Usuario cerró sesión', { userId });
        
        res.json(createResponse(true, null, 'Sesión cerrada exitosamente'));
    } catch (error) {
        logger.error('Error al cerrar sesión', error);
        res.status(500).json(createResponse(false, null, 'Error al cerrar sesión', error.message));
    }
});

// ==================== ENDPOINT DE INICIALIZACIÓN ====================

app.post('/initialize', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        
        logger.info('Inicializando colecciones para usuario', { userId });
        
        const collections = Object.values(COLLECTIONS);
        const initializationResults = [];
        
        for (const collection of collections) {
            try {
                // Verificar si la colección tiene documentos del usuario
                const snapshot = await db.collection(collection)
                    .where('userId', '==', userId)
                    .limit(1)
                    .get();
                
                const exists = !snapshot.empty;
                initializationResults.push({
                    collection,
                    exists,
                    documentsCount: exists ? 'EXISTS' : 'CREATED'
                });
                
                logger.info(`Colección ${collection} procesada`, { exists });
                
            } catch (error) {
                logger.warn(`Error procesando colección ${collection}`, error);
                initializationResults.push({
                    collection,
                    exists: false,
                    error: error.message
                });
            }
        }
        
        res.json(createResponse(true, {
            userId,
            collections: initializationResults,
            timestamp: new Date().toISOString()
        }, 'Proceso de inicialización completado'));

    } catch (error) {
        logger.error('Error en inicialización de colecciones', error);
        res.status(500).json(createResponse(false, null, 'Error al inicializar colecciones', error.message));
    }
});

// ==================== ENDPOINTS DEL DASHBOARD ====================

app.get('/dashboard', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        
        // Ejecutar consultas en paralelo para mejor rendimiento
        const [
            animalsSnapshot,
            salesSnapshot,
            inventorySnapshot,
            feedsSnapshot,
            purchasesSnapshot
        ] = await Promise.all([
            db.collection(COLLECTIONS.ANIMALS).where('userId', '==', userId).get(),
            db.collection(COLLECTIONS.SALES).where('userId', '==', userId).get(),
            db.collection(COLLECTIONS.INVENTORY).where('userId', '==', userId).get(),
            db.collection(COLLECTIONS.FEEDS).where('userId', '==', userId).get(),
            db.collection(COLLECTIONS.PURCHASES).where('userId', '==', userId).get()
        ]);

        // Procesar datos de animales
        const animalsData = animalsSnapshot.docs.map(doc => doc.data());
        const totalAnimals = animalsSnapshot.size;
        const activeAnimals = animalsData.filter(animal => 
            animal.status === ANIMAL_STATUS.ACTIVE || !animal.status
        ).length;

        // Procesar datos de ventas
        const salesData = salesSnapshot.docs.map(doc => doc.data());
        const totalRevenue = salesData.reduce((sum, sale) => sum + (sale.salePrice || 0), 0);
        const recentSales = salesData
            .sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate))
            .slice(0, 5);

        // Procesar datos de inventario
        const inventoryData = inventorySnapshot.docs.map(doc => doc.data());
        const lowStockItems = inventoryData.filter(item => 
            item.currentStock <= item.minStock
        ).length;

        // Procesar datos de alimentación
        const feedsData = feedsSnapshot.docs.map(doc => doc.data());
        const totalFeedUsed = feedsData.reduce((sum, feed) => sum + (feed.quantity || 0), 0);

        // Procesar datos de compras
        const purchasesData = purchasesSnapshot.docs.map(doc => doc.data());
        const totalSpent = purchasesData.reduce((sum, purchase) => sum + (purchase.totalCost || 0), 0);

        const dashboardData = {
            summary: {
                total_animals: totalAnimals,
                active_animals: activeAnimals,
                total_sales: salesSnapshot.size,
                total_revenue: totalRevenue,
                total_inventory: inventorySnapshot.size,
                low_stock_items: lowStockItems,
                total_feed_used: totalFeedUsed,
                total_purchases: purchasesSnapshot.size,
                total_spent: totalSpent
            },
            recent_activity: {
                recent_sales: recentSales,
                low_stock_alerts: inventoryData
                    .filter(item => item.currentStock <= item.minStock)
                    .slice(0, 5)
            }
        };

        res.json(createResponse(true, dashboardData, 'Datos del dashboard obtenidos exitosamente'));

    } catch (error) {
        logger.error('Error obteniendo datos del dashboard', error);
        res.status(500).json(createResponse(false, null, 'Error al obtener datos del dashboard', error.message));
    }
});

// ==================== GESTIÓN DE ANIMALES ====================

// Obtener animales - FORMATO FLEXIBLE
app.get('/animals', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { page = 1, limit = 50, status, breed, search, format = 'standard' } = req.query;

        let query = db.collection(COLLECTIONS.ANIMALS).where('userId', '==', userId);

        // Aplicar filtros
        if (status) query = query.where('status', '==', status);
        if (breed) query = query.where('breed', '==', breed);

        // Ordenar
        query = query.orderBy('createdAt', 'desc');

        const snapshot = await query.get();
        let animals = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || null,
            updatedAt: doc.data().updatedAt?.toDate?.() || null
        }));

        // Aplicar búsqueda
        if (search) {
            const searchLower = search.toLowerCase();
            animals = animals.filter(animal => 
                animal.name?.toLowerCase().includes(searchLower) ||
                animal.earTag?.toLowerCase().includes(searchLower) ||
                animal.breed?.toLowerCase().includes(searchLower)
            );
        }

        // Paginación
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedAnimals = animals.slice(startIndex, endIndex);

        // Formato de respuesta flexible
        let responseData;
        switch (format) {
            case 'direct':
                responseData = paginatedAnimals;
                break;
            case 'simple':
                responseData = { animals: paginatedAnimals };
                break;
            case 'standard':
            default:
                responseData = {
                    animals: paginatedAnimals,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(animals.length / limit),
                        totalAnimals: animals.length,
                        hasNext: endIndex < animals.length,
                        hasPrev: startIndex > 0
                    }
                };
        }

        res.json(createResponse(true, responseData, 'Animales obtenidos exitosamente'));

    } catch (error) {
        logger.error('Error obteniendo animales', error);
        res.status(500).json(createResponse(false, null, 'Error al obtener animales', error.message));
    }
});

// Obtener un animal específico
app.get('/animals/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const animalId = req.params.id;

        const animalDoc = await db.collection(COLLECTIONS.ANIMALS).doc(animalId).get();
        
        if (!animalDoc.exists) {
            return res.status(404).json(
                createResponse(false, null, 'Animal no encontrado', 'ANIMAL_NOT_FOUND')
            );
        }

        const animalData = animalDoc.data();
        if (animalData.userId !== userId) {
            return res.status(403).json(
                createResponse(false, null, 'No tienes permisos para ver este animal', 'PERMISSION_DENIED')
            );
        }
        
        res.json(createResponse(true, {
            id: animalDoc.id,
            ...animalData,
            createdAt: animalData.createdAt?.toDate?.() || null,
            updatedAt: animalData.updatedAt?.toDate?.() || null
        }, 'Animal obtenido exitosamente'));

    } catch (error) {
        logger.error('Error obteniendo animal', error);
        res.status(500).json(createResponse(false, null, 'Error al obtener animal', error.message));
    }
});

// Agregar nuevo animal
app.post('/animals', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const {
            name,
            earTag,
            breed,
            birthDate,
            weight,
            gender,
            status = 'active',
            notes
        } = req.body;

        logger.info('Agregando nuevo animal', { earTag, breed, userId });

        // Validaciones básicas
        if (!earTag || !breed) {
            return res.status(400).json(
                createResponse(false, null, 'Número de arete y raza son obligatorios', 'MISSING_REQUIRED_FIELDS')
            );
        }

        // Verificar si ya existe un animal con el mismo número de arete
        const existingAnimal = await db.collection(COLLECTIONS.ANIMALS)
            .where('userId', '==', userId)
            .where('earTag', '==', earTag)
            .get();
            
        if (!existingAnimal.empty) {
            return res.status(400).json(
                createResponse(false, null, 'Ya existe un animal con este número de arete', 'DUPLICATE_EAR_TAG')
            );
        }

        const animalData = {
            userId,
            name: name || `Borrego ${earTag}`,
            earTag,
            breed,
            birthDate: birthDate || null,
            weight: weight ? parseFloat(weight) : 0,
            gender: gender || 'unknown',
            status,
            notes: notes || '',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection(COLLECTIONS.ANIMALS).add(animalData);
        logger.info('Animal agregado exitosamente', { animalId: docRef.id });

        res.status(201).json(createResponse(true, {
            id: docRef.id,
            ...animalData
        }, 'Animal agregado exitosamente'));

    } catch (error) {
        logger.error('Error agregando animal', error);
        res.status(500).json(createResponse(false, null, 'Error al agregar animal', error.message));
    }
});

// Actualizar animal
app.put('/animals/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const animalId = req.params.id;
        
        // Verificar que el animal existe y pertenece al usuario
        const animalDoc = await db.collection(COLLECTIONS.ANIMALS).doc(animalId).get();
        if (!animalDoc.exists) {
            return res.status(404).json(
                createResponse(false, null, 'Animal no encontrado', 'ANIMAL_NOT_FOUND')
            );
        }

        const animalData = animalDoc.data();
        if (animalData.userId !== userId) {
            return res.status(403).json(
                createResponse(false, null, 'No tienes permisos para editar este animal', 'PERMISSION_DENIED')
            );
        }

        const updateData = {
            ...req.body,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection(COLLECTIONS.ANIMALS).doc(animalId).update(updateData);
        logger.info('Animal actualizado exitosamente', { animalId });
        
        res.json(createResponse(true, {
            id: animalId,
            ...updateData
        }, 'Animal actualizado exitosamente'));

    } catch (error) {
        logger.error('Error actualizando animal', error);
        res.status(500).json(createResponse(false, null, 'Error al actualizar animal', error.message));
    }
});

// Eliminar animal
app.delete('/animals/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const animalId = req.params.id;
        
        // Verificar que el animal existe y pertenece al usuario
        const animalDoc = await db.collection(COLLECTIONS.ANIMALS).doc(animalId).get();
        if (!animalDoc.exists) {
            return res.status(404).json(
                createResponse(false, null, 'Animal no encontrado', 'ANIMAL_NOT_FOUND')
            );
        }

        const animalData = animalDoc.data();
        if (animalData.userId !== userId) {
            return res.status(403).json(
                createResponse(false, null, 'No tienes permisos para eliminar este animal', 'PERMISSION_DENIED')
            );
        }

        await db.collection(COLLECTIONS.ANIMALS).doc(animalId).delete();
        logger.info('Animal eliminado exitosamente', { animalId });
        
        res.json(createResponse(true, null, 'Animal eliminado exitosamente'));

    } catch (error) {
        logger.error('Error eliminando animal', error);
        res.status(500).json(createResponse(false, null, 'Error al eliminar animal', error.message));
    }
});

// ==================== GESTIÓN DE VENTAS ====================

// Obtener ventas
app.get('/sales', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { page = 1, limit = 50 } = req.query;
        
        let salesSnapshot;
        
        try {
            salesSnapshot = await db.collection(COLLECTIONS.SALES)
                .where('userId', '==', userId)
                .orderBy('saleDate', 'desc')
                .get();
        } catch (error) {
            // Fallback: obtener todas y filtrar
            const allSales = await db.collection(COLLECTIONS.SALES).get();
            const userSales = allSales.docs.filter(doc => doc.data().userId === userId);
            salesSnapshot = { docs: userSales };
        }

        const sales = salesSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                animalEarTag: data.animalEarTag || 'N/A',
                animalName: data.animalName || 'Sin nombre',
                salePrice: data.salePrice || 0,
                saleDate: data.saleDate?.toDate?.() || data.saleDate,
                createdAt: data.createdAt?.toDate?.() || null
            };
        });

        // Paginación
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedSales = sales.slice(startIndex, endIndex);

        res.json(createResponse(true, {
            sales: paginatedSales,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(sales.length / limit),
                totalSales: sales.length,
                hasNext: endIndex < sales.length,
                hasPrev: startIndex > 0
            }
        }, 'Ventas obtenidas exitosamente'));

    } catch (error) {
        logger.error('Error obteniendo ventas', error);
        res.status(500).json(createResponse(false, null, 'Error al obtener ventas', error.message));
    }
});

// Registrar nueva venta
app.post('/sales', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const {
            animalEarTag,
            animalName,
            saleDate,
            buyerName,
            buyerContact,
            salePrice,
            weightAtSale,
            notes
        } = req.body;

        logger.info('Registrando nueva venta', { animalEarTag, salePrice, userId });

        // Validaciones
        if (!animalEarTag) {
            return res.status(400).json(
                createResponse(false, null, 'Número de arete del animal es obligatorio', 'MISSING_EAR_TAG')
            );
        }

        if (!salePrice || salePrice <= 0) {
            return res.status(400).json(
                createResponse(false, null, 'Precio de venta válido es obligatorio', 'INVALID_SALE_PRICE')
            );
        }

        // Buscar animal por arete
        let animalId = null;
        let existingAnimalData = null;
        
        try {
            const animalQuery = await db.collection(COLLECTIONS.ANIMALS)
                .where('userId', '==', userId)
                .where('earTag', '==', animalEarTag)
                .get();
                
            if (!animalQuery.empty) {
                const animalDoc = animalQuery.docs[0];
                animalId = animalDoc.id;
                existingAnimalData = animalDoc.data();
                logger.info('Animal encontrado para venta', { animalId });
            }
        } catch (animalError) {
            logger.warn('No se encontró animal con arete', { animalEarTag });
        }

        // Crear registro de venta
        const saleData = {
            userId,
            animalId: animalId,
            animalEarTag: animalEarTag,
            animalName: animalName || existingAnimalData?.name || `Borrego ${animalEarTag}`,
            saleDate: saleDate || new Date().toISOString().split('T')[0],
            buyerName: buyerName || '',
            buyerContact: buyerContact || '',
            salePrice: parseFloat(salePrice),
            weightAtSale: weightAtSale ? parseFloat(weightAtSale) : (existingAnimalData?.weight || 0),
            notes: notes || '',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const saleRef = await db.collection(COLLECTIONS.SALES).add(saleData);

        // Si se encontró el animal, actualizar su estado a "vendido"
        if (animalId) {
            try {
                await db.collection(COLLECTIONS.ANIMALS).doc(animalId).update({
                    status: ANIMAL_STATUS.SOLD,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                logger.info('Animal marcado como vendido', { animalId });
            } catch (updateError) {
                logger.warn('No se pudo actualizar estado del animal', updateError);
            }
        }

        res.status(201).json(createResponse(true, {
            id: saleRef.id,
            ...saleData
        }, 'Venta registrada exitosamente'));

    } catch (error) {
        logger.error('Error registrando venta', error);
        res.status(500).json(createResponse(false, null, 'Error al registrar venta', error.message));
    }
});

// Eliminar venta
app.delete('/sales/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const saleId = req.params.id;
        
        const saleDoc = await db.collection(COLLECTIONS.SALES).doc(saleId).get();
        if (!saleDoc.exists) {
            return res.status(404).json(
                createResponse(false, null, 'Venta no encontrada', 'SALE_NOT_FOUND')
            );
        }

        const saleData = saleDoc.data();
        if (saleData.userId !== userId) {
            return res.status(403).json(
                createResponse(false, null, 'No tienes permisos para eliminar esta venta', 'PERMISSION_DENIED')
            );
        }

        // Si la venta tenía un animal asociado, restaurar su estado a "active"
        if (saleData.animalId) {
            try {
                await db.collection(COLLECTIONS.ANIMALS).doc(saleData.animalId).update({
                    status: ANIMAL_STATUS.ACTIVE,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                logger.info('Estado del animal restaurado a activo', { animalId: saleData.animalId });
            } catch (updateError) {
                logger.warn('No se pudo restaurar estado del animal', updateError);
            }
        }

        await db.collection(COLLECTIONS.SALES).doc(saleId).delete();
        logger.info('Venta eliminada exitosamente', { saleId });
        
        res.json(createResponse(true, null, 'Venta eliminada exitosamente'));

    } catch (error) {
        logger.error('Error eliminando venta', error);
        res.status(500).json(createResponse(false, null, 'Error al eliminar venta', error.message));
    }
});

// ==================== CONTROL DE ALIMENTOS - ESTRUCTURA ACTUALIZADA ====================

// Obtener alimentos
app.get('/feeds', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { page = 1, limit = 50 } = req.query;
        
        let feedsSnapshot;
        
        try {
            feedsSnapshot = await db.collection(COLLECTIONS.FEEDS)
                .where('userId', '==', userId)
                .orderBy('feedingDate', 'desc')
                .get();
        } catch (error) {
            // Fallback
            const allFeeds = await db.collection(COLLECTIONS.FEEDS).get();
            const userFeeds = allFeeds.docs.filter(doc => doc.data().userId === userId);
            feedsSnapshot = { docs: userFeeds };
        }

        const feeds = feedsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                feedingDate: data.feedingDate?.toDate?.() || data.feedingDate,
                createdAt: data.createdAt?.toDate?.() || null
            };
        });

        // Paginación
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedFeeds = feeds.slice(startIndex, endIndex);

        res.json(createResponse(true, {
            feeds: paginatedFeeds,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(feeds.length / limit),
                totalFeeds: feeds.length,
                hasNext: endIndex < feeds.length,
                hasPrev: startIndex > 0
            }
        }, 'Alimentaciones obtenidas exitosamente'));

    } catch (error) {
        logger.error('Error obteniendo alimentaciones', error);
        res.status(500).json(createResponse(false, null, 'Error al obtener alimentaciones', error.message));
    }
});

// Registrar alimentación (LOTES)
app.post('/feeds', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const {
            batchNumber,
            feedType,
            quantity,
            unit,
            feedingDate,
            notes
        } = req.body;

        logger.info('Registrando nuevo lote de alimento', { batchNumber, feedType, userId });

        // Validaciones
        if (!batchNumber || !feedType || !quantity) {
            return res.status(400).json(
                createResponse(false, null, 'Número de lote, tipo y cantidad son obligatorios', 'MISSING_REQUIRED_FIELDS')
            );
        }

        const feedData = {
            userId,
            batchNumber,
            feedType,
            quantity: parseFloat(quantity),
            unit: unit || 'kg',
            feedingDate: feedingDate || new Date().toISOString().split('T')[0],
            notes: notes || '',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const feedRef = await db.collection(COLLECTIONS.FEEDS).add(feedData);
        logger.info('Lote de alimento registrado exitosamente', { feedId: feedRef.id });

        res.status(201).json(createResponse(true, {
            id: feedRef.id,
            ...feedData
        }, 'Lote de alimento registrado exitosamente'));

    } catch (error) {
        logger.error('Error registrando lote de alimento', error);
        res.status(500).json(createResponse(false, null, 'Error al registrar lote de alimento', error.message));
    }
});

// Actualizar lote de alimento
app.put('/feeds/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const feedId = req.params.id;
        
        const feedDoc = await db.collection(COLLECTIONS.FEEDS).doc(feedId).get();
        if (!feedDoc.exists) {
            return res.status(404).json(
                createResponse(false, null, 'Lote de alimento no encontrado', 'FEED_NOT_FOUND')
            );
        }

        const feedData = feedDoc.data();
        if (feedData.userId !== userId) {
            return res.status(403).json(
                createResponse(false, null, 'No tienes permisos para editar este lote', 'PERMISSION_DENIED')
            );
        }

        const updateData = {
            ...req.body,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection(COLLECTIONS.FEEDS).doc(feedId).update(updateData);
        logger.info('Lote de alimento actualizado exitosamente', { feedId });
        
        res.json(createResponse(true, {
            id: feedId,
            ...updateData
        }, 'Lote de alimento actualizado exitosamente'));

    } catch (error) {
        logger.error('Error actualizando lote de alimento', error);
        res.status(500).json(createResponse(false, null, 'Error al actualizar lote de alimento', error.message));
    }
});

// Eliminar lote de alimento
app.delete('/feeds/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const feedId = req.params.id;
        
        const feedDoc = await db.collection(COLLECTIONS.FEEDS).doc(feedId).get();
        if (!feedDoc.exists) {
            return res.status(404).json(
                createResponse(false, null, 'Lote de alimento no encontrado', 'FEED_NOT_FOUND')
            );
        }

        const feedData = feedDoc.data();
        if (feedData.userId !== userId) {
            return res.status(403).json(
                createResponse(false, null, 'No tienes permisos para eliminar este lote', 'PERMISSION_DENIED')
            );
        }

        await db.collection(COLLECTIONS.FEEDS).doc(feedId).delete();
        logger.info('Lote de alimento eliminado exitosamente', { feedId });
        
        res.json(createResponse(true, null, 'Lote de alimento eliminado exitosamente'));

    } catch (error) {
        logger.error('Error eliminando lote de alimento', error);
        res.status(500).json(createResponse(false, null, 'Error al eliminar lote de alimento', error.message));
    }
});

// ==================== GESTIÓN DE INVENTARIO ====================

app.get('/inventory', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { page = 1, limit = 50, lowStock = false } = req.query;

        let query = db.collection(COLLECTIONS.INVENTORY).where('userId', '==', userId);

        const snapshot = await query.get();
        let inventory = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            lastUpdated: doc.data().lastUpdated?.toDate?.() || null,
            createdAt: doc.data().createdAt?.toDate?.() || null
        }));

        // Filtrar por stock bajo si se solicita
        if (lowStock === 'true') {
            inventory = inventory.filter(item => item.currentStock <= item.minStock);
        }

        // Paginación
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedInventory = inventory.slice(startIndex, endIndex);

        res.json(createResponse(true, {
            inventory: paginatedInventory,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(inventory.length / limit),
                totalItems: inventory.length,
                hasNext: endIndex < inventory.length,
                hasPrev: startIndex > 0
            },
            lowStockCount: inventory.filter(item => item.currentStock <= item.minStock).length
        }, 'Inventario obtenido exitosamente'));

    } catch (error) {
        logger.error('Error obteniendo inventario:', error);
        res.status(500).json(createResponse(false, null, 'Error al obtener inventario', error.message));
    }
});

// Obtener un item específico del inventario
app.get('/inventory/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const inventoryId = req.params.id;

        const inventoryDoc = await db.collection(COLLECTIONS.INVENTORY).doc(inventoryId).get();
        
        if (!inventoryDoc.exists) {
            return res.status(404).json(
                createResponse(false, null, 'Item de inventario no encontrado', 'INVENTORY_ITEM_NOT_FOUND')
            );
        }

        const inventoryData = inventoryDoc.data();
        if (inventoryData.userId !== userId) {
            return res.status(403).json(
                createResponse(false, null, 'No tienes permisos para ver este item', 'PERMISSION_DENIED')
            );
        }
        
        res.json(createResponse(true, {
            id: inventoryDoc.id,
            ...inventoryData,
            lastUpdated: inventoryData.lastUpdated?.toDate?.() || null,
            createdAt: inventoryData.createdAt?.toDate?.() || null
        }, 'Item de inventario obtenido exitosamente'));

    } catch (error) {
        logger.error('Error obteniendo item de inventario:', error);
        res.status(500).json(createResponse(false, null, 'Error al obtener item de inventario', error.message));
    }
});

// Agregar item al inventario
app.post('/inventory', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const {
            itemName,
            category,
            item_type,
            currentStock,
            minStock,
            unit,
            price,
            supplier,
            notes
        } = req.body;

        logger.info('Agregando item al inventario', { itemName, category, userId });

        // Validaciones
        if (!itemName) {
            return res.status(400).json(
                createResponse(false, null, 'Nombre del item es obligatorio', 'MISSING_ITEM_NAME')
            );
        }

        // Usar item_type si category no está presente
        const finalCategory = category || item_type;

        if (!finalCategory) {
            return res.status(400).json(
                createResponse(false, null, 'Categoría del item es obligatoria', 'MISSING_CATEGORY')
            );
        }

        const inventoryData = {
            userId,
            itemName,
            category: finalCategory,
            currentStock: parseFloat(currentStock) || 0,
            minStock: parseFloat(minStock) || 0,
            unit: unit || 'unidad',
            price: price ? parseFloat(price) : 0,
            supplier: supplier || '',
            notes: notes || '',
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const inventoryRef = await db.collection(COLLECTIONS.INVENTORY).add(inventoryData);
        logger.info('Item agregado al inventario exitosamente', { itemId: inventoryRef.id });

        res.status(201).json(createResponse(true, {
            id: inventoryRef.id,
            ...inventoryData
        }, 'Item agregado al inventario exitosamente'));

    } catch (error) {
        logger.error('Error agregando item al inventario', error);
        res.status(500).json(createResponse(false, null, 'Error al agregar item al inventario', error.message));
    }
});

// Actualizar item completo del inventario
app.put('/inventory/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const inventoryId = req.params.id;
        
        const inventoryDoc = await db.collection(COLLECTIONS.INVENTORY).doc(inventoryId).get();
        if (!inventoryDoc.exists) {
            return res.status(404).json(
                createResponse(false, null, 'Item de inventario no encontrado', 'INVENTORY_ITEM_NOT_FOUND')
            );
        }

        const inventoryData = inventoryDoc.data();
        if (inventoryData.userId !== userId) {
            return res.status(403).json(
                createResponse(false, null, 'No tienes permisos para editar este item', 'PERMISSION_DENIED')
            );
        }

        const updateData = {
            ...req.body,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection(COLLECTIONS.INVENTORY).doc(inventoryId).update(updateData);
        logger.info('Item de inventario actualizado exitosamente', { inventoryId });
        
        res.json(createResponse(true, {
            id: inventoryId,
            ...updateData
        }, 'Item de inventario actualizado exitosamente'));

    } catch (error) {
        logger.error('Error actualizando item de inventario:', error);
        res.status(500).json(createResponse(false, null, 'Error al actualizar item de inventario', error.message));
    }
});

// Eliminar item del inventario
app.delete('/inventory/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const inventoryId = req.params.id;
        
        const inventoryDoc = await db.collection(COLLECTIONS.INVENTORY).doc(inventoryId).get();
        if (!inventoryDoc.exists) {
            return res.status(404).json(
                createResponse(false, null, 'Item de inventario no encontrado', 'INVENTORY_ITEM_NOT_FOUND')
            );
        }

        const inventoryData = inventoryDoc.data();
        if (inventoryData.userId !== userId) {
            return res.status(403).json(
                createResponse(false, null, 'No tienes permisos para eliminar este item', 'PERMISSION_DENIED')
            );
        }

        await db.collection(COLLECTIONS.INVENTORY).doc(inventoryId).delete();
        logger.info('Item de inventario eliminado exitosamente', { inventoryId });
        
        res.json(createResponse(true, null, 'Item eliminado del inventario exitosamente'));

    } catch (error) {
        logger.error('Error eliminando item de inventario:', error);
        res.status(500).json(createResponse(false, null, 'Error al eliminar item del inventario', error.message));
    }
});

// Actualizar stock del inventario
app.put('/inventory/:id/stock', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const inventoryId = req.params.id;
        const { newStock, operation = 'set', quantity } = req.body;

        const inventoryDoc = await db.collection(COLLECTIONS.INVENTORY).doc(inventoryId).get();
        if (!inventoryDoc.exists) {
            return res.status(404).json(
                createResponse(false, null, 'Item de inventario no encontrado', 'INVENTORY_ITEM_NOT_FOUND')
            );
        }

        // Verificar que el item pertenece al usuario
        const inventoryData = inventoryDoc.data();
        if (inventoryData.userId !== userId) {
            return res.status(403).json(
                createResponse(false, null, 'No tienes permisos para editar este item', 'PERMISSION_DENIED')
            );
        }

        let updatedStock;

        if (operation === 'add') {
            updatedStock = inventoryData.currentStock + parseFloat(quantity);
        } else if (operation === 'subtract') {
            updatedStock = inventoryData.currentStock - parseFloat(quantity);
        } else {
            updatedStock = parseFloat(newStock);
        }

        // Asegurar que el stock no sea negativo
        if (updatedStock < 0) {
            updatedStock = 0;
        }

        await db.collection(COLLECTIONS.INVENTORY).doc(inventoryId).update({
            currentStock: updatedStock,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });

        logger.info('Stock actualizado exitosamente', { inventoryId, previousStock: inventoryData.currentStock, newStock: updatedStock });

        res.json(createResponse(true, {
            previousStock: inventoryData.currentStock,
            newStock: updatedStock,
            operation: operation
        }, 'Stock actualizado exitosamente'));

    } catch (error) {
        logger.error('Error actualizando stock', error);
        res.status(500).json(createResponse(false, null, 'Error al actualizar stock', error.message));
    }
});



// ==================== DIAGNÓSTICO ESPECÍFICO ====================

// Middleware específico para purchases
app.use('/purchases', (req, res, next) => {
    console.log('🔧🔧🔧 MIDDLEWARE PURCHASES ESPECÍFICO 🔧🔧🔧');
    console.log('🔧 MÉTODO:', req.method);
    console.log('🔧 URL:', req.url);
    console.log('🔧 ORIGINAL URL:', req.originalUrl);
    console.log('🔧 PATH:', req.path);
    console.log('🔧 BODY:', req.body);
    console.log('🔧 TIMESTAMP:', new Date().toISOString());
    next();
});

// LUEGO tus rutas de purchases en el ORDEN CORRECTO:
// 1. POST /purchases
// 2. GET /purchases  
// 3. PUT /purchases/:id
// 4. DELETE /purchases/:id






// ==================== GESTIÓN DE COMPRAS ====================

// ⭐⭐ PRIMERO: Endpoints de diagnóstico (van primero)
app.get('/debug/purchases', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        
        logger.info('Diagnóstico de compras solicitado', { userId });
        
        // Verificar si la colección existe y tiene documentos
        const purchasesSnapshot = await db.collection(COLLECTIONS.PURCHASES)
            .where('userId', '==', userId)
            .limit(10)
            .get();

        const purchases = purchasesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || null
        }));

        // Verificar estructura de la colección
        const collectionRef = db.collection(COLLECTIONS.PURCHASES);
        const sampleQuery = await collectionRef.limit(1).get();
        
        res.json(createResponse(true, {
            collection: COLLECTIONS.PURCHASES,
            totalPurchases: purchases.length,
            purchases: purchases,
            collectionExists: !sampleQuery.empty,
            userHasPurchases: purchases.length > 0,
            firestoreConfig: {
                projectId: process.env.GCLOUD_PROJECT,
                region: 'us-central1'
            },
            timestamp: new Date().toISOString()
        }, 'Diagnóstico de compras completado'));

    } catch (error) {
        logger.error('Error en diagnóstico de compras:', error);
        res.status(500).json(createResponse(false, null, 'Error en diagnóstico', {
            error: error.message,
            code: error.code,
            stack: error.stack
        }));
    }
});

// ⭐⭐ SEGUNDO: POST (Crear compras) - ESTE DEBE IR ANTES DEL GET
// Registrar nueva compra - VERSIÓN MEJORADA CON MÁS LOGGING
app.post('/purchases', authenticate, async (req, res) => {
    let purchaseRef;
    
    try {
        // ⭐⭐ LOG DE CONFIRMACIÓN CRÍTICO ⭐⭐
        console.log('⭐⭐⭐ ENDPOINT POST /purchases EJECUTADO ⭐⭐⭐');
        console.log('⭐⭐⭐ MÉTODO:', req.method);
        console.log('⭐⭐⭐ BODY:', req.body);
        
        const userId = req.user.uid;
        const {
            itemName,
            type,
            quantity,
            unit,
            unitCost,
            totalCost,
            purchaseDate,
            supplier,
            notes
        } = req.body;

        // LOG DETALLADO DE LA SOLICITUD
        logger.info('🔍 SOLICITUD DE COMPRA RECIBIDA:', {
            userId,
            body: req.body,
            headers: req.headers,
            timestamp: new Date().toISOString()
        });

        // Validaciones mejoradas
        if (!itemName || !type) {
            logger.warn('Validación fallida: campos requeridos faltantes', { itemName, type });
            return res.status(400).json(
                createResponse(false, null, 'Nombre y tipo son obligatorios', 'MISSING_REQUIRED_FIELDS')
            );
        }

        const cost = totalCost || unitCost;
        if (!cost && cost !== 0) {
            logger.warn('Validación fallida: costo faltante');
            return res.status(400).json(
                createResponse(false, null, 'Costo total o unitario es obligatorio', 'MISSING_COST')
            );
        }

        // Preparar datos
        const purchaseData = {
            userId,
            itemName: itemName.toString().trim(),
            type: type.toString().trim(),
            quantity: quantity ? parseFloat(quantity) : 1,
            unit: unit || 'unidad',
            unitCost: unitCost ? parseFloat(unitCost) : parseFloat(cost),
            totalCost: parseFloat(cost),
            purchaseDate: purchaseDate || new Date().toISOString().split('T')[0],
            supplier: supplier || '',
            notes: notes || '',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        logger.info('📝 DATOS PREPARADOS PARA FIRESTORE:', {
            purchaseData,
            collection: COLLECTIONS.PURCHASES
        });

        // INTENTAR GUARDAR EN FIRESTORE
        logger.info('💾 INTENTANDO GUARDAR EN FIRESTORE...');
        purchaseRef = await db.collection(COLLECTIONS.PURCHASES).add(purchaseData);
        
        logger.info('✅ ESCRITURA EN FIRESTORE EXITOSA:', {
            purchaseId: purchaseRef.id,
            collection: COLLECTIONS.PURCHASES,
            path: purchaseRef.path
        });

        // VERIFICACIÓN INMEDIATA
        logger.info('🔎 VERIFICANDO ESCRITURA...');
        const verificationDoc = await purchaseRef.get();
        
        if (!verificationDoc.exists) {
            logger.error('❌ VERIFICACIÓN FALLIDA: Documento no existe después de guardar');
            throw new Error('La compra no se pudo verificar en Firestore');
        }

        const savedData = verificationDoc.data();
        logger.info('✅ VERIFICACIÓN EXITOSA:', {
            purchaseId: purchaseRef.id,
            exists: verificationDoc.exists,
            savedItemName: savedData.itemName
        });

        // Preparar respuesta
        const responseData = {
            id: purchaseRef.id,
            ...purchaseData,
            // Usar fechas reales para la respuesta
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        logger.info('📤 ENVIANDO RESPUESTA EXITOSA');
        res.status(201).json(createResponse(true, responseData, 'Compra registrada exitosamente'));

    } catch (error) {
        logger.error('💥 ERROR CRÍTICO AL GUARDAR COMPRA:', {
            error: error.message,
            code: error.code,
            stack: error.stack,
            purchaseId: purchaseRef?.id,
            collection: COLLECTIONS.PURCHASES
        });

        let errorMessage = 'Error al registrar compra';
        let errorCode = 'PURCHASE_SAVE_ERROR';
        let statusCode = 500;

        if (error.code === 'permission-denied') {
            errorMessage = 'Permisos insuficientes para guardar en Firestore';
            errorCode = 'FIRESTORE_PERMISSION_DENIED';
            statusCode = 403;
        } else if (error.code === 'not-found') {
            errorMessage = 'Colección no encontrada';
            errorCode = 'COLLECTION_NOT_FOUND';
            statusCode = 404;
        }

        res.status(statusCode).json(createResponse(false, null, errorMessage, {
            code: errorCode,
            details: error.message,
            suggestion: 'Revisa los logs de Cloud Functions para más detalles'
        }));
    }
});

// ⭐⭐ TERCERO: GET (Obtener compras) - ESTE DEBE IR DESPUÉS DEL POST
// Obtener compras
app.get('/purchases', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { page = 1, limit = 50, type, startDate, endDate } = req.query;

        let query = db.collection(COLLECTIONS.PURCHASES).where('userId', '==', userId);

        // Aplicar filtros
        if (type) query = query.where('type', '==', type);
        if (startDate || endDate) {
            query = query.orderBy('purchaseDate');
        } else {
            query = query.orderBy('purchaseDate', 'desc');
        }

        const snapshot = await query.get();
        let purchases = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                purchaseDate: data.purchaseDate?.toDate?.() || data.purchaseDate,
                createdAt: data.createdAt?.toDate?.() || null
            };
        });

        // Filtrar por fecha si se proporciona
        if (startDate) {
            purchases = purchases.filter(p => new Date(p.purchaseDate) >= new Date(startDate));
        }
        if (endDate) {
            purchases = purchases.filter(p => new Date(p.purchaseDate) <= new Date(endDate));
        }

        // Paginación
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedPurchases = purchases.slice(startIndex, endIndex);

        res.json(createResponse(true, {
            purchases: paginatedPurchases,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(purchases.length / limit),
                totalPurchases: purchases.length,
                hasNext: endIndex < purchases.length,
                hasPrev: startIndex > 0
            }
        }, 'Compras obtenidas exitosamente'));

    } catch (error) {
        logger.error('Error obteniendo compras', error);
        res.status(500).json(createResponse(false, null, 'Error al obtener compras', error.message));
    }
});

// ⭐⭐ CUARTO: PUT y DELETE (Actualizar y eliminar)
// Actualizar compra
app.put('/purchases/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const purchaseId = req.params.id;
        
        const purchaseDoc = await db.collection(COLLECTIONS.PURCHASES).doc(purchaseId).get();
        if (!purchaseDoc.exists) {
            return res.status(404).json(
                createResponse(false, null, 'Compra no encontrada', 'PURCHASE_NOT_FOUND')
            );
        }

        const purchaseData = purchaseDoc.data();
        if (purchaseData.userId !== userId) {
            return res.status(403).json(
                createResponse(false, null, 'No tienes permisos para editar esta compra', 'PERMISSION_DENIED')
            );
        }

        const updateData = {
            ...req.body,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection(COLLECTIONS.PURCHASES).doc(purchaseId).update(updateData);
        logger.info('Compra actualizada exitosamente', { purchaseId });
        
        res.json(createResponse(true, {
            id: purchaseId,
            ...updateData
        }, 'Compra actualizada exitosamente'));

    } catch (error) {
        logger.error('Error actualizando compra', error);
        res.status(500).json(createResponse(false, null, 'Error al actualizar compra', error.message));
    }
});

// Eliminar compra
app.delete('/purchases/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const purchaseId = req.params.id;
        
        const purchaseDoc = await db.collection(COLLECTIONS.PURCHASES).doc(purchaseId).get();
        if (!purchaseDoc.exists) {
            return res.status(404).json(
                createResponse(false, null, 'Compra no encontrada', 'PURCHASE_NOT_FOUND')
            );
        }

        const purchaseData = purchaseDoc.data();
        if (purchaseData.userId !== userId) {
            return res.status(403).json(
                createResponse(false, null, 'No tienes permisos para eliminar esta compra', 'PERMISSION_DENIED')
            );
        }

        await db.collection(COLLECTIONS.PURCHASES).doc(purchaseId).delete();
        logger.info('Compra eliminada exitosamente', { purchaseId });
        
        res.json(createResponse(true, null, 'Compra eliminada exitosamente'));

    } catch (error) {
        logger.error('Error eliminando compra', error);
        res.status(500).json(createResponse(false, null, 'Error al eliminar compra', error.message));
    }
});


// ==================== MANEJO DE ERRORES ====================

app.use((error, req, res, next) => {
    logger.error('Error no manejado', error);

    let statusCode = 500;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'Error interno del servidor';

    if (error.code === 'auth/id-token-expired') {
        statusCode = 401;
        errorCode = 'TOKEN_EXPIRED';
        message = 'Token expirado';
    } else if (error.code === 'auth/argument-error') {
        statusCode = 401;
        errorCode = 'INVALID_TOKEN';
        message = 'Token inválido';
    }

    res.status(statusCode).json(createResponse(false, null, message, errorCode));
});

// ==================== RUTAS NO ENCONTRADAS ====================

app.use('*', (req, res) => {
    res.status(404).json(createResponse(false, null, 'Ruta no encontrada', {
        path: req.originalUrl,
        method: req.method
    }));
});

// ==================== EXPORTACIÓN PARA GEN 2 ====================

// Exportar como Cloud Functions Gen 2
exports.api = onRequest({
  cors: true,
  memory: '256MiB',
  timeoutSeconds: 60
}, app);