import { ComandasMock } from "./comandas.mock"

const engine = new ComandasMock()

export async function getComanda(key) {
    return await engine.getComanda(key)
}

export async function updateItem(key, itemId, updates) {
    return await engine.updateItem(key, itemId, updates)
}
