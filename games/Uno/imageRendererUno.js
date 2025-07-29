// games/Uno/imageRendererUno.js
const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

// ALTERADO: Tenta registrar a fonte Inter-Bold
try {
    registerFont(path.join(__dirname, 'assets', 'Inter-Bold.ttf'), { family: 'Inter Bold' });
} catch (e) {
    console.log("[ImageRendererUno] Fonte 'Inter-Bold.ttf' não encontrada, usando 'sans-serif'.");
}

// --- ESTRUTURA DE ASSETS REVISADA (sem alterações aqui) ---
const baseAssetMap = {
    'vermelho': path.join(__dirname, 'assets', 'red.png'),
    'amarelo': path.join(__dirname, 'assets', 'yellow.png'),
    'verde': path.join(__dirname, 'assets', 'green.png'),
    'azul': path.join(__dirname, 'assets', 'blue.png'),
    'curinga': path.join(__dirname, 'assets', 'curinga.png'),
    '+4': path.join(__dirname, 'assets', '4+.png'),
};
const iconAssetMap = {
    'reverso': path.join(__dirname, 'assets', 'reverse.png'),
    'pular': path.join(__dirname, 'assets', 'block.png'),
};


// --- Funções de Desenho (COM ALTERAÇÕES) ---

/**
 * Desenha o número do índice da carta (para o comando !jogar)
 */
function desenharNumeroIndice(ctx, numero, x, y) {
    ctx.font = '60px "Inter Bold", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';
    ctx.fillText(numero, x, y);
}

/**
 * Desenha o texto principal da carta (número ou +2)
 */
function desenharTextoPrincipal(ctx, texto, x, y) {
    // ALTERADO: Fonte Inter e sem stroke
    ctx.font = 'bold 72px "Inter Bold", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'white';
    ctx.fillText(texto, x, y);
}

// --- Funções de Renderização (sem alterações na lógica interna, herdam o novo estilo) ---

async function renderizarMao(mao, outputPath) {
    if (!mao || mao.length === 0) return null;

    const LARGURA_CARTA = 240;
    const ALTURA_CARTA = 372;
    const CARTAS_POR_LINHA = 7;
    const ESPACAMENTO_HORIZONTAL = 20;
    const ESPACAMENTO_VERTICAL = 60; // Mantém espaço para o número maior
    const PADDING_LATERAL = 25;
    const PADDING_VERTICAL = 25;

    const numLinhas = Math.ceil(mao.length / CARTAS_POR_LINHA);
    const numCartasNaLinhaMaisLonga = Math.min(mao.length, CARTAS_POR_LINHA);

    const larguraTotal = (PADDING_LATERAL * 2) + (numCartasNaLinhaMaisLonga * LARGURA_CARTA) + ((numCartasNaLinhaMaisLonga - 1) * ESPACAMENTO_HORIZONTAL);
    const alturaTotal = (PADDING_VERTICAL * 2) + (numLinhas * ALTURA_CARTA) + ((numLinhas - 1) * ESPACAMENTO_VERTICAL);

    const canvas = createCanvas(larguraTotal, alturaTotal);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#006400';
    ctx.fillRect(0, 0, larguraTotal, alturaTotal);

    const moldesCarregados = {};
    const todosAssets = { ...baseAssetMap, ...iconAssetMap };
    for (const key in todosAssets) {
        if (fs.existsSync(todosAssets[key])) {
            moldesCarregados[key] = await loadImage(todosAssets[key]);
        }
    }

    for (let i = 0; i < mao.length; i++) {
        const carta = mao[i];
        const linha = Math.floor(i / CARTAS_POR_LINHA);
        const coluna = i % CARTAS_POR_LINHA;
        const x = PADDING_LATERAL + coluna * (LARGURA_CARTA + ESPACAMENTO_HORIZONTAL);
        const y = PADDING_VERTICAL + ESPACAMENTO_VERTICAL + linha * (ALTURA_CARTA + ESPACAMENTO_VERTICAL);

        desenharNumeroIndice(ctx, (i + 1).toString(), x + LARGURA_CARTA / 2, y - (ESPACAMENTO_VERTICAL / 2));
        
        let baseKey = carta.cor;
        if (baseAssetMap[carta.valor]) {
             baseKey = carta.valor;
        }
        const baseMolde = moldesCarregados[baseKey];
        if (baseMolde) {
            ctx.drawImage(baseMolde, x, y, LARGURA_CARTA, ALTURA_CARTA);
        }

        if (iconAssetMap[carta.valor]) {
            const iconMolde = moldesCarregados[carta.valor];
            if (iconMolde) {
                const iconX = x + (LARGURA_CARTA - iconMolde.width) / 2;
                const iconY = y + (ALTURA_CARTA - iconMolde.height) / 2;
                ctx.drawImage(iconMolde, iconX, iconY);
            }
        }

        const temDesignProprio = ['curinga', '+4', 'reverso', 'pular'].includes(carta.valor);
        if (!temDesignProprio) {
            desenharTextoPrincipal(ctx, carta.valor, x + LARGURA_CARTA / 2, y + ALTURA_CARTA / 2);
        }
    }

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    console.log(`[ImageRendererUno] Imagem da mão salva em: ${outputPath}`);
    return outputPath;
}

async function renderizarCartaUnica(carta, outputPath) {
    const LARGURA_CARTA = 240;
    const ALTURA_CARTA = 372;
    const canvas = createCanvas(LARGURA_CARTA, ALTURA_CARTA);
    const ctx = canvas.getContext('2d');

    let baseKey = carta.cor;
    if (baseAssetMap[carta.valor]) {
        baseKey = carta.valor;
    }
    const baseMolde = await loadImage(baseAssetMap[baseKey]);
    ctx.drawImage(baseMolde, 0, 0, LARGURA_CARTA, ALTURA_CARTA);

    if (iconAssetMap[carta.valor]) {
        const iconMolde = await loadImage(iconAssetMap[carta.valor]);
        const iconX = (LARGURA_CARTA - iconMolde.width) / 2;
        const iconY = (ALTURA_CARTA - iconMolde.height) / 2;
        ctx.drawImage(iconMolde, iconX, iconY);
    }
    
    const temDesignProprio = ['curinga', '+4', 'reverso', 'pular'].includes(carta.valor);
    if (!temDesignProprio) {
        desenharTextoPrincipal(ctx, carta.valor, LARGURA_CARTA / 2, ALTURA_CARTA / 2);
    }
    
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    return outputPath;
}

module.exports = { renderizarMao, renderizarCartaUnica };