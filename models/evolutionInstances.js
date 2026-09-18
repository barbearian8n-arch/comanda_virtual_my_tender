import supabase from "../infra/supabase.js";
import evolution from "../infra/evolution.js";
import enterprise from "./enterprise.js";
import { ConflictError, NotFoundError, ValidationError } from "../infra/errors.js";

/**
 * Conexões de WhatsApp (instâncias do Evolution) desta loja.
 *
 * ---------------------------------------------------------------------------
 * A regra que governa este arquivo inteiro
 * ---------------------------------------------------------------------------
 * O servidor do Evolution é COMPARTILHADO e o namespace de instância é global:
 * uma consulta em 2026-09-17 devolveu 10 instâncias, das quais só três são deste
 * sistema — as outras são MyDebit, Phonext, responda-me e afins. Um
 * `DELETE /instance/delete/{nome}` com o nome de outro produto derruba o
 * WhatsApp dele.
 *
 * Por isso NENHUMA função aqui aceita nome de instância vindo da tela. Toda
 * operação recebe um `id` e resolve o nome por `buscarLinha()`, que lê a nossa
 * tabela. O nome só é escolhido por quem usa na CRIAÇÃO — e ali a proteção é o
 * próprio `POST /instance/create`, que falha se o nome já existir no servidor.
 * Este painel nunca adota instância pré-existente por nome; a única adoção é a
 * do SQL de migração, e ela lê o que já estava no config da própria empresa.
 *
 * ---------------------------------------------------------------------------
 * Duas fontes de verdade que precisam andar juntas
 * ---------------------------------------------------------------------------
 * `evolution_instance` é o registro do painel. O que o n8n lê é
 * `enterprise.config.evolution` (`EvoInstance`, `EvoSender`). Promover escreve
 * nos dois — ver `sincronizarConfig()`. Se só a tabela fosse atualizada, a tela
 * mostraria "principal" e o robô continuaria respondendo pelo número antigo.
 */

const TABELA = "evolution_instance";

/** Os estados que o Evolution devolve. `unknown` é nosso: "ainda não perguntei". */
const ESTADOS = ["open", "close", "connecting"];

const NOME_MAX = 60;

/**
 * O nome vai cru no PATH da URL do Evolution. Barra e afins mudariam a rota
 * chamada — `a/../delete` é o tipo de coisa que não pode nem chegar perto.
 * Acento e espaço passam de propósito: há instância em uso chamada
 * "Pérsio casa de bolos 1" e ela continua tendo que funcionar.
 */
