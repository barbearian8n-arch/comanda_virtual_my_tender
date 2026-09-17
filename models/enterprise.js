import supabase from "../infra/supabase.js";
import { ValidationError } from "../infra/errors.js";

/**
 * Este projeto é de uma loja só: não há login, nem `enterprise_id` em lugar
 * nenhum do código. A empresa é fixa, mas fica em variável de ambiente para o
 * mesmo build servir outra loja sem recompilar — hoje toda a `padaria` é da 1.
 */
const ENTERPRISE_ID = Number(process.env.ENTERPRISE_ID ?? 1);

/** Ordem da semana como o robô espera ler, começando no domingo. */
const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"];

/**
 * `{dia} {hh:mm}-{hh:mm}`, ex.: `seg 07:00-19:00`. Mesmo formato que o
 * `operating_time` do mytender-v2 usa, para o robô não precisar aprender dois.
 *
 * O intervalo NÃO precisa terminar depois de começar: `sex 22:00-02:00` é uma
 * madrugada legítima, e recusar isso quebraria quem fecha depois da meia-noite.
 */
const PADRAO_HORARIO = /^(dom|seg|ter|qua|qui|sex|sab) ([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/;

/**
 * As três agendas que a tela de Configurações grava. São chaves de
 * `enterprise.config` (jsonb) e não colunas próprias: a tabela não tem essas
 * colunas neste banco, e o robô já lê o `config` inteiro pela view
 * `view_enterprise_config` — então nada precisa ser criado para ele enxergar.
 */
const CAMPOS_AGENDA = ["schedule_agent", "schedule_store", "schedule_booking"];

/** O interruptor de cada agenda: `schedule_agent` → `schedule_agent_enabled`. */
function campoAtivo(campo) {
    return `${campo}_enabled`;
}

/**
 * Interruptor ausente vale `false` — "esta agenda não está restringindo nada".
 *
 * O padrão é desligado porque é ele que preserva o comportamento de hoje: antes
 * desta tela não havia agenda nenhuma gravada, o robô respondia sempre e a loja
 * não tinha horário declarado. Um padrão ligado sobre lista vazia significaria
 * "só vale dentro de faixa nenhuma" — silenciando o robô no primeiro deploy.
 */
function montarSaida(config) {
    const saida = {};

    for (const campo of CAMPOS_AGENDA) {
        saida[campo] = Array.isArray(config?.[campo]) ? config[campo] : [];
        saida[campoAtivo(campo)] = config?.[campoAtivo(campo)] === true;
    }

    return saida;
}

/**
 * Ordena por dia da semana e depois por horário de início.
 *
 * A lista chega na ordem em que a tela desenhou as linhas, que muda conforme a
 * pessoa adiciona e remove faixas. Gravar ordenado deixa o array estável: quem
 * for comparar duas versões vê diferença de conteúdo, não de ordem.
 */
function ordenar(entradas) {
    return [...entradas].sort((a, b) => {
        const diaA = DIAS.indexOf(a.slice(0, 3));
        const diaB = DIAS.indexOf(b.slice(0, 3));

        return diaA === diaB ? a.slice(4).localeCompare(b.slice(4)) : diaA - diaB;
    });
}

function normalizarAgenda(campo, valor) {
    if (!Array.isArray(valor)) {
        throw new ValidationError(`${campo} deve ser uma lista`);
    }

    const entradas = valor.map((entrada) => String(entrada ?? "").trim());
    const invalidas = entradas.filter((entrada) => !PADRAO_HORARIO.test(entrada));

    if (invalidas.length > 0) {
        throw new ValidationError(
            `Horário inválido em ${campo}: ${invalidas.join(", ")}. Use o formato "seg 07:00-19:00"`
        );
    }

    // faixa repetida não muda o que o robô entende, só polui a lista
    return ordenar([...new Set(entradas)]);
}

async function getConfig() {
    const { data, error } = await supabase
        .from("enterprise")
        .select("config")
        .eq("id", ENTERPRISE_ID)
        .single();

    if (error) {
        throw error;
    }

    return data.config ?? {};
}

/**
 * As três agendas com seus interruptores, sempre as seis chaves — empresa sem
 * nada gravado devolve listas vazias e tudo desligado.
 */
async function getSchedules() {
    return montarSaida(await getConfig());
}

/**
 * Merge dentro de `config`, nunca sobrescrita do objeto inteiro: o mesmo jsonb
 * guarda `evolution` (EvoSender, EvoInstance, NomeAtendente), que é o que o n8n
 * lê para saber por qual número responder. Gravar `{ schedule_agent }` puro
 * apagaria aquilo e derrubaria o robô.
 *
 * Leitura-modificação-escrita: duas telas salvando ao mesmo tempo podem perder
 * uma gravação. É tela de configuração de uma loja só, uma pessoa por vez — não
 * vale um RPC no banco só para isto.
 */
async function setSchedules(patch) {
    const mudancas = {};

    for (const campo of CAMPOS_AGENDA) {
        if (patch?.[campo] !== undefined) {
            mudancas[campo] = normalizarAgenda(campo, patch[campo]);
        }

        // o interruptor anda separado da lista: dá para ligar e desligar sem
        // mexer nos horários, que é o caso de pausar a agenda e retomá-la depois
        if (patch?.[campoAtivo(campo)] !== undefined) {
            mudancas[campoAtivo(campo)] = Boolean(patch[campoAtivo(campo)]);
        }
    }

    if (Object.keys(mudancas).length === 0) {
        throw new ValidationError("Nada para atualizar");
    }

    const config = await getConfig();

    const { data, error } = await supabase
        .from("enterprise")
        .update({ config: { ...config, ...mudancas } })
        .eq("id", ENTERPRISE_ID)
        .select("config")
        .single();

    if (error) {
        throw error;
    }

    return montarSaida(data.config ?? {});
}

/**
 * Onde a conexão de WhatsApp desta loja vive: host, instância e o número que
 * responde por ela. É a MESMA chave `config.evolution` que o n8n lê, de
 * propósito — duas fontes para isto significaria o painel enviando por uma
 * instância e o robô por outra.
 *
 * A chave da API não está aqui: é segredo de ambiente (`EVO_KEY`), não dado de
 * uma linha do banco.
 */
async function getEvolutionConfig() {
    const { evolution } = (await getConfig()) ?? {};

    const texto = (valor) => (typeof valor === "string" ? valor.trim() : "");

    return {
        host: texto(evolution?.EvoHost),
        instancia: texto(evolution?.EvoInstance),
        sender: texto(evolution?.EvoSender),
        nomeAtendente: texto(evolution?.NomeAtendente) || null
    };
}

/**
 * Merge dentro de `config.evolution`, preservando as chaves que este painel não
 * escreve mas o n8n lê (`EvoHost`, `GrupoBalanca`, `NomeAtendente`).
 *
 * `EvoSender` só deve ser sobrescrito com um JID de verdade — quem chama é que
 * garante isso. Mandar null porque a instância está desconectada apagaria o
 * discriminador do histórico e a tela de Mensagens ficaria vazia: a conversa
 * antiga continua sendo daquele número mesmo com o WhatsApp fora do ar.
 */
async function setEvolutionConfig(patch) {
    const config = await getConfig();
    const evolution = { ...(config.evolution ?? {}), ...patch };

    const { data, error } = await supabase
        .from("enterprise")
        .update({ config: { ...config, evolution } })
        .eq("id", ENTERPRISE_ID)
        .select("config")
        .single();

    if (error) {
        throw error;
    }

    return data.config?.evolution ?? {};
}

export default {
    getConfig,
    getEvolutionConfig,
    setEvolutionConfig,
    getSchedules,
    setSchedules,
    ENTERPRISE_ID,
    CAMPOS_AGENDA,
    DIAS
};
