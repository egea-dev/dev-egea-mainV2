const GOOGLE_MAPS_HOSTS = [
  'www.google.com',
  'maps.google.com',
  'maps.app.goo.gl',
  'goo.gl',
];

export const isHttpUrl = (value: string): boolean => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const isGoogleMapsUrl = (value: string): boolean => {
  if (!isHttpUrl(value)) return false;
  try {
    const url = new URL(value);
    return GOOGLE_MAPS_HOSTS.some((host) => url.host.includes(host));
  } catch {
    return false;
  }
};

export const extractCoordinates = (value: string): string | null => {
  if (!value) return null;

  const coordinatePattern = /(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/;
  const match = value.match(coordinatePattern);
  if (match) {
    const [, lat, lng] = match;
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return `${latitude},${longitude}`;
    }
  }

  if (isHttpUrl(value)) {
    try {
      const url = new URL(value);

      const queryCandidates = [
        url.searchParams.get('query'),
        url.searchParams.get('destination'),
        url.searchParams.get('q'),
      ].filter(Boolean) as string[];

      for (const candidate of queryCandidates) {
        const coords = extractCoordinates(candidate);
        if (coords) return coords;
      }

      const pathCoords = extractCoordinates(url.pathname);
      if (pathCoords) return pathCoords;
    } catch {
      return null;
    }
  }

  return null;
};

const sanitizeLabel = (value: string): string => value.trim().replace(/\s+/g, ' ');

export const buildMapsSearchUrl = (value: string): string => {
  const trimmed = sanitizeLabel(value);
  if (!trimmed) return 'https://www.google.com/maps';

  if (isGoogleMapsUrl(trimmed)) {
    return trimmed;
  }

  if (isHttpUrl(trimmed)) {
    return trimmed;
  }

  const coords = extractCoordinates(trimmed);
  const query = coords ?? trimmed;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

export const buildMapsDirectionsUrl = (value: string): string => {
  const trimmed = sanitizeLabel(value);
  if (!trimmed) return 'https://www.google.com/maps';

  const coords = extractCoordinates(trimmed);
  if (coords) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(coords)}`;
  }

  if (isGoogleMapsUrl(trimmed) || isHttpUrl(trimmed)) {
    return trimmed;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(trimmed)}`;
};

export const formatLocationLabel = (value: string): string => sanitizeLabel(value);
