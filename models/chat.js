import mytenderClient from "../infra/mytender.js";

async function notifyWeighingFinished(key) {
    await mytenderClient.post("/pesagem-feita", { key });
}

async function notifyDeliveryFeeUpdated(key) {
    await mytenderClient.post("/taxa-entrega-atualizada", { key });
}

export default {
    notifyWeighingFinished,
    notifyDeliveryFeeUpdated
}

