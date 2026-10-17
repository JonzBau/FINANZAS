const equipo = require('../models/equipo.model');


exports.crear = async (req, res) => {
await equipo.crear(req.body);
res.json({ mensaje: 'equipo creado' });
};


exports.listar = async (req, res) => {
const data = await equipo.listar();
res.json(data.rows);
};


exports.actualizar = async (req, res) => {
await equipo.actualizar(req.params.id, req.body);
res.json({ mensaje: 'equipo actualizado' });
};


exports.desactivar = async (req, res) => {
await equipo.desactivar(req.params.id);
res.json({ mensaje: 'equipo desactivado' });
};