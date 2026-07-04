import api from "@/lib/api-client";

export class DownloadLimitError extends Error {
  requiresPremium = true;
  constructor(message: string) {
    super(message);
    this.name = "DownloadLimitError";
  }
}

async function parseApiError(error: unknown): Promise<Error> {
  const err = error as {
    response?: { data?: Blob | { message?: string }; status?: number };
    message?: string;
  };

  const data = err.response?.data;

  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const json = JSON.parse(text) as {
        message?: string;
        requiresPremium?: boolean;
      };
      if (json.requiresPremium) {
        return new DownloadLimitError(
          json.message || "Daily download limit reached"
        );
      }
      return new Error(json.message || "Download failed");
    } catch {
      return new Error("Download failed");
    }
  }

  if (data && typeof data === "object" && "message" in data) {
    return new Error(String(data.message));
  }

  return new Error(err.message || "Download failed");
}

export async function downloadVideoFile(videoId: string) {
  let response;
  try {
    response = await api.post(`/download/video/${videoId}`, null, {
      responseType: "blob",
      timeout: 120000,
    });
  } catch (error: unknown) {
    throw await parseApiError(error);
  }

  const contentType = response.headers["content-type"] as string | undefined;
  if (contentType?.includes("application/json")) {
    const text = await (response.data as Blob).text();
    const json = JSON.parse(text) as { message?: string };
    throw new Error(json.message || "Download failed");
  }

  const disposition = response.headers["content-disposition"] as
    | string
    | undefined;
  let filename = "video.mp4";
  if (disposition) {
    const match = disposition.match(/filename="([^"]+)"/);
    if (match?.[1]) filename = match[1];
  }

  const blob = new Blob([response.data], {
    type: contentType || "video/mp4",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
