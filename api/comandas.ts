import { createHandler } from "infra/handlers";
import mytenderClient from "infra/mytender";
import { VercelRequest, VercelResponse } from "@vercel/node";

const handler = createHandler();

handler.get(async (req: VercelRequest, res: VercelResponse) => {
    const { key } = req.query;

    if (!key) {
        res.status(400).end("Missing key");
        return;
    }

    // const response = await mytenderClient.get(`/comandas/${key}`);

    res.status(200).json({ key });
});

export default handler;