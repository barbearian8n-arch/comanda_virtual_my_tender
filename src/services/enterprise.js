import { EnterpriseAPI } from "./enterprise.api"

const engine = new EnterpriseAPI()

export async function getSchedules() {
    return await engine.getSchedules()
}

export async function saveSchedules(schedules) {
    return await engine.saveSchedules(schedules)
}
