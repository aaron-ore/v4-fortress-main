"use client";

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
import { Flag, Mail, MessageSquare } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { useNotifications } from "@/context/NotificationContext";
import { useProfile } from "@/context/ProfileContext";

interface FeedbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const FeedbackDialog: React.FC<FeedbackDialogProps> = ({ isOpen, onClose }) => {
  const { addNotification } = useNotifications();
  const { profile } = useProfile();

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [contactInfo, setContactInfo] = useState(profile?.email || "");

  useEffect(() => {
    if (isOpen) {
      setSubject("");
      setDescription("");
      setContactInfo(profile?.email || "");
    }
  }, [isOpen, profile?.email]);

  const handleSubmitFeedback = () => {
    if (!subject.trim() || !description.trim()) {
      showError("Please fill in both the subject and description.");
      return;
    }

    const feedbackDetails = {
      subject: subject.trim(),
      description: description.trim(),
      contactInfo: contactInfo.trim() || "N/A",
      userId: profile?.id || "anonymous",
      userName: profile?.fullName || "Anonymous",
      timestamp: new Date().toISOString(),
    };

    console.log("Feedback Submitted:", feedbackDetails);
    addNotification(`New Feedback: ${subject.trim()} from ${profile?.fullName || 'Anonymous'}`, "info");
    showSuccess("Thank you for your feedback! We've received your submission.");

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-6 w-6 text-primary" /> Submit Feedback / Report Issue
          </DialogTitle>
          <DialogDescription>
            Help us improve Fortress by sharing your thoughts or reporting any problems.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject <span className="text-red-500">*</span></Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Feature Request: Dark Mode"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide as much detail as possible..."
              rows={5}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactInfo" className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" /> Your Contact Info (Optional)
            </Label>
            <Input
              id="contactInfo"
              type="email"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="email@example.com"
            />
            <p className="text-xs text-muted-foreground">
              We'll use this if we need more information about your feedback.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmitFeedback}>
            <MessageSquare className="h-4 w-4 mr-2" /> Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackDialog;