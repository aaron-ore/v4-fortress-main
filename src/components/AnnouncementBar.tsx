import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/context/OnboardingContext"; // Import useOnboarding

interface AnnouncementBarProps {
  message: string;
  linkTo: string;
  linkText: string;
}

// Simple typing effect hook
const useTypingEffect = (text: string, speed: number = 50) => {
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < text.length) {
      const timeoutId = setTimeout(() => {
        setDisplayedText((prev) => prev + text.charAt(index));
        setIndex((prev) => prev + 1);
      }, speed);
      return () => clearTimeout(timeoutId);
    }
  }, [text, speed, index]);

  return displayedText;
};

const AnnouncementBar: React.FC<AnnouncementBarProps> = ({ message, linkTo, linkText }) => {
  const { companyProfile } = useOnboarding(); // Get companyProfile from context

  const [isDismissed, setIsDismissed] = useState(() => {
    // Check local storage to see if it was previously dismissed
    if (typeof window !== 'undefined') {
      return localStorage.getItem("fortress_announcement_dismissed") === "true";
    }
    return false;
  });

  // Determine visibility: not dismissed AND no company profile set
  const isVisible = !isDismissed && !companyProfile;

  const typedMessage = useTypingEffect(message);

  const handleDismiss = () => {
    setIsDismissed(true);
    // Store dismissal preference in local storage
    if (typeof window !== 'undefined') {
      localStorage.setItem("fortress_announcement_dismissed", "true");
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="relative bg-primary text-primary-foreground p-3 text-center text-sm flex items-center justify-center overflow-hidden">
      <p className="flex-grow">
        {typedMessage}
        {typedMessage.length === message.length && ( // Only show link after typing is complete
          <>
            {" "}
            <Link to={linkTo} className="underline font-semibold hover:opacity-80">
              {linkText}
            </Link>
          </>
        )}
      </p>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDismiss}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-primary-foreground hover:bg-primary/80"
        aria-label="Dismiss announcement"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default AnnouncementBar;