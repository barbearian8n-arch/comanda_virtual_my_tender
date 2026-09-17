import { createContext } from "react"

/**
 * Só o objeto de contexto.
 *
 * Separado do provider porque o Fast Refresh do Vite exige que um módulo de
 * componente exporte apenas componentes — contexto e hook no mesmo arquivo
 * fazem o recarregamento perder o estado a cada edição.
 */
export const AuthContext = createContext(null)
