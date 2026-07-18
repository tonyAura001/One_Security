import { redirect } from "next/navigation";

/**
 * Entry point. Redirects into the app shell; the shell's route guard
 * forwards to the current demo role's own home screen if needed.
 */
export default function RootPage() {
  redirect("/dashboard");
}
