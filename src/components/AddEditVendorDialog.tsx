import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useVendors, Vendor } from "@/context/VendorContext";
import { showError } from "@/utils/toast";
import { formatPhoneNumber } from "@/utils/formatters"; // Import the new formatter

interface AddEditVendorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vendorToEdit?: Vendor | null; // Optional prop for editing
}

const AddEditVendorDialog: React.FC<AddEditVendorDialogProps> = ({
  isOpen,
  onClose,
  vendorToEdit,
}) => {
  const { addVendor, updateVendor } = useVendors();
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (vendorToEdit) {
      setName(vendorToEdit.name);
      setContactPerson(vendorToEdit.contactPerson || "");
      setEmail(vendorToEdit.email || "");
      setPhone(vendorToEdit.phone ? formatPhoneNumber(vendorToEdit.phone) : ""); // Apply format
      setAddress(vendorToEdit.address || "");
      setNotes(vendorToEdit.notes || "");
    } else {
      // Reset form for adding new vendor
      setName("");
      setContactPerson("");
      setEmail("");
      setPhone("");
      setAddress("");
      setNotes("");
    }
  }, [vendorToEdit, isOpen]); // Reset when dialog opens or vendorToEdit changes

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      showError("Vendor Name is required.");
      return;
    }

    const vendorData = {
      name: name.trim(),
      contactPerson: contactPerson.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.replace(/[^\d]/g, '') || undefined, // Store only digits
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (vendorToEdit) {
      await updateVendor({ ...vendorToEdit, ...vendorData });
    } else {
      await addVendor(vendorData);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vendorToEdit ? "Edit Vendor" : "Add New Vendor"}</DialogTitle>
          <DialogDescription>
            {vendorToEdit ? "Update the details for this vendor." : "Enter the details for a new vendor."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Vendor Name <span className="text-red-500">*</span></Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Global Suppliers Inc."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactPerson">Contact Person</Label>
              <Input
                id="contactPerson"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g., Jane Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vendor@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="text" // Changed to text to allow custom formatting
                value={phone}
                onChange={handlePhoneChange}
                placeholder="e.g., 555-123-4567"
                maxLength={12} // Max length for XXX-XXX-XXXX
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Vendor St, City, State, Zip"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specific notes about this vendor..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {vendorToEdit ? "Save Changes" : "Add Vendor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditVendorDialog;