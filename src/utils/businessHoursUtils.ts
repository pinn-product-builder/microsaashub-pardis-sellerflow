/**
 * Utilitários para cálculo de tempo baseado em horários comerciais.
 */

export interface BusinessHour {
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_open: boolean;
}

/**
 * Calcula a diferença em horas entre duas datas, considerando apenas o horário comercial.
 */
export function calculateBusinessHoursElapsed(
    startDate: Date,
    endDate: Date,
    businessHours: BusinessHour[]
): number {
    if (endDate <= startDate) return 0;

    let elapsedMs = 0;
    let currentMoment = new Date(startDate);
    const endMoment = new Date(endDate);

    const getBusinessDay = (date: Date) => businessHours.find(bh => bh.day_of_week === date.getDay());

    // Iterar dia a dia
    while (currentMoment < endMoment) {
        const dayConfig = getBusinessDay(currentMoment);

        if (!dayConfig || !dayConfig.is_open) {
            // Pula para o início do próximo dia
            currentMoment.setDate(currentMoment.getDate() + 1);
            currentMoment.setHours(0, 0, 0, 0);
            continue;
        }

        const [startH, startM] = dayConfig.start_time.split(':').map(Number);
        const [endH, endM] = dayConfig.end_time.split(':').map(Number);

        const openingTime = new Date(currentMoment);
        openingTime.setHours(startH, startM, 0, 0);

        const closingTime = new Date(currentMoment);
        closingTime.setHours(endH, endM, 0, 0);

        // Ajusta o início da janela de hoje
        const windowStart = currentMoment > openingTime ? currentMoment : openingTime;
        // Ajusta o fim da janela de hoje
        const windowEnd = endMoment < closingTime ? endMoment : closingTime;

        if (windowStart < windowEnd && windowStart < closingTime && windowEnd > openingTime) {
            elapsedMs += windowEnd.getTime() - windowStart.getTime();
        }

        // Avança para o início do próximo dia
        currentMoment.setDate(currentMoment.getDate() + 1);
        currentMoment.setHours(0, 0, 0, 0);
    }

    return elapsedMs / (1000 * 60 * 60);
}
