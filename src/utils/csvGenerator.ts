export const generateInventoryCsvTemplate = (): string => {
  const headers = [
    "name",
    "description",
    "sku",
    "category",
    "pickingBinQuantity",
    "overstockQuantity",
    "reorderLevel",
    "pickingReorderLevel",
    "committedStock",
    "incomingStock",
    "unitCost",
    "retailPrice",
    "location",
    "imageUrl",
    "vendorId",
    "barcodeUrl",
    "autoReorderEnabled",
    "autoReorderQuantity",
  ];

  const exampleRow = [
    "Example Product A",
    "Description for Product A",
    "SKU-001",
    "Electronics",
    "50", // pickingBinQuantity
    "50", // overstockQuantity
    "20", // reorderLevel
    "10", // pickingReorderLevel
    "5",
    "10",
    "Main Warehouse-A-01-01", // Example structured location
    "http://example.com/imageA.jpg",
    "vendor-uuid-123",
    "SKU-001", // Barcode value, not the SVG itself
    "TRUE", // autoReorderEnabled
    "100", // autoReorderQuantity
  ];

  const csvContent = [
    headers.join(","),
    exampleRow.join(","),
  ].join("\n");

  return csvContent;
};

export const generateCustomerCsvTemplate = (): string => {
  const headers = [
    "name",
    "contactPerson",
    "email",
    "phone",
    "address",
    "notes",
  ];

  const exampleRow = [
    "Acme Corp",
    "Jane Doe",
    "jane.doe@acmecorp.com",
    "555-123-4567",
    "123 Main St, Anytown, USA",
    "Key account, always offers discounts.",
  ];

  const csvContent = [
    headers.join(","),
    exampleRow.join(","),
  ].join("\n");

  return csvContent;
};