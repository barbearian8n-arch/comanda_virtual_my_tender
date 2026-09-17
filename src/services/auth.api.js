import { createApiClient } from "./http"

export class AuthAPI {
    constructor() {
        this.axios = createApiClient()
    }

    async login(email, senha) {
        const response = await this.axios.post(`/auth/login`, { email, senha })
        return response.data
    }

    async logout() {
        const response = await this.axios.post(`/auth/logout`, {})
        return response.data
    }

    async me() {
        const response = await this.axios.get(`/auth/me`)
        return response.data
    }

    /** A loja ainda não tem dono? A tela de login usa para oferecer o cadastro. */
    async status() {
        const response = await this.axios.get(`/auth/status`)
        return response.data
    }

    async register({ nome, email, senha, papel }) {
        const response = await this.axios.post(`/auth/register`, { nome, email, senha, papel })
        return response.data
    }

    async listUsers() {
        const response = await this.axios.get(`/auth/users`)
        return response.data
    }

    async updateUser(id, patch) {
        const response = await this.axios.post(`/auth/users`, { id, ...patch })
        return response.data
    }
}
