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

/**
 * Duas assinaturas possíveis, e qual vale depende do ambiente.
 *
 * HS256 com `JWT_SECRET` basta para este painel sozinho. Mas o servidor de
 * notificação (o mesmo que o mytender-v2 usa) só aceita **RS256** — ele responde
 * `{"error":"unsupported alg"}` a qualquer token HS256, porque valida com uma
 * chave pública.
 *
 * Então: havendo `JWT_PRIVATE_KEY_B64`/`JWT_PUBLIC_KEY_B64`, assina em RS256 e
 * os alertas em tempo real passam a funcionar. Sem elas, segue em HS256 como
 * antes. É opcional de propósito — trocar o algoritmo invalida toda sessão
 * aberta, e isso não pode acontecer por efeito colateral de um deploy.
 */
function chaves() {
    const priv = process.env.JWT_PRIVATE_KEY_B64;
    const pub = process.env.JWT_PUBLIC_KEY_B64;

    if (priv && pub) {
        return {
            algoritmo: "RS256",
            assinar: Buffer.from(priv, "base64").toString("utf-8"),
            verificar: Buffer.from(pub, "base64").toString("utf-8")
        };
    }

    const valor = process.env.JWT_SECRET;

    if (!valor || valor.length < 32) {
        throw new ApiError(
            "Nenhuma chave de assinatura configurada: defina JWT_SECRET (mínimo 32 caracteres) " +
            "ou o par JWT_PRIVATE_KEY_B64/JWT_PUBLIC_KEY_B64",
            { name: "ConfigError", code: "jwt-not-configured", statusCode: 503 }
        );
    }

    return { algoritmo: "HS256", assinar: valor, verificar: valor };
}

/** Qual algoritmo está valendo — a tela usa para saber se pode ligar os alertas. */
export function algoritmoAtual() {
    try {
        return chaves().algoritmo;
    } catch {
        return null;
    }
}

export const VALIDADE_SEGUNDOS = DIAS_VALIDADE * 24 * 60 * 60;

/**
 * O `jti` é o que amarra o token à linha em `user_session`. Sem ele, dois logins
 * da mesma pessoa no mesmo segundo gerariam tokens idênticos e revogar um
 * derrubaria o outro.
 */
export function assinar({ userId, email, role }) {
    const { algoritmo, assinar: chave } = chaves();

    return jwt.sign(
        {
            sub: String(userId),
            email,
            role,
            /**
             * O servidor de notificação exige esta claim e a compara com a
             * empresa da URL do fluxo: sem ela responde
             * `{"error":"token not valid for this enterprise"}`, e com o id de
             * outra empresa também — é assim que ele isola um inquilino do outro.
             */
            enterprise_id: Number(process.env.ENTERPRISE_ID ?? 1),
            jti: randomBytes(16).toString("hex")
        },
        chave,
        { algorithm: algoritmo, expiresIn: VALIDADE_SEGUNDOS }
    );
}

/** Devolve o payload, ou `null` para token inválido, expirado ou adulterado. */
export function verificar(token) {
    try {
        const { algoritmo, verificar: chave } = chaves();
        return jwt.verify(token, chave, { algorithms: [algoritmo] });
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
