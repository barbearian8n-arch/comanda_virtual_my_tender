import { createHandler } from "../../infra/handlers";
import mytenderClient from "../../infra/mytender";
import { VercelRequest, VercelResponse } from "@vercel/node";

const handler = createHandler();

handler.get(async (req: VercelRequest, res: VercelResponse) => {
    const response = await mytenderClient.get("/comandas/keys");

    res.status(200).json(response.data);
});

export default handler;