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

export type DirectionInfo = {
  currentLocation: string;    // 현재 위치명 (예: 광양 배알도 수변공원)
  howToGet: string;           // 오는 방법 (대중교통/자차)
};

export type PhotoAnalysis = {
  tags: Tag[];
  mood: string;
  shortcutMessage: string;
  nearbyPlaces: NearbyPlace[];
  specialties: string[];
  directions?: DirectionInfo;
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
