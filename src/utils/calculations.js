/**
 * Calcula o preço total real de um item baseado na quantidade e unidade.
 * Resolve problemas comuns como valores nulos, strings ou propriedades faltando.
 * 
 * @param {Object} item Objeto do item contendo menu_info ou base_price, e as propriedades 'real'
 * @returns {number} O preço total calculado
 */
export function calculateRealTotalPrice(item) {
    try {
        const price_per_kg = item.menu_info.price;
        const price_per_unit = item.menu_info.price_per_unit;
        const quantity = item.real.quantity;
        const unit = item.real.unit;

        if (unit === "kg") {
            return quantity * price_per_kg;
        } else if (unit === "g") {
            return (quantity * price_per_kg) / 1000;
        } else {
            return quantity * price_per_unit;
        }
    } catch (error) {
        console.error("Erro crítico no cálculo de preço:", error);
        return 0;
    }
}

/**
 * Calcula o subtotal das comandas somando os preços totais de cada item.
 * @param {Array} items Lista de itens da comanda
 * @returns {number} Subtotal calculado
 */
export function calculateSubtotal(items) {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce((acc, item) => {
        const price = item.real?.total_price || item.requested?.estimated_price || item.total_price || 0;
        return acc + price;
    }, 0);
}

/**
 * Calcula os totais da comanda (subtotal, taxa de entrega, total final).
 * @param {Array} items Lista de itens
 * @param {number|null} deliveryFee Taxa de entrega (pode ser null)
 * @returns {Object} Objeto com subtotal, taxaEntrega e total
 */
export function calculateComandaTotals(items, deliveryFee) {
    const subtotal = calculateSubtotal(items);
    const taxaEntrega = deliveryFee || 0;
    const total = subtotal + taxaEntrega;
    return { subtotal, taxaEntrega, total };
}