const NOME_PROIBIDO = /[/\\?#%]/;

const CAMPOS_PUBLICOS =
    "id, enterprise_id, instance_name, instance_id, is_primary, status, status_checked_at, owner_jid, profile_name, connected_at, disconnected_at, created_at";

/**
 * Qualquer coisa fora da lista vira 'unknown' em vez de ir para o banco. O CHECK
 * da coluna rejeitaria um estado novo inventado por uma versão futura do
 * Evolution, e a tela quebraria inteira por causa de um rótulo.
 */
function normalizarStatus(state) {
    const texto = String(state ?? "").trim().toLowerCase();
    return ESTADOS.includes(texto) ? texto : "unknown";
}

function normalizarNome(nome) {
    const texto = typeof nome === "string" ? nome.trim() : "";

    if (!texto) {
        throw new ValidationError("O nome da conexão é obrigatório");
    }

    if (texto.length > NOME_MAX) {
        throw new ValidationError(`O nome deve ter no máximo ${NOME_MAX} caracteres`);
    }

    if (NOME_PROIBIDO.test(texto)) {
        throw new ValidationError("O nome não pode conter / \\ ? # nem %");
    }

    return texto;
}

/** Host do Evolution desta loja — sem ele nenhuma operação tem para onde ir. */
async function getHost() {
    const { host } = await enterprise.getEvolutionConfig();

    if (!host) {
        throw new ValidationError(
            "A empresa não tem EvoHost configurado — sem ele não há servidor Evolution para falar."
        );
    }

    return host;
}

/** A linha, sempre filtrada pela empresa: é isto que impede alcançar a de outro. */
async function buscarLinha(id) {
    const { data, error } = await supabase
        .from(TABELA)
        .select(CAMPOS_PUBLICOS)
        .eq("id", id)
        .eq("enterprise_id", enterprise.ENTERPRISE_ID)
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (!data) {
        throw new NotFoundError("Conexão não encontrada");
    }

    return data;
}

async function atualizarLinha(id, patch) {
    const { data, error } = await supabase
        .from(TABELA)
        .update(patch)
        .eq("id", id)
        .select(CAMPOS_PUBLICOS)
        .single();

    if (error) {
        throw error;
    }

    return data;
}

/**
 * Espelha o estado do Evolution na linha e, quando é a principal, propaga o
 * número conectado para `config.evolution`.
 *
 * `ownerJid` só vem do `fetchInstances` — o `connectionState` devolve só o
 * estado. A consulta extra acontece apenas quando a conexão está aberta e o
 * número ainda não é o que está gravado.
 */
async function sincronizarEstado(linha, state, { forcarDetalhes = false } = {}) {
    const status = normalizarStatus(state);
    const agora = new Date().toISOString();

    const patch = { status, status_checked_at: agora };

    if (status === "open" && linha.status !== "open") {
        patch.connected_at = agora;
    }

    if (status === "close" && linha.status === "open") {
        patch.disconnected_at = agora;
    }

    if (status === "open" || forcarDetalhes) {
        const detalhes = await evolution
            .fetchInstance(await getHost(), linha.instance_name)
            .catch(() => null);

        if (detalhes) {
            patch.owner_jid = detalhes.ownerJid ?? detalhes.owner ?? linha.owner_jid ?? null;
            patch.profile_name = detalhes.profileName ?? linha.profile_name ?? null;
            patch.instance_id = detalhes.id ?? linha.instance_id ?? null;
        }
    }

    const atualizada = await atualizarLinha(linha.id, patch);

    if (atualizada.is_primary && atualizada.owner_jid && atualizada.owner_jid !== linha.owner_jid) {
        await sincronizarConfig(atualizada);
    }

    return atualizada;
}

/**
 * Grava no jsonb que o n8n lê. `EvoSender` só é sobrescrito quando temos um JID
 * de verdade: mandar null porque a instância está desconectada apagaria o
 * discriminador do histórico e a tela de Mensagens ficaria vazia — a conversa
 * antiga continua sendo daquele número mesmo com o WhatsApp fora do ar.
 */
async function sincronizarConfig(linha) {
    const patch = { EvoInstance: linha.instance_name };

    if (linha.owner_jid) {
        patch.EvoSender = linha.owner_jid;
    }

    await enterprise.setEvolutionConfig(patch);
}

/**
 * Aponta a instância para o fluxo do robô no n8n e CONFERE lendo de volta.
 *
 * A conferência não é paranoia: o GET devolve `webhookBase64` e o POST recebe
 * `base64` — nomes diferentes para o mesmo campo, e é exatamente aí que um erro
 * silencioso aparece. Sem ler de volta, "webhook configurado" na tela não prova
 * nada, e uma instância principal que não recebe mensagem é o pior estado
 * possível: tudo parece certo e o robô simplesmente emudece.
 */
async function configurarWebhook(instanceName) {
    const host = await getHost();

    await evolution.setWebhook(host, instanceName);

    const efetivo = await evolution.findWebhook(host, instanceName);
    const esperado = evolution.webhookUrl();

    const divergencias = [];

    if (efetivo?.url !== esperado) {
        divergencias.push(`url ficou "${efetivo?.url ?? "vazia"}"`);
    }

    if (efetivo?.webhookBase64 !== true) {
        divergencias.push("base64 não ficou ligado");
    }

    if (efetivo?.webhookByEvents !== false) {
        divergencias.push("byEvents não ficou desligado");
    }

    const eventos = Array.isArray(efetivo?.events) ? efetivo.events : [];

    if (!evolution.WEBHOOK_EVENTOS.every((evento) => eventos.includes(evento))) {
        divergencias.push(`eventos ficaram [${eventos.join(", ")}]`);
    }

    if (divergencias.length > 0) {
        throw new ConflictError(
            `O webhook não foi gravado como esperado (${divergencias.join("; ")}). ` +
            "A conexão não foi promovida a principal."
        );
    }

    return efetivo;
}

/**
 * A lista com o estado de cada uma, consultado ao vivo.
 *
 * A consulta ao Evolution é tolerante de propósito: servidor fora do ar devolve
 * a linha com o último estado conhecido em vez de derrubar a tela inteira —
 * saber o que estava valendo é melhor que uma página de erro.
 */
async function listInstances() {
    const { data, error } = await supabase
        .from(TABELA)
        .select(CAMPOS_PUBLICOS)
        .eq("enterprise_id", enterprise.ENTERPRISE_ID)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });

    if (error) {
        throw error;
    }

    const host = await getHost().catch(() => null);

    if (!host) {
        return data ?? [];
    }

    return Promise.all(
        (data ?? []).map(async (linha) => {
            try {
                const estado = await evolution.connectionState(host, linha.instance_name);
                return await sincronizarEstado(linha, estado);
            } catch {
                return linha;
            }
        })
    );
}

