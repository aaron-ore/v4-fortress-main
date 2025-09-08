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
import { useCustomers, Customer } from "@/context/CustomerContext";
import { showError } from "@/utils/toast";
import { formatPhoneNumber } from "@/utils/formatters";

interface AddEditCustomerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customerToEdit?: Customer | null;
}

const AddEditCustomerDialog: React.FC<AddEditCustomerDialogProps> = ({
  isOpen,
  onClose,
  customerToEdit,
}) => {
  const { addCustomer, updateCustomer } = useCustomers();
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (customerToEdit) {
      setName(customerToEdit.name);
      setContactPerson(customerToEdit.contactPerson || "");
      setEmail(customerToEdit.email || "");
      setPhone(customerToEdit.phone ? formatPhoneNumber(customerToEdit.phone) : "");
      setAddress(customerToEdit.address || "");
      setNotes(customerToEdit.notes || "");
    } else {
      setName("");
      setContactPerson("");
      setEmail("");
      setPhone("");
      setAddress("");
      setNotes("");
    }
  }, [customerToEdit, isOpen]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      showError("Customer Name is required.");
      return;
    }

    const customerData = {
      name: name.trim(),
      contactPerson: contactPerson.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.replace(/[^\d]/g, '') || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (customerToEdit) {
      await updateCustomer({ ...customerToEdit, ...customerData });
    } else {
      await addCustomer(customerData);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customerToEdit ? "Edit Customer" : "Add New Customer"}</DialogTitle>
          <DialogDescription>
            {customerToEdit ? "Update the details for this customer." : "Enter the details for a new customer."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Customer Name <span className="text-red-500">*</span></Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., John Doe"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactPerson">Contact Person</Label>
              <Input
                id="contactPerson"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g., Jane Smith"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="text"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="e.g., 555-123-4567"
                maxLength={12}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, City, State, Zip"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specific notes about this customer..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {customerToEdit ? "Save Changes" : "Add Customer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditCustomerDialog;