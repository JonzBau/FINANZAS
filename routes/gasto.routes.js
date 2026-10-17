const express = require('express');
const router = express.Router();
const controller = require('../controllers/gasto.controller'); // Importa el controlador

// GET /gasto - Listar todos los gastos
router.get('/', controller.listar);

// GET /gasto/:id - Obtener un gasto específico
router.get('/:id', controller.obtenerPorId);

// POST /gasto - Crear un nuevo gasto
router.post('/', controller.crear);

// PUT /gasto/:id - Actualizar un gasto existente
router.put('/:id', controller.actualizar);

// PATCH /gasto/:id/desactivar - Desactivar gasto (soft delete)
router.patch('/:id/desactivar', controller.desactivar);

// DELETE /gasto/:id - Eliminar gasto permanentemente (hard delete)
router.delete('/:id', controller.desaparecer);

module.exports = router; // Exporta el router para usarlo en app.js