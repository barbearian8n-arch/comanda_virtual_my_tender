import supabase from "../infra/supabase.js";
import { ValidationError } from "../infra/errors.js";
import evolution from "../infra/evolution.js";
import enterprise from "./enterprise.js";

const TABELA = "wa_message";

/**
 * Janela de mensagens lida para montar a lista de conversas. O PostgREST não faz
 * `GROUP BY`, então o agrupamento acontece aqui — por isso a tela mostra "as
 * conversas recentes", e não o histórico inteiro. Se um dia passar disso, o certo
 * é uma view com DISTINCT ON no banco, não aumentar este número.
 */
const JANELA_CONVERSAS = 1000;

/**
 * Quantas mensagens por página da conversa.
 *
 * A thread carrega em pedaços e vai buscando as antigas conforme a pessoa rola
 * para cima. Antes vinham 300 de uma vez: funciona com as conversas de hoje (a
 * maior tem 73), mas o custo cresce junto com o histórico, e quem abre a tela
 * quer ler as ÚLTIMAS — as de meses atrás quase nunca são olhadas.
 */
const PAGINA_THREAD = 30;

/** Teto por requisição, para um `limite` vindo de fora não virar um "traga tudo". */
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
        criado_em: linha.created_at,
        midia: linha.media_url ?? null,
        // escrita pelo n8n depois que o áudio chega: fica null no intervalo
        // entre o upload e a transcrição ficar pronta
        transcricao: linha.transcription ?? null
    };
}

const COLUNAS_MENSAGEM =
    "id, push_name, message, message_type, from_me, is_agent, client_normalized_phone, created_at, media_url, transcription";

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

/**
 * Uma página da conversa, em ordem cronológica.
 *
 * `antesDoId` é o cursor: manda o id da mensagem mais antiga já carregada para
 * receber as anteriores a ela. Cursor, e não `offset`, porque a conversa recebe
 * mensagem nova enquanto a pessoa lê — com offset, cada chegada empurra a
 * janela e a página seguinte viria repetindo ou pulando linhas.
 *
 * Pagina por `id` e não por `created_at`: os dois dão a mesma ordem (conferido
 * sobre a tabela inteira), mas `id` é único, e `created_at` repetido entre duas
 * mensagens deixaria o cursor ambíguo — a fronteira da página poderia repetir
 * uma linha ou engolir outra.
 *
 * Devolve `tem_mais` para a tela saber se ainda vale pedir. Vem de buscar UM
 * registro além da página: contar o total custaria uma segunda consulta para
 * responder algo que essa linha extra já responde.
 */
async function listMessages(sender, telefone, { antesDoId = null, limite = PAGINA_THREAD } = {}) {
    const numero = apenasDigitos(telefone);

    if (!sender || !numero) {
        return { mensagens: [], tem_mais: false };
    }

    const tamanho = Math.min(Math.max(Number(limite) || PAGINA_THREAD, 1), LIMITE_THREAD);

    let consulta = supabase
        .from(TABELA)
        .select(COLUNAS_MENSAGEM)
        .eq("sender", sender)
        .eq("client_normalized_phone", numero)
        .order("id", { ascending: false })
        .limit(tamanho + 1);

    if (antesDoId != null) {
        consulta = consulta.lt("id", antesDoId);
    }

    const { data, error } = await consulta;

    if (error) {
        throw error;
    }

    const linhas = data ?? [];
    const tem_mais = linhas.length > tamanho;
    const pagina = tem_mais ? linhas.slice(0, tamanho) : linhas;

    // busca desc para a página pegar as MAIS RECENTES, exibe asc
    return { mensagens: pagina.map(mapMensagem).reverse(), tem_mais };
}

/** Teto do texto de uma mensagem — o mesmo que o WhatsApp aceita. */
const LIMITE_TEXTO = 4096;

/**
 * Grava a mensagem que ACABOU de sair.
 *
 * Não é redundância com o webhook: o Evolution **não** devolve pelo webhook o
 * que foi enviado pela API dele. Quem envia é quem grava — é assim que o n8n
 * faz com as respostas do robô.
 *
 * `is_agent: false` é o que separa esta linha das do robô: na tela ela aparece
 * com o selo "loja", que é exatamente o que ela é.
 */
async function registrarEnviada({ sender, numero, texto, pushName }) {
    const linha = {
        sender,
        client_phone: `${numero}@s.whatsapp.net`,
        client_normalized_phone: numero,
        message: texto,
        message_type: "text",
        from_me: true,
        is_agent: false,
        is_reply: true,
        push_name: pushName ?? null,
        // `message` e `sended_at` são NOT NULL na tabela
        sended_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from(TABELA).insert(linha).select(COLUNAS_MENSAGEM).single();

    if (error) {
        // A mensagem JÁ chegou ao cliente. Falhar aqui não pode virar "não
        // enviei" na tela: o atendente mandaria de novo e o cliente receberia
        // duas vezes. O que se perde é o histórico, e é o menor dos males.
        console.error("Mensagem enviada mas não registrada em wa_message:", error);

        return {
            ...mapMensagem({ ...linha, id: null, created_at: new Date().toISOString() }),
            registrada: false
        };
    }

    return { ...mapMensagem(data), registrada: true };
}

/**
 * Envia um texto da loja para o cliente pela instância configurada na empresa.
 *
 * O robô continua respondendo esta conversa normalmente — silenciá-lo é outra
 * decisão, tomada por número na `ignore_list` que o n8n lê.
 */
async function sendMessage(sender, telefone, texto) {
    const numero = apenasDigitos(telefone);
    const mensagem = String(texto ?? "").trim();

    if (!sender) {
        throw new ValidationError("Informe o número de origem (sender)");
    }

    if (!numero) {
        throw new ValidationError("Número do cliente inválido");
    }

    if (!mensagem) {
        throw new ValidationError("Escreva a mensagem antes de enviar");
    }

    if (mensagem.length > LIMITE_TEXTO) {
        throw new ValidationError(`A mensagem deve ter no máximo ${LIMITE_TEXTO} caracteres`);
    }

    const { host, instancia, sender: senderConfigurado, nomeAtendente } =
        await enterprise.getEvolutionConfig();

    if (!instancia) {
        throw new ValidationError(
            "A empresa não tem EvoInstance configurado — sem ela não há por qual conexão enviar."
        );
    }

    /**
     * A conversa aberta é de um número, e quem envia é a instância configurada
     * agora. Quando os dois discordam — histórico de uma instância antiga — a
     * mensagem sairia de um número e seria gravada como se fosse de outro, e a
     * tela passaria a mentir sobre quem falou. Recusar é melhor que registrar
     * errado: o cliente receberia de um número que não é o daquela conversa.
     */
    if (senderConfigurado && sender !== senderConfigurado) {
        throw new ValidationError(
            `Esta conversa é do número ${apenasDigitos(sender.split("@")[0])}, mas a conexão configurada hoje é ${apenasDigitos(senderConfigurado.split("@")[0])}. ` +
            "A mensagem sairia de outro número — selecione a conversa do número atual."
        );
    }

    // Envia PRIMEIRO: gravar antes deixaria no histórico uma mensagem que o
    // cliente nunca recebeu, e é o histórico que o balcão usa para saber o que
    // já foi dito.
    await evolution.sendText(host, instancia, numero, mensagem);

    return registrarEnviada({ sender, numero, texto: mensagem, pushName: nomeAtendente });
}

export default { listSenders, listConversations, listMessages, sendMessage };
