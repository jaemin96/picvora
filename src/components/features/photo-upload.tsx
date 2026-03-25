"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, ImagePlus, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { usePhotoStore } from "@/stores/photo-store";
import { extractExifData } from "@/lib/exif";

export function PhotoUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const {
    uploadedPreview,
    extractedExif,
    isAnalyzing,
    setUploadedFile,
    setExtractedExif,
    setIsAnalyzing,
    setAnalysis,
    setAddress,
    setError,
    reset,
  } = usePhotoStore();

  const handleFile = useCallback(
    async (file: File) => {
      const isHeicByName =
        file.name.toLowerCase().endsWith(".heic") ||
        file.name.toLowerCase().endsWith(".heif");
      if (!file.type.startsWith("image/") && !isHeicByName) {
        setError("이미지 파일만 업로드할 수 있습니다.");
        return;
      }

      setError(null);

      const isHeic =
        file.type === "image/heic" ||
        file.type === "image/heif" ||
        isHeicByName;

      // HEIC 변환 시 로딩 표시
      if (isHeic) setIsConverting(true);

      // EXIF는 원본 파일에서 추출
      try {
        const exif = await extractExifData(file);
        setExtractedExif(exif);
      } catch {
        setExtractedExif({});
      }

      let displayFile = file;
      if (isHeic) {
        try {
          // 런타임에 동적 import (SSR 완전 회피)
          const heic2any = (await import("heic2any")).default;
          const blob = (await heic2any({
            blob: file,
            toType: "image/jpeg",
            quality: 0.9,
          })) as Blob;
          displayFile = new File(
            [blob],
            file.name.replace(/\.(heic|heif)$/i, ".jpg"),
            { type: "image/jpeg" }
          );
        } catch {
          setError("HEIC 파일 변환에 실패했습니다.");
          setIsConverting(false);
          return;
        } finally {
          setIsConverting(false);
        }
      }

      const preview = URL.createObjectURL(displayFile);
      setUploadedFile(isHeic ? displayFile : file, preview);
    },
    [setUploadedFile, setExtractedExif, setError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleAnalyze = async () => {
    const file = usePhotoStore.getState().uploadedFile;
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const currentExif = usePhotoStore.getState().extractedExif;
      if (currentExif) {
        formData.append("exif", JSON.stringify(currentExif));
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("분석에 실패했습니다. 다시 시도해주세요.");
      }

      const data = await res.json();
      setAnalysis(data.analysis);
      if (data.address) setAddress(data.address);
      if (data.exif && Object.keys(data.exif).length > 0) {
        setExtractedExif({
          ...usePhotoStore.getState().extractedExif,
          ...data.exif,
        });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // HEIC 변환 중 로딩 화면
  if (isConverting) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-lg"
      >
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-center">
            <p className="font-medium">HEIC 변환 중...</p>
            <p className="mt-1 text-sm text-muted-foreground">잠시만 기다려주세요</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (uploadedPreview) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg space-y-4"
      >
        <div className="relative overflow-hidden rounded-2xl border border-border shadow-lg">
          <Image
            src={uploadedPreview}
            alt="업로드된 사진"
            width={600}
            height={400}
            className="h-auto w-full object-cover"
            unoptimized
          />
          <button
            onClick={reset}
            className="absolute right-3 top-3 rounded-full bg-black/50 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {extractedExif && Object.keys(extractedExif).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-card p-4"
          >
            <p className="mb-2 text-sm font-medium text-muted-foreground">
              EXIF 정보
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {extractedExif.make && (
                <div>
                  <span className="text-muted-foreground">카메라: </span>
                  {extractedExif.make} {extractedExif.model}
                </div>
              )}
              {extractedExif.fNumber && (
                <div>
                  <span className="text-muted-foreground">조리개: </span>f/
                  {extractedExif.fNumber}
                </div>
              )}
              {extractedExif.exposureTime && (
                <div>
                  <span className="text-muted-foreground">셔터: </span>
                  {extractedExif.exposureTime >= 1
                    ? `${extractedExif.exposureTime}s`
                    : `1/${Math.round(1 / extractedExif.exposureTime)}s`}
                </div>
              )}
              {extractedExif.iso && (
                <div>
                  <span className="text-muted-foreground">ISO: </span>
                  {extractedExif.iso}
                </div>
              )}
              {extractedExif.focalLength && (
                <div>
                  <span className="text-muted-foreground">초점거리: </span>
                  {extractedExif.focalLength}mm
                </div>
              )}
              {extractedExif.dateTime && (
                <div>
                  <span className="text-muted-foreground">촬영일: </span>
                  {new Date(extractedExif.dateTime).toLocaleDateString("ko-KR")}
                </div>
              )}
              {extractedExif.latitude && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">GPS: </span>
                  {extractedExif.latitude.toFixed(4)},{" "}
                  {extractedExif.longitude?.toFixed(4)}
                </div>
              )}
            </div>
          </motion.div>
        )}

        <Button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          size="lg"
        >
          {isAnalyzing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="mr-2 h-4 w-4" />
          )}
          {isAnalyzing ? "AI가 분석 중..." : "AI로 분석하기"}
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-lg"
    >
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-12 transition-all ${
          isDragging
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        }`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={isDragging ? "drag" : "idle"}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="rounded-full bg-primary/10 p-4"
          >
            <Upload className="h-8 w-8 text-primary" />
          </motion.div>
        </AnimatePresence>
        <div className="text-center">
          <p className="font-medium">
            {isDragging ? "여기에 놓으세요!" : "사진을 드래그하거나 클릭하세요"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            JPG, PNG, HEIC 지원
          </p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </motion.div>
  );
}
