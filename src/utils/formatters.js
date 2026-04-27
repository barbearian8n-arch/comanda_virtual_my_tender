export function formatPhone(phone) {
    if (!phone) return ""
    let reversed = reverseString(phone)
    reversed = reversed.replace(/(\d{4})(\d{4})(\d{2})(\d*)/, "$1,$2,$3,$4")

    const [countryCode, ddd, ...rest] = reversed.split(",").reverse().map(reverseString)
    return `+${countryCode} (${ddd}) ${rest.join("-")}`
}

export function reverseString(str) {
    return str.split("").reverse().join("")
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
