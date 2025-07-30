const mongoose = require('mongoose');

const abastecimentoSchema = new mongoose.Schema({
    shortId: { type: String, unique: true, sparse: true, index: true },
    userId: { type: String, required: true, index: true },
    odometro: { type: Number, required: true },
    litros: { type: Number, required: true },
    precoPorLitro: { type: Number, required: true },
    valorTotal: { type: Number, required: true },
    tipoCombustivel: { type: String, required: true, enum: ['gasolina', 'etanol'] },
    transacaoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transacao' }
}, { 
    timestamps: true
});

module.exports = mongoose.model('Abastecimento', abastecimentoSchema);