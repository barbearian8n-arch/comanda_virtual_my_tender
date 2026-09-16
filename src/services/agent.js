import { AgentAPI } from "./agent.api"

const engine = new AgentAPI()

export async function listSenders() {
    return await engine.listSenders()
}

export async function listConversations(sender) {
    return await engine.listConversations(sender)
}

export async function listMessages(sender, telefone) {
    return await engine.listMessages(sender, telefone)
}

export async function uploadAudio(sender, telefone, arquivo) {
    return await engine.uploadAudio(sender, telefone, arquivo)
}
