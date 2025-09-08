import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useOnboarding, Location } from "@/context/OnboardingContext"; // NEW: Import Location interface
import { showSuccess, showError } from "@/utils/toast";
import { XCircle } from "lucide-react";
import { parseLocationString, buildLocationString } from "@/utils/locationParser"; // NEW: Import location parsers

export interface LocationSetupStepProps { // Exported interface
  onNext: () => void;
  onBack: () => void;
}

const LocationSetupStep: React.FC<LocationSetupStepProps> = ({ onNext, onBack }) => {
  const { locations, addLocation, removeLocation } = useOnboarding();
  const [newLocationName, setNewLocationName] = useState("");

  const handleAddLocation = async () => { // NEW: Made async
    if (newLocationName.trim() === "") {
      showError("Location name cannot be empty.");
      return;
    }
    // Check if display name or full location string already exists
    const existingLocation = locations.find(loc => 
      loc.displayName?.toLowerCase() === newLocationName.trim().toLowerCase() ||
      loc.fullLocationString.toLowerCase() === newLocationName.trim().toLowerCase()
    );
    if (existingLocation) {
      showError("This location already exists.");
      return;
    }

    // For simplicity in onboarding, we'll try to parse it or use it as a display name
    const parsed = parseLocationString(newLocationName.trim());
    let fullLocationString = newLocationName.trim();
    let displayName = newLocationName.trim();

    // If it looks like a structured string, use it as such
    if (parsed.area && parsed.row && parsed.bay && parsed.level && parsed.pos) {
      fullLocationString = buildLocationString(parsed);
      displayName = newLocationName.trim(); // Keep display name as entered
    } else {
      // If not a structured string, assume it's just a display name, generate a simple structured string
      // This is a simplified approach for onboarding. In a full system, you'd guide the user to create structured locations.
      const baseName = newLocationName.trim().replace(/[^a-zA-Z0-9]/g, '');
      fullLocationString = `${baseName.substring(0,2).toUpperCase()}-01-01-1-A`;
      displayName = newLocationName.trim();
    }

    // Default color for new locations
    const defaultColor = "#4CAF50"; // Green

    const newLocation: Omit<Location, "id" | "createdAt" | "userId" | "organizationId"> = {
      fullLocationString,
      displayName,
      area: parsed.area || "N/A", // Fallback if not parsed
      row: parsed.row || "N/A",
      bay: parsed.bay || "N/A",
      level: parsed.level || "N/A",
      pos: parsed.pos || "N/A",
      color: defaultColor,
    };

    await addLocation(newLocation); // NEW: Call addLocation with structured object
    setNewLocationName("");
  };

  const handleRemoveLocation = async (locationId: string) => { // NEW: Takes ID
    await removeLocation(locationId); // NEW: Call removeLocation with ID
  };

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-2xl font-bold text-foreground">Warehouse & Location Setup</h2>
      <p className="text-muted-foreground">Define your inventory storage locations (e.g., Main Warehouse, Store Front, Bin A1).</p>

      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="newLocation">New Location Name</Label>
          <div className="flex gap-2">
            <Input
              id="newLocation"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              placeholder="e.g., Main Warehouse, Shelf A"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddLocation();
                }
              }}
            />
            <Button onClick={handleAddLocation}>Add</Button>
          </div>
        </div>

        {locations.length > 0 && (
          <div className="space-y-2">
            <Label>Current Locations</Label>
            <ul className="border border-border rounded-md p-3 bg-muted/20 max-h-40 overflow-y-auto">
              {locations.map((loc) => ( // Iterate over Location objects
                <li key={loc.id} className="flex items-center justify-between py-1 text-foreground">
                  <span>{loc.displayName || loc.fullLocationString}</span> {/* Display name or full string */}
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveLocation(loc.id)}> {/* Pass ID */}
                    <XCircle className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={onNext}>Next</Button>
      </div>
    </div>
  );
};

export default LocationSetupStep;