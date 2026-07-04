export function getAllowedOrigins() {
  const raw = process.env.CLIENT_ORIGIN || "http://localhost:3000";
  return raw.split(",").map((o) => o.trim()).filter(Boolean);
}

function isLocalDevOrigin(origin) {
  if (process.env.NODE_ENV === "production") return false;

  try {
    const url = new URL(origin);
    const port = url.port || (url.protocol === "https:" ? "443" : "80");
    const portNum = Number(port);
    // Next.js may use 3001, 3002, … when 3000 is taken
    if (portNum < 3000 || portNum > 3010) return false;

    const host = url.hostname;
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.startsWith("192.168.") ||
      host.startsWith("10.") ||
      host.endsWith(".local")
    );
  } catch {
    return false;
  }
}

export function corsOriginValidator(origin, callback) {
  const allowed = getAllowedOrigins();

  if (!origin || allowed.includes(origin) || isLocalDevOrigin(origin)) {
    return callback(null, true);
  }

  console.warn(`CORS blocked for origin: ${origin}`);
  callback(null, false);
}
