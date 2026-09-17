/**
 * Motor de som dos alertas.
 *
 * Os toques são SINTETIZADOS na hora com a Web Audio API, não baixados. Num
 * balcão o alerta é o aviso de que chegou pedido: se ele dependesse de rede, a
 * primeira oscilação de conexão deixaria a loja sem saber que o cliente pediu —
 * e mudo é a única falha aqui que ninguém percebe acontecendo.
 *
 * Som enviado pela loja é a exceção: aí existe arquivo, e por isso existe também
 * um timbre reserva para quando ele ainda não baixou ou falhou.
 */

export const TIMBRES = {
    toque: { rotulo: "Toque curto", onda: "sine", ganho: 1.65, notas: [[880, 90]] },
    sino: { rotulo: "Sino", onda: "sine", ganho: 1.5, notas: [[1046, 110], [1568, 260]] },
    positivo: { rotulo: "Positivo", onda: "triangle", ganho: 1.35, notas: [[659, 80], [880, 80], [1318, 200]] },
    atencao: { rotulo: "Atenção", onda: "triangle", ganho: 1.5, notas: [[622, 120], [null, 70], [622, 120]] },
    urgente: {
        // onda quadrada corta o barulho do salão melhor que a senoide, mas é
        // agressiva: o ganho compensa para não estourar no alto-falante do tablet
        rotulo: "Urgente", onda: "square", ganho: 0.66,
        notas: [[880, 100], [660, 100], [880, 100], [660, 230]]
    },
    campainha: { rotulo: "Campainha", onda: "triangle", ganho: 1.35, notas: [[1174, 130], [988, 130], [784, 320]] },

    /* Os dois de baixo existem para tocar em LOOP, e por isso são feitos ao
       contrário dos de cima: o que chama atenção num toque único (ataque seco,
       nota curta, onda dura) é justamente o que cansa quando repete.

       A soltura é mais longa que a pausa entre as notas de propósito — assim a
       cauda de uma nota ainda soa quando a seguinte começa, e o loop vira uma
       onda ligada em vez de bipes emendados. */
    suave: {
        rotulo: "Aviso suave (contínuo)", onda: "sine", ganho: 1.02,
        ataqueS: 0.14, solturaS: 0.45,
        // dó–mi: terça maior, intervalo que soa como aviso e não como alarme
        notas: [[523, 560], [659, 560]]
    },
    respiro: {
        rotulo: "Respiro (pulso lento)", onda: "sine", ganho: 1.14,
        ataqueS: 0.25, solturaS: 0.5,
        // a soltura de 0,5s cobre a pausa: o som some devagar em vez de cortar
        notas: [[494, 900], [null, 500]]
    }
}

/**
 * Prefixo que separa um som enviado (`arquivo:<uuid>`) dos timbres acima, já que
 * os dois dividem o mesmo campo em `enterprise.config.alertas`. O mesmo valor
 * está em `models/alertaSons.js` — não há módulo compartilhado entre `api/` e
 * `src/`.
 */
export const PREFIXO_ARQUIVO = "arquivo:"

const TIMBRE_RESERVA = "toque"
const TIMBRE_RESERVA_SIRENE = "suave"

/** Arquivo toca no volume em que foi gravado; os ganhos de TIMBRES passam de 1. */
const GANHO_ARQUIVO = 1

const ATAQUE_S = 0.008
const SOLTURA_S = 0.06
/** `exponentialRamp` não aceita zero — este é o "silêncio" possível. */
const PISO = 0.0001

export function ehSomEnviado(nome) {
    return typeof nome === "string" && nome.startsWith(PREFIXO_ARQUIVO)
}

/* ===== Sons enviados pela loja ===================================== */

const sonsEnviados = new Map()

/**
 * Registra a lista vinda do servidor e começa a baixar cada arquivo.
 *
 * O download é disparado aqui, e não na hora de tocar: decodificar um mp3 leva
 * centenas de milissegundos, e um alerta que chega meio segundo depois do
 * pedido é um alerta que o balcão associa ao pedido errado.
 */
