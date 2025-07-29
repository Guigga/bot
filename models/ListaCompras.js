// models/ListaCompras.js

const mongoose = require('mongoose');

const listaComprasSchema = new mongoose.Schema({
    // Um identificador único para a nossa lista. Como ela é compartilhada, usaremos um valor fixo.
    listId: {
        type: String,
        required: true,
        unique: true,
        default: 'shared_shopping_list' // Garante que sempre estaremos editando a mesma lista
    },
    // O array que guardará os itens da nossa lista
    items: [{
        type: String
    }]
});

module.exports = mongoose.model('ListaCompras', listaComprasSchema);