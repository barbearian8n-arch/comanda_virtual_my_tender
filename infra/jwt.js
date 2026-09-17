import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";
import { ApiError } from "./errors.js";

/**
 * Assinatura dos tokens de sessão.
 *
 * Sem `JWT_SECRET` o processo NÃO cai para um segredo padrão: um default aqui
 * seria a mesma chave em todo deploy, e qualquer um poderia forjar um token de
 * admin. Falhar alto é melhor que rodar inseguro em silêncio.
 */
const DIAS_VALIDADE = 7;

function segredo() {
    const valor = process.env.JWT_SECRET;

    if (!valor || valor.length < 32) {
        throw new ApiError("JWT_SECRET ausente ou curta demais (mínimo 32 caracteres)", {
            name: "ConfigError",
            code: "jwt-not-configured",
            statusCode: 503
        });
    }

    return valor;
}

export const VALIDADE_SEGUNDOS = DIAS_VALIDADE * 24 * 60 * 60;

/**
 * O `jti` é o que amarra o token à linha em `user_session`. Sem ele, dois logins
 * da mesma pessoa no mesmo segundo gerariam tokens idênticos e revogar um
 * derrubaria o outro.
 */
export function assinar({ userId, email, role }) {
    return jwt.sign(
        { sub: String(userId), email, role, jti: randomBytes(16).toString("hex") },
        segredo(),
        { expiresIn: VALIDADE_SEGUNDOS }
    );
}

/** Devolve o payload, ou `null` para token inválido, expirado ou adulterado. */
export function verificar(token) {
    try {
        return jwt.verify(token, segredo());
    } catch {
        return null;
    }
}

/**
 * O que vai para a coluna `token_hash`.
 *
 * SHA-256 simples basta aqui, diferente da senha: o token já é 100+ caracteres
 * aleatórios, então não há o que adivinhar por força bruta — o hash existe para
 * um vazamento da tabela não entregar sessões utilizáveis.
 */
export function hashDoToken(token) {
    return createHash("sha256").update(String(token ?? "")).digest("hex");
}
