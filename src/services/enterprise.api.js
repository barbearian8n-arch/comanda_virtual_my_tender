import axios from "axios"

export class EnterpriseAPI {
    constructor() {
        this.baseUrl = import.meta.env.VITE_API_URL
        this.axios = axios.create({
            baseURL: this.baseUrl,
            headers: {
                "Content-Type": "application/json"
            }
        })
    }

    async getSchedules() {
        const response = await this.axios.get(`/enterprise/schedules`)

        if (response.status !== 200) {
            throw new Error("Erro ao buscar os horários")
        }

        return response.data
    }

    async saveSchedules(schedules) {
        const response = await this.axios.post(`/enterprise/schedules`, schedules)

        if (response.status !== 200) {
            throw new Error("Erro ao salvar os horários")
        }

        return response.data
    }
}
