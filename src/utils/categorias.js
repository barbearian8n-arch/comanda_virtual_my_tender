/**
 * Resolver o `?categoria=` que chega pela URL contra as categorias de verdade.
 *
 * Quem monta esses links é o robô, escrevendo em texto corrido no WhatsApp — ele
 * vai mandar "pizza", "Pizzas Tradicionais" ou "paes-tradicionais", e o filtro do
 * servidor é `eq` exato. Sem uma tradução no meio, qualquer diferença de acento,
 * caixa ou plural entrega um cardápio VAZIO ao cliente, que é pior que não ter
 * mandado link nenhum: ele conclui que a loja não tem o produto.
 */

/** O valor que a tela usa para dizer "sem filtro". */
export const TODOS = "todos"

/** `Pães Tradicionais` e `paes-tradicionais` viram a mesma coisa. */
export function normalizarCategoria(texto) {
    return String(texto ?? "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        // hífen, vírgula e afins viram espaço: o robô tanto escreve o nome quanto
        // um slug, e os dois têm de chegar no mesmo lugar
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
}

/**
 * O que fazer com o valor que veio na URL.
 *
 * Devolve `{ modo, categorias }`:
 *   - `uma`     → casou com uma categoria; é a aba selecionada, filtrada no servidor
 *   - `varias`  → casou com várias; mostra a lista completa recortada nelas
 *   - `todos`   → pediu tudo explicitamente
 *   - `nenhuma` → não casou com nada; mostra tudo, sem recorte
 *
 * `varias` existe porque "pizza" casa com nove categorias aqui. Escolher uma na
 * sorte mostraria ao cliente um cardápio que não é o que ele pediu, e cair no
 * padrão o mandaria para uma categoria sem relação nenhuma com a conversa. As
 * nove juntas é o que ele quis dizer.
 *
 * A ordem das tentativas importa: `Pizzas Tradicionais` é prefixo de
 * `Pizzas Tradicionais - Meio a Meio`, então o casamento exato vem antes do
 * parcial — senão o nome completo nunca ganharia de si mesmo.
 */
export function resolverCategorias(valor, categorias) {
    const alvo = normalizarCategoria(valor)
    const lista = Array.isArray(categorias) ? categorias : []

    if (!alvo || lista.length === 0) {
        return { modo: "nenhuma", categorias: [] }
    }

    if (alvo === TODOS) {
        return { modo: TODOS, categorias: [] }
    }

    const pares = lista.map((categoria) => ({
        categoria,
        normal: normalizarCategoria(categoria)
    }))

    const exata = pares.find((p) => p.normal === alvo)
    if (exata) {
        return { modo: "uma", categorias: [exata.categoria] }
    }

    /**
     * Singular e plural têm de dar no mesmo lugar. O robô escreve como sai na
     * conversa, e "pizza" casava com nove categorias enquanto "pizzas" casava
     * com sete — as duas "Pizza Sem Lactose" ficavam de fora do plural. Duas
     * respostas diferentes para a mesma pergunta do cliente.
     *
     * Só a partir de 4 caracteres: cortar o "s" de termo curto criaria raízes
     * curtas demais, que pegam categoria sem relação nenhuma.
     */
    const variantes = new Set([alvo])
    if (alvo.length >= 4) {
        variantes.add(alvo.endsWith("s") ? alvo.slice(0, -1) : `${alvo}s`)
    }

    const casaAlguma = (texto, teste) => [...variantes].some((v) => teste(texto, v))

    // prefixo antes de trecho solto: "pizza" deve pegar as que COMEÇAM com
    // pizza, não uma "Bebidas para Pizza" que só menciona a palavra
    const porPrefixo = pares.filter((p) => casaAlguma(p.normal, (t, v) => t.startsWith(v)))
    const casadas = porPrefixo.length > 0
        ? porPrefixo
        : pares.filter((p) => casaAlguma(p.normal, (t, v) => t.includes(v)))

    if (casadas.length === 0) {
        return { modo: "nenhuma", categorias: [] }
    }

    if (casadas.length === 1) {
        return { modo: "uma", categorias: [casadas[0].categoria] }
    }

    return { modo: "varias", categorias: casadas.map((p) => p.categoria) }
}
