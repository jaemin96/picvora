import { notFound } from "next/navigation";
import { ArrowLeft, Camera, Pencil, Eye } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ShareView } from "@/components/features/share-view";
import { LikeButton } from "@/components/features/like-button";
import { formatCount } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CardDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("photo_cards")
    .select("*")
    .eq("share_id", params.id)
    .single();

  if (error || !data) notFound();

  // 조회수 증가 (RPC로 atomic increment, RLS 우회)
  const { data: rpcCount } = await supabase.rpc("increment_view_count", {
    card_share_id: params.id,
  });
  const newCount = rpcCount ?? (data.view_count ?? 0) + 1;

  const isOwner = user?.id === data.user_id;

  return (
    <main className="flex min-h-screen flex-col">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
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
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Eye className="h-3.5 w-3.5" />
              <span>{formatCount(newCount)}</span>
            </div>
            <LikeButton cardId={params.id} size="lg" />
            {isOwner && (
              <Link
                href={`/cards/${params.id}/edit`}
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
                수정
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-lg px-4 py-6">
        <ShareView card={data} />
      </div>
    </main>
  );
}
