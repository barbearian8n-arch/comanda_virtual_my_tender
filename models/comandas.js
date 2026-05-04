import { NotFoundError } from "../infra/errors.js";
import mytenderClient from "../infra/mytender.js";
import supabase from "../infra/supabase.js";

/**
 * @param {DBViewCommandJoin} comanda 
 * @returns {APICommand}
 */
function mapComandaToAPI(comanda) {
    return {
        id: comanda.command_id,
        key: comanda.command_key,
        redis_key: `comanda/${comanda.command_key}`,
        status: comanda.command_status,
        client_endereco: comanda.client_endereco,
        client_valor_entrega: comanda.client_valor_entrega,
        delivery_address: comanda.delivery_address,
        delivery_fee: comanda.delivery_fee,
        delivery_date: comanda.delivery_date,
        total_real_price: comanda.total_real_price,
        payment_method: comanda.payment_method,
        contact: {
            lead_id: comanda.client_id,
            name: comanda.client_name,
            number: String(comanda.client_numero),
            number_normalized: String(comanda.client_numero)
        },
        items: comanda.items.map(item => mapComandaItemToAPI(comanda.command_id, item)),
        formated_items: comanda.formated_items
    };
}

/**
 * @param {DBCommandItemJoin} item 
 * @returns {APICommandItem}
 */
function mapComandaItemToAPI(command_id, item) {
    return {
        id: item.id,
        name: item.menu_nome,
        command_id: command_id,

        menu_info: {
            id: item.menu_id,
            name: item.menu_nome,
            unit: item.menu_unidade,
            price: item.menu_preco,
            price_per_unit: item.menu_preco_por_uni,
            category: item.menu_categoria,
            is_available: item.menu_is_disponivel,
            g_per_unit: item.menu_g_por_uni
        },

        requested: {
            quantity: item.req_quantity,
            unit: item.req_unit,
            estimated_price: item.req_estimated_price,
        },

        real: {
            quantity: item.real_quantity,
            unit: item.real_unit,
            total_price: item.real_total_price,
        },

        to_be_weighed: item.to_be_weighed
    };
}

/**
 * @param {APICommandItem[]} items
 * @returns {Promise<DBCommandItem[]>}
 */
function mapCommandItemsToDB(items) {
    return items.map(item => ({
        id: item.id,
        menu_id: item.menu_info.id,
        req_unit: item.requested.unit,
        req_quantity: item.requested.quantity,
        req_estimated_price: item.requested.estimated_price,
        real_unit: item.real.unit,
        real_quantity: item.real.quantity,
        real_total_price: item.real.total_price,
        to_be_weighed: item.to_be_weighed,
        command_id: item.command_id
    }));
}

/**
 * @returns {Promise<APICommand[]>}
 */
async function listCommands() {
    const { data, error } = await supabase.schema("public").from("view_command_w_items").select("*");
    if (error) {
        throw error;
    }

    return data.map(mapComandaToAPI);
}

/**
 * @param {string} key
 * @returns {Promise<APICommand>}
 */
async function getCommand(key) {
    const { data, error } = await supabase.schema("public").from("view_command_w_items").select("*").eq("command_key", key);
    if (error) {
        throw error;
    }

    if (data.length === 0) {
        throw new NotFoundError("Comanda não encontrada");
    }

    const { data: commandData, error: commandError } = await supabase
        .schema("public")
        .from("command")
        .select("total_real_price")
        .eq("key", key)
        .single();
    if (commandError) throw commandError;

    data[0].total_real_price = commandData.total_real_price;

    return mapComandaToAPI(data[0]);
}


async function getCommandByClientId(clientId) {
    const { data, error } = await supabase.schema("public").from("view_command_w_items").select("*").eq("client_id", clientId);
    if (error) {
        throw error;
    }

    if (data.length === 0) {
        throw new NotFoundError("Comanda não encontrada");
    }

    const { data: commandData, error: commandError } = await supabase
        .schema("public")
        .from("command")
        .select("total_real_price")
        .eq("client_id", clientId)
        .single();
    if (commandError) throw commandError;

    data[0].total_real_price = commandData.total_real_price;

    return mapComandaToAPI(data[0]);
}

