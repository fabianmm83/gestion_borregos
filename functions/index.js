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

// Configuración de CORS
app.use(cors({ origin: true }));

// Headers de seguridad
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

// Middleware para parsear JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== UTILIDADES Y CONSTANTES ====================

const COLLECTIONS = {
    USERS: 'users',
    ANIMALS: 'animals',
    SALES: 'sales',
    FEEDS: 'feeds',
    INVENTORY: 'inventory'
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
            'GET    /inventory',
            'POST   /inventory',
            'PUT    /inventory/:id/stock'
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

// ==================== ENDPOINTS DE AUTENTICACIÓN ====================

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

app.post('/auth/verify', async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json(
                createResponse(false, null, 'Token requerido', 'MISSING_TOKEN')
            );
        }

        const decodedToken = await admin.auth().verifyIdToken(token);
        
        // Obtener información del usuario desde Firestore
        const userDoc = await db.collection(COLLECTIONS.USERS).doc(decodedToken.uid).get();
        const userData = userDoc.exists ? userDoc.data() : {};

        // Actualizar último login
        if (userDoc.exists) {
            await db.collection(COLLECTIONS.USERS).doc(decodedToken.uid).update({
                lastLogin: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        res.json(createResponse(true, {
            valid: true,
            user: {
                uid: decodedToken.uid,
                email: decodedToken.email,
                name: decodedToken.name || userData.name || decodedToken.email,
                role: userData.role || 'user',
                lastLogin: userData.lastLogin?.toDate?.() || null
            }
        }, 'Token válido'));

    } catch (error) {
        logger.error('Error en verificación de token', error);
        res.status(401).json(createResponse(false, null, 'Token inválido', 'INVALID_TOKEN'));
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
            feedsSnapshot
        ] = await Promise.all([
            db.collection(COLLECTIONS.ANIMALS).where('userId', '==', userId).get(),
            db.collection(COLLECTIONS.SALES).where('userId', '==', userId).get(),
            db.collection(COLLECTIONS.INVENTORY).where('userId', '==', userId).get(),
            db.collection(COLLECTIONS.FEEDS).where('userId', '==', userId).get()
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

        const dashboardData = {
            summary: {
                total_animals: totalAnimals,
                active_animals: activeAnimals,
                total_sales: salesSnapshot.size,
                total_revenue: totalRevenue,
                total_inventory: inventorySnapshot.size,
                low_stock_items: lowStockItems,
                total_feed_used: totalFeedUsed
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

// Obtener animales
app.get('/animals', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const { page = 1, limit = 50, status, breed, search } = req.query;

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

        res.json(createResponse(true, {
            animals: paginatedAnimals,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(animals.length / limit),
                totalAnimals: animals.length,
                hasNext: endIndex < animals.length,
                hasPrev: startIndex > 0
            }
        }, 'Animales obtenidos exitosamente'));

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

        await db.collection(COLLECTIONS.SALES).doc(saleId).delete();
        logger.info('Venta eliminada exitosamente', { saleId });
        
        res.json(createResponse(true, null, 'Venta eliminada exitosamente'));

    } catch (error) {
        logger.error('Error eliminando venta', error);
        res.status(500).json(createResponse(false, null, 'Error al eliminar venta', error.message));
    }
});

// ==================== CONTROL DE ALIMENTOS ====================

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

// Registrar alimentación
app.post('/feeds', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const {
            feedType,
            quantity,
            unit,
            feedingDate,
            animalEarTag,
            notes
        } = req.body;

        logger.info('Registrando nueva alimentación', { feedType, quantity, userId });

        // Validaciones
        if (!feedType || !quantity) {
            return res.status(400).json(
                createResponse(false, null, 'Tipo y cantidad de alimento son obligatorios', 'MISSING_REQUIRED_FIELDS')
            );
        }

        const feedData = {
            userId,
            feedType,
            quantity: parseFloat(quantity),
            unit: unit || 'kg',
            feedingDate: feedingDate || new Date().toISOString().split('T')[0],
            notes: notes || '',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Asociar animal si se proporciona arete
        if (animalEarTag) {
            try {
                const animalQuery = await db.collection(COLLECTIONS.ANIMALS)
                    .where('userId', '==', userId)
                    .where('earTag', '==', animalEarTag)
                    .get();
                    
                if (!animalQuery.empty) {
                    const animalDoc = animalQuery.docs[0];
                    feedData.animalId = animalDoc.id;
                    feedData.animalEarTag = animalEarTag;
                    logger.info('Animal asociado a alimentación', { animalEarTag });
                } else {
                    feedData.animalEarTag = animalEarTag;
                }
            } catch (animalError) {
                feedData.animalEarTag = animalEarTag;
            }
        }

        const feedRef = await db.collection(COLLECTIONS.FEEDS).add(feedData);
        logger.info('Alimentación registrada exitosamente', { feedId: feedRef.id });

        res.status(201).json(createResponse(true, {
            id: feedRef.id,
            ...feedData
        }, 'Alimentación registrada exitosamente'));

    } catch (error) {
        logger.error('Error registrando alimentación', error);
        res.status(500).json(createResponse(false, null, 'Error al registrar alimentación', error.message));
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