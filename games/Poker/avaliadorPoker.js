const evaluator = require('poker-evaluator');

// Recebe um array com 2 cartas de cada jogador e as cartas da mesa
function avaliarMaos(jogadores, maosPrivadas, cartasMesa) {
  const resultados = [];

  jogadores.forEach((jogador, idx) => {
    const maoCompleta = [...maosPrivadas[idx], ...cartasMesa];
    console.log(`👀 Verificando mão do ${jogador}:`, maoCompleta);

    const resultado = evaluator.evalHand(maoCompleta);

    resultados.push({
      jogador,
      descricao: resultado.handName,
      pontuacao: resultado.value,
      cartas: maoCompleta,
    });
  });

  resultados.sort((a, b) => b.pontuacao - a.pontuacao);

  const vencedor = resultados[0];

  return {
    vencedor,
    ranking: resultados
  };
}

module.exports = { avaliarMaos };