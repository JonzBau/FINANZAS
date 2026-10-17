const Usuario = require('../models/usuarios.model');


exports.crear = async (req, res) => {
await Usuario.crear(req.body);
res.json({ mensaje: 'Usuario creado' });
};


exports.listar = async (req, res) => {
const data = await Usuario.listar();
res.json(data.rows);
};


exports.actualizar = async (req, res) => {
await Usuario.actualizar(req.params.id, req.body);
res.json({ mensaje: 'Usuario actualizado' });
};


exports.desactivar = async (req, res) => {
await Usuario.desactivar(req.params.id);
res.json({ mensaje: 'Usuario desactivado' });
};