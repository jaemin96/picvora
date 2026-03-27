"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, ImagePlus, Check, Share2, Crop, Globe, Users, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { usePhotoStore } from "@/stores/photo-store";
import { extractExifData } from "@/lib/exif";
import { EditableResultCard } from "./editable-result-card";
import { ImageCropEditor } from "./image-crop-editor";
import type { PhotoAnalysis, Visibility } from "@/types";
import { CLAUDE_MODELS, DEFAULT_MODEL, type ClaudeModelId } from "@/lib/claude-models";

const IS_DEV = process.env.NODE_ENV === "development";

const VISIBILITY_OPTIONS: { value: Visibility; label: string; icon: typeof Globe; desc: string }[] = [
  { value: "public", label: "전체 공개", icon: Globe, desc: "누구나 볼 수 있어요" },
  { value: "followers", label: "팔로워 공개", icon: Users, desc: "팔로워만 볼 수 있어요" },
  { value: "private", label: "나만 보기", icon: Lock, desc: "나만 볼 수 있어요" },
];

function SkeletonBlock({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      className={`bg-muted ${className ?? ""}`}
      style={style}
    />
  );
}

type Step = "upload" | "preview" | "analyzing" | "edit" | "publishing" | "done";

export function UploadFlow({
  onClose,
  onPublished,
}: {
  onClose: () => void;
  onPublished: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ClaudeModelId>(DEFAULT_MODEL);
  const [isConverting, setIsConverting] = useState(false);
  const [editedAnalysis, setEditedAnalysis] = useState<PhotoAnalysis | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showCropEditor, setShowCropEditor] = useState(false);

  const {
    uploadedPreview,
    extractedExif,
    address,
    visibility,
    setUploadedFile,
    setExtractedExif,
    setIsAnalyzing,
    setAnalysis,
    setAddress,
    setVisibility,
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

      if (isHeic) setIsConverting(true);

      try {
        const exif = await extractExifData(file);
        setExtractedExif(exif);
      } catch {
        setExtractedExif({});
      }

      let displayFile = file;
      if (isHeic) {
        try {
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
      setStep("preview");
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

  const handleCropApply = useCallback(
    (blob: Blob) => {
      const editedFile = new File(
        [blob],
        usePhotoStore.getState().uploadedFile?.name ?? "edited.jpg",
        { type: "image/jpeg" }
      );
      const preview = URL.createObjectURL(editedFile);
      setUploadedFile(editedFile, preview);
      setShowCropEditor(false);
    },
    [setUploadedFile]
  );

  const handleAnalyze = async () => {
    const file = usePhotoStore.getState().uploadedFile;
    if (!file) return;

    setStep("analyzing");
    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", file);
      const currentExif = usePhotoStore.getState().extractedExif;
      if (currentExif) formData.append("exif", JSON.stringify(currentExif));
      formData.append("model", selectedModel);

      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      if (!res.ok) throw new Error("분석에 실패했습니다.");

      const data = await res.json();
      setAnalysis(data.analysis);
      setEditedAnalysis(data.analysis);
      if (data.address) setAddress(data.address);
      if (data.exif && Object.keys(data.exif).length > 0) {
        setExtractedExif({
          ...usePhotoStore.getState().extractedExif,
          ...data.exif,
        });
      }
      setStep("edit");
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      setStep("preview");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePublish = async () => {
    const file = usePhotoStore.getState().uploadedFile;
    if (!editedAnalysis || !file) return;
    setStep("publishing");

    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("analysis", JSON.stringify(editedAnalysis));
      formData.append("visibility", visibility);
      if (extractedExif) formData.append("exif", JSON.stringify(extractedExif));
      if (address) formData.append("address", address);

      const res = await fetch("/api/publish", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? "게시에 실패했습니다.");
      }
      const data = await res.json();
      setShareId(data.shareId);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "게시 중 오류가 발생했습니다.");
      setStep("edit");
    }
  };

  const handleCopyLink = () => {
    if (!shareId) return;
    navigator.clipboard.writeText(`${window.location.origin}/share/${shareId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    const wasPublished = step === "done";
    reset();
    setStep("upload");
    setEditedAnalysis(null);
    setShareId(null);
    if (wasPublished) onPublished();
    else onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-semibold">
          {step === "upload" && "사진 업로드"}
          {step === "preview" && "사진 확인"}
          {step === "analyzing" && "AI 분석 중"}
          {step === "edit" && "내용 편집"}
          {step === "publishing" && "게시 중..."}
          {step === "done" && "게시 완료"}
        </h2>
        <button
          onClick={handleClose}
          className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* 컨텐츠 */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* 업로드 단계 */}
          {(step === "upload" || isConverting) && (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-4 p-8 min-h-[50vh]"
            >
              {isConverting ? (
                <motion.div
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                  className="flex items-center gap-2"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  <p className="text-sm font-medium text-muted-foreground">HEIC 변환 중...</p>
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                </motion.div>
              ) : (
                <>
                  <motion.div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                    animate={isDragging ? { scale: 1.03 } : { scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="relative w-full max-w-sm cursor-pointer"
                  >
                    {/* 드래그 중 글로우 효과 */}
                    <AnimatePresence>
                      {isDragging && (
                        <motion.div
                          key="glow"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 rounded-3xl bg-primary/20 blur-xl pointer-events-none"
                        />
                      )}
                    </AnimatePresence>

                    <div
                      className={`relative flex flex-col items-center justify-center gap-5 rounded-3xl border-2 p-12 transition-colors duration-200 ${
                        isDragging
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                      }`}
                    >
                      {/* 아이콘 */}
                      <motion.div
                        animate={isDragging ? { y: -4 } : { y: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className={`rounded-2xl p-5 transition-colors ${
                          isDragging ? "bg-primary/20" : "bg-muted"
                        }`}
                      >
                        <Upload className={`h-8 w-8 transition-colors ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                      </motion.div>

                      <div className="text-center">
                        <p className={`font-semibold transition-colors ${isDragging ? "text-primary" : "text-foreground"}`}>
                          {isDragging ? "여기에 놓으세요" : "사진을 드래그하거나 클릭"}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          AI가 장소와 분위기를 분석해드려요
                        </p>
                      </div>

                      {/* 파일 형식 칩 */}
                      <div className="flex gap-2">
                        {["JPG", "PNG", "HEIC"].map((fmt) => (
                          <span
                            key={fmt}
                            className="rounded-full border border-border bg-muted/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                          >
                            {fmt}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
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
                </>
              )}
            </motion.div>
          )}

          {/* 프리뷰 + 분석 버튼 */}
          {step === "preview" && uploadedPreview && (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 p-4"
            >
              <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border shadow-lg">
                <Image
                  src={uploadedPreview}
                  alt="업로드된 사진"
                  width={600}
                  height={400}
                  className="h-auto w-full object-cover"
                  unoptimized
                />
              </div>

              {extractedExif && Object.keys(extractedExif).length > 0 && (
                <div className="w-full max-w-lg rounded-xl border border-border bg-card p-4">
                  <p className="mb-2 text-sm font-medium text-muted-foreground">EXIF 정보</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {extractedExif.make && (
                      <div><span className="text-muted-foreground">카메라: </span>{extractedExif.make} {extractedExif.model}</div>
                    )}
                    {extractedExif.fNumber && (
                      <div><span className="text-muted-foreground">조리개: </span>f/{extractedExif.fNumber}</div>
                    )}
                    {extractedExif.exposureTime && (
                      <div>
                        <span className="text-muted-foreground">셔터: </span>
                        {extractedExif.exposureTime >= 1 ? `${extractedExif.exposureTime}s` : `1/${Math.round(1 / extractedExif.exposureTime)}s`}
                      </div>
                    )}
                    {extractedExif.iso && (
                      <div><span className="text-muted-foreground">ISO: </span>{extractedExif.iso}</div>
                    )}
                    {extractedExif.focalLength && (
                      <div><span className="text-muted-foreground">초점거리: </span>{extractedExif.focalLength}mm</div>
                    )}
                    {extractedExif.dateTime && (
                      <div><span className="text-muted-foreground">촬영일: </span>{new Date(extractedExif.dateTime).toLocaleDateString("ko-KR")}</div>
                    )}
                    {extractedExif.latitude && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">GPS: </span>
                        {extractedExif.latitude.toFixed(4)}, {extractedExif.longitude?.toFixed(4)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {IS_DEV && (
                <div className="w-full max-w-lg rounded-xl border border-dashed border-amber-400/60 bg-amber-50/10 p-3">
                  <p className="mb-2 text-xs font-medium text-amber-500">🛠 DEV — AI 모델 선택</p>
                  <div className="flex flex-col gap-1.5">
                    {(Object.entries(CLAUDE_MODELS) as [ClaudeModelId, string][]).map(([id, label]) => (
                      <label key={id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="claude-model"
                          value={id}
                          checked={selectedModel === id}
                          onChange={() => setSelectedModel(id)}
                          className="accent-amber-500"
                        />
                        <span className={`text-sm ${selectedModel === id ? "font-semibold text-amber-600" : "text-muted-foreground"}`}>
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="w-full max-w-lg flex gap-3">
                <Button
                  onClick={() => {
                    reset();
                    setStep("upload");
                  }}
                  variant="outline"
                  className="gap-2"
                  size="lg"
                >
                  <X className="h-4 w-4" />
                  다시 선택
                </Button>
                <Button
                  onClick={() => setShowCropEditor(true)}
                  variant="outline"
                  className="gap-2"
                  size="lg"
                >
                  <Crop className="h-4 w-4" />
                  편집
                </Button>
                <Button onClick={handleAnalyze} className="flex-1 gap-2" size="lg">
                  <ImagePlus className="h-4 w-4" />
                  AI로 분석하기
                </Button>
              </div>
            </motion.div>
          )}

          {/* 분석 중 - 스켈레톤 */}
          {step === "analyzing" && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 p-4"
            >
              {/* 분석 중 헤더 */}
              <motion.div
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                className="flex items-center gap-2 py-1"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <p className="text-sm font-medium text-muted-foreground">AI가 분석 중이에요</p>
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              </motion.div>

              <div className="w-full max-w-lg space-y-4">
                {/* 이미지 영역 스켈레톤 */}
                <SkeletonBlock className="h-52 w-full rounded-2xl" />

                {/* 감성 메시지 스켈레톤 */}
                <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
                  <SkeletonBlock className="h-3 w-8 mx-auto rounded-full" />
                  <SkeletonBlock className="h-5 w-3/4 mx-auto rounded-lg" />
                  <SkeletonBlock className="h-3.5 w-1/2 mx-auto rounded-lg" />
                </div>

                {/* 태그 스켈레톤 */}
                <div className="flex flex-wrap gap-2">
                  {[80, 64, 72, 56, 88].map((w, i) => (
                    <SkeletonBlock key={i} className={`h-7 rounded-full`} style={{ width: w }} />
                  ))}
                </div>

                {/* 주변 정보 스켈레톤 */}
                <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <SkeletonBlock className="h-4 w-4 rounded-md" />
                    <SkeletonBlock className="h-4 w-20 rounded-lg" />
                  </div>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
                      <SkeletonBlock className="h-8 w-8 rounded-lg shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <SkeletonBlock className="h-3.5 w-28 rounded" />
                        <SkeletonBlock className="h-3 w-40 rounded" />
                      </div>
                    </div>
                  ))}
                </div>

                {/* 카카오맵 스켈레톤 */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                    <SkeletonBlock className="h-4 w-4 rounded-md" />
                    <SkeletonBlock className="h-3.5 w-32 rounded" />
                  </div>
                  <SkeletonBlock className="h-48 w-full rounded-none" />
                  <div className="px-4 py-3 border-t border-border space-y-1.5">
                    <SkeletonBlock className="h-3 w-full rounded" />
                    <SkeletonBlock className="h-3 w-4/5 rounded" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 편집 단계 */}
          {step === "edit" && editedAnalysis && (
            <motion.div
              key="edit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 p-4"
            >
              <div className="w-full max-w-lg rounded-xl border border-dashed border-primary/30 bg-primary/5 px-4 py-2.5">
                <p className="text-xs text-primary/70 text-center">
                  텍스트를 클릭해서 편집하거나 태그를 추가/삭제할 수 있어요
                </p>
              </div>

              {uploadedPreview && (
                <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border shadow-md">
                  <Image
                    src={uploadedPreview}
                    alt="사진"
                    width={600}
                    height={300}
                    className="h-48 w-full object-cover"
                    unoptimized
                  />
                </div>
              )}

              <EditableResultCard
                analysis={editedAnalysis}
                onChange={setEditedAnalysis}
              />

              {/* 공개범위 선택 */}
              <div className="w-full max-w-lg">
                <p className="mb-2 text-sm font-medium text-muted-foreground">공개범위</p>
                <div className="flex gap-2">
                  {VISIBILITY_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const selected = visibility === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setVisibility(opt.value)}
                        className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 text-center transition-all ${
                          selected
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border bg-card text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-xs font-semibold">{opt.label}</span>
                        <span className="text-[10px] leading-tight opacity-70">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="w-full max-w-lg pb-8">
                <Button onClick={handlePublish} className="w-full gap-2" size="lg">
                  게시하기
                </Button>
              </div>
            </motion.div>
          )}

          {/* 게시 중 */}
          {step === "publishing" && (
            <motion.div
              key="publishing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 p-4"
            >
              <motion.div
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                className="flex items-center gap-2 py-1"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <p className="text-sm font-medium text-muted-foreground">게시 중이에요</p>
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              </motion.div>
              <div className="w-full max-w-lg space-y-4">
                <SkeletonBlock className="h-52 w-full rounded-2xl" />
                <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
                  <SkeletonBlock className="h-5 w-3/4 mx-auto rounded-lg" />
                  <SkeletonBlock className="h-3.5 w-1/2 mx-auto rounded-lg" />
                </div>
                <div className="flex gap-2">
                  {[80, 64, 72].map((w, i) => (
                    <SkeletonBlock key={i} className="h-7 rounded-full" style={{ width: w }} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* 완료 */}
          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-6 p-8 min-h-[50vh]"
            >
              <div className="rounded-full bg-green-100 p-5">
                <Check className="h-10 w-10 text-green-600" />
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">게시 완료!</p>
                <p className="mt-1 text-sm text-muted-foreground">목록에서 확인할 수 있어요</p>
              </div>
              <div className="flex w-full max-w-xs flex-col gap-3">
                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  className="w-full gap-2"
                >
                  {copied ? (
                    <><Check className="h-4 w-4 text-green-500" /> 링크 복사됨!</>
                  ) : (
                    <><Share2 className="h-4 w-4" /> 공유 링크 복사</>
                  )}
                </Button>
                <Button onClick={handleClose} className="w-full">
                  목록으로 돌아가기
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* 사진 편집 (crop/rotate) */}
      {showCropEditor && uploadedPreview && (
        <ImageCropEditor
          previewUrl={uploadedPreview}
          onApply={handleCropApply}
          onCancel={() => setShowCropEditor(false)}
          mode="photo"
        />
      )}
    </motion.div>
  );
}
