import { create } from "zustand";
import type { PhotoCard } from "@/types";

type PhotoState = {
  photos: PhotoCard[];
  selectedPhoto: PhotoCard | null;
  isAnalyzing: boolean;
  addPhoto: (photo: PhotoCard) => void;
  setSelectedPhoto: (photo: PhotoCard | null) => void;
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  removePhoto: (id: string) => void;
};

export const usePhotoStore = create<PhotoState>((set) => ({
  photos: [],
  selectedPhoto: null,
  isAnalyzing: false,
  addPhoto: (photo) =>
    set((state) => ({ photos: [...state.photos, photo] })),
  setSelectedPhoto: (photo) => set({ selectedPhoto: photo }),
  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  removePhoto: (id) =>
    set((state) => ({ photos: state.photos.filter((p) => p.id !== id) })),
}));
