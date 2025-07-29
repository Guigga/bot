// games/baralhoUtils.js
const { renderizarCartas } = require('./imageRenderer');
const path = require('path');
const fs = require('fs');

/**
 * Gera um baralho padrão de 52 cartas e o embaralha.
 * @returns {string[]} Um array de strings representando o baralho embaralhado.
 */
function gerarBaralho() {
    const naipes = ['s', 'h', 'd', 'c'];   // spades, hearts, diamonds, clubs
    const valores = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']; // 'T' para 10
    const baralho = [];

    for (let naipe of naipes) {
        for (let valor of valores) {
            baralho.push(`${valor}${naipe}`);
        }
    }

    // Embaralhar (Algoritmo Fisher-Yates)
    for (let i = baralho.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [baralho[i], baralho[j]] = [baralho[j], baralho[i]];
    }

    return baralho;
}

/**
 * Gera uma imagem de um conjunto de cartas e a salva em um diretório temporário.
 * @param {string[]} cartas - Array de cartas a serem renderizadas (ex: ['As', 'Kd']).
 * @returns {Promise<string|null>} O caminho para a imagem gerada, ou null se houver erro.
 */
async function gerarImagemCartas(cartas) {
    if (!cartas || cartas.length === 0) {
        // Se precisar de uma imagem para "mão vazia", pode ser tratado aqui.
        // Por enquanto, vamos retornar null para evitar erros.
        console.log('[BaralhoUtils] Tentativa de gerar imagem para um array de cartas vazio.');
        return null;
    }
    try {
        // Garante que o diretório para imagens temporárias exista
        const tempDir = path.join(__dirname, '..', 'temp_images');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Gera um nome de arquivo único para evitar conflitos
        const fileName = `cartas_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.png`;
        const outputPath = path.join(tempDir, fileName);

        // Chama o renderizador de imagem
        await renderizarCartas(cartas, outputPath);

        return outputPath;
    } catch (error) {
        console.error('Erro ao gerar imagem das cartas:', error);
        return null;
    }
}

function gerarBaralhoTruco() {
    const naipes = ['s', 'h', 'd', 'c']; // espadas, copas, ouros, paus
    // No truco, removemos 8, 9, 10. O 'T' representa o 10 no baralho padrão.
    const valores = ['2', '3', '4', '5', '6', '7', 'J', 'Q', 'K', 'A'];
    const baralho = [];
    for (let naipe of naipes) {
        for (let valor of valores) {
            baralho.push(`${valor}${naipe}`);
        }
    }

    // Embaralhar (Algoritmo Fisher-Yates)
    for (let i = baralho.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [baralho[i], baralho[j]] = [baralho[j], baralho[i]];
    }

    console.log('[BaralhoUtils] Baralho de Truco com 40 cartas gerado e embaralhado.');
    return baralho;
}


module.exports = { gerarBaralho, gerarBaralhoTruco, gerarImagemCartas };

