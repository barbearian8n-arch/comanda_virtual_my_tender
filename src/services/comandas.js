import { ComandasMock } from "./comandas.mock"
import { ComandasAPI } from "./comandas.api"

const engine = import.meta.env.VITE_USE_MOCK === "true" ? new ComandasMock() : new ComandasAPI()

export async function getComanda(key) {
    return await engine.getComanda(key)
}

export async function updateItem(key, itemId, updates) {
    return await engine.updateItem(key, itemId, updates)
}

export async function getComandas() {
    return await engine.getComandas()
}

export async function saveWeights(key, items) {
    return await engine.saveWeights(key, items)
}
