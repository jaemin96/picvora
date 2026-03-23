export type ExifData = {
  make?: string;
  model?: string;
  latitude?: number;
  longitude?: number;
  dateTime?: string;
  exposureTime?: number;
  fNumber?: number;
  iso?: number;
  focalLength?: number;
  lensModel?: string;
};

export type LocationInfo = {
  address?: string;
  city?: string;
  country?: string;
  latitude: number;
  longitude: number;
};

export type PhotoAnalysis = {
  tags: string[];
  mood: string;
  shortcutMessage: string;
  nearbyPlaces: NearbyPlace[];
  directions?: string;
};

export type NearbyPlace = {
  name: string;
  category: "restaurant" | "cafe" | "attraction" | "landmark";
  distance?: string;
  description?: string;
};

export type PhotoCard = {
  id: string;
  imageUrl: string;
  exif: ExifData;
  location?: LocationInfo;
  analysis?: PhotoAnalysis;
  createdAt: string;
};
