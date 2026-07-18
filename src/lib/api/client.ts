/**
 * Simulated async transport. Every read goes through `simulate`, so the
 * whole app already treats data as remote/asynchronous. Swapping the demo
 * fixtures for Supabase later means changing only the service functions —
 * never the screens.
 */

const DEFAULT_DELAY = 280;

export async function simulate<T>(data: T, delay = DEFAULT_DELAY): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, delay));
  return data;
}
