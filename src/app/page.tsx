import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await auth();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Fluuy</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Logado como {session?.user?.email}
        {session?.user?.isPlatformAdmin ? " (platform admin)" : ""}
      </p>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <Button type="submit" variant="outline">
          Sair
        </Button>
      </form>
    </main>
  );
}
