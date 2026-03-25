import { createHandler } from "../infra/handlers.js";
import mytenderClient from "../infra/mytender.js";

const handler = createHandler();

handler.get(async (req, res) => {
    const response = await mytenderClient.get("/comandas/keys");

    res.status(200).json(response.data);
});

export default handler;