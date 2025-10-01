const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// Inicializar Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Configurar Firestore para evitar timeouts
db.settings({ 
    ignoreUndefinedProperties: true,
    timeout: 30000 
});

const app = express();

// Configurar CORS - MEJORADO
app.use(cors({ origin: true }));
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// Middleware para parsear JSON
app.use(express.json());

// Ruta raíz corregida
app.get('/', (req, res) => {
    res.json({ 
        status: 'API funcionando', 
        message: 'Sistema de Gestión de Borregos',
        timestamp: new Date().toISOString(),
        endpoints: [
            '/health',
            '/auth/create-admin',
            '/auth/verify',
            '/dashboard',
            '/animals',
            '/sales',
            '/feeds',
            '/inventory'
        ]
    });
});

// ==================== MIDDLEWARE DE AUTENTICACIÓN ====================

const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
};

// ==================== ENDPOINTS PÚBLICOS ====================

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Sistema de Gestión de Borregos funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

// ==================== ENDPOINTS DE AUTENTICACIÓN ====================

// Crear usuario administrador
app.post('/auth/create-admin', async (req, res) => {
    try {
        console.log('=== CREATE ADMIN REQUEST ===');
        console.log('Body:', req.body);
        
        const { email, name, uid } = req.body;

        if (!email) {
            console.log('Error: Email requerido');
            return res.status(400).json({ error: 'Email es requerido' });
        }

        // Si no se proporciona UID, crear el usuario en Firebase Auth
        let userId = uid;
        if (!userId) {
            console.log('Creando usuario en Firebase Auth...');
            try {
                const userRecord = await admin.auth().createUser({
                    email,
                    displayName: name,
                    emailVerified: true,
                    password: 'tempPassword123' // Contraseña temporal
                });
                userId = userRecord.uid;
                console.log('Usuario creado en Auth:', userId);
            } catch (authError) {
                console.log('Error creando usuario en Auth:', authError);
                // Si el usuario ya existe, obtener el UID
                if (authError.code === 'auth/email-already-exists') {
                    const userRecord = await admin.auth().getUserByEmail(email);
                    userId = userRecord.uid;
                    console.log('Usuario ya existe en Auth:', userId);
                } else {
                    throw authError;
                }
            }
        }

        // Crear/actualizar perfil en Firestore
        console.log('Creando perfil en Firestore...');
        const userProfile = {
            email,
            name: name || 'Administrador',
            role: 'admin',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('users').doc(userId).set(userProfile, { merge: true });
        console.log('Perfil creado en Firestore');

        res.status(201).json({
            message: 'Usuario administrador creado/actualizado exitosamente',
            userId: userId,
            profile: userProfile
        });
        
    } catch (error) {
        console.error('Error completo en create-admin:', error);
        res.status(500).json({ 
            error: 'Error al crear usuario administrador',
            details: error.message,
            code: error.code
        });
    }
});

// Verificar token
app.post('/auth/verify', async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({ error: 'Token requerido' });
        }

        const decodedToken = await admin.auth().verifyIdToken(token);
        
        // Obtener información adicional del usuario desde Firestore
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        const userData = userDoc.exists ? userDoc.data() : {};

        res.json({
            valid: true,
            user: {
                uid: decodedToken.uid,
                email: decodedToken.email,
                name: decodedToken.name || userData.name || decodedToken.email,
                role: userData.role || 'user'
            }
        });
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ valid: false, error: 'Token inválido' });
    }
});

// ==================== ENDPOINTS PROTEGIDOS DEL DASHBOARD ====================

// Obtener datos del dashboard
app.get('/dashboard', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        
        // Verificar que el usuario existe en Firestore
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        // Obtener conteo de animales del usuario
        const animalsSnapshot = await db.collection('animals')
            .where('userId', '==', userId)
            .get();
        const totalAnimals = animalsSnapshot.size;
        
        // Calcular animales activos (no vendidos/muertos)
        const activeAnimals = animalsSnapshot.docs.filter(doc => {
            const data = doc.data();
            return data.status === 'active' || !data.status;
        }).length;

        // Obtener items con stock bajo del inventario del usuario
        const inventorySnapshot = await db.collection('inventory')
            .where('userId', '==', userId)
            .get();
        const lowStockItems = inventorySnapshot.docs.filter(doc => {
            const data = doc.data();
            return data.currentStock <= data.minStock;
        }).length;

        res.json({
            total_animals: totalAnimals,
            active_animals: activeAnimals,
            low_stock_items: lowStockItems,
            total_inventory: inventorySnapshot.size
        });
    } catch (error) {
        console.error('Error getting dashboard data:', error);
        res.status(500).json({ error: 'Error al obtener datos del dashboard' });
    }
});

