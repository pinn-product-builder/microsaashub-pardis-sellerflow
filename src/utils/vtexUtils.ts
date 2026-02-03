
export const getEmbalagemQtyFromText = (text?: string | null) => {
    if (!text) return null;
    const direct = text.match(/(?:caixa|cx)\s*(\d+)/i);
    if (direct?.[1]) {
        const qty = Number.parseInt(direct[1], 10);
        return Number.isFinite(qty) && qty > 0 ? qty : null;
    }
    const unidades = text.match(/(\d+)\s*(?:unidades?|unid\.?|un\.?)\b/i);
    if (unidades?.[1]) {
        const qty = Number.parseInt(unidades[1], 10);
        return Number.isFinite(qty) && qty > 0 ? qty : null;
    }
    return null;
};

export const getEmbalagemQty = (embalagem?: string | null, ...fallbacks: Array<string | null | undefined>) => {
    const base = getEmbalagemQtyFromText(embalagem);
    if (base) return base;
    for (const text of fallbacks) {
        const qty = getEmbalagemQtyFromText(text);
        if (qty) return qty;
    }
    return null;
};
