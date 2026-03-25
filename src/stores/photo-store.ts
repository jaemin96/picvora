import { create } from "zustand";
import type { PhotoCard, ExifData, PhotoAnalysis } from "@/types";

type PhotoState = {
  photos: PhotoCard[];
  selectedPhoto: PhotoCard | null;
  isAnalyzing: boolean;
  uploadedFile: File | null;
  uploadedPreview: string | null;
  extractedExif: ExifData | null;
  analysis: PhotoAnalysis | null;
  address: string | null;
  error: string | null;

  addPhoto: (photo: PhotoCard) => void;
  setSelectedPhoto: (photo: PhotoCard | null) => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  removePhoto: (id: string) => void;
  setUploadedFile: (file: File | null, preview: string | null) => void;
  setExtractedExif: (exif: ExifData | null) => void;
  setAnalysis: (analysis: PhotoAnalysis | null) => void;
  setAddress: (address: string | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
};

export const usePhotoStore = create<PhotoState>((set) => ({
  photos: [],
  selectedPhoto: null,
  isAnalyzing: false,
  uploadedFile: null,
  uploadedPreview: null,
  extractedExif: null,
  analysis: null,
  address: null,
  error: null,

  addPhoto: (photo) =>
    set((state) => ({ photos: [...state.photos, photo] })),
  setSelectedPhoto: (photo) => set({ selectedPhoto: photo }),
  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  removePhoto: (id) =>
    set((state) => ({ photos: state.photos.filter((p) => p.id !== id) })),
  setUploadedFile: (file, preview) =>
    set({ uploadedFile: file, uploadedPreview: preview }),
  setExtractedExif: (exif) => set({ extractedExif: exif }),
  setAnalysis: (analysis) => set({ analysis }),
  setAddress: (address) => set({ address }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      uploadedFile: null,
      uploadedPreview: null,
      extractedExif: null,
      analysis: null,
      address: null,
      error: null,
      isAnalyzing: false,
    }),
}));
