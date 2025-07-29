// games/imageRenderer.js
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Mapeamento de valores para o que será exibido na carta
const valorMap = {
    'T': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A'
};

// Mapeamento de naipes para ícones e cores
const naipeInfo = {
    's': { icone: '♠', cor: 'black' }, // Espadas
    'h': { icone: '♥', cor: 'red' },   // Copas
    'd': { icone: '♦', cor: 'red' },   // Ouros
    'c': { icone: '♣', cor: 'black' }  // Paus
};

/**
 * Desenha uma única carta em um contexto de canvas.
 * @param {CanvasRenderingContext2D} ctx - O contexto 2D do canvas onde a carta será desenhada.
 * @param {string} carta - A string da carta (ex: 'As', 'Td').
 * @param {number} x - A posição X inicial para desenhar a carta.
 * @param {number} y - A posição Y inicial para desenhar a carta.
 */
function desenharCarta(ctx, carta, x, y) {
    const larguraCarta = 100;
    const alturaCarta = 140;
    const raioBorda = 10;

    const valor = carta[0];
    const naipe = carta[1];

    const info = naipeInfo[naipe] || { icone: '?', cor: 'black' };
    const valorVisual = valorMap[valor] || valor;

    // Sombra da carta
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;

    // Fundo branco da carta com bordas arredondadas
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(x + raioBorda, y);
    ctx.lineTo(x + larguraCarta - raioBorda, y);
    ctx.quadraticCurveTo(x + larguraCarta, y, x + larguraCarta, y + raioBorda);
    ctx.lineTo(x + larguraCarta, y + alturaCarta - raioBorda);
    ctx.quadraticCurveTo(x + larguraCarta, y + alturaCarta, x + larguraCarta - raioBorda, y + alturaCarta);
    ctx.lineTo(x + raioBorda, y + alturaCarta);
    ctx.quadraticCurveTo(x, y + alturaCarta, x, y + alturaCarta - raioBorda);
    ctx.lineTo(x, y + raioBorda);
    ctx.quadraticCurveTo(x, y, x + raioBorda, y);
    ctx.closePath();
    ctx.fill();

    // Resetar sombra para não afetar o texto
    ctx.shadowColor = 'transparent';

    // Desenhar valor e naipe
    ctx.fillStyle = info.cor;
    
    // Valor no canto superior esquerdo
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(valorVisual, x + 8, y + 5);

    // Naipe grande no centro
    ctx.font = '60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(info.icone, x + larguraCarta / 2, y + alturaCarta / 2);
}

/**
 * Renderiza uma imagem contendo várias cartas lado a lado em um fundo de mesa.
 * @param {string[]} cartas - Array de strings de cartas. Ex: ['As', 'Kd', 'Qc'].
 * @param {string} outputPath - O caminho completo para salvar o arquivo de imagem.
 * @returns {Promise<string>} O caminho do arquivo salvo.
 */
async function renderizarCartas(cartas, outputPath) {
    const larguraCarta = 100;
    const alturaCarta = 140;
    const espacamento = 15; // Espaço entre as cartas
    const padding = 20;     // Espaço ao redor do conjunto de cartas

    const numCartas = cartas.length;
    if (numCartas === 0) {
        // Se não houver cartas, podemos criar uma imagem vazia ou retornar null
        // Por enquanto, vamos criar uma pequena imagem de "mesa vazia"
        const canvasVazio = createCanvas(200, 180);
        const ctxVazio = canvasVazio.getContext('2d');
        ctxVazio.fillStyle = '#006400'; // Verde escuro
        ctxVazio.fillRect(0, 0, 200, 180);
        ctxVazio.fillStyle = 'white';
        ctxVazio.font = '20px Arial';
        ctxVazio.textAlign = 'center';
        ctxVazio.fillText('Mesa Vazia', 100, 90);
        fs.writeFileSync(outputPath, canvasVazio.toBuffer('image/png'));
        return outputPath;
    }

    const larguraTotal = (larguraCarta * numCartas) + (espacamento * (numCartas - 1)) + (padding * 2);
    const alturaTotal = alturaCarta + (padding * 2);

    const canvas = createCanvas(larguraTotal, alturaTotal);
    const ctx = canvas.getContext('2d');

    // Fundo da mesa (verde)
    ctx.fillStyle = '#006400'; // Verde escuro
    ctx.fillRect(0, 0, larguraTotal, alturaTotal);

    // Desenha cada carta
    cartas.forEach((carta, index) => {
        const x = padding + index * (larguraCarta + espacamento);
        const y = padding;
        desenharCarta(ctx, carta, x, y);
    });

    // Salva o canvas como um arquivo de imagem PNG
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);

    console.log(`[ImageRenderer] Imagem salva em: ${outputPath}`);
    return outputPath;
}

module.exports = { renderizarCartas };
