// Encrypts / decrypts the app config ({ token, gistId }) with a passphrase.
// Used by setup.html (encrypt) and index.html (decrypt). Runs entirely in the
// browser; the passphrase never leaves the device.
//
// Format (base64): salt (16 bytes) | iv (12 bytes) | AES-256-GCM ciphertext
// Key: PBKDF2-SHA256 with many iterations, so each passphrase guess is slow.

const KDF_ITERATIONS = 600000;

async function deriveKey(passphrase, salt) {
  const base = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: KDF_ITERATIONS, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

async function encryptConfig(obj, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const plain = new TextEncoder().encode(JSON.stringify(obj));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain));
  const all = new Uint8Array(salt.length + iv.length + cipher.length);
  all.set(salt, 0); all.set(iv, 16); all.set(cipher, 28);
  return btoa(String.fromCharCode(...all));
}

// Throws if the passphrase is wrong (AES-GCM authentication fails).
async function decryptConfig(b64, passphrase) {
  const all = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const key = await deriveKey(passphrase, all.slice(0, 16));
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: all.slice(16, 28) }, key, all.slice(28));
  return JSON.parse(new TextDecoder().decode(plain));
}
