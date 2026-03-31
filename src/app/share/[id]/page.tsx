import { notFound } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { ShareView } from "@/components/features/share-view";

export default async function SharePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("photo_cards")
    .select("*")
    .eq("share_id", params.id)
    .single();

  if (error || !data) notFound();

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 px-4 py-12 sm:px-8">
      <div className="flex items-center">
        <Image src="/picvora-logo-dark.svg" alt="Picvora" width={140} height={42} className="hidden dark:block" priority />
        <Image src="/picvora-logo-light.svg" alt="Picvora" width={140} height={42} className="block dark:hidden" priority />
      </div>
      <ShareView card={data} />
    </main>
  );
}
