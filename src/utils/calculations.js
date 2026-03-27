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
