import { notFound } from "next/navigation";
import { ArrowLeft, Camera } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ShareView } from "@/components/features/share-view";

export default async function CardDetailPage({
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
    <main className="flex min-h-screen flex-col">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            href="/"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-1">
              <Camera className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold">Picvora</span>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-lg px-4 py-6">
        <ShareView card={data} />
      </div>
    </main>
  );
}
