const Producto = require('../models/productos.model');


exports.crear = async (req, res) => {
await Producto.crear(req.body);
res.json({ mensaje: 'Producto creado' });
};


exports.listar = async (req, res) => {
const data = await Producto.listar();
res.json(data.rows);
};


exports.actualizar = async (req, res) => {
await Producto.actualizar(req.params.id, req.body);
res.json({ mensaje: 'Producto actualizado' });
};


exports.desactivar = async (req, res) => {
await Producto.desactivar(req.params.id);
res.json({ mensaje: 'Producto desactivado' });
};