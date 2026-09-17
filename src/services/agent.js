import { AgentAPI } from "./agent.api"

const engine = new AgentAPI()

export async function listSenders() {
    return await engine.listSenders()
}

export async function listConversations(sender) {
    return await engine.listConversations(sender)
}

export async function listMessages(sender, telefone, antesDoId = null) {
    return await engine.listMessages(sender, telefone, antesDoId)
}

export async function sendMessage(sender, telefone, texto) {
    return await engine.sendMessage(sender, telefone, texto)
}
