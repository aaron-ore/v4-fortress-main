"use client";

import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats, Html5QrcodeFullConfig, Html5QrcodeCameraScanConfig } from "html5-qrcode";

export interface QrScannerRef {
  stopAndClear: () => Promise<void>;
  retryStart: () => Promise<void>;
}

interface QrScannerProps {
  onScan: (decodedText: string) => void;
  onError: (errorMessage: string) => void;
  onReady: () => void;
  onLoading: (loading: boolean) => void; // New prop to indicate loading state
  isOpen: boolean;
}

const QR_SCANNER_DIV_ID = "qr-code-full-region"; // Consistent ID

const QrScanner = forwardRef<QrScannerRef, QrScannerProps>(
  ({ onScan, onError, onReady, onLoading, isOpen }, ref) => {
    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
    const isMounted = useRef(true);
    const isCameraStartedRef = useRef(false); // Tracks if html5QrCode.start() is active
    const isStartingRef = useRef(false); // Tracks if startScanner is currently running
    const qrScannerDivRef = useRef<HTMLDivElement>(null); // NEW: Ref for the scanner div

    const html5QrcodeConstructorConfig: Html5QrcodeFullConfig = {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
      ],
      verbose: false,
    };

    const html5QrcodeCameraScanConfig: Html5QrcodeCameraScanConfig = {
      fps: 10,
      // Removed qrbox to allow full camera view for scanning
      aspectRatio: 1.0,
      disableFlip: false,
    };

    const stopScanner = useCallback(async () => {
      if (html5QrCodeRef.current && isCameraStartedRef.current) {
        console.log("[QrScanner] Attempting to stop scanner...");
        try {
          await html5QrCodeRef.current.stop();
          console.log("[QrScanner] Scanner stopped successfully.");
        } catch (e) {
          console.warn("[QrScanner] Error during scanner stop (might be already stopped or camera not found):", e);
        } finally {
          isCameraStartedRef.current = false;
        }
      } else {
        console.log("[QrScanner] No active scanner instance to stop.");
      }
    }, []);

    const clearScanner = useCallback(() => {
      if (html5QrCodeRef.current) {
        console.log("[QrScanner] Attempting to clear scanner instance...");
        try {
          html5QrCodeRef.current.clear();
          console.log("[QrScanner] Scanner instance cleared.");
        } catch (e) {
          console.warn("[QrScanner] Error during scanner clear:", e);
        } finally {
          html5QrCodeRef.current = null; // Crucial: Nullify the instance
        }
      } else {
        console.log("[QrScanner] No scanner instance to clear.");
      }
    }, []);

    const stopAndClear = useCallback(async () => {
      console.log("[QrScanner] stopAndClear called.");
      await stopScanner(); // Ensure scanner is stopped first
      // Add a small delay to allow camera resources to fully release before clearing
      await new Promise(resolve => setTimeout(resolve, 500)); // Reduced delay to 500ms
      clearScanner();    // Then clear the instance
      isCameraStartedRef.current = false; // Ensure this is reset
      isStartingRef.current = false; // Ensure this is reset
      onLoading(false); // Indicate that we are no longer loading/transitioning
      onError(null); // Clear any persistent error message
    }, [stopScanner, clearScanner, onLoading, onError]);

    const startScanner = useCallback(async () => {
      if (!isMounted.current || !isOpen) {
        console.log("[QrScanner] Not starting scanner: component unmounted or dialog closed.");
        return;
      }
      if (isStartingRef.current) {
        console.log("[QrScanner] Scanner already in process of starting, skipping new start.");
        return;
      }
      if (isCameraStartedRef.current) {
        console.log("[QrScanner] Camera already started, skipping new start.");
        onReady(); // Re-signal ready if already active
        onLoading(false);
        return;
      }
      // NEW: Check if the div element is available
      if (!qrScannerDivRef.current) {
        console.log("[QrScanner] qrScannerDivRef.current is null. Deferring startScanner.");
        return; // Defer starting until the div is mounted
      }


      isStartingRef.current = true; // Mark as starting
      onLoading(true); // Indicate loading has started
      onError(null); // Clear previous errors

      // Ensure any active stream is stopped before proceeding
      await stopScanner();
      await new Promise(resolve => setTimeout(resolve, 300)); // Small delay for camera resource release

      // --- Logic to select camera by device ID ---
      let cameraSelection: string | undefined = undefined;
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          console.log("[QrScanner] Available cameras:", cameras);
          // Try to find an 'environment' camera. Heuristic: often contains 'back'/'rear' in label.
          let environmentCamera = cameras.find(camera => camera.label.toLowerCase().includes('back') || camera.label.toLowerCase().includes('rear'));
          
          if (!environmentCamera && cameras.length === 1) {
            environmentCamera = cameras[0]; // If only one, assume it's the primary one
          } else if (!environmentCamera && cameras.length > 1) {
            // Fallback: if no explicit 'back'/'rear' label, try the last one as it's often the main rear camera
            environmentCamera = cameras[cameras.length - 1];
          }

          if (environmentCamera) {
            cameraSelection = environmentCamera.id;
            console.log("[QrScanner] Selected camera device ID:", cameraSelection, "Label:", environmentCamera.label);
          } else {
            console.warn("[QrScanner] No explicit 'environment' camera found by label. Falling back to generic 'environment' string.");
            cameraSelection = "environment"; // Fallback to generic string
          }
        } else {
          console.warn("[QrScanner] No cameras found by Html5Qrcode.getCameras(). Falling back to generic 'environment' string.");
          cameraSelection = "environment"; // Fallback to generic string
        }
      } catch (err: any) {
        console.error("[QrScanner] Error enumerating cameras:", err);
        onError("Failed to list cameras. " + err.message);
        onLoading(false);
        isStartingRef.current = false; // Reset starting flag
        return;
      }
      // --- End camera selection logic ---

      if (!cameraSelection) {
        onError("No camera could be selected for scanning.");
        onLoading(false);
        isStartingRef.current = false; // Reset starting flag
        return;
      }

      // Instantiate Html5Qrcode if it's null (first time or after full clear)
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(QR_SCANNER_DIV_ID, html5QrcodeConstructorConfig);
      }

      console.log(`[QrScanner] Attempting to start scanner with selection:`, cameraSelection);
      try {
        await html5QrCodeRef.current.start(
          cameraSelection, // Pass the string (device ID or "environment")
          html5QrcodeCameraScanConfig,
          async (decodedText) => { // Made async to await stopScanner
            if (isMounted.current) {
              console.log("[QrScanner] Scan successful:", decodedText);
              await stopScanner(); // Immediately stop scanner after a successful scan
              await new Promise(resolve => setTimeout(resolve, 100)); // Small delay before callback
              onScan(decodedText);
            }
          },
          (errorMessage) => {
            if (isMounted.current && !errorMessage.includes("No QR code found")) {
              console.warn("[QrScanner] Scan error (not 'No QR code found'):", errorMessage);
            }
          }
        );
        if (isMounted.current) {
          console.log("[QrScanner] Scanner started and ready.");
          isCameraStartedRef.current = true; // Mark camera as started
          onReady();
          onLoading(false); // Stop loading on success
        }
      } catch (err: any) {
        if (isMounted.current) {
          console.error(`[QrScanner] Error starting scanner:`, err);
          isCameraStartedRef.current = false; // Ensure state is reset on error
          let errorMessage = "Failed to start camera. ";
          if (err.name === "NotReadableError") {
            errorMessage += "The camera might be in use by another application, or there's a temporary hardware issue. Please try closing other camera apps. ";
          } else if (err.name === "NotAllowedError") {
            errorMessage += "Camera access was denied. Please check your browser's site permissions for this page and grant camera access. ";
          } else if (err.name === "OverconstrainedError") {
            errorMessage += "The camera could not be activated with the requested settings (e.g., back camera not found or available). Try restarting your device or closing other camera apps. ";
          } else if (err.name === "NotFoundError") {
            errorMessage += "No camera devices were found. ";
          } else {
            errorMessage += "An unknown error occurred. Please ensure your device has a working camera and try again. ";
          }
          onError(errorMessage); // Report error, but don't retry automatically
          onLoading(false); // Stop loading on error
        }
      } finally {
        isStartingRef.current = false; // Always reset starting flag
      }
    }, [isOpen, onScan, onReady, onError, onLoading, stopScanner, html5QrcodeConstructorConfig, html5QrcodeCameraScanConfig, qrScannerDivRef]); // Added qrScannerDivRef to dependencies

    const retryStart = useCallback(async () => {
      console.log("[QrScanner] retryStart called.");
      await startScanner();
    }, [startScanner]);

    useImperativeHandle(ref, () => ({
      stopAndClear: stopAndClear,
      retryStart: retryStart,
    }));

    useEffect(() => {
      isMounted.current = true;
      console.log("[QrScanner] Main effect running. isOpen:", isOpen);

      // NEW: Only attempt to start if the divRef is available
      if (isOpen && qrScannerDivRef.current) {
        startScanner();
      } else if (!isOpen) {
        stopAndClear();
      }

      return () => {
        isMounted.current = false;
        console.log("[QrScanner] Component unmounting or effect cleanup. Stopping and clearing scanner.");
        stopAndClear();
      };
    }, [isOpen, startScanner, stopAndClear, qrScannerDivRef.current]); // Added qrScannerDivRef.current to dependencies

    return (
      <div id={QR_SCANNER_DIV_ID} ref={qrScannerDivRef} className="w-full h-full" /> 
    );
  }
);

QrScanner.displayName = "QrScanner";

export default QrScanner;