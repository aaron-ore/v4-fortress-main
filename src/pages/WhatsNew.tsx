import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, CalendarDays, GitCommit } from "lucide-react";

interface ReleaseNote {
  version: string;
  date: string;
  features: string[];
  improvements: string[];
  bugFixes: string[];
}

const WhatsNew: React.FC = () => {
  // Mock release notes data
  const releaseNotes: ReleaseNote[] = [
    {
      version: "1.2.0",
      date: "2024-08-15",
      features: [
        "Kanban Board for Order Management: Visually track order statuses with drag-and-drop functionality.",
        "PDF Export for Purchase Orders: Generate professional PDF documents directly from the PO creation page.",
      ],
      improvements: [
        "Enhanced Inventory Filtering: Added more filter options for better inventory overview.",
        "Improved Dashboard Performance: Faster loading times for key metrics.",
      ],
      bugFixes: [
        "Fixed an issue where certain inventory items were not saving correctly.",
        "Resolved display issues on smaller screens for the reports page.",
      ],
    },
    {
      version: "1.1.0",
      date: "2024-07-20",
      features: [
        "Multi-Location Inventory Support: Track items across different warehouses or storage areas.",
        "Basic User Role Management: Assign 'Admin', 'Inventory Manager', and 'Viewer' roles.",
      ],
      improvements: [
        "Updated UI for Add/Edit Inventory Dialogs.",
        "Better error handling for CSV imports.",
      ],
      bugFixes: [
        "Corrected calculation for total stock value on dashboard.",
      ],
    },
    {
      version: "1.0.0",
      date: "2024-06-01",
      features: [
        "Initial Release: Core Inventory Management.",
        "Product Catalog & SKU Management.",
        "Basic Sales & Purchase Order Tracking.",
        "Dashboard Overview with Key Metrics.",
      ],
      improvements: [],
      bugFixes: [],
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">What's New in Fortress</h1>
      <p className="text-muted-foreground">Stay up-to-date with the latest features, improvements, and bug fixes.</p>

      <div className="space-y-8">
        {releaseNotes.map((release) => (
          <Card key={release.version} className="bg-card border-border rounded-lg shadow-sm p-6">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-2">
                <CardTitle className="text-2xl font-bold text-foreground">Version {release.version}</CardTitle>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" /> {release.date}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Released on {release.date}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {release.features.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg text-primary flex items-center gap-2">
                    <Sparkles className="h-5 w-5" /> New Features
                  </h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    {release.features.map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                </div>
              )}

              {release.improvements.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg text-accent flex items-center gap-2">
                    <GitCommit className="h-5 w-5" /> Improvements
                  </h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    {release.improvements.map((improvement, index) => (
                      <li key={index}>{improvement}</li>
                    ))}
                  </ul>
                </div>
              )}

              {release.bugFixes.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg text-destructive flex items-center gap-2">
                    <GitCommit className="h-5 w-5" /> Bug Fixes
                  </h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    {release.bugFixes.map((fix, index) => (
                      <li key={index}>{fix}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default WhatsNew;