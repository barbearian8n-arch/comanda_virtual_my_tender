import supabase from "../infra/supabase.js";
import enterprise from "./enterprise.js";
import { hashSenha, conferirSenha } from "../infra/password.js";
import { assinar, hashDoToken, verificar, VALIDADE_SEGUNDOS } from "../infra/jwt.js";
import { PAPEIS, permissoesDoPapel } from "../infra/permissions.js";
import { ConflictError, NotFoundError, ValidationError } from "../infra/errors.js";

const TABELA = "user";
const TABELA_SESSAO = "user_session";

/** Nunca inclui `password_hash` — ele não sai desta camada. */
const CAMPOS_PUBLICOS =
    "id, email, display_name, username, role, is_active, enterprise_id, created_at, last_login_at";

function normalizarEmail(valor) {
    return String(valor ?? "").trim().toLowerCase();
}

/**
 * O usuário como a tela o vê: dados públicos mais o que ele pode fazer.
 *
 * As permissões vão resolvidas daqui, e não deduzidas no cliente a partir do
 * papel: o mapa é do servidor, e é ele que decide. O cliente usa isto só para
 * esconder botão — quem barra de verdade é o middleware em cada rota.
 */
function comPermissoes(linha) {
    return { ...linha, permissoes: permissoesDoPapel(linha.role) };
}

async function buscarPorEmail(email) {
    const { data, error } = await supabase
        .from(TABELA)
        .select(`${CAMPOS_PUBLICOS}, password_hash`)
        .eq("enterprise_id", enterprise.ENTERPRISE_ID)
        .ilike("email", normalizarEmail(email))
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data;
}

async function contarUsuarios() {
    const { count, error } = await supabase
        .from(TABELA)
        .select("id", { count: "exact", head: true })
        .eq("enterprise_id", enterprise.ENTERPRISE_ID);

    if (error) {
        throw error;
    }

    return count ?? 0;
}

/**
 * Cria a conta.
 *
 * `papel` não vem de quem se cadastra — quem chama é que decide, e a rota de
 * registro só passa "admin" quando a loja ainda não tem nenhum usuário.
 */
async function criar({ nome, email, senha, papel }) {
    const enderecoEmail = normalizarEmail(email);

    if (!enderecoEmail.includes("@")) {
        throw new ValidationError("E-mail inválido");
    }

    if (!PAPEIS.includes(papel)) {
        throw new ValidationError(`Papel inválido: ${papel}. Use ${PAPEIS.join(" ou ")}.`);
    }

    // hashSenha impõe o tamanho mínimo; aqui só traduzimos para erro de API
    let password_hash;
    try {
        password_hash = await hashSenha(senha);
    } catch (erro) {
        throw new ValidationError(erro.message);
    }

    const { data, error } = await supabase
        .from(TABELA)
        .insert({
            enterprise_id: enterprise.ENTERPRISE_ID,
            email: enderecoEmail,
            // `display_name` e `username` são NOT NULL e já existiam na tabela,
            // que foi criada para o desenho do mytender-v2. Reaproveito as duas
            // em vez de criar colunas paralelas: duas respostas para "como esta
            // pessoa se chama" divergem na primeira edição.
            display_name: String(nome ?? "").trim() || enderecoEmail.split("@")[0],
            // o login aqui é por e-mail; `username` existe porque o v2 entra por
            // ele. Guardar o próprio e-mail mantém a linha utilizável dos dois
            // lados e herda a unicidade que o índice de e-mail já garante.
            username: enderecoEmail,
            role: papel,
            password_hash
        })
        .select(CAMPOS_PUBLICOS)
        .single();

    if (error) {
        if (error.code === "23505") {
            throw new ConflictError("Já existe uma conta com esse e-mail");
        }
        throw error;
    }

    return comPermissoes(data);
}

/**
 * Entra e abre a sessão.
 *
 * A mesma mensagem para e-mail inexistente e senha errada é intencional:
 * distinguir os dois transforma a tela de login numa ferramenta de descobrir
 * quais e-mails têm conta.
 */
async function login({ email, senha, userAgent, ip }) {
    const generico = new ValidationError("E-mail ou senha incorretos");

    const usuario = await buscarPorEmail(email);

    if (!usuario) {
        // confere contra um hash descartável assim mesmo: responder na hora para
        // e-mail inexistente denunciaria, pelo tempo, quais contas existem
        await conferirSenha(senha, "scrypt$16384$8$1$00$00");
        throw generico;
    }

    if (!(await conferirSenha(senha, usuario.password_hash))) {
        throw generico;
    }

    if (!usuario.is_active) {
        throw new ValidationError("Esta conta está desativada");
    }

    const token = assinar({ userId: usuario.id, email: usuario.email, role: usuario.role });
    const expira = new Date(Date.now() + VALIDADE_SEGUNDOS * 1000).toISOString();

    const { error } = await supabase.from(TABELA_SESSAO).insert({
        user_id: usuario.id,
        token_hash: hashDoToken(token),
        expires_at: expira,
        user_agent: userAgent ?? null,
        ip: ip ?? null
    });

    if (error) {
        throw error;
    }

    await supabase
        .from(TABELA)
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", usuario.id);

    const { password_hash, ...publico } = usuario;
    void password_hash;

    return { token, usuario: comPermissoes(publico), expira_em: expira };
}

