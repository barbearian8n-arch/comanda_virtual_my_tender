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

/**
 * Quais avisos em tempo real o balcão recebe.
 *
 * Fica em `enterprise.config` e não em tabela nova: são três chaves por empresa,
 * sem histórico e sem consulta própria — uma tabela aqui só acrescentaria um
 * join a cada leitura.
 *
 * `nova_mensagem` nasce DESLIGADA de propósito: com o robô respondendo, toda
 * conversa de cliente viraria um alerta, e enxurrada de aviso ensina o balcão a
 * ignorar aviso. Fica a um clique de ser ligada por quem quiser.
 */
const NOTIFICACOES_DEFAULTS = {
    comanda_criada: { ligado: true, severidade: "info", confirmar: false },
    comanda_fechada: { ligado: true, severidade: "atencao", confirmar: true },
    nova_mensagem: { ligado: false, severidade: "info", confirmar: false }
};

const SEVERIDADES_VALIDAS = ["info", "sucesso", "atencao", "urgente"];

/**
 * Normaliza para o formato completo. O que veio do banco pode ser de uma versão
 * anterior, ter evento que não existe mais ou vir pela metade; o balcão não pode
 * deixar de ser avisado por causa de uma chave torta.
 */
function mesclarNotificacoes(guardado) {
    const origem = guardado && typeof guardado === "object" ? guardado : {};
    const saida = {};

    for (const [id, padrao] of Object.entries(NOTIFICACOES_DEFAULTS)) {
        const atual = origem[id] && typeof origem[id] === "object" ? origem[id] : {};

        saida[id] = {
            ligado: atual.ligado === undefined ? padrao.ligado : Boolean(atual.ligado),
            severidade: SEVERIDADES_VALIDAS.includes(atual.severidade) ? atual.severidade : padrao.severidade,
            confirmar: atual.confirmar === undefined ? padrao.confirmar : Boolean(atual.confirmar)
        };
    }

    return saida;
}

/**
 * Som dos alertas: volume, timbres, insistência, sirene.
 *
 * É da EMPRESA, e não do navegador. Guardado em localStorage, limpar o cache ou
 * trocar o tablet zerava tudo, e o gerente não conseguia ajustar uma vez para a
 * loja inteira.
 *
 * O formato é validado no cliente (`src/services/alertasConfig.js`), que é quem
 * conhece os timbres e os modos. Aqui só se garante o que o balcão não pode
 * perder por um valor torto: número é número, e o volume cabe na escala. Timbre
 * que não existe mais o cliente troca pelo padrão ao ler.
 */
const ALERTAS_DEFAULTS = {
    somLigado: true,
    volume: 60,
    duracaoMs: 6000,
    posicao: "topo-direita",
    repetirPendenciaMs: 10000,
    sirene: "nunca",
    timbreSirene: "suave",
    // `atencao` e não "crescente": o v2 traz "crescente" aqui, mas esse timbre não
    // existe no catálogo dele nem no nosso — caía no toque reserva em silêncio,
    // e "comanda fechada" (severidade atencao, ligada por padrão) soava como um
    // bipe curto qualquer em vez do som de atenção.
    timbres: { info: "toque", sucesso: "positivo", atencao: "atencao", urgente: "urgente" }
};

const LIMITES_ALERTAS = {
    volume: [0, 100],
    duracaoMs: [1500, 60000],
    repetirPendenciaMs: [0, 300000]
};

function numeroEntre(campo, valor, padrao) {
    const [minimo, maximo] = LIMITES_ALERTAS[campo];
    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return padrao;
    }

    return Math.min(maximo, Math.max(minimo, Math.round(numero)));
}

function textoOu(valor, padrao) {
    return typeof valor === "string" && valor.trim() ? valor.trim() : padrao;
}

