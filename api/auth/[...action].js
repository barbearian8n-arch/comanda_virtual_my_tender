import { createHandler } from "../../infra/handlers.js"
import usuarios from "../../models/usuarios.js"
import { requireLogin, requirePermissao, opcional } from "../../infra/authMiddleware.js"
import { MethodNotAllowedError, NotFoundError, ValidationError } from "../../infra/errors.js"

const handler = createHandler()

/** De onde veio a sessão — só para a pessoa reconhecer a própria na lista. */
function contexto(req) {
    return {
        userAgent: req.headers["user-agent"] ?? null,
        ip: (req.headers["x-forwarded-for"] ?? "").split(",")[0].trim() || null
    }
}

const actions = {
    login: {
        post: async (req, res) => {
            const { email, senha } = req.body || {}

            const resultado = await usuarios.login({ email, senha, ...contexto(req) })

            res.status(200).json(resultado)
        }
    },

    logout: {
        post: async (req, res) => {
            await opcional.handle(req)

            // sem token não há o que revogar, e responder erro faria a tela de
            // logout falhar justamente quando a sessão já não valia
            if (req.token) {
                await usuarios.logout(req.token)
            }

            res.status(200).json({ success: true })
        }
    },

    /** Quem sou eu — é com isto que o painel decide o que desenhar ao abrir. */
    me: {
        get: async (req, res) => {
            await requireLogin.handle(req)

            res.status(200).json(req.usuario)
        }
    },

    /**
     * Cadastro.
     *
     * Com a loja ainda sem nenhum usuário, aceita UM cadastro sem autenticação e
     * ele nasce admin — é o primeiro acesso, e sem isso não haveria como entrar
     * na primeira vez. A partir daí, exige um admin logado: a porta se fecha
     * atrás de quem passou.
     */
    register: {
        post: async (req, res) => {
            const { nome, email, senha, papel } = req.body || {}

            const primeiro = (await usuarios.contarUsuarios()) === 0

            if (!primeiro) {
                await requirePermissao("usuario.manage").handle(req, res)
            }

            const criado = await usuarios.criar({
                nome,
                email,
                senha,
                // quem se cadastra nunca escolhe o próprio papel: no primeiro
                // acesso é admin por necessidade, depois é o admin quem decide
                papel: primeiro ? "admin" : (papel ?? "atendente")
            })

            res.status(200).json({ ...criado, primeiro_acesso: primeiro })
        }
    },

    /** A loja já tem dono? A tela de login usa para oferecer o primeiro cadastro. */
    status: {
        get: async (req, res) => {
            res.status(200).json({ precisa_cadastro: (await usuarios.contarUsuarios()) === 0 })
        }
    },

    users: {
        get: async (req, res) => {
            await requirePermissao("usuario.manage").handle(req, res)

            res.status(200).json(await usuarios.listar())
        },
        post: async (req, res) => {
            await requirePermissao("usuario.manage").handle(req, res)

            const { id, papel, ativo, nome, senha } = req.body || {}

            if (id == null) {
                throw new ValidationError("Informe o usuário (id)")
            }

            res.status(200).json(await usuarios.atualizar(Number(id), { papel, ativo, nome, senha }))
        }
    }
}

function getActionEntry(req) {
    const segments = req.query["...action"]
    const name = Array.isArray(segments) ? segments.join("/") : segments
    const entry = name && !name.includes("/") && actions[name]

    if (!entry) {
        throw new NotFoundError("Rota não encontrada")
    }

    return entry
}

handler.get(async (req, res) => {
    const entry = getActionEntry(req)

    if (!entry.get) {
        throw new MethodNotAllowedError("Method Not Allowed")
    }

    await entry.get(req, res)
})

handler.post(async (req, res) => {
    const entry = getActionEntry(req)

    if (!entry.post) {
        throw new MethodNotAllowedError("Method Not Allowed")
    }

    await entry.post(req, res)
})

export default handler
