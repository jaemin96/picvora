export type ExifData = {
  make?: string;
  model?: string;
  software?: string;
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

export type TagType = "mood" | "location" | "time" | "subject" | "specialty";

export type Tag = {
  label: string;
  type: TagType;
};

export type NearbyPlace = {
  name: string;
  category: "restaurant" | "cafe" | "attraction" | "landmark";
  distance?: string;
  description?: string;
  address?: string;
};

export type PhotoAnalysis = {
  tags: Tag[];
  mood: string;
  shortcutMessage: string;
  nearbyPlaces: NearbyPlace[];
  specialties: string[];
  cameraInfo?: string;
  shootingTips?: string;
};

export type AnalyzeResponse = {
  exif: ExifData;
  location?: LocationInfo;
  analysis: PhotoAnalysis;
};

export type LocationResponse = {
  address: string;
  places: NearbyPlace[];
  specialties: string[];
};

export type Visibility = "public" | "followers" | "private";

export type PhotoCard = {
  id: string;
  imageUrl: string;
  exif: ExifData;
  location?: LocationInfo;
  analysis?: PhotoAnalysis;
  visibility: Visibility;
  createdAt: string;
};

export type SupportTicket = {
  id: string;
  user_id: string | null;
  email: string;
  name: string;
  message: string;
  status: "open" | "answered" | "closed";
  admin_reply: string | null;
  created_at: string;
  replied_at: string | null;
};
