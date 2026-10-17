const express = require('express');
const router = express.Router();
const controller = require('../controllers/ahorro.controller'); // Importa el controlador

// GET /ahorro - Listar todos los ahorros
router.get('/', controller.listar);

// GET /ahorro/:id - Obtener un ahorro específico
router.get('/:id', controller.obtenerPorId);

// POST /ahorro - Crear un nuevo ahorro
router.post('/', controller.crear);

// PUT /ahorro/:id - Actualizar un ahorro existente
router.put('/:id', controller.actualizar);

// PATCH /ahorro/:id/abonar - Agregar un abono al monto ahorrado
router.patch('/:id/abonar', controller.abonar);

// PATCH /ahorro/:id/desactivar - Desactivar ahorro (soft delete)
router.patch('/:id/desactivar', controller.desactivar);

// DELETE /ahorro/:id - Eliminar ahorro permanentemente (hard delete)
router.delete('/:id', controller.desaparecer);

module.exports = router; // Exporta el router para usarlo en app.js