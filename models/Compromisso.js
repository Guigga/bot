const mongoose = require('mongoose');

const compromissoSchema = new mongoose.Schema({
    shortId: { type: String, unique: true, sparse: true, index: true },
    // Guarda o ID do WhatsApp do usuário, assim como em Transacao.js
    userId: { type: String, required: true }, 
    
    // O título ou descrição do compromisso
    titulo: { type: String, required: true },

    // A data e hora do compromisso. Essencial para ordenação e futuros lembretes
    dataHora: { type: Date, required: true },

    // (Opcional, mas útil para o futuro) Um campo para controlar se um lembrete já foi enviado
    lembreteEnviado: { type: Boolean, default: false }
}, { 
    // Adiciona os campos 'createdAt' e 'updatedAt' automaticamente, igual em Transacao.js
    timestamps: true 
}); 

// Adiciona um índice no campo de data para otimizar as buscas
compromissoSchema.index({ userId: 1, dataHora: 1 });

module.exports = mongoose.model('Compromisso', compromissoSchema);