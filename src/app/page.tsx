"use client";

import { Camera } from "lucide-react";
import { PhotoUpload } from "@/components/features/photo-upload";
import { ResultCard } from "@/components/features/result-card";
import { usePhotoStore } from "@/stores/photo-store";
import { AnimatePresence, motion } from "framer-motion";

export default function Home() {
  const { analysis, error } = usePhotoStore();

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 px-4 py-12 sm:px-8">
      {/* 헤더 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <Camera className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Picvora
          </h1>
        </div>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          사진 한 장으로 그 장소의 맥락을 추출하고,
          <br />
          AI가 자동으로 태그와 정보 카드를 생성합니다.
        </p>
      </motion.div>

      {/* 업로드 영역 */}
      <PhotoUpload />

      {/* 에러 메시지 */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm text-destructive"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* 분석 결과 */}
      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <ResultCard analysis={analysis} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