/**
 * O formato do QR muda conforme a resposta: `create` devolve `{ qrcode: { base64 } }`
 * e `connect` devolve `base64` na raiz. Pior, o `base64` às vezes vem cru, sem o
 * `data:image/png;base64,` na frente — e aí o <img> não pinta nada, deixando a
 * moldura vazia sem nenhum erro para explicar. Normaliza tudo numa data URI só.
 */
function extrairQrCode(bruto) {
    const base64 = bruto?.base64 ?? bruto?.qrcode?.base64 ?? null;

    if (!base64) {
        return null;
    }

    return base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
}

/**
 * Cria no Evolution e registra aqui.
 *
 * Cria LÁ primeiro: o servidor recusa nome repetido, e é essa recusa que impede
 * o painel de "adotar" a instância de outro produto que por acaso tenha o mesmo
 * nome. Registrar antes deixaria a linha órfã apontando para algo alheio.
 */
async function createInstance(nome) {
    const instanceName = normalizarNome(nome);
    const host = await getHost();

    const criada = await evolution.createInstance(host, instanceName);

    // primeira conexão da loja já nasce principal — senão o robô fica sem
    // EvoInstance e ninguém entende por que ele não responde
    const { count, error: countError } = await supabase
        .from(TABELA)
        .select("id", { count: "exact", head: true })
        .eq("enterprise_id", enterprise.ENTERPRISE_ID);

    if (countError) {
        throw countError;
    }

    const { data: linha, error: insertError } = await supabase
        .from(TABELA)
        .insert({
            enterprise_id: enterprise.ENTERPRISE_ID,
            instance_name: instanceName,
            instance_id: criada?.instance?.instanceId ?? null,
            is_primary: count === 0,
            status: normalizarStatus(criada?.instance?.status),
            status_checked_at: new Date().toISOString()
        })
        .select(CAMPOS_PUBLICOS)
        .single();

    if (insertError) {
        if (insertError.code === "23505") {
            throw new ConflictError("Já existe uma conexão com esse nome");
        }
        throw insertError;
    }

    // Best-effort aqui, ao contrário de `setPrimary`: a instância já existe no
    // servidor e o QR desta resposta é o único que a pessoa vai ver. Derrubar a
    // criação por causa do webhook perderia as duas coisas — e a segunda
    // tentativa esbarraria no nome já usado. A falha volta em `webhookErro` e o
    // robô só fica mudo até alguém promover a conexão de novo.
    let webhookErro = null;

    if (linha.is_primary) {
        try {
            await configurarWebhook(linha.instance_name);
        } catch (error) {
            webhookErro = error.message;
            console.error("Falha ao configurar o webhook da instância nova:", error.message);
        }

        await sincronizarConfig(linha);
    }

    return {
        instancia: linha,
        webhookErro,
        qrcode: extrairQrCode(criada?.qrcode)
    };
}

/** Pede o QR. Instância já conectada volta sem QR e com `conectada: true`. */
async function connectInstance(id) {
    const linha = await buscarLinha(id);
    const host = await getHost();

    const resposta = await evolution.connect(host, linha.instance_name);
    const qrcode = extrairQrCode(resposta);

    const estado = await evolution.connectionState(host, linha.instance_name).catch(() => null);
    const atualizada = await sincronizarEstado(linha, estado);

    return { instancia: atualizada, qrcode, conectada: atualizada.status === "open" };
}

