// RPG/racas.js

// Este arquivo define os arquétipos de raça para a criação de personagens.
// Os valores representam os BÔNUS aplicados aos atributos base da classe.
const RACAS = {
    humano: {
        descricao: "Versáteis e adaptáveis.",
        modificadores: { forca: 1, destreza: 1, constituicao: 1, inteligencia: 1, sabedoria: 1, carisma: 1 }
    },
    elfo: {
        descricao: "Ágeis e perceptivos, com afinidade para a magia.",
        modificadores: { destreza: 2, inteligencia: 1, constituicao: -1 }
    },
    anao: {
        descricao: "Robustos e resilientes, mestres do artesanato.",
        modificadores: { constituicao: 2, forca: 1, carisma: -1 }
    },
    orc: {
        descricao: "Fortes e ferozes, nascidos para o combate.",
        modificadores: { forca: 2, constituicao: 1, inteligencia: -2, carisma: -1 }
    },
    halfling: {
        descricao: "Pequenos e sortudos, mestres da furtividade.",
        modificadores: { destreza: 2, carisma: 1, forca: -1 }
    }
};

module.exports = RACAS;