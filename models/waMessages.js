import supabase from "../infra/supabase.js";
import { ValidationError } from "../infra/errors.js";

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

/** Bucket público criado para os áudios da conversa — 16 MB, `audio/*`. */
const BUCKET_AUDIO = "chat_audio";

/**
 * Tipos aceitos, e a extensão que cada um ganha no bucket.
 *
 * `audio/opus` primeiro porque é o que o WhatsApp usa em nota de voz. Os outros
 * entram porque o arquivo pode vir de qualquer lugar: o `MediaRecorder` do
 * navegador produz `webm`, e gravador de celular costuma dar `m4a` ou `mp3`.
 *
 * A lista existe mesmo o bucket já aceitando `audio/*`: recusar aqui devolve um
 * erro que diz o que fazer, enquanto a recusa do storage chega como um erro
 * genérico bem mais longe de quem clicou.
 */
const TIPOS_AUDIO = {
    "audio/opus": "opus",
    "audio/ogg": "ogg",
    "audio/webm": "webm",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/mp4": "m4a",
    "audio/x-m4a": "m4a",
    "audio/aac": "aac",
    "audio/wav": "wav",
    "audio/x-wav": "wav"
};

/**
 * Sobe um áudio da loja para a conversa: arquivo no bucket, linha na tabela.
 *
 * A transcrição NÃO é preenchida aqui — quem transcreve é o n8n, fora deste
 * repo. A linha nasce com `transcription` nula e a tela mostra isso como
 * "transcrevendo…" até o n8n voltar e escrever.
 *
 * `is_agent` é false de propósito: quem mandou foi a loja, não o robô. É essa
 * coluna que faz o balão aparecer marcado como "loja" na conversa, e marcá-la
 * como robô poria na conta dele uma fala que não é dele.
 */
async function uploadAudio(sender, telefone, buffer, contentType) {
    const numero = apenasDigitos(telefone);

    if (!sender) {
        throw new ValidationError("Informe o número de origem (sender)");
    }

    if (!numero) {
        throw new ValidationError("Informe o telefone da conversa");
    }

    if (!buffer || buffer.length === 0) {
        throw new ValidationError("Arquivo vazio — envie o áudio como application/octet-stream");
    }

    const extensao = TIPOS_AUDIO[contentType];

    if (!extensao) {
        throw new ValidationError(
            `Formato de áudio não aceito: ${contentType || "desconhecido"}. Use ${Object.keys(TIPOS_AUDIO).join(", ")}`
        );
    }

    // uma pasta por contato, e o instante no nome: dois envios no mesmo segundo
    // ainda assim não se sobrescrevem por causa do sufixo aleatório
    const caminho = `${numero}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensao}`;

    const { error: erroUpload } = await supabase.storage
        .from(BUCKET_AUDIO)
        .upload(caminho, buffer, { contentType, upsert: false });

    if (erroUpload) {
        throw erroUpload;
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET_AUDIO).getPublicUrl(caminho);

    const { data, error } = await supabase
        .from(TABELA)
        .insert({
            sender,
            client_phone: `${numero}@s.whatsapp.net`,
            client_normalized_phone: numero,
            from_me: true,
            is_agent: false,
            message_type: "audio",
            media_url: publicUrl,
            // `message` e `sended_at` são NOT NULL na tabela. Áudio não tem
            // texto, então `message` vai vazia — o que foi dito aparece em
            // `transcription`, escrita depois pelo n8n.
            message: "",
            // instante real em UTC. As linhas que o n8n grava trazem aqui o
            // horário LOCAL como se fosse UTC (3h adiantado, ver mapMensagem);
            // não reproduzo esse desvio de propósito — a tela ordena e exibe por
            // `created_at`, que é confiável nas duas origens.
            sended_at: new Date().toISOString()
        })
        .select(COLUNAS_MENSAGEM)
        .single();

    if (error) {
        // sem isto o arquivo ficaria no bucket sem linha nenhuma apontando para
        // ele — lixo que ninguém encontra depois para limpar
        await supabase.storage.from(BUCKET_AUDIO).remove([caminho]);
        throw error;
    }

    return mapMensagem(data);
}

export default { listSenders, listConversations, listMessages, uploadAudio };