async function updateCommandStatusToOpen(key) {
    const { data, error } = await supabase.schema("public").from("command").update({ status: "open" }).eq("key", key);
    if (error) {
        throw error;
    }

    return data;
}

/**
 * @param {APICommandItem[]} items
 * @returns {Promise<DBCommandItem[]>}
 */
async function updateCommandItems(items) {
    const dbItems = mapCommandItemsToDB(items);

    const { data, error } = await supabase
        .schema("public")
        .from("command_item")
        .upsert(dbItems)
        .select();

    if (error) {
        throw error;
    }

    return data;
}

async function updateDeliveryFee(key, value) {
    const { data, error } = await supabase.schema("public").from("command").update({ delivery_fee: value }).eq("key", key);

    if (error) {
        throw error;
    }

    return data;
}

async function updateComandaValues(key, { delivery_fee, total_real_price }) {
    const { data, error } = await supabase
        .schema("public")
        .from("command")
        .update({
            ...(delivery_fee !== undefined && { delivery_fee }),
            ...(total_real_price !== undefined && { total_real_price })
        })
        .eq("key", key);

    if (error) {
        throw error;
    }

    return data;
}

async function updateComanda(key, { delivery_address, payment_method }) {
    const { data, error } = await supabase
        .schema("public")
        .from("command")
        .update({
            ...(delivery_address != undefined && { delivery_address }),
            ...(payment_method !== undefined && { payment_method })
        })
        .eq("key", key);

    if (error) {
        throw error;
    }

    return data;
}

async function getCommandIdByKey(key) {
    const { data, error } = await supabase
        .schema("public")
        .from("command")
        .select("id")
        .eq("key", key)
        .single();

    if (error) throw error;
    return data.id;
}

/**
 * @param {number} commandId
 * @param {{ menu_id, req_unit, req_quantity, req_estimated_price }} itemData
 */
async function addCommandItem(commandId, itemData) {
    const isWeighed = itemData.req_unit === "kg" || itemData.req_unit === "g";

    const { data, error } = await supabase
        .schema("public")
        .from("command_item")
        .insert({
            command_id: commandId,
            menu_id: itemData.menu_id,
            req_unit: itemData.req_unit,
            req_quantity: itemData.req_quantity,
            req_estimated_price: itemData.req_estimated_price,
            real_unit: itemData.req_unit,
            real_quantity: isWeighed ? 0 : itemData.req_quantity,
            real_total_price: isWeighed ? 0 : itemData.req_estimated_price,
            to_be_weighed: isWeighed,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

async function removeCommandItem(itemId) {
    const { data, error } = await supabase
        .schema("public")
        .from("command_item")
        .delete()
        .eq("id", itemId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

async function closeComanda(key) {
    const { data, error } = await mytenderClient.post("/command/close", { key });

    if (error) throw error;

    return data;
}

async function finishComanda(key) {
    const { data, error } = await mytenderClient.post("/command/finish", { key });

    if (error) throw error;

    return data;
}

async function createCommand(clientId) {
    const { data: clientData, error: clientError } = await supabase
        .schema("public")
        .from("padaria")
        .select("*")
        .eq("id", clientId)
        .single();
    if (clientError) throw clientError;

    const { data, error } = await supabase
        .schema("public")
        .from("command")
        .insert({
            key: String(clientData.numero),
            client_id: clientId,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export default {
    listCommands,
    getCommand,
    getCommandByClientId,
    getCommandIdByKey,

    updateCommandItems,
    updateCommandStatusToOpen,
    updateDeliveryFee,
    updateComandaValues,
    updateComanda,

    createCommand,

    addCommandItem,
    removeCommandItem,

    closeComanda,
    finishComanda
}