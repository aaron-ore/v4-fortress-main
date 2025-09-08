import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, BookOpen, MessageCircle, ExternalLink } from "lucide-react";
import { showSuccess } from "@/utils/toast";
import { Link } from "react-router-dom"; // Import Link

const HelpCenter: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");

  // Mock FAQ data
  const faqs = [
    {
      id: "getting-started-1",
      category: "Getting Started",
      question: "How do I set up my company profile and locations?",
      answer: "After signing in, you'll be guided through an onboarding wizard. You can also go to 'Settings' to update your company name, currency, address, and manage your inventory locations (e.g., Main Warehouse, Shelf A).",
    },
    {
      id: "getting-started-2",
      category: "Getting Started",
      question: "What is the 'Reorder Level' and how does it work?",
      answer: "The reorder level is the minimum quantity of an item you want to have in stock before you need to reorder. When an item's quantity drops to or below this level, it will appear in 'Low Stock Alerts' on your Dashboard.",
    },
    {
      id: "signing-up-1",
      category: "Signing Up & Onboarding",
      question: "How do I sign up for a new account?",
      answer: "On the login page, click 'Sign Up'. Enter your email and a strong password. You'll receive a confirmation email to verify your account. After confirmation, you can log in and complete the initial setup.",
    },
    {
      id: "signing-up-2",
      category: "Signing Up & Onboarding",
      question: "What is a 'Company Code' during sign-up?",
      answer: "If your organization already uses Fortress, your administrator can provide you with a unique 'Company Code'. Entering this code during sign-up will automatically link your new account to your company's existing inventory and user base.",
    },
    {
      id: "user-management-1",
      category: "User Management & Employees",
      question: "How do I add new employees to my Fortress account?",
      answer: "As an administrator, navigate to the 'Users' page. You can invite new users by sharing your unique 'Company Code' (found in 'Settings'). New users can enter this code during their sign-up to join your organization.",
    },
    {
      id: "user-management-2",
      category: "User Management & Employees",
      question: "How do I change an employee's role?",
      answer: "On the 'Users' page, you can see a list of all employees. For each user, there's a dropdown menu next to their current role. Select the new role (e.g., 'Viewer', 'Manager', 'Admin') and confirm the change.",
    },
    {
      id: "inventory-1",
      category: "Inventory Management",
      question: "How do I add a new inventory item?",
      answer: "Navigate to the 'Inventory' page, then click the '+ Add New Item' button. Fill in the required details like item name, SKU, quantity, and location, then click 'Add Item'.",
    },
    {
      id: "inventory-2",
      category: "Inventory Management",
      question: "Can I import my existing inventory from a CSV file?",
      answer: "Yes, on the 'Inventory' page, click the 'Actions' dropdown and select 'Import CSV'. You can upload your spreadsheet there. Make sure your CSV is formatted correctly.",
    },
    {
      id: "orders-1",
      category: "Order Management",
      question: "How do I track incoming shipments?",
      answer: "Incoming shipments are typically managed through Purchase Orders. You can create a PO, and once items are received, update the PO status to reflect the incoming stock. Use the 'Receive Shipment' action on the Orders page or the 'Receive Inventory' tool in Warehouse Operations.",
    },
    {
      id: "mobile-1",
      category: "Using Mobile Features",
      question: "How do I use Fortress on my mobile device?",
      answer: "Fortress is designed to be responsive on mobile browsers. For dedicated warehouse tasks, navigate to the 'Warehouse Operations' page. This page is optimized for mobile and offers tools like 'Item Lookup', 'Receive Inventory', 'Fulfill Order', and 'Ship Order' with barcode scanning capabilities.",
    },
    {
      id: "mobile-2",
      category: "Using Mobile Features",
      question: "How does barcode scanning work on mobile?",
      answer: "On the 'Warehouse Operations' page, select a tool (e.g., 'Item Lookup'). You'll see a 'Scan Barcode/QR' button. Tapping this will activate your device's camera to scan barcodes or QR codes, automatically populating relevant fields or searching for items.",
    },
    {
      id: "reports-1",
      category: "Reporting & Analytics",
      question: "How can I generate reports on my sales and inventory?",
      answer: "Visit the 'Reports' page. Here you'll find various pre-built reports like 'Sales by Product Category', 'Inventory Value by Location', and 'Overall Stock Level Trend'. You can also export these reports to Excel.",
    },
  ];

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearch = () => {
    showSuccess(`Searching help articles for: "${searchTerm}".`);
  };

  const handleContactSupport = () => {
    showSuccess("Opening live chat/contact form.");
  };

  const groupFaqsByCategory = (faqs: typeof filteredFaqs) => {
    return faqs.reduce((acc, faq) => {
      (acc[faq.category] = acc[faq.category] || []).push(faq);
      return acc;
    }, {} as Record<string, typeof filteredFaqs>);
  };

  const groupedFaqs = groupFaqsByCategory(filteredFaqs);
  const categoriesOrder = ["Getting Started", "Signing Up & Onboarding", "User Management & Employees", "Inventory Management", "Order Management", "Using Mobile Features", "Reporting & Analytics"];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Help Center & Knowledge Base</h1>
      <p className="text-muted-foreground">Find answers to common questions and get support for using Fortress.</p>

      {/* Search Bar */}
      <Card className="bg-card border-border rounded-lg shadow-sm p-6">
        <CardHeader className="pb-4 flex flex-row items-center gap-4">
          <Search className="h-6 w-6 text-primary" />
          <CardTitle className="text-xl font-semibold">Search Help Articles</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="e.g., 'add item', 'reorder', 'reports'"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
          />
          <Button onClick={handleSearch}>Search</Button>
        </CardContent>
      </Card>

      {/* Frequently Asked Questions */}
      <Card className="bg-card border-border rounded-lg shadow-sm p-6">
        <CardHeader className="pb-4 flex flex-row items-center gap-4">
          <BookOpen className="h-6 w-6 text-primary" />
          <CardTitle className="text-xl font-semibold">Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent>
          {/* New: Getting Started section with link to Setup Instructions */}
          <div className="mb-6">
            <h3 className="font-semibold text-lg text-foreground mb-2">Getting Started</h3>
            <p className="text-muted-foreground">
              If you're new to Fortress, check out our step-by-step setup guide:{" "}
              <Link to="/setup-instructions" className="text-primary hover:underline">
                Fortress Setup Guide
              </Link>
            </p>
          </div>
          {Object.keys(groupedFaqs).length > 0 ? (
            <div className="space-y-6">
              {categoriesOrder.map(category => {
                const faqsInCategory = groupedFaqs[category];
                if (faqsInCategory && faqsInCategory.length > 0) {
                  return (
                    <div key={category}>
                      <h3 className="font-semibold text-lg text-foreground mb-3">{category}</h3>
                      <Accordion type="single" collapsible className="w-full">
                        {faqsInCategory.map((faq) => (
                          <AccordionItem key={faq.id} value={faq.id}>
                            <AccordionTrigger className="text-left text-foreground hover:no-underline">
                              {faq.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground">
                              {faq.answer}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">No matching FAQs found.</p>
          )}
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Card className="bg-card border-border rounded-lg shadow-sm p-6">
        <CardHeader className="pb-4 flex flex-row items-center gap-4">
          <MessageCircle className="h-6 w-6 text-primary" />
          <CardTitle className="text-xl font-semibold">Still Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            If you can't find what you're looking for, our support team is here to assist you.
          </p>
          <Button onClick={handleContactSupport}>
            <MessageCircle className="h-4 w-4 mr-2" /> Contact Support
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            For urgent issues, please check our{" "}
            <a href="https://status.fortressapp.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 inline-flex">
              System Status Page <ExternalLink className="h-3 w-3" />
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default HelpCenter;