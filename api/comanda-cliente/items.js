import { createHandler } from "../../infra/handlers.js";
import comandas from "../../models/comandas.js";

const handler = createHandler();

function getComandaKey(req) {
    const raw = req.headers["cookie"] || "";
    const match = raw.match(/(?:^|;\s*)comanda_key=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
}

handler.post(async (req, res) => {
    const key = getComandaKey(req);
    if (!key) {
        res.status(401).json({ error: "Cookie comanda_key ausente" });
        return;
    }

    const { menu_id, req_unit, req_quantity, req_estimated_price } = req.body;
    if (!menu_id || !req_unit || req_quantity == null) {
        res.status(400).json({ error: "Campos obrigatórios ausentes: menu_id, req_unit, req_quantity" });
        return;
    }

    const commandId = await comandas.getCommandIdByKey(key);
    const item = await comandas.addCommandItem(commandId, {
        menu_id,
        req_unit,
        req_quantity,
        req_estimated_price: req_estimated_price ?? 0
    });

    res.status(200).json(item);
});

handler.delete(async (req, res) => {
    const key = getComandaKey(req);
    if (!key) {
        res.status(401).json({ error: "Cookie comanda_key ausente" });
        return;
    }

    const { item_id } = req.query;
    if (!item_id) {
        res.status(400).json({ error: "item_id ausente" });
        return;
    }

    const item = await comandas.removeCommandItem(item_id);
    res.status(200).json(item);
});

export default handler;
