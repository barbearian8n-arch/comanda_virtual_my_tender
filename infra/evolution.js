import axios from "axios";
import { ApiError, ValidationError } from "./errors.js";

/**
 * Cliente da Evolution API (WhatsApp).
 *
 * Diferente do resto da infra deste repo, o endereço NÃO vem do ambiente: host e
 * instância moram em `enterprise.config.evolution` (`EvoHost`, `EvoInstance`),
 * que é a mesma configuração que o n8n lê. Manter um `EVO_URL` no `.env` em
 * paralelo criaria duas fontes para o mesmo fato — e um deploy apontando para
 * uma instância diferente da que o robô usa.
 *
 * Do ambiente vem só a chave (`EVO_KEY`), que é segredo e não pertence a uma
 * linha do banco. Ela é a chave GLOBAL do servidor Evolution: pode tudo em
 * qualquer instância, inclusive nas que não são deste sistema. Por isso o nome
 * da instância nunca vem do cliente — quem resolve é o model, a partir da
 * config da empresa.
 */

const TIMEOUT_MS = 30_000;

function criarCliente(host) {
    if (!host) {
        throw new ValidationError(
            "A empresa não tem EvoHost configurado — sem ele não há para onde enviar."
        );
    }

    if (!process.env.EVO_KEY) {
        throw new ApiError("EVO_KEY não configurada", {
            name: "ConfigError",
            code: "evolution-not-configured",
            statusCode: 503
        });
    }

    return axios.create({
        baseURL: String(host).replace(/\/+$/, ""),
        timeout: TIMEOUT_MS,
        headers: {
            "Content-Type": "application/json",
            apikey: process.env.EVO_KEY
        }
    });
}

/**
 * O Evolution responde erro como
 * `{ status, error, response: { message: ["texto"] } }` — `message` é ARRAY, e
 * usar `error.response.data.message` direto sairia como "[object Object]" na tela.
 */
function mensagemDoErro(error) {
    const dados = error.response?.data;
    const bruta = dados?.response?.message ?? dados?.message ?? dados?.error;

    if (Array.isArray(bruta)) {
        return bruta.filter(Boolean).map(String).join("; ");
    }

    if (typeof bruta === "string" && bruta.trim()) {
        return bruta.trim();
    }

    return error.message || "Falha ao falar com o Evolution";
}

/**
 * Traduz a falha para os erros do repo, para o handler devolver o status certo
 * em vez de 500 em tudo — quem lê o log precisa separar "bug nosso" de
 * "dependência fora do ar".
 */
function traduzirErro(error, acao) {
    if (error instanceof ApiError) {
        return error;
    }

    const status = error.response?.status;
    const mensagem = mensagemDoErro(error);

    if (status === 400) {
        return new ValidationError(mensagem, error);
    }

    if (status === 401 || status === 403) {
        return new ApiError("EVO_KEY recusada pelo servidor do Evolution", {
            name: "EvolutionAuthError",
            code: "evolution-unauthorized",
            statusCode: 502,
            cause: error
        });
    }

    if (status === 404) {
        return new ApiError(
            `A instância não existe no Evolution (${mensagem}) — confira o EvoInstance da empresa`,
            {
                name: "EvolutionInstanceError",
                code: "evolution-instance-missing",
                statusCode: 502,
                cause: error
            }
        );
    }

    // Timeout, DNS, 5xx: o Evolution está fora, não é erro nosso
    return new ApiError(`Evolution indisponível ao ${acao}: ${mensagem}`, {
        name: "EvolutionUnavailableError",
        code: "evolution-unavailable",
        statusCode: 502,
        cause: error
    });
}

/**
 * Manda um texto para um número.
 *
 * `numero` vai só com dígitos (DDI+DDD+número); quem monta o JID é o Evolution.
 *
 * Instância desconectada responde 400: a mensagem NÃO fica numa fila esperando o
 * WhatsApp voltar. Por isso quem chama tem de tratar a falha como "não enviada",
 * e nunca como "enviada, vai chegar".
 */
