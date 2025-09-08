import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package, MapPin, Truck, FileText, BarChart } from "lucide-react";

const SetupInstructions: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Fortress Setup Guide</h1>
      <p className="text-muted-foreground">
        Welcome to Fortress! Follow these steps to get your inventory management system up and running quickly.
      </p>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="bg-card border-border rounded-lg shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" /> Step 1: Company Profile & Locations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground">
              Start by defining your company's basic information and setting up your inventory storage locations (e.g., Main Warehouse, Shelf A, Store Front).
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Go to <Link to="/settings" className="text-primary hover:underline">Settings</Link>.</li>
              <li>Fill in "Company Profile" details.</li>
              <li>Click "Manage Locations" to add your warehouses or storage areas.</li>
            </ul>
            <Button asChild className="mt-4">
              <Link to="/settings">Go to Settings</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border rounded-lg shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" /> Step 2: Add Inventory Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground">
              Populate your inventory. You can add items one by one or import them in bulk.
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Navigate to <Link to="/inventory" className="text-primary hover:underline">Inventory</Link>.</li>
              <li>Click "+ Add New Item" to add items manually.</li>
              <li>Use the "Actions" dropdown to "Import CSV" for bulk uploads.</li>
            </ul>
            <Button asChild className="mt-4">
              <Link to="/inventory">Go to Inventory</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border rounded-lg shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <Truck className="h-5 w-5 text-accent" /> Step 3: Manage Vendors
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground">
              Keep track of your suppliers and business partners.
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Visit the <Link to="/vendors" className="text-primary hover:underline">Vendors</Link> page.</li>
              <li>Add new vendors with their contact information.</li>
            </ul>
            <Button asChild className="mt-4">
              <Link to="/vendors">Go to Vendors</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border rounded-lg shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-destructive" /> Step 4: Create Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground">
              Start creating purchase orders for incoming stock or sales invoices for outgoing goods.
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Go to <Link to="/orders" className="text-primary hover:underline">Orders</Link>.</li>
              <li>Use the "Create Order" button to generate Purchase Orders or Sales Invoices.</li>
            </ul>
            <Button asChild className="mt-4">
              <Link to="/orders">Go to Orders</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border rounded-lg shadow-sm lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <BarChart className="h-5 w-5 text-yellow-500" /> Step 5: Explore Reports & Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-muted-foreground">
              Once you have data, leverage the dashboard and reports for insights.
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Check your <Link to="/" className="text-primary hover:underline">Dashboard</Link> for a quick overview.</li>
              <li>Visit <Link to="/reports" className="text-primary hover:underline">Reports</Link> for detailed analytics on inventory value, sales, and more.</li>
            </ul>
            <Button asChild className="mt-4">
              <Link to="/reports">Go to Reports</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="text-center mt-8">
        <p className="text-lg font-semibold text-foreground">Need more help?</p>
        <p className="text-muted-foreground">
          Visit our full <Link to="/help" className="text-primary hover:underline">Help Center</Link> for detailed articles and support.
        </p>
      </div>
    </div>
  );
};

export default SetupInstructions;