// ==================== GESTIÓN DE ANIMALES (PROTEGIDO) ====================

// Obtener todos los animales del usuario
app.get('/animals', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const animalsSnapshot = await db.collection('animals')
            .where('userId', '==', userId)
            .get();
            
        const animals = animalsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // Convertir timestamps a formato legible
            createdAt: doc.data().createdAt?.toDate?.() || null,
            updatedAt: doc.data().updatedAt?.toDate?.() || null
        }));
        
        res.json(animals);
    } catch (error) {
        console.error('Error getting animals:', error);
        res.status(500).json({ error: 'Error al obtener animales' });
    }
});

// Obtener un animal específico del usuario
app.get('/animals/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const animalDoc = await db.collection('animals').doc(req.params.id).get();
        
        if (!animalDoc.exists) {
            return res.status(404).json({ error: 'Animal no encontrado' });
        }

        // Verificar que el animal pertenece al usuario
        const animalData = animalDoc.data();
        if (animalData.userId !== userId) {
            return res.status(403).json({ error: 'No tienes permisos para ver este animal' });
        }
        
        res.json({
            id: animalDoc.id,
            ...animalData,
            // Convertir timestamps a formato legible
            createdAt: animalData.createdAt?.toDate?.() || null,
            updatedAt: animalData.updatedAt?.toDate?.() || null
        });
    } catch (error) {
        console.error('Error getting animal:', error);
        res.status(500).json({ error: 'Error al obtener animal' });
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

        // Validaciones básicas
        if (!earTag || !breed) {
            return res.status(400).json({ error: 'Número de arete y raza son obligatorios' });
        }

        // Verificar si ya existe un animal con el mismo número de arete para este usuario
        const existingAnimal = await db.collection('animals')
            .where('userId', '==', userId)
            .where('earTag', '==', earTag)
            .get();
            
        if (!existingAnimal.empty) {
            return res.status(400).json({ error: 'Ya existe un animal con este número de arete' });
        }

        const animalData = {
            userId,
            name: name || `Borrego ${earTag}`,
            earTag,
            breed,
            birthDate: birthDate || null,
            weight: weight || 0,
            gender: gender || 'unknown',
            status,
            notes: notes || '',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = await db.collection('animals').add(animalData);
        
        res.status(201).json({
            id: docRef.id,
            message: 'Animal agregado exitosamente',
            ...animalData
        });
    } catch (error) {
        console.error('Error adding animal:', error);
        res.status(500).json({ error: 'Error al agregar animal' });
    }
});

// Actualizar animal
app.put('/animals/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const animalId = req.params.id;
        
        // Verificar que el animal existe y pertenece al usuario
        const animalDoc = await db.collection('animals').doc(animalId).get();
        if (!animalDoc.exists) {
            return res.status(404).json({ error: 'Animal no encontrado' });
        }

        const animalData = animalDoc.data();
        if (animalData.userId !== userId) {
            return res.status(403).json({ error: 'No tienes permisos para editar este animal' });
        }

        const updateData = {
            ...req.body,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('animals').doc(animalId).update(updateData);
        
        res.json({
            message: 'Animal actualizado exitosamente',
            id: animalId
        });
    } catch (error) {
        console.error('Error updating animal:', error);
        res.status(500).json({ error: 'Error al actualizar animal' });
    }
});

// Eliminar animal
app.delete('/animals/:id', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const animalId = req.params.id;
        
        // Verificar que el animal existe y pertenece al usuario
        const animalDoc = await db.collection('animals').doc(animalId).get();
        if (!animalDoc.exists) {
            return res.status(404).json({ error: 'Animal no encontrado' });
        }

        const animalData = animalDoc.data();
        if (animalData.userId !== userId) {
            return res.status(403).json({ error: 'No tienes permisos para eliminar este animal' });
        }

        await db.collection('animals').doc(animalId).delete();
        
        res.json({ message: 'Animal eliminado exitosamente' });
    } catch (error) {
        console.error('Error deleting animal:', error);
        res.status(500).json({ error: 'Error al eliminar animal' });
    }
});

