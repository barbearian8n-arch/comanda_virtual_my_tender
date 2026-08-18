import supabase from "../infra/supabase.js";

const TABELA = "wa_message";

/**
 * Janela de mensagens lida para montar a lista de conversas. O PostgREST não faz
 * `GROUP BY`, então o agrupamento acontece aqui — por isso a tela mostra "as
 * conversas recentes", e não o histórico inteiro. Se um dia passar disso, o certo
 * é uma view com DISTINCT ON no banco, não aumentar este número.
 */
const JANELA_CONVERSAS = 1000;

/** Teto de mensagens de uma conversa. */
const LIMITE_THREAD = 300;

/** Janela para descobrir os remetentes. Só uma coluna estreita, então cabe mais. */
const JANELA_SENDERS = 5000;

/** PostgREST monta o filtro como string; dígito nunca quebra a expressão. */
function apenasDigitos(valor) {
    return String(valor ?? "").replace(/\D/g, "");
}

/**
 * Os números de WhatsApp que aparecem na tabela, do mais recente para o mais
 * antigo. É o que alimenta o `<select>` da tela: quem grava as mensagens é o
 * n8n, fora deste repo, e `sender` é o JID da conta conectada que as recebeu.
 *
 * Trocar de instância do Evolution troca esse número e as mensagens antigas
 * ficam com o JID anterior — por isso a escolha é do usuário, e não uma
 * configuração fixa: numa troca, o histórico antigo continua alcançável.
 *
 * Sem `DISTINCT` no PostgREST, a deduplicação é feita aqui sobre uma janela.
 */
async function listSenders() {
    const { data, error } = await supabase
        .from(TABELA)
        .select("sender, created_at")
        .order("created_at", { ascending: false })
        .limit(JANELA_SENDERS);

    if (error) {
        throw error;
    }

    const vistos = new Map();

    for (const linha of data ?? []) {
        const jid = typeof linha.sender === "string" ? linha.sender.trim() : "";

        if (!jid || vistos.has(jid)) {
            continue;
        }

        // a consulta vem em ordem decrescente, então o primeiro de cada JID já é
        // o uso mais recente dele
        vistos.set(jid, { jid, telefone: apenasDigitos(jid.split("@")[0]), ultima: linha.created_at });
    }

    return [...vistos.values()];
}

/**
 * `created_at` é o `now()` da inserção e está em UTC de verdade. `sended_at`, que
 * seria o candidato natural, vem da origem com o horário LOCAL gravado como se
 * fosse UTC (3h adiantado) — exibir aquilo daria uma hora errada em toda linha.
 */
function mapMensagem(linha) {
    return {
        id: linha.id,
        texto: linha.message,
        tipo: linha.message_type,
        de_mim: Boolean(linha.from_me),
        do_robo: Boolean(linha.is_agent),
        push_name: linha.push_name,
        telefone: linha.client_normalized_phone,
        criado_em: linha.created_at
    };
}

const COLUNAS_MENSAGEM =
    "id, push_name, message, message_type, from_me, is_agent, client_normalized_phone, created_at";

/**
 * Uma linha por contato, com a última mensagem e a contagem da janela lida.
 * Enriquece com o nome do cliente cadastrado (`padaria`).
 *
 * `sender` vazio devolve lista vazia, nunca "tudo": sem o discriminador não há
 * como saber de qual número é a conversa, e misturar dois números na mesma lista
 * daria a impressão de uma conversa só.
 */
async function listConversations(sender) {
    if (!sender) {
        return { conversas: [] };
    }

    const { data, error } = await supabase
        .from(TABELA)
        .select(COLUNAS_MENSAGEM)
        .eq("sender", sender)
        .order("created_at", { ascending: false })
        .limit(JANELA_CONVERSAS);

    if (error) {
        throw error;
    }

    const porTelefone = new Map();

    for (const linha of data ?? []) {
        const telefone = linha.client_normalized_phone;
        const conversa = porTelefone.get(telefone);

        if (!conversa) {
            // a consulta vem em ordem decrescente, então o primeiro de cada
            // telefone já é o mais recente
            porTelefone.set(telefone, {
                telefone,
                nome: null,
                push_name: linha.from_me ? null : linha.push_name,
                ultima: mapMensagem(linha),
                total: 1,
                recebidas: linha.from_me ? 0 : 1
            });
            continue;
        }

        conversa.total++;
        if (!linha.from_me) {
            conversa.recebidas++;
            // push_name só vale quando veio do cliente: nas linhas de saída a
            // coluna traz o nome da própria loja
            conversa.push_name ??= linha.push_name;
        }
    }

    if (porTelefone.size === 0) {
        return { conversas: [] };
    }

    const nomes = await buscarNomesDeClientes([...porTelefone.keys()]);

    return {
        conversas: [...porTelefone.values()].map((conversa) => ({
            ...conversa,
            nome: nomes.get(conversa.telefone) ?? conversa.push_name ?? null
        }))
    };
}

/** `padaria` é o cadastro do cliente; nem todo telefone que escreve tem um. */
async function buscarNomesDeClientes(telefones) {
    const numeros = telefones.map(apenasDigitos).filter(Boolean);

    if (numeros.length === 0) {
        return new Map();
    }

    const { data, error } = await supabase
        .from("padaria")
        .select("numero, name")
        .in("numero", numeros);

    if (error) {
        throw error;
    }

    return new Map((data ?? []).map((cliente) => [apenasDigitos(cliente.numero), cliente.name]));
}

/** A conversa com um contato, em ordem cronológica. */
async function listMessages(sender, telefone) {
    const numero = apenasDigitos(telefone);

    if (!sender || !numero) {
        return [];
    }

    const { data, error } = await supabase
        .from(TABELA)
        .select(COLUNAS_MENSAGEM)
        .eq("sender", sender)
        .eq("client_normalized_phone", numero)
        .order("created_at", { ascending: false })
        .limit(LIMITE_THREAD);

    if (error) {
        throw error;
    }

    // busca desc para o teto pegar as MAIS RECENTES, exibe asc
    return (data ?? []).map(mapMensagem).reverse();
}

export default { listSenders, listConversations, listMessages };
