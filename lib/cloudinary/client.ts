import "server-only";
import { v2 as cloudinary } from "cloudinary";

let configured = false;

/**
 * Lazily configures and returns the server-side Cloudinary SDK instance.
 * Throws if credentials are missing so misconfiguration fails loudly instead
 * of silently hitting an unconfigured client.
 */
export function getCloudinaryClient() {
  if (!configured) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.local."
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    configured = true;
  }

  return cloudinary;
}
