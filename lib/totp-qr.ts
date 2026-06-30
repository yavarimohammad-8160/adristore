import QRCode from "qrcode";

export async function createTotpQrDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 180,
    color: { dark: "#000000", light: "#ffffff" },
  });
}