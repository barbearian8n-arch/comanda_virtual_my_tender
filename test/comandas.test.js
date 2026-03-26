import axios from "axios";
import { inspect } from "node:util";

async function list(logger) {
    const res = await axios.get("http://localhost:3000/api/comandas");

    logger.info(res.data);
}

const COMANDA_KEY = "123";
async function get(logger) {
    const res = await axios.get(`http://localhost:3000/api/comandas?key=${COMANDA_KEY}`);

    logger.info(res.data);
}

async function update(logger) {
    const res = await axios.put("http://localhost:3000/api/comandas", {
        key: COMANDA_KEY,
        status: "finalizada",
    });

    logger.info(res.data);
}

const testCases = {
    'list': list,
    'get': get,
    'update': update,
}

const tests = process.argv.slice(2);

tests.forEach((test) => {
    const logger = {
        log: (message) => console.log(`[LOG] ${test} - ${inspect(message, { depth: null, colors: true })}`),
        info: (message) => console.log(`[INFO] ${test} - ${inspect(message, { depth: null, colors: true })}`),
        error: (message) => console.error(`[ERROR] ${test} - ${inspect(message, { depth: null, colors: true })}`),
    };

    testCases[test](logger);
});