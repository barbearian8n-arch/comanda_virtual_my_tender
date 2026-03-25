import { createHandler } from "../infra/middleware";
import { api } from "../infra/comanda-api";

const handler = createHandler();

handler.get(get);

export default handler;

async function get(req, res) {
    const response = await api.get("/mytender/comandas/keys");

    return res.json(response.data);
}