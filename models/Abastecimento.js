const mongoose = require('mongoose');

const abastecimentoSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    odometro: { type: Number, required: true },
    litros: { type: Number, required: true },
    precoPorLitro: { type: Number, required: true },
    valorTotal: { type: Number, required: true },
    tipoCombustivel: { type: String, required: true, enum: ['gasolina', 'etanol'] },
}, { 
    timestamps: true
});

module.exports = mongoose.model('Abastecimento', abastecimentoSchema);