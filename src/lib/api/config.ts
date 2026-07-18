/**
 * Base URL de l'API backend (NestJS). Isolée du client Axios pour être
 * importable côté serveur (DAL) sans embarquer la dépendance HTTP navigateur.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
