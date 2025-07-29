// Função helper para calcular a data do próximo dia da semana
function getDateForNextWeekday(weekday) {
    const weekdays = { 'domingo': 0, 'segunda': 1, 'terca': 2, 'terça': 2, 'quarta': 3, 'quinta': 4, 'sexta': 5, 'sabado': 6, 'sábado': 6 };
    const targetDay = weekdays[weekday.toLowerCase()];
    if (targetDay === undefined) return null;

    const today = new Date();
    const todayDay = today.getDay();
    
    let daysToAdd = targetDay - todayDay;
    if (daysToAdd <= 0) { 
        daysToAdd += 7;
    }

    const targetDate = new Date();
    targetDate.setDate(today.getDate() + daysToAdd);
    return targetDate;
}

// Exporta a função para que outros arquivos possam usá-la
module.exports = {
    getDateForNextWeekday
};