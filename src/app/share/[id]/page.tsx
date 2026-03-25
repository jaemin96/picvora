import { notFound } from "next/navigation";
import { Camera } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ShareView } from "@/components/features/share-view";

export default async function SharePage({
  params,
}: {
  params: { id: string };
}) {
  const { data, error } = await supabase
    .from("photo_cards")
    .select("*")
    .eq("share_id", params.id)
    .single();

  if (error || !data) notFound();

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 px-4 py-12 sm:px-8">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5">
          <Camera className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Picvora</h1>
      </div>
      <ShareView card={data} />
    </main>
  );
}
