import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusCircle, Trash2, MapPin, QrCode, Printer, Edit } from "lucide-react"; // NEW: Import Edit icon
import { showError, showSuccess } from "@/utils/toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useOnboarding, Location } from "@/context/OnboardingContext"; // NEW: Import Location interface
import { usePrint, PrintContentData } from "@/context/PrintContext";
import LocationLabelGenerator from "@/components/LocationLabelGenerator"; // Import the new component
import { parseLocationString, LocationParts } from "@/utils/locationParser"; // NEW: Import parseLocationString and LocationParts
import LocationInventoryViewDialog from "@/components/LocationInventoryViewDialog"; // NEW: Import LocationInventoryViewDialog
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"; // NEW: Import Dialog components

// Predefined colors for labels, matching some of the designs
const labelColors = [
  { name: "Green", hex: "#4CAF50" },
  { name: "Blue", hex: "#2196F3" },
  { name: "Purple", hex: "#9C27B0" },
  { name: "Yellow", hex: "#FFEB3B" },
  { name: "Red", hex: "#F44336" },
  { name: "Orange", hex: "#FF9800" },
];

const Locations: React.FC = () => {
  const { locations, addLocation, updateLocation, removeLocation } = useOnboarding();
  const { initiatePrint } = usePrint();

  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null); // NEW: Store full Location object

  const [isLocationLabelGeneratorOpen, setIsLocationLabelGeneratorOpen] = useState(false); // NEW: State for generator dialog
  const [locationToEdit, setLocationToEdit] = useState<Location | null>(null); // NEW: Store Location object for editing

  const [isLocationInventoryViewDialogOpen, setIsLocationInventoryViewDialogOpen] = useState(false);
  const [locationToViewInventory, setLocationToViewInventory] = useState<string | null>(null);

  const handleAddLocationClick = () => {
    setLocationToEdit(null); // Clear for new location
    setIsLocationLabelGeneratorOpen(true);
  };

  const handleEditLocationClick = (location: Location) => { // NEW: Pass full Location object
    setLocationToEdit(location);
    setIsLocationLabelGeneratorOpen(true);
  };

  const handleDeleteLocationClick = (location: Location) => { // NEW: Pass full Location object
    setLocationToDelete(location);
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmRemoveLocation = async () => { // NEW: Async function
    if (locationToDelete) {
      await removeLocation(locationToDelete.id); // NEW: Pass ID to removeLocation
      if (locationToViewInventory === locationToDelete.fullLocationString) {
        setLocationToViewInventory(null);
        setIsLocationInventoryViewDialogOpen(false);
      }
    }
    setIsConfirmDeleteDialogOpen(false);
    setLocationToDelete(null);
  };

  const handleViewInventoryClick = (locationString: string) => { // Now takes fullLocationString
    setLocationToViewInventory(locationString);
    setIsLocationInventoryViewDialogOpen(true);
  };

  const handleSaveLocation = async (newLocationData: Omit<Location, 'id' | 'createdAt' | 'userId' | 'organizationId'>, isNew: boolean) => {
    if (isNew) {
      await addLocation(newLocationData);
    } else if (locationToEdit) {
      await updateLocation({ ...locationToEdit, ...newLocationData });
    }
    setIsLocationLabelGeneratorOpen(false);
  };

  const handleGenerateAndPrintFromGenerator = (labelsToPrint: PrintContentData[]) => {
    for (const label of labelsToPrint) {
      initiatePrint(label);
    }
    showSuccess(`Generated and sent ${labelsToPrint.length} location labels to printer!`);
  };

  return (
    <div className="flex flex-col h-full space-y-6 p-6">
      <h1 className="text-3xl font-bold">Location Management</h1>
      <p className="text-muted-foreground">Manage your inventory storage locations and generate QR code labels for them.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow">
        {/* Manage Locations Card */}
        <Card className="bg-card border-border shadow-sm flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" /> Existing Locations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4 flex-grow flex flex-col">
            <Button onClick={handleAddLocationClick} aria-label="Add new location">
              <PlusCircle className="h-4 w-4 mr-2" /> Add New Location
            </Button>

            {locations.length > 0 ? (
              <div className="space-y-2 flex-grow flex flex-col">
                <Label>Current Locations</Label>
                <ScrollArea className="flex-grow border border-border rounded-md p-3 bg-muted/20">
                  <ul className="space-y-1">
                    {locations.map((loc) => (
                      <li key={loc.id} className="flex items-center justify-between py-1 text-foreground">
                        <Button
                          variant="ghost"
                          className="p-0 h-auto text-left font-normal text-foreground hover:underline"
                          onClick={() => handleViewInventoryClick(loc.fullLocationString)}
                        >
                          {loc.displayName || loc.fullLocationString}
                        </Button>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditLocationClick(loc)}
                            aria-label={`Edit label for ${loc.displayName || loc.fullLocationString}`}
                          >
                            <Edit className="h-4 w-4 text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteLocationClick(loc)}
                            aria-label={`Remove location ${loc.displayName || loc.fullLocationString}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No locations defined yet. Add your first location!</p>
            )}
          </CardContent>
        </Card>

        {/* Generate Labels Card (now just a placeholder for the dialog) */}
        <Card className="bg-card border-border shadow-sm flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <QrCode className="h-5 w-5 text-accent" /> Location Label Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex-grow flex flex-col items-center justify-center text-muted-foreground">
            <p>Use the "Add New Location" or "Edit" buttons to manage location details and generate labels.</p>
            <QrCode className="h-24 w-24 mt-4 text-muted-foreground/50" />
          </CardContent>
        </Card>
      </div>

      {locationToDelete && (
        <ConfirmDialog
          isOpen={isConfirmDeleteDialogOpen}
          onClose={() => setIsConfirmDeleteDialogOpen(false)}
          onConfirm={confirmRemoveLocation}
          title="Confirm Location Deletion"
          description={`Are you sure you want to delete the location "${locationToDelete.displayName || locationToDelete.fullLocationString}"? This cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}

      {/* Location Label Generator Dialog */}
      <Dialog open={isLocationLabelGeneratorOpen} onOpenChange={setIsLocationLabelGeneratorOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{locationToEdit ? "Edit Location & Generate Labels" : "Add New Location & Generate Labels"}</DialogTitle>
            <DialogDescription>
              {locationToEdit ? "Update details for this location and generate new labels." : "Define a new location and generate scannable QR code labels."}
            </DialogDescription>
          </DialogHeader>
          <LocationLabelGenerator
            initialLocation={locationToEdit} // Pass the full object
            onSave={handleSaveLocation}
            onGenerateAndPrint={handleGenerateAndPrintFromGenerator}
            onClose={() => setIsLocationLabelGeneratorOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Location Inventory View Dialog */}
      {locationToViewInventory && (
        <LocationInventoryViewDialog
          isOpen={isLocationInventoryViewDialogOpen}
          onClose={() => setIsLocationInventoryViewDialogOpen(false)}
          locationName={locationToViewInventory}
        />
      )}
    </div>
  );
};

export default Locations;