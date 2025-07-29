// games/Velha/imageRenderer.js

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

/**
 * Renders the Tic-Tac-Toe board state as a PNG image with improvements.
 * - Features a more solid grid.
 * - Watermarks for coordinates only appear on empty cells.
 * @param {Array<Object>} historicoDeJogadas - An array of move objects, e.g., [{ posicao: 'a1', simbolo: '❌' }]
 * @returns {Promise<string>} The file path to the generated image.
 */
async function renderizarVelha(historicoDeJogadas, posicaoParaDestacar = null, linhaVencedora = null) {
    const width = 300;
    const height = 300;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // ... (o código para desenhar fundo, grid, peças e o destaque amarelo continua igual) ...
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(100, 20); ctx.lineTo(100, 280);
    ctx.moveTo(200, 20); ctx.lineTo(200, 280);
    ctx.moveTo(20, 100); ctx.lineTo(280, 100);
    ctx.moveTo(20, 200); ctx.lineTo(280, 200);
    ctx.stroke();

    const jogadasFeitas = new Map(historicoDeJogadas.map(j => [j.posicao, j.simbolo]));
    const todasPosicoes = ['a1', 'a2', 'a3', 'b1', 'b2', 'b3', 'c1', 'c2', 'c3'];

    for (const posicao of todasPosicoes) {
        const col = parseInt(posicao[1]) - 1;
        const row = posicao.charCodeAt(0) - 'a'.charCodeAt(0);
        const x = col * 100 + 50;
        const y = row * 100 + 50;

        if (posicao === posicaoParaDestacar) {
            ctx.fillStyle = 'rgba(255, 235, 59, 0.6)';
            ctx.beginPath();
            ctx.arc(x, y, 45, 0, Math.PI * 2);
            ctx.fill();
        }

        if (jogadasFeitas.has(posicao)) {
            const simbolo = jogadasFeitas.get(posicao);
            ctx.lineWidth = 8;

            if (simbolo === '❌') {
                ctx.strokeStyle = '#D32F2F';
                ctx.beginPath();
                ctx.moveTo(x - 25, y - 25); ctx.lineTo(x + 25, y + 25);
                ctx.moveTo(x + 25, y - 25); ctx.lineTo(x - 25, y + 25);
                ctx.stroke();
            } else { // '⭕'
                ctx.strokeStyle = '#1976D2';
                ctx.beginPath();
                ctx.arc(x, y, 30, 0, Math.PI * 2);
                ctx.stroke();
            }
        } else {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.font = 'bold 32px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(posicao.toUpperCase(), x, y);
        }
    }


    // --- MELHORIA ADICIONADA: DESENHA A LINHA DA VITÓRIA ---
    // Este bloco só executa se uma linha vencedora for fornecida
    if (linhaVencedora && linhaVencedora.length === 3) {
        const posicoesCoord = {};
        todasPosicoes.forEach(pos => {
            const col = parseInt(pos[1]) - 1;
            const row = pos.charCodeAt(0) - 'a'.charCodeAt(0);
            posicoesCoord[pos] = { x: col * 100 + 50, y: row * 100 + 50 };
        });

        const [startPos, , endPos] = linhaVencedora;
        const startCoords = posicoesCoord[startPos];
        const endCoords = posicoesCoord[endPos];

        ctx.beginPath();
        ctx.moveTo(startCoords.x, startCoords.y);
        ctx.lineTo(endCoords.x, endCoords.y);
        ctx.strokeStyle = '#FFD700'; // Cor de ouro para a linha da vitória
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.stroke();
    }

    const tempDir = path.join(__dirname, '..', '..', 'temp_images');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const filePath = path.join(tempDir, `velha_${Date.now()}.png`);
    fs.writeFileSync(filePath, canvas.toBuffer('image/png'));
    
    return filePath;
}

module.exports = { renderizarVelha };
