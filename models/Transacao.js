// models/Transacao.js
const mongoose = require('mongoose');

const transacaoSchema = new mongoose.Schema({
    shortId: { type: String, unique: true, sparse: true, index: true },
    // Este campo vai guardar o ID do WhatsApp de quem enviou o comando
    userId: { type: String, required: true }, 
    
    // 'enum' garante que o tipo só pode ser um desses dois valores
    tipo: { type: String, required: true, enum: ['ganho', 'gasto'] }, 
    
    valor: { type: Number, required: true },
    categoria: { type: String, required: true },
    descricao: { type: String }, // Campo opcional
}, { 
    // Adiciona os campos 'createdAt' e 'updatedAt' automaticamente
    timestamps: true 
}); 

module.exports = mongoose.model('Transacao', transacaoSchema);