import QRCode from 'qrcode'; // Import the 'qrcode' library

/**
 * Generates an SVG string for a QR code.
 * @param value The data to encode in the QR code.
 * @param size The size of the QR code in pixels (default: 128).
 * @returns A promise that resolves with the SVG string of the QR code.
 */
export const generateQrCodeSvg = async (value: string, size: number = 128): Promise<string> => {
  if (!value) {
    throw new Error("Value for QR code cannot be empty.");
  }

  try {
    // Use qrcode.toString to generate SVG
    const svgString = await QRCode.toString(value, {
      type: 'svg',
      width: size,
      height: size,
      margin: 0, // Changed margin to 0 to remove internal white space
      color: {
        dark: '#000000', // Black dots
        light: '#FFFFFF' // White background
      }
    });
    return svgString;
  } catch (error: any) {
    console.error("Error generating QR code SVG:", error);
    throw new Error(`Failed to generate QR code SVG: ${error.message}`);
  }
};