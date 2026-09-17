import { randomUUID } from "node:crypto";
import supabase from "../infra/supabase.js";
import enterprise from "./enterprise.js";
import { ConflictError, NotFoundError, ValidationError } from "../infra/errors.js";

/**
 * Sons de alerta enviados pela loja.
 *
 * O arquivo mora no Storage (bucket público `alertas`, caminho
 * `{enterprise_id}/{uuid}.{ext}`) e a tabela `alerta_som` guarda só os metadados
 * e a url — DDL em `.dev_scripts/004_alerta_som.sql`.
 *
 * O id sai daqui (uuid gerado ANTES do upload) e não do banco, porque a ordem é
 * subir o arquivo primeiro e inserir a linha já com a url pronta. `url` é NOT
 * NULL: inserir antes exigiria um UPDATE depois, e uma falha no meio deixaria
 * linha sem arquivo — que na tela é um som que aparece na lista e não toca.
 */

const BUCKET = "alertas";

/**
 * Como um som enviado é escrito dentro de `enterprise.config.alertas`, onde
 * divide espaço com os timbres sintetizados ("toque", "sino", ...). O prefixo é
 * o que separa os dois: `arquivo:<uuid>`.
 *
 * O mesmo valor está em `src/services/alertaSonoro.js` — não há módulo
 * compartilhado entre `api/` e `src/`, então os dois lados repetem a constante.
 */
const PREFIXO_TIMBRE = "arquivo:";

/** O id de timbre correspondente a um som enviado. */
export function timbreDoSom(id) {
    return `${PREFIXO_TIMBRE}${id}`;
}

/**
 * Só o que o Safari do iPad decodifica. Ogg e webm ficam de fora de propósito:
 * tocariam no notebook de quem configurou e ficariam mudos no tablet do balcão.
 * A mesma lista está em `allowed_mime_types` do bucket.
 */
const MIME_EXT = {
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/wave": "wav",
    "audio/mp4": "m4a",
    "audio/x-m4a": "m4a",
    "audio/aac": "aac"
};

const TAMANHO_MAXIMO = 2 * 1024 * 1024;
const ROTULO_MAXIMO = 60;

/**
 * O id vira caminho de arquivo e filtro de consulta; um texto qualquer aqui
 * devolveria o erro 22P02 do Postgres em vez de um 404 explicável.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CAMPOS = "id, rotulo, url, mime, tamanho_bytes, duracao_ms, criado_em";

function exigirUuid(id) {
    const texto = String(id ?? "").trim();

    if (!UUID.test(texto)) {
        throw new ValidationError("Som inválido");
    }

    return texto;
}

function normalizarRotulo(valor) {
    const texto = String(valor ?? "").trim();

    if (!texto) {
        throw new ValidationError("Dê um nome ao som");
    }

    if (texto.length > ROTULO_MAXIMO) {
        throw new ValidationError(`O nome deve ter no máximo ${ROTULO_MAXIMO} caracteres`);
    }

    return texto;
}

async function listar() {
    const { data, error } = await supabase
        .from("alerta_som")
        .select(CAMPOS)
        .eq("enterprise_id", enterprise.ENTERPRISE_ID)
        .order("criado_em", { ascending: true });

    if (error) {
        throw error;
    }

    return data ?? [];
}

/**
 * Sobe o arquivo e registra.
 *
 * `duracaoMs` vem medida no navegador e é só informativa — medir aqui exigiria
 * decodificar o áudio no servidor para um número que a tela usa apenas para
 * escrever "0:03" ao lado do nome.
 */
async function criar({ rotulo, duracaoMs, buffer, contentType }) {
    const nome = normalizarRotulo(rotulo);
    const extensao = MIME_EXT[contentType];

    if (!extensao) {
        throw new ValidationError(
            `Formato não aceito: ${contentType || "desconhecido"}. Use ${[...new Set(Object.values(MIME_EXT))].join(", ")}.`
        );
    }

    if (!buffer || buffer.length === 0) {
        throw new ValidationError("Arquivo vazio — envie o som como application/octet-stream");
    }

    if (buffer.length > TAMANHO_MAXIMO) {
        throw new ValidationError(
            `O arquivo tem ${(buffer.length / 1024 / 1024).toFixed(1)} MB; o limite é ${TAMANHO_MAXIMO / 1024 / 1024} MB.`
        );
    }

    const id = randomUUID();
    const caminho = `${enterprise.ENTERPRISE_ID}/${id}.${extensao}`;

    const { error: erroUpload } = await supabase.storage
        .from(BUCKET)
        .upload(caminho, buffer, { contentType, upsert: false });

    if (erroUpload) {
        throw erroUpload;
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(caminho);

    const { data, error } = await supabase
        .from("alerta_som")
        .insert({
            id,
            enterprise_id: enterprise.ENTERPRISE_ID,
            rotulo: nome,
            url: publicUrl,
            mime: contentType,
            tamanho_bytes: buffer.length,
            duracao_ms: Number.isFinite(Number(duracaoMs)) ? Math.round(Number(duracaoMs)) : null
        })
        .select(CAMPOS)
        .single();

    if (error) {
        // sem isto o arquivo ficaria no bucket sem linha apontando para ele —
        // lixo que ninguém encontra depois para limpar
        await supabase.storage.from(BUCKET).remove([caminho]);
        throw error;
    }

    return data;
}

async function renomear(id, rotulo) {
    const alvo = exigirUuid(id);
    const nome = normalizarRotulo(rotulo);

    const { data, error } = await supabase
        .from("alerta_som")
        .update({ rotulo: nome })
        .eq("id", alvo)
        .eq("enterprise_id", enterprise.ENTERPRISE_ID)
        .select(CAMPOS)
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (!data) {
        throw new NotFoundError("Som não encontrado");
    }

    return data;
}

/**
 * Remove o registro, o arquivo e as referências na configuração.
 *
 * A limpeza da config é obrigatória: um timbre apontando para som que não existe
 * mais faria o balcão cair no toque reserva do motor, e a tela de configuração
 * mostraria um seletor em branco — dois jeitos de a pessoa não entender por que
 * o alerta mudou.
 */
async function remover(id) {
    const alvo = exigirUuid(id);

    const { data: som, error: erroBusca } = await supabase
        .from("alerta_som")
        .select(CAMPOS)
        .eq("id", alvo)
        .eq("enterprise_id", enterprise.ENTERPRISE_ID)
        .maybeSingle();

    if (erroBusca) {
        throw erroBusca;
    }

    if (!som) {
        throw new NotFoundError("Som não encontrado");
    }

    // primeiro solta as referências: apagar o arquivo antes deixaria uma janela
    // em que a config aponta para algo que já não existe
    const alertas = await enterprise.removerTimbre(timbreDoSom(alvo));

    const caminho = som.url.split(`/${BUCKET}/`)[1];

    if (caminho) {
        const { error: erroArquivo } = await supabase.storage
            .from(BUCKET)
            .remove([decodeURIComponent(caminho)]);

        // arquivo já sumido não impede a limpeza da linha: os dois lados
        // discordarem é justamente o que este botão existe para resolver
        if (erroArquivo && erroArquivo.statusCode !== "404") {
            throw erroArquivo;
        }
    }

    const { error } = await supabase
        .from("alerta_som")
        .delete()
        .eq("id", alvo)
        .eq("enterprise_id", enterprise.ENTERPRISE_ID);

    if (error) {
        throw error;
    }

    return { removido: som, alertas };
}

export default { listar, criar, renomear, remover, timbreDoSom, PREFIXO_TIMBRE };
