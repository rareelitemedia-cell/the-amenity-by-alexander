export interface PlacesData {
  rating?: number;
  reviewCount?: number;
  mapsUrl?: string;
  website?: string | null;
  photoUrl?: string | null;
  lat?: number;
  lng?: number;
  priceLevel?: string;
}

export interface ItineraryItem {
  time: string;
  activity: string;
  description: string;
  location: string;
  priceRange?: string;
  travelTime?: string;
  type: 'attraction' | 'restaurant' | 'activity' | 'travel';
  menuUrl?: string;
  bookingUrl?: string;
  walkingTime?: string;
  drivingTime?: string;
  placesQuery?: string;
  places?: PlacesData;
}

export interface DayPlan {
  day: number;
  theme?: string;
  items: ItineraryItem[];
}

export interface ItineraryResponse {
  city: string;
  zone?: string;
  type: string;
  budget: string;
  duration: number;
  itinerary: DayPlan[];
  thoughtProcess?: string[];
}

export interface FormValues {
  city: string;
  zone: string;
  type: string;
  days: number;
  budget: string;
  thinking: boolean;
  customPrompt: string;
}
