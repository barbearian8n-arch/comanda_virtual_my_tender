import { EnterpriseAPI } from "./enterprise.api"

const engine = new EnterpriseAPI()

export async function getSchedules() {
    return await engine.getSchedules()
}

export async function saveSchedules(schedules) {
    return await engine.saveSchedules(schedules)
}

export async function listInstances() {
    return await engine.listInstances()
}

export async function getInstanceState(id) {
    return await engine.getInstanceState(id)
}

export async function createInstance(nome) {
    return await engine.instanceAction("criar", { nome })
}

export async function connectInstance(id) {
    return await engine.instanceAction("conectar", { id })
}

export async function disconnectInstance(id) {
    return await engine.instanceAction("desconectar", { id })
}

export async function restartInstance(id) {
    return await engine.instanceAction("reiniciar", { id })
}

export async function setPrimaryInstance(id) {
    return await engine.instanceAction("principal", { id })
}

export async function removeInstance(id) {
    return await engine.removeInstance(id)
}
