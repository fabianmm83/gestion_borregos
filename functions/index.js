const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Inicializar Firebase Admin
admin.initializeApp();

// Inicializar Express
const app = express();

// Middlewares
app.use(cors({ origin: true }));
app.use(bodyParser.json());

// ==================== RUTAS DE LA API ====================

// 1. Ruta de prueba
app.get('/api/test', (req, res) => {
  res.json({ message: 'API de Gestión de Borregos funcionando!' });
});

// 2. Obtener todos los borregos
app.get('/api/borregos', async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection('borregos').get();
    const borregos = [];
    snapshot.forEach(doc => {
      borregos.push({ id: doc.id, ...doc.data() });
    });
    res.json(borregos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Crear nuevo borrego
app.post('/api/borregos', async (req, res) => {
  try {
    const { nombre, edad, peso, raza, estado } = req.body;
    const borregoData = {
      nombre,
      edad,
      peso,
      raza,
      estado: estado || 'activo',
      fechaCreacion: new Date()
    };

    const docRef = await admin.firestore().collection('borregos').add(borregoData);
    res.json({ id: docRef.id, message: 'Borrego creado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Actualizar borrego
app.put('/api/borregos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    await admin.firestore().collection('borregos').doc(id).update(updateData);
    res.json({ message: 'Borrego actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Eliminar borrego
app.delete('/api/borregos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await admin.firestore().collection('borregos').doc(id).delete();
    res.json({ message: 'Borrego eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== EXPORTAR FUNCIONES ====================

// Exportar la API completa como una Cloud Function
exports.api = functions.https.onRequest(app);

// Ejemplo de función individual (opcional)
exports.helloWorld = functions.https.onRequest((req, res) => {
  res.json({ message: 'Hello from Firebase!' });
});