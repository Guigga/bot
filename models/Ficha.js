const mongoose = require('mongoose');

// Sub-schema para os itens do inventário
const itemSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    quantidade: { type: Number, default: 1 },
    peso: { type: Number, default: 0 },
    descricao: { type: String, default: "N/A" }
}, { _id: false }); // _id: false evita que o Mongoose crie um ID para cada item

const fichaSchema = new mongoose.Schema({
    playerId: { type: String, required: true, unique: true },
    nome: { type: String, default: "Sem Nome" },
    classe: { type: String, default: "N/A" },
    raca: { type: String, default: "N/A" },
    nivel: { type: Number, default: 1 },
    
    // Detalhes Narrativos e Físicos
    idade: { type: String, default: "N/A" },
    altura: { type: String, default: "N/A" },
    peso: { type: String, default: "N/A" },
    alinhamento: { type: String, default: "N/A" },
    antecedente: { type: String, default: "N/A" },
    divindade: { type: String, default: "N/A" },
    historia: { type: String, default: "N/A" },

    // Atributos Principais
    hp_max: { type: Number, default: 10 },
    hp_atual: { type: Number, default: 10 },
    ca: { type: Number, default: 10 },
    forca: { type: Number, default: 10 },
    destreza: { type: Number, default: 10 },
    constituicao: { type: Number, default: 10 },
    inteligencia: { type: Number, default: 10 },
    sabedoria: { type: Number, default: 10 },
    carisma: { type: Number, default: 10 },

    // --- NOVOS CAMPOS DE CARGA ---
    carga_atual: { type: Number, default: 0 },
    carga_maxima: { type: Number, default: 50 }, // Ex: 10 (força) * 5 = 50
    
    // --- INVENTÁRIO ATUALIZADO ---
    inventario: [itemSchema], // Usa o sub-schema definido acima

    // Listas
    habilidades: [String],
    ataques: [String],
    magias: [String],
});

module.exports = mongoose.model('Ficha', fichaSchema);
