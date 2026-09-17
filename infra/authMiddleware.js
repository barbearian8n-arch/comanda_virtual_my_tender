import usuarios from "../models/usuarios.js";
import { podeFazer } from "./permissions.js";
import { ApiError } from "./errors.js";

/**
 * Autenticação e autorização das rotas.
 *
 * Os middlewares ficam com o handler (`handler.middleware.post(...)`), então
 * uma rota nova nasce ABERTA — é preciso lembrar de protegê-la. É o oposto do
 * padrão seguro, mas é como o `createHandler` deste repo funciona; a
 * compensação é `api/_protegidas.md`, que lista quem exige o quê.
 */

class NaoAutenticadoError extends ApiError {
    constructor(message = "Faça login para continuar") {
        super(message, { name: "NaoAutenticadoError", code: "unauthorized", statusCode: 401 });
    }
}

class SemPermissaoError extends ApiError {
    constructor(message = "Sua conta não tem permissão para isto") {
        super(message, { name: "SemPermissaoError", code: "forbidden", statusCode: 403 });
    }
}

/**
 * O token vem no `Authorization: Bearer`. Não usamos cookie: a API é chamada de
 * outra origem (o painel na Vercel), e cookie entre origens exigiria SameSite
 * afrouxado — que é justamente o que abre espaço para CSRF.
 */
function extrairToken(req) {
    const cabecalho = req.headers?.authorization ?? "";
    const [tipo, valor] = String(cabecalho).split(" ");

    return tipo?.toLowerCase() === "bearer" && valor ? valor.trim() : null;
}

/**
 * Preenche `req.usuario` quando há sessão válida, e segue adiante quando não há.
 *
 * Serve para rota que muda de comportamento com login, sem exigi-lo — o
 * cardápio que o cliente final abre é assim.
 */
async function carregarUsuario(req) {
    if (req.usuario !== undefined) {
        return req.usuario;
    }

    const token = extrairToken(req);
    req.usuario = null;
    req.token = token;

    if (token) {
        const sessao = await usuarios.autenticar(token);
        req.usuario = sessao?.usuario ?? null;
        req.sessaoId = sessao?.sessaoId ?? null;
    }

    return req.usuario;
}

export const opcional = {
    handle: async (req) => {
        await carregarUsuario(req);
    }
};

export const requireLogin = {
    handle: async (req) => {
        if (!(await carregarUsuario(req))) {
            throw new NaoAutenticadoError();
        }
    }
};

/**
 * Exige uma permissão. Sempre autentica antes: sem login a resposta é 401
 * ("entre"), e não 403 ("você não pode") — são coisas diferentes para quem está
 * do outro lado, e para a tela, que redireciona num caso e avisa no outro.
 */
export function requirePermissao(permissao) {
    return {
        handle: async (req) => {
            const usuario = await carregarUsuario(req);

            if (!usuario) {
                throw new NaoAutenticadoError();
            }

            if (!podeFazer(usuario.role, permissao)) {
                throw new SemPermissaoError(
                    `Esta ação exige a permissão "${permissao}", que o papel "${usuario.role}" não tem.`
                );
            }
        }
    };
}

export { NaoAutenticadoError, SemPermissaoError };
