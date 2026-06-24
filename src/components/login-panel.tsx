import { LockKeyhole } from "lucide-react";
import { login } from "@/app/actions";

export function LoginPanel() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 text-foreground">
      <form action={login} className="w-full max-w-sm rounded-md border border-zinc-800 bg-zinc-950 p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-zinc-100">
          <LockKeyhole className="h-4 w-4 text-emerald-300" />
          WalkCode
        </div>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          className="h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-600"
          placeholder="Dashboard password"
        />
        <button
          type="submit"
          className="mt-3 h-10 w-full rounded-md bg-emerald-500 px-3 text-sm font-medium text-black transition hover:bg-emerald-400"
        >
          Open Dashboard
        </button>
      </form>
    </main>
  );
}