/**
 * Valida o token: assinatura E sessão viva no banco.
 *
 * Os dois, e não só a assinatura: é a linha em `user_session` que permite
 * revogar. Sem ela, "desconectar" não teria efeito nenhum até o token expirar
 * sozinho, e uma conta comprometida seguiria valendo por dias.
 */
async function autenticar(token) {
    const payload = verificar(token);

    if (!payload) {
        return null;
    }

    const { data: sessao, error } = await supabase
        .from(TABELA_SESSAO)
        .select("id, user_id, expires_at, revoked_at")
        .eq("token_hash", hashDoToken(token))
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (!sessao || sessao.revoked_at || new Date(sessao.expires_at) < new Date()) {
        return null;
    }

    const { data: usuario, error: erroUsuario } = await supabase
        .from(TABELA)
        .select(CAMPOS_PUBLICOS)
        .eq("id", sessao.user_id)
        .maybeSingle();

    if (erroUsuario) {
        throw erroUsuario;
    }

    // desativado no meio da sessão perde o acesso na requisição seguinte, sem
    // precisar esperar o token expirar
    if (!usuario || !usuario.is_active) {
        return null;
    }

    return { usuario: comPermissoes(usuario), sessaoId: sessao.id };
}

async function logout(token) {
    const { error } = await supabase
        .from(TABELA_SESSAO)
        .update({ revoked_at: new Date().toISOString() })
        .eq("token_hash", hashDoToken(token))
        .is("revoked_at", null);

    if (error) {
        throw error;
    }

    return { success: true };
}

async function listar() {
    const { data, error } = await supabase
        .from(TABELA)
        .select(CAMPOS_PUBLICOS)
        .eq("enterprise_id", enterprise.ENTERPRISE_ID)
        .order("created_at", { ascending: true });

    if (error) {
        throw error;
    }

    return (data ?? []).map(comPermissoes);
}

async function buscar(id) {
    const { data, error } = await supabase
        .from(TABELA)
        .select(CAMPOS_PUBLICOS)
        .eq("id", id)
        .eq("enterprise_id", enterprise.ENTERPRISE_ID)
        .maybeSingle();

    if (error) {
        throw error;
    }

    if (!data) {
        throw new NotFoundError("Usuário não encontrado");
    }

    return data;
}

/**
 * Quantos admins ativos existem além deste.
 *
 * É a trava contra a loja ficar sem ninguém que possa administrar: rebaixar ou
 * desativar o último admin deixaria a tela de usuários inalcançável para todo
 * mundo, e não há como consertar isso pela interface depois.
 */
async function outrosAdminsAtivos(id) {
    const { count, error } = await supabase
        .from(TABELA)
        .select("id", { count: "exact", head: true })
        .eq("enterprise_id", enterprise.ENTERPRISE_ID)
        .eq("role", "admin")
        .eq("is_active", true)
        .neq("id", id);

    if (error) {
        throw error;
    }

    return count ?? 0;
}

async function atualizar(id, { papel, ativo, nome, senha }) {
    const atual = await buscar(id);
    const patch = {};

    if (papel !== undefined) {
        if (!PAPEIS.includes(papel)) {
            throw new ValidationError(`Papel inválido: ${papel}. Use ${PAPEIS.join(" ou ")}.`);
        }
        patch.role = papel;
    }

    if (ativo !== undefined) {
        patch.is_active = Boolean(ativo);
    }

    if (nome !== undefined) {
        const limpo = String(nome ?? "").trim();

        // NOT NULL: nome apagado volta para a parte local do e-mail, nunca null
        patch.display_name = limpo || atual.email.split("@")[0];
    }

    if (senha !== undefined) {
        try {
            patch.password_hash = await hashSenha(senha);
        } catch (erro) {
            throw new ValidationError(erro.message);
        }
    }

    if (Object.keys(patch).length === 0) {
        throw new ValidationError("Nada para atualizar");
    }

    const deixaDeSerAdmin =
        (patch.role !== undefined && patch.role !== "admin") || patch.is_active === false;

    if (atual.role === "admin" && atual.is_active && deixaDeSerAdmin) {
        if ((await outrosAdminsAtivos(id)) === 0) {
            throw new ConflictError(
                "Este é o último admin ativo. Promova outra pessoa antes — senão ninguém mais consegue administrar a loja."
            );
        }
    }

    const { data, error } = await supabase
        .from(TABELA)
        .update(patch)
        .eq("id", id)
        .eq("enterprise_id", enterprise.ENTERPRISE_ID)
        .select(CAMPOS_PUBLICOS)
        .single();

    if (error) {
        throw error;
    }

    // trocar papel, desativar ou trocar senha derruba as sessões abertas: sem
    // isso a pessoa continuaria navegando com o acesso antigo até o token expirar
    await supabase
        .from(TABELA_SESSAO)
        .update({ revoked_at: new Date().toISOString() })
        .eq("user_id", id)
        .is("revoked_at", null);

    return comPermissoes(data);
}

export default {
    criar,
    login,
    logout,
    autenticar,
    listar,
    buscar,
    atualizar,
    contarUsuarios
};