async function sendText(host, instancia, numero, texto) {
    return chamar("enviar a mensagem", host, (client) =>
        client.post(`/message/sendText/${encodeURIComponent(instancia)}`, {
            number: numero,
            text: texto
        })
    );
}

/**
 * Fluxo do robô no n8n para onde a instância manda o que recebe.
 *
 * O padrão é o `wh-1-5b`, que é o que a instância em uso hoje já aponta.
 * `EVO_WEBHOOK_URL` sobrescreve — é assim que produção aponta para o `wh-1-5`
 * sem precisar de outro build.
 */
const WEBHOOK_URL_PADRAO = "https://main-n8n.zz8kak.easypanel.host/webhook/v1/mytender/wh-1-5b";

/**
 * Só MESSAGES_UPSERT: é o evento de mensagem nova, o único que o fluxo consome.
 * Assinar o resto encheria o n8n de execução descartada.
 */
const WEBHOOK_EVENTOS = ["MESSAGES_UPSERT"];

function webhookUrl() {
    return process.env.EVO_WEBHOOK_URL?.trim() || WEBHOOK_URL_PADRAO;
}

async function chamar(acao, host, fn) {
    try {
        const { data } = await fn(criarCliente(host));
        return data;
    } catch (error) {
        throw traduzirErro(error, acao);
    }
}

/** Todas as instâncias do servidor — inclusive as que NÃO são deste sistema. */
async function fetchInstances(host) {
    return chamar("listar as instâncias", host, (client) => client.get("/instance/fetchInstances"));
}

/** Os detalhes de uma instância; é daqui que saem `ownerJid` e `profileName`. */
async function fetchInstance(host, instancia) {
    const lista = await fetchInstances(host);

    if (!Array.isArray(lista)) {
        return null;
    }

    return (
        lista.find((item) => (item?.name ?? item?.instance?.instanceName) === instancia) ?? null
    );
}

async function createInstance(host, instancia) {
    return chamar("criar a instância", host, (client) =>
        client.post("/instance/create", {
            instanceName: instancia,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS"
        })
    );
}

/** Devolve o QR quando há um para ler; instância já conectada volta sem ele. */
async function connect(host, instancia) {
    return chamar("conectar", host, (client) =>
        client.get(`/instance/connect/${encodeURIComponent(instancia)}`)
    );
}

async function connectionState(host, instancia) {
    const data = await chamar("consultar o estado", host, (client) =>
        client.get(`/instance/connectionState/${encodeURIComponent(instancia)}`)
    );

    return data?.instance?.state ?? null;
}

async function logout(host, instancia) {
    return chamar("desconectar", host, (client) =>
        client.delete(`/instance/logout/${encodeURIComponent(instancia)}`)
    );
}

async function restart(host, instancia) {
    return chamar("reiniciar", host, (client) =>
        client.post(`/instance/restart/${encodeURIComponent(instancia)}`)
    );
}

async function deleteInstance(host, instancia) {
    return chamar("remover a instância", host, (client) =>
        client.delete(`/instance/delete/${encodeURIComponent(instancia)}`)
    );
}

async function setWebhook(host, instancia, url = webhookUrl()) {
    return chamar("configurar o webhook", host, (client) =>
        client.post(`/webhook/set/${encodeURIComponent(instancia)}`, {
            webhook: {
                enabled: true,
                url,
                events: WEBHOOK_EVENTOS,
                byEvents: false,
                base64: true
            }
        })
    );
}

async function findWebhook(host, instancia) {
    return chamar("ler o webhook", host, (client) =>
        client.get(`/webhook/find/${encodeURIComponent(instancia)}`)
    );
}

export default {
    sendText,
    fetchInstances,
    fetchInstance,
    createInstance,
    connect,
    connectionState,
    logout,
    restart,
    deleteInstance,
    setWebhook,
    findWebhook,
    webhookUrl,
    WEBHOOK_EVENTOS
};
