const UNIT_OPTIONS = [
    { value: "u", label: "Unidade" },
    { value: "g", label: "Gramas" },
    { value: "kg", label: "Quilogramas" },
]

/**
 * Retorna as opções de unidades válidas com base nas regras do produto.
 */
export function getValidUnits(produto) {
    if (!produto) return UNIT_OPTIONS

    // se unidade for "uni", mostre apenas unidade
    if (produto.unidade === "uni") {
        return UNIT_OPTIONS.filter(u => u.value === "u")
    }

    if (produto.unidade === "kg") {
        // se g_por_uni for null e unidade for kg então mostre apenas g e kg
        if (!produto.g_por_uni) {
            return UNIT_OPTIONS.filter(u => u.value === "g" || u.value === "kg")
        }

        // se for kg e g_por_uni e preco_por_uni existir deve mostrar todos os seletores
        if (produto.g_por_uni && produto.preco_por_uni !== null && produto.preco_por_uni !== undefined) {
            return UNIT_OPTIONS
        }
        
        // Em casos residuais de kg, retornamos g e kg por segurança
        return UNIT_OPTIONS.filter(u => u.value === "g" || u.value === "kg")
    }

    return UNIT_OPTIONS
}
