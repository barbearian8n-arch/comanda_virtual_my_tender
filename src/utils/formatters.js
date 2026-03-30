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