// ==================== GESTIÓN DE VENTAS (PROTEGIDO) ====================

// Obtener todas las ventas del usuario
app.get('/sales', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const salesSnapshot = await db.collection('sales')
            .where('userId', '==', userId)
            .orderBy('saleDate', 'desc')
            .get();
            
        const sales = salesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // Convertir timestamps a formato legible
            saleDate: doc.data().saleDate?.toDate?.() || doc.data().saleDate,
            createdAt: doc.data().createdAt?.toDate?.() || null
        }));
        
        res.json(sales);
    } catch (error) {
        console.error('Error getting sales:', error);
        res.status(500).json({ error: 'Error al obtener ventas' });
    }
});

// Registrar nueva venta
app.post('/sales', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const {
            animalId,
            animalEarTag,
            saleDate,
            buyerName,
            buyerContact,
            salePrice,
            weightAtSale,
            notes
        } = req.body;

        // Validaciones
        if (!animalId && !animalEarTag) {
            return res.status(400).json({ error: 'ID o número de arete del animal son obligatorios' });
        }

        if (!salePrice) {
            return res.status(400).json({ error: 'Precio de venta es obligatorio' });
        }

        let animalDoc;
        if (animalId) {
            animalDoc = await db.collection('animals').doc(animalId).get();
        } else {
            const animalQuery = await db.collection('animals')
                .where('userId', '==', userId)
                .where('earTag', '==', animalEarTag)
                .get();
                
            if (animalQuery.empty) {
                return res.status(404).json({ error: 'Animal no encontrado' });
            }
            animalDoc = animalQuery.docs[0];
        }

        if (!animalDoc.exists) {
            return res.status(404).json({ error: 'Animal no encontrado' });
        }

        // Verificar que el animal pertenece al usuario
        const animalData = animalDoc.data();
        if (animalData.userId !== userId) {
            return res.status(403).json({ error: 'No tienes permisos para vender este animal' });
        }

        // Crear registro de venta
        const saleData = {
            userId,
            animalId: animalDoc.id,
            animalEarTag: animalData.earTag,
            animalName: animalData.name,
            saleDate: saleDate || new Date().toISOString(),
            buyerName: buyerName || '',
            buyerContact: buyerContact || '',
            salePrice: parseFloat(salePrice),
            weightAtSale: weightAtSale || animalData.weight || 0,
            notes: notes || '',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const saleRef = await db.collection('sales').add(saleData);

        // Actualizar estado del animal a "vendido"
        await db.collection('animals').doc(animalDoc.id).update({
            status: 'sold',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.status(201).json({
            id: saleRef.id,
            message: 'Venta registrada exitosamente',
            ...saleData
        });
    } catch (error) {
        console.error('Error registering sale:', error);
        res.status(500).json({ error: 'Error al registrar venta' });
    }
});

// ==================== CONTROL DE ALIMENTOS (PROTEGIDO) ====================

// Obtener todos los alimentos del usuario
app.get('/feeds', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const feedsSnapshot = await db.collection('feeds')
            .where('userId', '==', userId)
            .orderBy('feedingDate', 'desc')
            .get();
            
        const feeds = feedsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // Convertir timestamps a formato legible
            feedingDate: doc.data().feedingDate?.toDate?.() || doc.data().feedingDate,
            createdAt: doc.data().createdAt?.toDate?.() || null
        }));
        
        res.json(feeds);
    } catch (error) {
        console.error('Error getting feeds:', error);
        res.status(500).json({ error: 'Error al obtener alimentos' });
    }
});

// Registrar alimentación
app.post('/feeds', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const {
            animalId,
            animalEarTag,
            feedType,
            quantity,
            unit,
            feedingDate,
            notes
        } = req.body;

        if (!feedType || !quantity) {
            return res.status(400).json({ error: 'Tipo y cantidad de alimento son obligatorios' });
        }

        const feedData = {
            userId,
            feedType,
            quantity: parseFloat(quantity),
            unit: unit || 'kg',
            feedingDate: feedingDate || new Date().toISOString(),
            notes: notes || '',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Si se especifica un animal, verificar que pertenece al usuario
        if (animalId) {
            const animalDoc = await db.collection('animals').doc(animalId).get();
            if (animalDoc.exists && animalDoc.data().userId === userId) {
                feedData.animalId = animalId;
                feedData.animalEarTag = animalDoc.data().earTag;
            }
        } else if (animalEarTag) {
            const animalQuery = await db.collection('animals')
                .where('userId', '==', userId)
                .where('earTag', '==', animalEarTag)
                .get();
                
            if (!animalQuery.empty) {
                const animalDoc = animalQuery.docs[0];
                feedData.animalId = animalDoc.id;
                feedData.animalEarTag = animalEarTag;
            }
        }

        const feedRef = await db.collection('feeds').add(feedData);

        res.status(201).json({
            id: feedRef.id,
            message: 'Alimentación registrada exitosamente',
            ...feedData
        });
    } catch (error) {
        console.error('Error registering feed:', error);
        res.status(500).json({ error: 'Error al registrar alimentación' });
    }
});

