/**
 * STUB PRÉSENTATIONNEL — remplace le vrai client Supabase.
 * ────────────────────────────────────────────────────────────
 * Ce fichier NE contient AUCUN secret, AUCUNE URL, AUCUN appel réseau.
 * Il expose la même surface d'API que `@supabase/ssr` mais toutes les
 * requêtes se résolvent à un résultat neutre `{ data: null, error: null }`.
 * Les écrans copiés conservent donc leur logique de chargement d'origine,
 * mais ne récupèrent aucune donnée réelle : ils affichent leurs états
 * « vide » / « chargement ».
 *
 * Le builder est TYPÉ (interface `Chain`) afin que les callbacks
 * `.then(({ data, error }) => …)` gardent un typage contextuel et que les
 * écrans compilent sans modification.
 *
 * TODO(intégration): brancher données réelles.
 *   → Remplacez ce fichier par votre vrai client (Supabase, REST, tRPC…)
 *     OU passez des données en props aux écrans (voir MANIFEST.md).
 */

interface QueryResult {
  data: any
  error: any
  count: number
  status: number
  statusText: string
}

// Builder chaînable ET « thenable ». Toutes les méthodes renvoient un Chain ;
// `then` est typé pour fournir un contexte aux callbacks.
interface Chain extends PromiseLike<QueryResult> {
  select(...a: any[]): Chain
  insert(...a: any[]): Chain
  update(...a: any[]): Chain
  upsert(...a: any[]): Chain
  delete(...a: any[]): Chain
  eq(...a: any[]): Chain
  neq(...a: any[]): Chain
  gt(...a: any[]): Chain
  gte(...a: any[]): Chain
  lt(...a: any[]): Chain
  lte(...a: any[]): Chain
  like(...a: any[]): Chain
  ilike(...a: any[]): Chain
  is(...a: any[]): Chain
  in(...a: any[]): Chain
  or(...a: any[]): Chain
  not(...a: any[]): Chain
  filter(...a: any[]): Chain
  match(...a: any[]): Chain
  contains(...a: any[]): Chain
  containedBy(...a: any[]): Chain
  overlaps(...a: any[]): Chain
  range(...a: any[]): Chain
  order(...a: any[]): Chain
  limit(...a: any[]): Chain
  single(...a: any[]): Chain
  maybeSingle(...a: any[]): Chain
  csv(...a: any[]): Chain
  throwOnError(...a: any[]): Chain
  abortSignal(...a: any[]): Chain
  on(...a: any[]): Chain
  subscribe(...a: any[]): Chain
  unsubscribe(...a: any[]): Chain
  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2>
  [key: string]: any
}

const NOOP_RESULT: QueryResult = {
  data: null,
  error: null,
  count: 0,
  status: 200,
  statusText: 'OK',
}

function chain(): Chain {
  return new Proxy(function () {}, {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (v: QueryResult) => unknown) => resolve(NOOP_RESULT)
      }
      if (prop === 'unsubscribe') return () => {}
      if (prop === 'data') return null
      if (prop === 'error') return null
      return (..._args: unknown[]) => chain()
    },
    apply() {
      return chain()
    },
  }) as unknown as Chain
}

// `auth` accepte n'importe quelle méthode (signInWithPassword, signUp,
// verifyOtp, updateUser, resetPasswordForEmail, exchangeCodeForSession…).
// Les méthodes courantes sont typées pour donner un contexte aux callbacks
// `.then(({ data }) => …)` / `onAuthStateChange(event => …)` ; le reste passe
// par l'index signature.
interface AuthStub {
  getUser(): Promise<{ data: { user: any }; error: any }>
  getSession(): Promise<{ data: { session: any }; error: any }>
  signOut(): Promise<{ error: any }>
  onAuthStateChange(
    cb?: (event: string, session: any) => void
  ): { data: { subscription: { unsubscribe(): void } } }
  [key: string]: any
}

const auth: AuthStub = new Proxy(
  {
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: (_cb?: unknown) => ({
      data: { subscription: { unsubscribe() {} } },
    }),
  },
  {
    get(target: any, prop: string) {
      if (prop in target) return target[prop]
      return async (..._args: unknown[]) => ({ data: null, error: null })
    },
  }
)

export function createClient() {
  return {
    from: (_table: string): Chain => chain(),
    rpc: (_fn: string, _params?: unknown): Chain => chain(),
    // `channel` renvoie `any` : certains écrans annotent la variable comme
    // `RealtimeChannel`. `any` reste assignable sans tirer @supabase en dép.
    channel: (_name: string): any => chain(),
    removeChannel: (_c?: unknown) => {},
    storage: { from: (_bucket: string): Chain => chain() },
    auth,
  }
}
