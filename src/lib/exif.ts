import exifr from "exifr";
import type { ExifData } from "@/types";

export async function extractExifData(file: File): Promise<ExifData> {
  const raw = await exifr.parse(file, {
    pick: [
      "Make",
      "Model",
      "GPSLatitude",
      "GPSLongitude",
      "DateTimeOriginal",
      "ExposureTime",
      "FNumber",
      "ISO",
      "FocalLength",
      "LensModel",
    ],
    gps: true,
  });

  if (!raw) return {};

  return {
    make: raw.Make,
    model: raw.Model,
    latitude: raw.latitude,
    longitude: raw.longitude,
    dateTime: raw.DateTimeOriginal?.toISOString?.() ?? raw.DateTimeOriginal,
    exposureTime: raw.ExposureTime,
    fNumber: raw.FNumber,
    iso: raw.ISO,
    focalLength: raw.FocalLength,
    lensModel: raw.LensModel,
  };
}
