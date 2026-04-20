import mytenderClient from "../infra/mytender.js";

async function notifyWeighingFinished(key) {
    await mytenderClient.post("/notify-agent", { key, event: "weighing_finished" });
}

async function notifyDeliveryFeeUpdated(key) {
    await mytenderClient.post("/notify-agent", { key, event: "delivery_fee_updated" });
}

async function notifyComandaClosed(key) {
    await mytenderClient.post("/notify-agent", { key, event: "command_closed" });
}

async function notifyComandaFinished(key) {
    await mytenderClient.post("/notify-agent", { key, event: "command_finished" });
}

export default {
    notifyWeighingFinished,
    notifyDeliveryFeeUpdated,
    notifyComandaClosed,
    notifyComandaFinished
}

