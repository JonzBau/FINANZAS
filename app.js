const express = require('express');
const path = require('path');


const app = express();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));


app.use('/', require('./routes/index.routes'));
app.use('/categoria', require('./routes/categoria.routes'));
app.use('/ahorro', require('./routes/ahorro.routes'));
app.use('/limite_gasto', require('./routes/limite_gasto.routes'));
app.use('/gasto', require('./routes/gasto.routes'));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});