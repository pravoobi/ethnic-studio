// Pure, client-safe Cloudinary delivery URL builder. lib/cloudinary/client.ts is guarded by
// "server-only" (it configures the SDK with api_secret) and can't be imported from client
// components. A delivery URL never needs the secret — cloud_name and a transformation string
// are enough — so this tiny helper lets a client component construct the exact same URL the
// server would, using the same pure transform builders (lib/cloudinary/transforms.ts), without
// a server round-trip or a page reload.
export function buildCloudinaryDeliveryUrl(cloudName: string, publicId: string, rawTransformation: string): string {
  return `https://res.cloudinary.com/${cloudName}/image/upload/${rawTransformation}/${publicId}`;
}
