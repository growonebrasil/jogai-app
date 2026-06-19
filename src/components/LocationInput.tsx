import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2, X } from "lucide-react";

export interface LocationData {
  location_name: string;
  full_address: string;
  latitude: number | null;
  longitude: number | null;
}

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface LocationInputProps {
  value: LocationData;
  onChange: (data: LocationData) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function LocationInput({
  value,
  onChange,
  placeholder = "Buscar local...",
  className,
  disabled,
}: LocationInputProps) {
  const [query, setQuery] = useState(value.location_name || "");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const autocompleteService = useRef<any>(null);
  const placesService = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dummyDiv = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => {
      const g = (window as any).google;
      if (g?.maps?.places) {
        autocompleteService.current = new g.maps.places.AutocompleteService();
        if (dummyDiv.current) {
          placesService.current = new g.maps.places.PlacesService(dummyDiv.current);
        }
        setGoogleReady(true);
      }
    };
    check();
    const timer = setTimeout(check, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const searchPlaces = useCallback(
    (input: string) => {
      if (!googleReady || !autocompleteService.current || input.length < 3) {
        setPredictions([]);
        return;
      }
      setLoading(true);
      autocompleteService.current.getPlacePredictions(
        { input, types: ["establishment", "geocode"], componentRestrictions: { country: "br" } },
        (results: any[] | null, status: string) => {
          setLoading(false);
          if (status === "OK" && results) {
            setPredictions(results);
            setShowDropdown(true);
          } else {
            setPredictions([]);
          }
        }
      );
    },
    [googleReady]
  );

  const handleSelect = (prediction: Prediction) => {
    if (!placesService.current) return;
    placesService.current.getDetails(
      { placeId: prediction.place_id, fields: ["name", "formatted_address", "geometry"] },
      (place: any, status: string) => {
        if (status === "OK" && place) {
          const data: LocationData = {
            location_name: place.name || prediction.structured_formatting.main_text,
            full_address: place.formatted_address || prediction.description,
            latitude: place.geometry?.location?.lat() || null,
            longitude: place.geometry?.location?.lng() || null,
          };
          onChange(data);
          setQuery(data.location_name);
          setShowDropdown(false);
        }
      }
    );
  };

  const handleInputChange = (text: string) => {
    setQuery(text);
    if (googleReady) {
      searchPlaces(text);
    }
    onChange({
      location_name: text,
      full_address: text,
      latitude: value.latitude,
      longitude: value.longitude,
    });
  };

  const handleClear = () => {
    setQuery("");
    setPredictions([]);
    onChange({ location_name: "", full_address: "", latitude: null, longitude: null });
  };

  return (
    <div ref={containerRef} className="relative">
      <div ref={dummyDiv} className="hidden" />
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          className={`pl-9 pr-8 bg-secondary/50 border-border ${className || ""}`}
          disabled={disabled}
          maxLength={200}
        />
        {query && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showDropdown && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          {loading && (
            <div className="flex items-center gap-2 px-3 py-2 text-muted-foreground text-sm">
              <Loader2 className="w-3 h-3 animate-spin" /> Buscando...
            </div>
          )}
          {predictions.map((p) => (
            <button
              key={p.place_id}
              type="button"
              onClick={() => handleSelect(p)}
              className="w-full text-left px-3 py-2.5 hover:bg-secondary/80 transition-colors border-b border-border last:border-0"
            >
              <p className="text-sm font-medium text-foreground truncate">{p.structured_formatting.main_text}</p>
              <p className="text-xs text-muted-foreground truncate">{p.structured_formatting.secondary_text}</p>
            </button>
          ))}
        </div>
      )}

      {value.full_address && value.latitude && (
        <p className="text-xs text-muted-foreground mt-1 truncate">📍 {value.full_address}</p>
      )}
    </div>
  );
}
