import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusCircle, Edit, Trash2, Users as UsersIcon, Upload, ChevronDown } from "lucide-react"; // NEW: Import Upload and ChevronDown
import { useCustomers, Customer } from "@/context/CustomerContext";
import AddEditCustomerDialog from "@/components/AddEditCustomerDialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import ImportCustomersDialog from "@/components/ImportCustomersDialog"; // NEW: Import ImportCustomersDialog
import {
  DropdownMenu, // NEW: Import DropdownMenu components
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Customers: React.FC = () => {
  const { customers, deleteCustomer } = useCustomers();
  const [isAddEditCustomerDialogOpen, setIsAddEditCustomerDialogOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<{ id: string; name: string } | null>(null);

  const [isImportCustomersDialogOpen, setIsImportCustomersDialogOpen] = useState(false); // NEW: State for import dialog

  const handleAddCustomerClick = () => {
    setCustomerToEdit(null);
    setIsAddEditCustomerDialogOpen(true);
  };

  const handleEditCustomerClick = (customer: Customer) => {
    setCustomerToEdit(customer);
    setIsAddEditCustomerDialogOpen(true);
  };

  const handleDeleteCustomerClick = (customerId: string, customerName: string) => {
    setCustomerToDelete({ id: customerId, name: customerName });
    setIsConfirmDeleteDialogOpen(true);
  };

  const confirmDeleteCustomer = () => {
    if (customerToDelete) {
      deleteCustomer(customerToDelete.id);
    }
    setIsConfirmDeleteDialogOpen(false);
    setCustomerToDelete(null);
  };

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) {
      return customers;
    }
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.contactPerson && customer.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (customer.phone && customer.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (customer.address && customer.address.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [customers, searchTerm]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Customer Management</h1>
      <p className="text-muted-foreground">Manage your customer accounts and contact information.</p>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search customers..."
          className="max-w-sm bg-input border-border text-foreground flex-grow"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" /> Add Customer <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Customer Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleAddCustomerClick}>
              <PlusCircle className="h-4 w-4 mr-2" /> Add New Customer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsImportCustomersDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" /> Import CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card className="bg-card border-border rounded-lg p-4">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold">All Customers</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCustomers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No customers found. Add a new customer to get started!</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="text-center w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.contactPerson || "-"}</TableCell>
                      <TableCell>{customer.email || "-"}</TableCell>
                      <TableCell>{customer.phone || "-"}</TableCell>
                      <TableCell className="max-w-[250px] truncate">{customer.address || "-"}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditCustomerClick(customer)}>
                            <Edit className="h-4 w-4 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteCustomerClick(customer.id, customer.name)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AddEditCustomerDialog
        isOpen={isAddEditCustomerDialogOpen}
        onClose={() => setIsAddEditCustomerDialogOpen(false)}
        customerToEdit={customerToEdit}
      />
      {customerToDelete && (
        <ConfirmDialog
          isOpen={isConfirmDeleteDialogOpen}
          onClose={() => setIsConfirmDeleteDialogOpen(false)}
          onConfirm={confirmDeleteCustomer}
          title="Confirm Customer Deletion"
          description={`Are you sure you want to delete customer "${customerToDelete.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}
      <ImportCustomersDialog
        isOpen={isImportCustomersDialogOpen}
        onClose={() => setIsImportCustomersDialogOpen(false)}
      />
    </div>
  );
};

export default Customers;