/** Só o estado — é o que a tela chama em laço enquanto o QR está na tela. */
async function getState(id) {
    const linha = await buscarLinha(id);
    const host = await getHost();

    const estado = await evolution.connectionState(host, linha.instance_name);

    return sincronizarEstado(linha, estado);
}

async function disconnectInstance(id) {
    const linha = await buscarLinha(id);
    const host = await getHost();

    await evolution.logout(host, linha.instance_name);

    return atualizarLinha(linha.id, {
        status: "close",
        status_checked_at: new Date().toISOString(),
        disconnected_at: new Date().toISOString()
    });
}

async function restartInstance(id) {
    const linha = await buscarLinha(id);
    const host = await getHost();

    await evolution.restart(host, linha.instance_name);

    const estado = await evolution.connectionState(host, linha.instance_name).catch(() => null);

    return sincronizarEstado(linha, estado);
}

/**
 * Remove no Evolution e apaga a linha.
 *
 * A principal não é removível: apagá-la deixaria `config.evolution.EvoInstance`
 * apontando para uma instância que não existe mais, e o robô pararia sem que a
 * tela dissesse por quê. Promova outra antes.
 *
 * Instância que já sumiu do servidor (apagada pelo manager) não impede a
 * limpeza da linha: os dois lados discordarem é justamente o que este botão
 * existe para resolver.
 */
async function removeInstance(id) {
    const linha = await buscarLinha(id);

    if (linha.is_primary) {
        throw new ConflictError(
            "Esta é a conexão principal. Promova outra antes de remover — sem isso o robô ficaria sem número."
        );
    }

    const host = await getHost();
    let sumiuDoServidor = false;

    try {
        await evolution.deleteInstance(host, linha.instance_name);
    } catch (error) {
        if (error.statusCode === 502 && error.code === "evolution-instance-missing") {
            sumiuDoServidor = true;
        } else {
            throw error;
        }
    }

    const { error } = await supabase
        .from(TABELA)
        .delete()
        .eq("id", linha.id)
        .eq("enterprise_id", enterprise.ENTERPRISE_ID);

    if (error) {
        throw error;
    }

    return { removida: linha, sumiuDoServidor };
}

/**
 * O switch: troca qual conexão responde pela loja.
 *
 * O webhook é gravado ANTES de mexer no banco. Se ele falhar, nada mudou e dá
 * para tentar de novo; na ordem inversa a loja ficaria com uma principal que não
 * recebe mensagem — o pior dos dois estados, porque a tela diria que está tudo
 * certo.
 *
 * O webhook da anterior não é removido de propósito: o n8n separa por quem
 * enviou, e as duas apontando para o mesmo fluxo é o desenho de sempre.
 */
async function setPrimary(id) {
    const linha = await buscarLinha(id);

    if (linha.is_primary) {
        // já é a principal, mas reaplica o webhook: é o botão que conserta uma
        // instância cujo webhook foi mexido por fora, pelo manager do Evolution
        await configurarWebhook(linha.instance_name);
        return linha;
    }

    await configurarWebhook(linha.instance_name);

    const { error: demoteError } = await supabase
        .from(TABELA)
        .update({ is_primary: false })
        .eq("enterprise_id", enterprise.ENTERPRISE_ID)
        .eq("is_primary", true);

    if (demoteError) {
        throw demoteError;
    }

    const promovida = await atualizarLinha(linha.id, { is_primary: true });

    // sem o JID, `config.evolution.EvoSender` fica com o número antigo e a tela
    // de Mensagens continua lendo a caixa errada — busca antes de propagar
    const comDetalhes = promovida.owner_jid
        ? promovida
        : await sincronizarEstado(promovida, promovida.status, { forcarDetalhes: true });

    await sincronizarConfig(comDetalhes);

    return comDetalhes;
}

export default {
    listInstances,
    createInstance,
    connectInstance,
    getState,
    disconnectInstance,
    restartInstance,
    removeInstance,
    setPrimary
};
