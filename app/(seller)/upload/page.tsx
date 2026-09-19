import UploadForm from "./UploadForm";

export default function UploadPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-8 animate-[fadeInUp_400ms_ease-out]">
      <h1 className="text-2xl font-semibold">Upload a garment</h1>
      <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        Pick a category, upload one flat photo, and the pipeline runs cutout, crop, and tagging.
      </p>
      <UploadForm />
    </main>
  );
}
