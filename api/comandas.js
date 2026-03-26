import { createHandler } from "../infra/handlers";
import comandas from "../models/comandas";

const handler = createHandler();

handler.get(async (req, res) => {
    const { key } = req.query;

    if (key == null) {
        const comandasList = await comandas.listComandas();
        res.status(200).json(comandasList);
        return;
    }

    const comanda = await comandas.getComanda(key);

    res.status(200).json(comanda);
});

export default handler;