const express = require('express');
const router = express.Router();
const controller = require('../controllers/limite_gasto.controller'); // Importa el controlador

// GET /limite_gasto - Listar todos los límites
router.get('/', controller.listar);

// GET /limite_gasto/:id - Obtener un límite específico
router.get('/:id', controller.obtenerPorId);

// POST /limite_gasto - Crear un nuevo límite
router.post('/', controller.crear);

// PUT /limite_gasto/:id - Actualizar un límite existente
router.put('/:id', controller.actualizar);

// PATCH /limite_gasto/:id/desactivar - Desactivar límite (soft delete)
router.patch('/:id/desactivar', controller.desactivar);

// DELETE /limite_gasto/:id - Eliminar límite permanentemente (hard delete)
router.delete('/:id', controller.desaparecer);

module.exports = router; // Exporta el router para usarlo en app.js