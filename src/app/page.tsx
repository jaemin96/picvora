import { Camera } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="flex items-center gap-3">
        <Camera className="h-10 w-10 text-primary" />
        <h1 className="text-4xl font-bold tracking-tight">Picvora</h1>
      </div>
      <p className="max-w-md text-center text-muted-foreground">
        사진 한 장으로 그 장소의 맥락을 추출하고,
        <br />
        AI가 자동으로 태그와 정보 카드를 생성합니다.
      </p>
    </main>
  );
}
