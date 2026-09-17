import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

/**
 * Hash de senha com `scrypt` do próprio Node.
 *
 * Sem bcrypt/argon2 de propósito: os dois são módulos nativos, e módulo nativo
 * em função serverless é build quebrando por versão de binário. `scrypt` é KDF
 * de senha de verdade (memória-dura, feita para ser cara), vem no runtime e não
 * precisa ser instalada.
 *
 * Formato gravado: `scrypt$N$r$p$<salt hex>$<hash hex>`. Os parâmetros vão
 * JUNTOS no registro porque um dia eles vão aumentar — e sem isso as senhas
 * antigas viram impossíveis de conferir depois do aumento.
 */
const N = 16384;
const R = 8;
const P = 1;
const TAMANHO_HASH = 64;
const TAMANHO_SALT = 16;

/** O custo de memória do scrypt é ~128*N*r bytes; o default do Node não basta. */
const OPCOES = { N, r: R, p: P, maxmem: 256 * N * R };

export async function hashSenha(senha) {
    const texto = String(senha ?? "");

    if (texto.length < 8) {
        throw new Error("A senha deve ter ao menos 8 caracteres");
    }

    const salt = randomBytes(TAMANHO_SALT);
    const hash = await scryptAsync(texto, salt, TAMANHO_HASH, OPCOES);

    return `scrypt$${N}$${R}$${P}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

/**
 * Confere a senha. Devolve `false` em vez de lançar para qualquer registro
 * malformado: um hash estragado no banco não pode virar erro 500 na tela de
 * login, que diria a um atacante que aquele e-mail existe.
 */
export async function conferirSenha(senha, registro) {
    try {
        const partes = String(registro ?? "").split("$");

        if (partes.length !== 6 || partes[0] !== "scrypt") {
            return false;
        }

        const [, n, r, p, saltHex, hashHex] = partes;
        const salt = Buffer.from(saltHex, "hex");
        const esperado = Buffer.from(hashHex, "hex");

        const obtido = await scryptAsync(String(senha ?? ""), salt, esperado.length, {
            N: Number(n),
            r: Number(r),
            p: Number(p),
            maxmem: 256 * Number(n) * Number(r)
        });

        // comparação em tempo constante: `===` vazaria, pelo tempo de resposta,
        // quantos bytes do hash foram acertados
        return obtido.length === esperado.length && timingSafeEqual(obtido, esperado);
    } catch {
        return false;
    }
}