function mesclarAlertas(guardado) {
    const origem = guardado && typeof guardado === "object" ? guardado : {};
    const timbresOrigem = origem.timbres && typeof origem.timbres === "object" ? origem.timbres : {};

    const timbres = {};
    for (const [severidade, padrao] of Object.entries(ALERTAS_DEFAULTS.timbres)) {
        timbres[severidade] = textoOu(timbresOrigem[severidade], padrao);
    }

    return {
        somLigado: origem.somLigado === undefined ? ALERTAS_DEFAULTS.somLigado : Boolean(origem.somLigado),
        volume: numeroEntre("volume", origem.volume, ALERTAS_DEFAULTS.volume),
        duracaoMs: numeroEntre("duracaoMs", origem.duracaoMs, ALERTAS_DEFAULTS.duracaoMs),
        posicao: textoOu(origem.posicao, ALERTAS_DEFAULTS.posicao),
        repetirPendenciaMs: numeroEntre("repetirPendenciaMs", origem.repetirPendenciaMs, ALERTAS_DEFAULTS.repetirPendenciaMs),
        sirene: textoOu(origem.sirene, ALERTAS_DEFAULTS.sirene),
        timbreSirene: textoOu(origem.timbreSirene, ALERTAS_DEFAULTS.timbreSirene),
        timbres
    };
}

async function getAlertasConfig() {
    return mesclarAlertas((await getConfig()).alertas);
}

/** Merge dentro de `config.alertas`, preservando `evolution`, `schedule_*` e o resto. */
async function setAlertasConfig(patch) {
    const config = await getConfig();
    const atual = mesclarAlertas(config.alertas);

    const alertas = mesclarAlertas({
        ...atual,
        ...(patch ?? {}),
        timbres: { ...atual.timbres, ...(patch?.timbres ?? {}) }
    });

    const { data, error } = await supabase
        .from("enterprise")
        .update({ config: { ...config, alertas } })
        .eq("id", ENTERPRISE_ID)
        .select("config")
        .single();

    if (error) {
        throw error;
    }

    return mesclarAlertas(data.config?.alertas);
}

async function getNotificacoesConfig() {
    return mesclarNotificacoes((await getConfig()).notificacoes);
}

/** `patch` é parcial nos dois níveis: `{ nova_mensagem: { ligado: true } }` vale. */
async function setNotificacoesConfig(patch) {
    const config = await getConfig();
    const atual = mesclarNotificacoes(config.notificacoes);

    const proximo = { ...atual };

    for (const [id, mudancas] of Object.entries(patch ?? {})) {
        if (!NOTIFICACOES_DEFAULTS[id]) {
            continue;
        }

        proximo[id] = { ...atual[id], ...mudancas };
    }

    const notificacoes = mesclarNotificacoes(proximo);

    const { data, error } = await supabase
        .from("enterprise")
        .update({ config: { ...config, notificacoes } })
        .eq("id", ENTERPRISE_ID)
        .select("config")
        .single();

    if (error) {
        throw error;
    }

    return mesclarNotificacoes(data.config?.notificacoes);
}

/**
 * Troca pelo padrão todo timbre que aponte para `timbreId`.
 *
 * Chamado quando um som enviado é excluído. Sem isto a preferência continuaria
 * apontando para um arquivo que não existe mais: o balcão cairia no timbre
 * reserva do motor de som e a tela de configuração mostraria um seletor em
 * branco — dois jeitos de a pessoa não entender por que o alerta mudou.
 */
async function removerTimbre(timbreId) {
    const atual = await getAlertasConfig();
    const patch = {};

    if (atual.timbreSirene === timbreId) {
        patch.timbreSirene = ALERTAS_DEFAULTS.timbreSirene;
    }

    const timbres = {};

    for (const [severidade, valor] of Object.entries(atual.timbres)) {
        if (valor === timbreId) {
            timbres[severidade] = ALERTAS_DEFAULTS.timbres[severidade];
        }
    }

    if (Object.keys(timbres).length > 0) {
        patch.timbres = timbres;
    }

    // nada apontava para o som: poupa a gravação e o merge no jsonb compartilhado
    if (Object.keys(patch).length === 0) {
        return atual;
    }

    return setAlertasConfig(patch);
}

export default {
    getConfig,
    getEvolutionConfig,
    getAlertasConfig,
    setAlertasConfig,
    getNotificacoesConfig,
    setNotificacoesConfig,
    removerTimbre,
    ALERTAS_DEFAULTS,
    NOTIFICACOES_DEFAULTS,
    setEvolutionConfig,
    getSchedules,
    setSchedules,
    ENTERPRISE_ID,
    CAMPOS_AGENDA,
    DIAS
};
