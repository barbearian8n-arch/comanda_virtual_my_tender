import { AuthAPI } from "./auth.api"

const engine = new AuthAPI()

export async function login(email, senha) {
    return await engine.login(email, senha)
}

export async function logout() {
    return await engine.logout()
}

export async function me() {
    return await engine.me()
}

export async function authStatus() {
    return await engine.status()
}

export async function register(dados) {
    return await engine.register(dados)
}

export async function listUsers() {
    return await engine.listUsers()
}

export async function updateUser(id, patch) {
    return await engine.updateUser(id, patch)
}
