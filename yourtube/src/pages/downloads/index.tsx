import DownloadsContent from "@/components/DownloadsContent";
import { Suspense } from "react";

export default function DownloadsPage() {
  return (
    <main className="flex-1 p-6">
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold mb-2">Downloads</h1>
        <p className="text-sm text-gray-600 mb-6">
          Videos saved to your device from YourTube appear here.
        </p>
        <Suspense fallback={<div>Loading…</div>}>
          <DownloadsContent />
        </Suspense>
      </div>
    </main>
  );
}