// ==================== GESTIÓN DE INVENTARIO (PROTEGIDO) ====================

// Obtener todo el inventario del usuario
app.get('/inventory', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const inventorySnapshot = await db.collection('inventory')
            .where('userId', '==', userId)
            .get();
            
        const inventory = inventorySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            // Convertir timestamps a formato legible
            lastUpdated: doc.data().lastUpdated?.toDate?.() || null,
            createdAt: doc.data().createdAt?.toDate?.() || null
        }));
        
        res.json(inventory);
    } catch (error) {
        console.error('Error getting inventory:', error);
        res.status(500).json({ error: 'Error al obtener inventario' });
    }
});

// Agregar item al inventario
app.post('/inventory', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const {
            itemName,
            category,
            currentStock,
            minStock,
            unit,
            price,
            supplier,
            notes
        } = req.body;

        if (!itemName || !category) {
            return res.status(400).json({ error: 'Nombre y categoría del item son obligatorios' });
        }

        const inventoryData = {
            userId,
            itemName,
            category,
            currentStock: parseFloat(currentStock) || 0,
            minStock: parseFloat(minStock) || 0,
            unit: unit || 'unidad',
            price: price ? parseFloat(price) : 0,
            supplier: supplier || '',
            notes: notes || '',
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const inventoryRef = await db.collection('inventory').add(inventoryData);

        res.status(201).json({
            id: inventoryRef.id,
            message: 'Item agregado al inventario exitosamente',
            ...inventoryData
        });
    } catch (error) {
        console.error('Error adding inventory item:', error);
        res.status(500).json({ error: 'Error al agregar item al inventario' });
    }
});

// Actualizar stock del inventario
app.put('/inventory/:id/stock', authenticate, async (req, res) => {
    try {
        const userId = req.user.uid;
        const inventoryId = req.params.id;
        const { newStock, operation = 'set', quantity } = req.body;

        const inventoryDoc = await db.collection('inventory').doc(inventoryId).get();
        if (!inventoryDoc.exists) {
            return res.status(404).json({ error: 'Item de inventario no encontrado' });
        }

        // Verificar que el item pertenece al usuario
        const inventoryData = inventoryDoc.data();
        if (inventoryData.userId !== userId) {
            return res.status(403).json({ error: 'No tienes permisos para editar este item' });
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

        await db.collection('inventory').doc(inventoryId).update({
            currentStock: updatedStock,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({
            message: 'Stock actualizado exitosamente',
            previousStock: inventoryData.currentStock,
            newStock: updatedStock
        });
    } catch (error) {
        console.error('Error updating inventory stock:', error);
        res.status(500).json({ error: 'Error al actualizar stock' });
    }
});

// ==================== MANEJO DE ERRORES GLOBAL ====================

app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ 
        error: 'Error interno del servidor',
        message: error.message 
    });
});

// ==================== MANEJO DE RUTAS NO ENCONTRADAS ====================

app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Ruta no encontrada',
        path: req.originalUrl,
        method: req.method,
        availableEndpoints: [
            'GET    /',
            'GET    /health',
            'POST   /auth/create-admin',
            'POST   /auth/verify',
            'GET    /dashboard',
            'GET    /animals',
            'POST   /animals',
            'GET    /animals/:id',
            'PUT    /animals/:id',
            'DELETE /animals/:id',
            'GET    /sales', 
            'POST   /sales',
            'GET    /feeds',
            'POST   /feeds',
            'GET    /inventory',
            'POST   /inventory',
            'PUT    /inventory/:id/stock'
        ]
    });
});

// ==================== EXPORTACIÓN ====================

exports.api = functions.https.onRequest(app);