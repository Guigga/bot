// C:\Users\Guilherme\bot-whatsapp\games\Forca\palavras.js

const palavras = [
    "BANANA", "COMPUTADOR", "WHATSAPP", "PROGRAMADOR",
    "FIGURINHA", "TRUCO", "DESENVOLVEDOR", "INTELIGENCIA",
    "ARTIFICIAL", "TECLADO", "AVENTURA", "BIBLIOTECA",
    "CHOCOLATE", "ELEFANTE", "FANTASMA", "GIRAFA"
];

// Exporta uma função que retorna uma palavra aleatória da lista
module.exports = function getPalavraAleatoria() {
    const indice = Math.floor(Math.random() * palavras.length);
    return palavras[indice];
};