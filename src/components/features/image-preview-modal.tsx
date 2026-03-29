"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw, RotateCw } from "lucide-react";

interface ImagePreviewModalProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export function ImagePreviewModal({ src, alt, onClose }: ImagePreviewModalProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const MIN_SCALE = 0.5;
  const MAX_SCALE = 5;

  const clampScale = (v: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, v));

  const resetView = useCallback(() => {
    setScale(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  }, []);

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // Wheel zoom
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setScale((s) => clampScale(s + delta * s));
  }, []);

  // Mouse drag
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    setIsDragging(true);
  };

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy });
  }, []);

  const onMouseUp = useCallback(() => {
    dragStart.current = null;
    setIsDragging(false);
  }, []);

  // Touch zoom + pan
  const touchStart = useRef<{ dist: number; scale: number; ox: number; oy: number } | null>(null);
  const singleTouch = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const dist = Math.hypot(dx, dy);
      touchStart.current = { dist, scale, ox: offset.x, oy: offset.y };
      singleTouch.current = null;
    } else if (e.touches.length === 1) {
      singleTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, ox: offset.x, oy: offset.y };
      touchStart.current = null;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 2 && touchStart.current) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const dist = Math.hypot(dx, dy);
      setScale(clampScale(touchStart.current.scale * (dist / touchStart.current.dist)));
    } else if (e.touches.length === 1 && singleTouch.current) {
      const ddx = e.touches[0].clientX - singleTouch.current.x;
      const ddy = e.touches[0].clientY - singleTouch.current.y;
      setOffset({ x: singleTouch.current.ox + ddx, y: singleTouch.current.oy + ddy });
    }
  };

  const onTouchEnd = () => {
    touchStart.current = null;
    singleTouch.current = null;
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      ref={containerRef}
      onClick={handleBackdropClick}
    >
      {/* 컨트롤 버튼 */}
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        <button
          onClick={() => setScale((s) => clampScale(s + 0.3))}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          title="확대"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={() => setScale((s) => clampScale(s - 0.3))}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          title="축소"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        {/* 회전 버튼 */}
        <button
          onClick={() => setRotation((r) => r - 90)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          title="왼쪽 회전"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          onClick={() => setRotation((r) => r + 90)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          title="오른쪽 회전"
        >
          <RotateCw className="h-4 w-4" />
        </button>
        {/* 초기화 */}
        <button
          onClick={resetView}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          title="초기화"
        >
          <span className="text-xs font-bold">1:1</span>
        </button>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          title="닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 배율 + 회전 표시 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white/70 backdrop-blur-sm">
        {Math.round(scale * 100)}%{rotation !== 0 && ` · ${((rotation % 360) + 360) % 360}°`}
      </div>

      {/* 이미지 */}
      <div
        className="relative select-none"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotation}deg)`,
          transformOrigin: "center",
          cursor: isDragging ? "grabbing" : scale > 1 ? "grab" : "default",
          transition: isDragging ? "none" : "transform 0.15s ease-out",
          willChange: "transform",
        }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt ?? "사진"}
          className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain shadow-2xl"
          draggable={false}
        />
      </div>
    </div>
  );
}
