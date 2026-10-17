const express = require('express');
const router = express.Router();
const controller = require('../controllers/categoria.controller'); // Importa el controlador

// GET /categoria - Listar todas las categorías
router.get('/', controller.listar);

// GET /categoria/:id - Obtener una categoría específica
router.get('/:id', controller.obtenerPorId);

// POST /categoria - Crear una nueva categoría
router.post('/', controller.crear);

// PUT /categoria/:id - Actualizar una categoría existente
router.put('/:id', controller.actualizar);

// PATCH /categoria/:id/desactivar - Desactivar categoría (soft delete)
router.patch('/:id/desactivar', controller.desactivar);

// DELETE /categoria/:id - Eliminar categoría permanentemente (hard delete)
router.delete('/:id', controller.desaparecer);

module.exports = router; // Exporta el router para usarlo en app.js