export function registrarSonsEnviados(lista) {
    const vistos = new Set()

    for (const som of Array.isArray(lista) ? lista : []) {
        const id = `${PREFIXO_ARQUIVO}${som.id}`
        vistos.add(id)

        const anterior = sonsEnviados.get(id)

        if (anterior && anterior.url === som.url) {
            anterior.rotulo = som.rotulo
            continue
        }

        sonsEnviados.set(id, { id, url: som.url, rotulo: som.rotulo, buffer: null, erro: false })
    }

    // som excluído em outro aparelho some daqui também
    for (const id of [...sonsEnviados.keys()]) {
        if (!vistos.has(id)) sonsEnviados.delete(id)
    }
}

export function listarSonsEnviados() {
    return [...sonsEnviados.values()].map(({ id, rotulo }) => ({ id, rotulo }))
}

async function bufferDoSom(entrada, ctx) {
    if (entrada.buffer) return entrada.buffer
    if (entrada.erro) return null

    try {
        const resposta = await fetch(entrada.url)
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`)

        entrada.buffer = await ctx.decodeAudioData(await resposta.arrayBuffer())
        return entrada.buffer
    } catch {
        // marca e desiste: insistir a cada alerta encheria a rede por um som
        entrada.erro = true
        return null
    }
}

/* ===== Contexto e saída ============================================ */

let contexto = null
let saida = null

function obterContexto() {
    if (contexto) return contexto

    const Construtor = window.AudioContext || window.webkitAudioContext
    if (!Construtor) return null

    contexto = new Construtor()
    return contexto
}

/**
 * Todo som passa por um compressor antes do destino.
 *
 * Não é efeito: é proteção. Os timbres têm ganhos calibrados, mas um arquivo
 * enviado pela loja pode ter sido gravado em qualquer nível — sem o limitador,
 * um mp3 alto estoura no alto-falante do tablet e faz o balcão baixar o volume
 * geral, o que deixa TODOS os alertas inaudíveis.
 */
function obterSaida(ctx) {
    if (saida && saida.ctx === ctx) return saida.no

    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -10
    compressor.knee.value = 6
    compressor.ratio.value = 12
    compressor.attack.value = 0.003
    compressor.release.value = 0.25
    compressor.connect(ctx.destination)

    saida = { ctx, no: compressor }
    return compressor
}

export function somSuportado() {
    return Boolean(window.AudioContext || window.webkitAudioContext)
}

export function somLiberado() {
    return contexto?.state === "running"
}

const EVENTOS_DE_GESTO = ["pointerdown", "mousedown", "touchstart", "touchend", "keydown", "click"]

/**
 * O navegador só deixa tocar som depois de um gesto do usuário.
 *
 * Sem isto o painel ficaria aberto no balcão a manhã inteira sem nunca poder
 * apitar, e ninguém saberia por quê — a tela não mostra nada de errado. Aqui o
 * primeiro clique em qualquer lugar destrava, e `aoLiberar` avisa a tela para
 * tirar o aviso de "som bloqueado".
 */
export function liberarNoPrimeiroGesto(aoLiberar) {
    const ctx = obterContexto()
    if (!ctx) return () => {}

    if (ctx.state === "running") {
        aoLiberar?.()
        return () => {}
    }

    const destravar = async () => {
        try {
            await ctx.resume()
        } catch {
            return
        }

        if (ctx.state === "running") {
            limpar()
            aoLiberar?.()
        }
    }

    const limpar = () => {
        for (const evento of EVENTOS_DE_GESTO) {
            window.removeEventListener(evento, destravar)
        }
    }

    for (const evento of EVENTOS_DE_GESTO) {
        window.addEventListener(evento, destravar, { passive: true })
    }

    return limpar
}

/* ===== Tocar ======================================================= */

function agendarNota({ ctx, timbre, hz, inicio, duracaoS, pico, destino }) {
    if (hz == null) return

    const osc = ctx.createOscillator()
    const ganho = ctx.createGain()

    osc.type = timbre.onda
    osc.frequency.setValueAtTime(hz, inicio)

    const ataque = timbre.ataqueS ?? ATAQUE_S
    const soltura = timbre.solturaS ?? SOLTURA_S

    // envelope exponencial: a rampa linear soa como clique no começo e no fim
    ganho.gain.setValueAtTime(PISO, inicio)
    ganho.gain.exponentialRampToValueAtTime(Math.max(pico, PISO), inicio + ataque)
    ganho.gain.exponentialRampToValueAtTime(PISO, inicio + duracaoS + soltura)

    osc.connect(ganho)
    ganho.connect(destino)

    osc.start(inicio)
    osc.stop(inicio + duracaoS + soltura + 0.02)
}

export function duracaoDoTimbre(nome) {
    const timbre = TIMBRES[nome]
    if (!timbre) return 0

    const total = timbre.notas.reduce((soma, [, ms]) => soma + ms, 0)
    return total + (timbre.solturaS ?? SOLTURA_S) * 1000
}

/**
 * Toca um timbre ou um som enviado. `volume` vai de 0 a 1.
 *
 * Som enviado que ainda não baixou cai no timbre reserva em vez de sair mudo.
 */
export async function tocarTimbre(nome, { volume = 0.6 } = {}) {
    const ctx = obterContexto()
    if (!ctx || volume <= 0) return

    if (ctx.state === "suspended") {
        try { await ctx.resume() } catch { return }
    }

    const destino = obterSaida(ctx)

    if (ehSomEnviado(nome)) {
        const entrada = sonsEnviados.get(nome)
        const buffer = entrada ? await bufferDoSom(entrada, ctx) : null

        if (buffer) {
            const fonte = ctx.createBufferSource()
            const ganho = ctx.createGain()

            fonte.buffer = buffer
            ganho.gain.value = volume * GANHO_ARQUIVO

            fonte.connect(ganho)
            ganho.connect(destino)
            fonte.start()
            return
        }

        // não baixou: o reserva sintetizado é melhor que silêncio
        return tocarTimbre(TIMBRE_RESERVA, { volume })
    }

    const timbre = TIMBRES[nome] ?? TIMBRES[TIMBRE_RESERVA]
    const pico = volume * timbre.ganho

    let quando = ctx.currentTime + 0.02

    for (const [hz, ms] of timbre.notas) {
        const duracaoS = ms / 1000
        agendarNota({ ctx, timbre, hz, inicio: quando, duracaoS, pico, destino })
        quando += duracaoS
    }
}

/* ===== Sirene (repete até alguém atender) ========================== */

/**
 * Agenda em janelas de 2s, repetidamente, em vez de um `setInterval` por nota.
 *
 * O relógio do JavaScript atrasa quando a aba perde o foco — e é exatamente aí
 * que a sirene precisa continuar soando. O relógio do Web Audio não atrasa, e
 * agendar adiantado deixa o som imune ao que acontece na thread principal.
 */
const HORIZONTE_S = 2
const PASSO_MS = 500

export function iniciarSirene(nome, { volume = 0.6 } = {}) {
    const ctx = obterContexto()
    if (!ctx) return () => {}

    const escolhido = ehSomEnviado(nome) || TIMBRES[nome] ? nome : TIMBRE_RESERVA_SIRENE
    const destino = obterSaida(ctx)

    let vivo = true
    let proxima = ctx.currentTime + 0.05

    // som enviado: repete o arquivo inteiro, espaçado pela própria duração
    if (ehSomEnviado(escolhido)) {
        const entrada = sonsEnviados.get(escolhido)
        let timer = null

        const ciclo = async () => {
            if (!vivo) return

            const buffer = entrada ? await bufferDoSom(entrada, ctx) : null

            if (!buffer) {
                // arquivo indisponível: cai no timbre contínuo sintetizado
                const parar = iniciarSirene(TIMBRE_RESERVA_SIRENE, { volume })
                pararArquivo = parar
                return
            }

            const fonte = ctx.createBufferSource()
            const ganho = ctx.createGain()
            fonte.buffer = buffer
            ganho.gain.value = volume * GANHO_ARQUIVO
            fonte.connect(ganho)
            ganho.connect(destino)
            fonte.start()

            timer = setTimeout(ciclo, buffer.duration * 1000)
        }

        let pararArquivo = null
        ciclo()

        return () => {
            vivo = false
            if (timer) clearTimeout(timer)
            pararArquivo?.()
        }
    }

    const timbre = TIMBRES[escolhido]
    const pico = volume * timbre.ganho

    const agendar = () => {
        if (!vivo) return

        const limite = ctx.currentTime + HORIZONTE_S

        while (proxima < limite) {
            for (const [hz, ms] of timbre.notas) {
                const duracaoS = ms / 1000
                agendarNota({ ctx, timbre, hz, inicio: proxima, duracaoS, pico, destino })
                proxima += duracaoS
            }
        }
    }

    agendar()
    const intervalo = setInterval(agendar, PASSO_MS)

    return () => {
        vivo = false
        clearInterval(intervalo)
    }
}
