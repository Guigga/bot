// RPG/classes.js

// Este arquivo define os arquétipos de classe para a criação de personagens.
// Agora, ele foca apenas nos atributos base. Itens e habilidades são adicionados manualmente.
const ARQUETIPOS = {
    guerreiro: {
        forca: 16, destreza: 12, constituicao: 14, inteligencia: 10, sabedoria: 10, carisma: 10,
        hp_max: 12, hp_atual: 12, ca: 15
    },
    mago: {
        forca: 8, destreza: 12, constituicao: 10, inteligencia: 16, sabedoria: 14, carisma: 10,
        hp_max: 8, hp_atual: 8, ca: 11
    },
    clerigo: {
        forca: 12, destreza: 8, constituicao: 14, inteligencia: 10, sabedoria: 16, carisma: 12,
        hp_max: 10, hp_atual: 10, ca: 16
    },
    ladrao: {
        forca: 10, destreza: 16, constituicao: 12, inteligencia: 12, sabedoria: 8, carisma: 14,
        hp_max: 8, hp_atual: 8, ca: 13
    },
    barbaro: {
        forca: 17, destreza: 12, constituicao: 16, inteligencia: 8, sabedoria: 10, carisma: 8,
        hp_max: 15, hp_atual: 15, ca: 13
    },
    paladino: {
        forca: 15, destreza: 10, constituicao: 14, inteligencia: 10, sabedoria: 13, carisma: 15,
        hp_max: 12, hp_atual: 12, ca: 16
    },
    patrulheiro: {
        forca: 12, destreza: 17, constituicao: 14, inteligencia: 10, sabedoria: 15, carisma: 8,
        hp_max: 10, hp_atual: 10, ca: 14
    },
    bardo: {
        forca: 10, destreza: 14, constituicao: 12, inteligencia: 12, sabedoria: 10, carisma: 17,
        hp_max: 8, hp_atual: 8, ca: 12
    }
};

// Exportamos o objeto para que outros arquivos possam usá-lo.
module.exports = ARQUETIPOS;
