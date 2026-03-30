import mytenderClient from "../infra/mytender.js";

async function notifyWeighingFinished(key) {
    await mytenderClient.post("/pesagem-feita", { key });
}

export default {
    notifyWeighingFinished
}

