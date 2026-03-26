import { createHandler } from "infra/handlers";
import mytenderClient from "infra/mytender";
import { VercelRequest, VercelResponse } from "@vercel/node";
import comandas from "models/comandas";

const handler = createHandler();

handler.get(async (req: VercelRequest, res: VercelResponse) => {
    const { key } = req.query;

    if (key == null) {
        const comandasList = await comandas.listComandas();
        res.status(200).json(comandasList);
        return;
    }

    const comanda = await comandas.getComanda(key as string);

    res.status(200).json(comanda);
});

export default handler;