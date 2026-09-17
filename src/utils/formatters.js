/**
 * `5511981412826` → `+55 (11) 98141-2826`; `557788701739` → `+55 (77) 8870-1739`.
 *
 * O número do assinante tem 9 dígitos (celular) ou 8 (fixo e celular antigo), e
 * os dois convivem no banco. Por isso o desmembramento é decidido pelo total de
 * dígitos, e não por uma máscara fixa: a versão anterior assumia 4+4 sempre e
 * empurrava o dígito extra para o código do país, exibindo os números de 13
 * dígitos como `+551 (19) 8141-2826`.
 *
 * Só desmembra o que tem cara de número brasileiro. Formato desconhecido volta
 * como veio — telefone exibido errado é pior que telefone sem formatação.
 */
export function formatPhone(phone) {
    if (!phone) return ""

    const digits = String(phone).replace(/\D/g, "")
    const bruto = String(phone)

    let pais = ""
    let ddd = ""
    let assinante = ""

    if (digits.length === 12 || digits.length === 13) {
        // 12/13 dígitos que não começam com 55 é número de fora: sem o código do
        // país certo, qualquer corte aqui seria chute
        if (!digits.startsWith("55")) return bruto

        pais = digits.slice(0, 2)
        ddd = digits.slice(2, 4)
        assinante = digits.slice(4)
    } else if (digits.length === 10 || digits.length === 11) {
        ddd = digits.slice(0, 2)
        assinante = digits.slice(2)
    } else if (digits.length === 8 || digits.length === 9) {
        assinante = digits
    } else {
        return bruto
    }

    // os últimos 4 são sempre o sufixo: sobra 5 no celular de 9, 4 no de 8
    const corte = assinante.length - 4
    const numero = `${assinante.slice(0, corte)}-${assinante.slice(corte)}`

    return [pais && `+${pais}`, ddd && `(${ddd})`, numero].filter(Boolean).join(" ")
}

export function formatUnit(item) {
    const unit = typeof item === 'string' ? item : (item?.unit || '');
    switch (unit) {
        case "u":
            return "unidades"
        case "kg":
            return "kg"
        case "g":
            return "g"
        case "l":
            return "l"
        default:
            return unit
    }
}

export function formatPrice(price) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).format(price)
}

/**
 * `2026-09-17T14:12:30Z` → `17/09/2026 às 11:12`.
 *
 * Data vazia ou impossível volta string vazia — quem chama decide o que dizer no
 * lugar, porque "Não informado" e "Imediata" são escolhas de tela, não de formato.
 */
export function formatDateTime(date) {
    if (!date) return ""

    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) return ""

    return dateObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
        + " às "
        + dateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

export function formatName(name) {
    if (!name) return ""
    return name.split(" - ")[0]
}

export function getDisplayPriceLabel(produto) {
    const display_unit = getDisplayUnit(produto);
    const label = displayUnitLabel(display_unit);

    const price = displayPrice(produto);

    return `${formatPrice(price)} / ${label}`;
}

export function displayPrice(produto) {
    const display_unit = getDisplayUnit(produto);

    switch (display_unit) {
        case 'uni':
            return produto.preco_por_uni
        case '5uni':
            return produto.preco_por_uni * 5
        case '10uni':
            return produto.preco_por_uni * 10

        case 'kg':
            return produto.preco

        case '100g':
            return produto.preco * 0.1
        case '250g':
            return produto.preco * 0.25
            
        default:
            return produto.preco
    }
}

export function getValidDisplayUnits(produto) {
    if (produto.unidade === 'uni') return ['uni'];
    
    if (produto.unidade !== 'kg') {
        console.warn('Unidade desconhecida:', produto.unidade);
        return [produto.unidade];
    }

    const valid_units = ['kg', '100g', '250g'];
    if (produto.preco_por_uni != null) {
        valid_units.push('uni');
        valid_units.push('5uni')
        valid_units.push('10uni')

    }

    return valid_units;
}

export function getDisplayUnit(produto) {
    const valid_units = getValidDisplayUnits(produto);
    return valid_units.includes(produto.display_unit) ? produto.display_unit : produto.unidade;
}

export function displayUnitLabel(unit) {
    switch (unit) {
        case 'uni': return 'Unidade';
        case '5uni': return '5 Unidades';
        case '10uni': return '10 Unidades';
        case 'kg': return 'Quilograma';
        case '100g': return '100 Gramas';
        case '250g': return '250 Gramas';
        default: return unit;
    }
}
