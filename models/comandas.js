import mytenderClient from "../infra/mytender.js";
import { NotFoundError } from "../infra/errors.js";

/**
 * @typedef {object} Comanda
 * @property {number} id
 * @property {string} key
 * @property {string} redis_key
 * @property {string} status
 * @property {object} contact
 * @property {number} contact.lead_id
 * @property {string} contact.name
 * @property {string} contact.number
 * @property {string} contact.number_normalized
 * @property {ComandaItem[]} items
 * @property {string} formated_items
 * }
 */

/**
 * @typedef {object} ComandaItem
 * @property {number} id
 * @property {string} name
 * @property {number} quantity
 * @property {number} unit_price
 * @property {number} total_price
 * @property {string} base_unit
 * @property {string} formated_item
 
*/

/**
 * @returns {Promise<Comanda[]>}
 */
async function listComandas() {
    const resp = await mytenderClient.get(`/comandas`);
    if (!resp.data.success) {
        throw new Error(resp.data.message);
    }

    return resp.data.comandas;
}

/**
 * @param {string} key
 * @returns {Promise<Comanda>}
 */
async function getComanda(key) {
    const resp = await mytenderClient.get(`/comandas?key=${key}`);
    if (!resp.data.success) {
        const error = resp.data.error;

        if (error === "not-found") {
            throw new NotFoundError("Comanda não encontrada");
        }

        throw new Error(error);
    }

    return resp.data.comanda;
}

/**
 * @param {string} key
 * @param {ComandaItem[]} items
 * @returns {Promise<void>}
 */
async function saveWeights(key, items) {
    const comanda = await getComanda(key);

    comanda.items = comanda.items.map(item => {
        const updatedItem = items.find(i => i.id === item.id);
        if (updatedItem) {
            return updatedItem;
        }
        return item;
    });

    console.log(comanda);
    // const resp = await setComanda(comanda);

    if (!resp.data.success) {
        throw new Error(resp.data.message);
    }

    return resp.data;
}

/**
 * @param {Comanda} comanda
 * @returns {Promise<void>}
 */
async function setComanda(comanda) {
    const resp = await mytenderClient.post(`/comandas`, comanda);
    if (!resp.data.success) {
        throw new Error(resp.data.message);
    }

    return resp.data;
}

export default {
    listComandas,
    getComanda,
    saveWeights,
    setComanda
}