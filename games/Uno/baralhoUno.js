// games/Uno/baralhoUno.js

/**
 * Gera um baralho de UNO completo com 108 cartas e o embaralha.
 * @returns {Array<object>} Um array de objetos de carta embaralhado.
 */
function gerarBaralhoUno() {
    const cores = ['vermelho', 'amarelo', 'verde', 'azul'];
    const valoresNumericos = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const valoresAcao = ['+2', 'reverso', 'pular'];
    const valoresCuringa = ['curinga', '+4'];
    const baralho = [];

    // Gerar cartas coloridas
    for (const cor of cores) {
        // Um '0' de cada cor
        baralho.push({ cor, valor: '0' });

        // Duas de cada número (1-9) e de cada carta de ação
        for (let i = 0; i < 2; i++) {
            for (let j = 1; j < valoresNumericos.length; j++) {
                baralho.push({ cor, valor: valoresNumericos[j] });
            }
            for (const valor of valoresAcao) {
                baralho.push({ cor, valor });
            }
        }
    }

    // Gerar cartas Curinga
    for (let i = 0; i < 4; i++) {
        baralho.push({ cor: 'preto', valor: 'curinga' });
        baralho.push({ cor: 'preto', valor: '+4' });
    }

    // Embaralhar (Algoritmo Fisher-Yates, o mesmo usado no bot [cite: 721])
    for (let i = baralho.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [baralho[i], baralho[j]] = [baralho[j], baralho[i]];
    }

    return baralho;
}

module.exports = { gerarBaralhoUno };