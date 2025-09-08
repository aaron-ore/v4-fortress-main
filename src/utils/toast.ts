import { toast } from "sonner";

let consecutiveErrorCount = 0;
const ERROR_THRESHOLD = 3; // Number of consecutive errors before suggesting support

const showToast = (type: 'success' | 'error', message: string, options?: any) => {
  if (type === 'error') {
    consecutiveErrorCount++;
    if (consecutiveErrorCount >= ERROR_THRESHOLD) {
      message = "Multiple errors detected. Please contact support if the issue persists.";
    }
  } else {
    consecutiveErrorCount = 0; // Reset on success
  }

  toast[type](message, {
    ...options,
    onDismiss: (id: string | number) => {
      // If the user dismisses a "contact support" toast, reset the counter
      if (consecutiveErrorCount >= ERROR_THRESHOLD && type === 'error') {
        consecutiveErrorCount = 0;
      }
      options?.onDismiss?.(id);
    }
  });
};

export const showSuccess = (message: string) => {
  showToast('success', message);
};

export const showError = (message: string) => {
  // Intercept generic "Fetch failed" messages
  if (message.toLowerCase().includes("fetch failed")) {
    message = "A network error occurred. Please check your internet connection and try again.";
  }
  showToast('error', message);
};

export const dismissToast = (toastId: string | number) => {
  toast.dismiss(toastId);
};