import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let initialized = false;

function parseServiceAccountJson(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return JSON.parse(raw.replace(/\\n/g, "\n"));
  }
}

function loadServiceAccount() {
  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    ? path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    : path.join(__dirname, "firebase-service-account.json");

  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    return parseServiceAccountJson(raw);
  }

  return null;
}

export function initFirebaseAdmin() {
  if (initialized) return admin;

  const serviceAccount = loadServiceAccount();
  if (!serviceAccount) {
    console.warn(
      "Firebase Admin not configured. Set FIREBASE_SERVICE_ACCOUNT (cloud) or FIREBASE_SERVICE_ACCOUNT_PATH (local)."
    );
    return null;
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  initialized = true;
  return admin;
}

export function getFirebaseAdmin() {
  if (!initialized) initFirebaseAdmin();
  return initialized ? admin : null;
}
