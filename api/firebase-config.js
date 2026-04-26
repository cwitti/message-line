import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const localConfigPath = resolve(__dirname, "../public/firebase-config.js");

function firebaseConfigFromEnv() {
  return {
    apiKey: process.env.FIREBASE_API_KEY || "",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.FIREBASE_APP_ID || ""
  };
}

async function firebaseConfigSource() {
  const firebaseConfig = firebaseConfigFromEnv();
  const isComplete = Object.values(firebaseConfig).every(Boolean);

  if (isComplete) {
    return `export const firebaseConfig = ${JSON.stringify(firebaseConfig, null, 2)};\n`;
  }

  try {
    return await readFile(localConfigPath, "utf8");
  } catch {
    return "throw new Error('Firebase config is missing on the server.');\n";
  }
}

export default async function handler(_request, response) {
  const source = await firebaseConfigSource();
  response.setHeader("Content-Type", "text/javascript; charset=utf-8");
  response.setHeader("Cache-Control", "no-cache");
  response.send(source);
}
