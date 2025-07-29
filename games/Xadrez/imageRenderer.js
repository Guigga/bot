// games/Xadrez/imageRenderer.js

const Jimp = require('jimp');
const path = require('path');
const { Chess } = require('chess.js');

// --- CONFIGURAÇÃO ---
const TAMANHO_QUADRADO = 800;
const OFFSET_X = 200;
const OFFSET_Y = 200;

const CAMINHO_ASSETS = path.join(__dirname, 'assets');
const CAMINHO_TABULEIRO = path.join(CAMINHO_ASSETS, 'Tabuleiro.png');

// --- CORREÇÃO DEFINITIVA: Usando um novo sistema de chaves (cor + tipo) ---
// Este mapa agora usa chaves únicas que combinam a cor ('w' ou 'b') e o tipo da peça.
const ARQUIVOS_PECAS = {
    // Peças Brancas (w + TIPO)
    'wP': 'Pb.png', 'wR': 'Rb.png', 'wN': 'Nb.png', 'wB': 'Bb.png', 'wQ': 'Qb.png', 'wK': 'Kb.png',
    // Peças Pretas (b + TIPO)
    'bP': 'pp.png', 'bR': 'rp.png', 'bN': 'np.png', 'bB': 'bp.png', 'bQ': 'qp.png', 'bK': 'kp.png'
};

const cacheImagensPecas = {};

async function preCarregarImagensPecas() {
    console.log('[ImageRenderer] Pre-carregando imagens das peças...');
    // Agora o loop itera sobre as novas chaves
    for (const key in ARQUIVOS_PECAS) {
        const caminho = path.join(CAMINHO_ASSETS, ARQUIVOS_PECAS[key]);
        // A chave no cache será 'wP', 'bP', etc.
        cacheImagensPecas[key] = await Jimp.read(caminho);
    }
    console.log('[ImageRenderer] Imagens das peças carregadas com sucesso!');
}

async function renderBoardToImage(gameState) {
    try {
        const game = new Chess(gameState.fen);
        const board = game.board();

        const imagemTabuleiro = await Jimp.read(CAMINHO_TABULEIRO);

        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const peca = board[i][j];
                if (peca) {
                    // --- CORREÇÃO DEFINITIVA: Criando a chave única para a busca ---
                    const key = peca.color + peca.type.toUpperCase(); // Ex: 'w' + 'p' = 'wp'
                    const imagemPeca = cacheImagensPecas[key];
                    
                    if (imagemPeca) {
                        const x_quadrado = OFFSET_X + j * TAMANHO_QUADRADO;
                        const y_quadrado = OFFSET_Y + i * TAMANHO_QUADRADO;

                        const x_centralizado = x_quadrado + (TAMANHO_QUADRADO / 2) - (imagemPeca.getWidth() / 2);
                        const y_centralizado = y_quadrado + (TAMANHO_QUADRADO / 2) - (imagemPeca.getHeight() / 2);

                        imagemTabuleiro.composite(imagemPeca, x_centralizado, y_centralizado);
                    }
                }
            }
        }

        return await imagemTabuleiro.getBufferAsync(Jimp.MIME_PNG);
    } catch (error) {
        console.error("Erro ao renderizar a imagem do tabuleiro:", error);
        return null;
    }
}

preCarregarImagensPecas().catch(err => {
    console.error("Falha fatal no pré-carregamento das imagens das peças:", err);
    process.exit(1);
});

module.exports = {
    renderBoardToImage,
};