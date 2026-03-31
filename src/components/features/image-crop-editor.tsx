"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactCrop, {
  type Crop,
  type PixelCrop,
  centerCrop,
  makeAspectCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { RotateCcw, RotateCw, Crop as CropIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type ImageCropEditorProps = {
  previewUrl: string;
  onApply: (blob: Blob) => void;
  onCancel: () => void;
  /** "avatar" = 원형 1:1 512px, "photo" = 자유 비율 원본 해상도 */
  mode?: "avatar" | "photo";
};

export function ImageCropEditor({
  previewUrl,
  onApply,
  onCancel,
  mode = "avatar",
}: ImageCropEditorProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [rotation, setRotation] = useState(0);
  const [rotatedSrc, setRotatedSrc] = useState(previewUrl);
  const [isProcessing, setIsProcessing] = useState(false);

  // 회전할 때마다 canvas로 미리 적용 → ReactCrop이 이미 회전된 이미지를 보게 함
  useEffect(() => {
    if (rotation === 0) {
      setRotatedSrc(previewUrl);
      return;
    }
    const img = new window.Image();
    img.onload = () => {
      const isOdd90 = rotation % 180 !== 0;
      const canvas = document.createElement("canvas");
      canvas.width = isOdd90 ? img.height : img.width;
      canvas.height = isOdd90 ? img.width : img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      setRotatedSrc(canvas.toDataURL("image/jpeg", 0.92));
      // 이미지 크기가 바뀌므로 crop 초기화
      setCrop(undefined);
      setCompletedCrop(undefined);
    };
    img.src = previewUrl;
  }, [rotation, previewUrl]);

  const isPhoto = mode === "photo";

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    if (isPhoto) {
      // photo 모드: 전체 영역 선택
      setCrop({ unit: "px", x: 0, y: 0, width, height });
    } else {
      const size = Math.min(width, height);
      const initialCrop = centerCrop(
        makeAspectCrop({ unit: "px", width: size * 0.9 }, 1, width, height),
        width,
        height
      );
      setCrop(initialCrop);
    }
  }, [isPhoto]);

  const handleRotate = (dir: "cw" | "ccw") => {
    setRotation((prev) => (prev + (dir === "cw" ? 90 : -90) + 360) % 360);
  };

  const handleApply = useCallback(async () => {
    const img = imgRef.current;
    if (!img) return;

    setIsProcessing(true);
    try {
      const scaleX = img.naturalWidth / img.width;
      const scaleY = img.naturalHeight / img.height;

      let srcX: number, srcY: number, srcW: number, srcH: number;
      if (completedCrop && completedCrop.width > 0 && completedCrop.height > 0) {
        srcX = completedCrop.x * scaleX;
        srcY = completedCrop.y * scaleY;
        srcW = completedCrop.width * scaleX;
        srcH = completedCrop.height * scaleY;
      } else if (isPhoto) {
        srcX = 0;
        srcY = 0;
        srcW = img.naturalWidth;
        srcH = img.naturalHeight;
      } else {
        const size = Math.min(img.naturalWidth, img.naturalHeight);
        srcX = (img.naturalWidth - size) / 2;
        srcY = (img.naturalHeight - size) / 2;
        srcW = size;
        srcH = size;
      }

      // avatar: 정사각형 512px, photo: 원본 해상도 유지
      // rotatedSrc에 이미 회전이 적용돼 있으므로 rotation 변환 불필요
      const outW = isPhoto ? srcW : 512;
      const outH = isPhoto ? srcH : 512;
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH);

      await new Promise<void>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error("toBlob failed")); return; }
            onApply(blob);
            resolve();
          },
          "image/jpeg",
          0.9
        );
      });
    } finally {
      setIsProcessing(false);
    }
  }, [completedCrop, rotation, onApply, isPhoto]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* 헤더 */}
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-semibold">{isPhoto ? "사진 편집" : "프로필 사진 편집"}</h2>
        <button
          onClick={onCancel}
          className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          disabled={isProcessing}
        >
          ✕
        </button>
      </div>

      {/* 이미지 영역 */}
      <div className="flex flex-1 items-center justify-center overflow-hidden p-4">
        <ReactCrop
          crop={crop}
          onChange={(c) => setCrop(c)}
          onComplete={(c) => setCompletedCrop(c)}
          {...(isPhoto ? {} : { aspect: 1, circularCrop: true })}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={rotatedSrc}
            alt="프로필 사진 편집"
            onLoad={onImageLoad}
            style={{ maxHeight: "50vh", maxWidth: "100%" }}
          />
        </ReactCrop>
      </div>

      {/* 하단 고정 컨트롤 바 */}
      <div className="shrink-0 border-t border-border bg-background px-4 pt-3 pb-6 space-y-3">
        <p className="text-xs text-muted-foreground text-center">
          {isPhoto ? "영역을 드래그해서 자르거나 회전할 수 있어요" : "원형 영역을 드래그해서 조정하세요"}
        </p>

        {/* 회전 버튼 */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => handleRotate("ccw")}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors disabled:opacity-40"
            disabled={isProcessing}
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">반시계</span>
          </button>
          <span className="w-10 text-center text-sm tabular-nums text-muted-foreground">{rotation}°</span>
          <button
            onClick={() => handleRotate("cw")}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors disabled:opacity-40"
            disabled={isProcessing}
          >
            <RotateCw className="h-4 w-4" />
            <span className="hidden sm:inline">시계</span>
          </button>
        </div>

        {/* 취소 / 적용 */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={isProcessing}
          >
            취소
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={handleApply}
            disabled={isProcessing}
          >
            <CropIcon className="h-4 w-4" />
            {isProcessing ? "처리 중..." : "적용"}
          </Button>
        </div>
      </div>
    </div>
  );
}
