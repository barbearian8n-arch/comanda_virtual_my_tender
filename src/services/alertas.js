import { AlertasAPI } from "./alertas.api"

const engine = new AlertasAPI()

export async function getAlertas() {
    return await engine.get()
}

export async function salvarAlertas(patch) {
    return await engine.salvar(patch)
}

export async function enviarSom(arquivo, dados) {
    return await engine.enviarSom(arquivo, dados)
}

export async function renomearSom(id, rotulo) {
    return await engine.renomearSom(id, rotulo)
}

export async function removerSom(id) {
    return await engine.removerSom(id)
}
