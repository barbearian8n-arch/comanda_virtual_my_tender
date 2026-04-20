import { ComandasMock } from "./comandas.mock"
import { ComandasAPI } from "./comandas.api"

// const engine = import.meta.env.VITE_USE_MOCK === "true" ? new ComandasMock() : new ComandasAPI()
const engine = new ComandasAPI()

export async function getComanda(key) {
    return await engine.getComanda(key)
}

export async function updateItem(key, itemId, updates) {
    return await engine.updateItem(key, itemId, updates)
}

export async function getComandas() {
    return await engine.getComandas()
}

export async function getComandasWithKgItems() {
    return await engine.getComandasWithKgItems()
}

export async function saveWeights(key, items) {
    return await engine.saveWeights(key, items)
}

export async function updateDeliveryFee(key, value) {
    return await engine.updateDeliveryFee(key, value)
}

export async function updateComandaValues(key, totalReal, deliveryFee) {
    return await engine.updateComandaValues(key, totalReal, deliveryFee)
}

export async function updateComanda(key, { delivery_address, payment_method }) {
    return await engine.updateComanda(key, { delivery_address, payment_method })
}

export async function closeComanda(key) {
    return await engine.closeComanda(key)
}

export async function finishComanda(key) {
    return await engine.finishComanda(key)
}

export async function addItemToComanda(menuId, unit, quantity, estimatedPrice) {
    return await engine.addItemToComanda(menuId, unit, quantity, estimatedPrice)
}

export async function removeItemFromComanda(itemId) {
    return await engine.removeItemFromComanda(itemId)
}
