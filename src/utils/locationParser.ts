export interface LocationParts {
  area: string;
  row: string;
  bay: string;
  level: string;
  pos: string;
}

/**
 * Parses a location string (e.g., "A-01-01-1-A") into its individual components.
 * Returns default empty strings if a part is missing.
 */
export const parseLocationString = (location: string): LocationParts => {
  const parts = location.split('-');
  return {
    area: parts[0] || '',
    row: parts[1] || '',
    bay: parts[2] || '',
    level: parts[3] || '',
    pos: parts[4] || '',
  };
};

/**
 * Builds a location string (e.g., "A-01-01-1-A") from its individual components.
 * Returns an empty string if any required part is missing.
 */
export const buildLocationString = (parts: LocationParts): string => {
  if (!parts.area || !parts.row || !parts.bay || !parts.level || !parts.pos) {
    return '';
  }
  return `${parts.area}-${parts.row}-${parts.bay}-${parts.level}-${parts.pos}`;
};

/**
 * Extracts unique values for a specific part (area, row, bay, level, pos)
 * from a list of full location strings.
 */
export const getUniqueLocationParts = (locations: string[], part: keyof LocationParts): string[] => {
  const uniqueValues = new Set<string>();
  locations.forEach(location => {
    const parsed = parseLocationString(location);
    if (parsed[part]) {
      uniqueValues.add(parsed[part]);
    }
  });
  return Array.from(uniqueValues).sort();
};