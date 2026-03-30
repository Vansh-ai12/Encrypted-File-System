function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const subArray = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, subArray);
  }

  return btoa(binary);
}

export async function encryptFile(file, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const enc = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );

  const buffer = await file.arrayBuffer();

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    buffer,
  );

  return {
    ciphertextBase64: arrayBufferToBase64(ciphertext),
    ivBase64: arrayBufferToBase64(iv),
    saltBase64: arrayBufferToBase64(salt),
    originalName: file.name,
    mimeType: file.type,
    size: file.size,
  };
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

export async function decryptFile(
  ciphertextBase64,
  ivBase64,
  saltBase64,
  password,
) {
  try {
    const enc = new TextEncoder();
    const dec = new TextDecoder();

    const ciphertext = base64ToUint8Array(ciphertextBase64);
    const iv = base64ToUint8Array(ivBase64);
    const salt = base64ToUint8Array(saltBase64);


    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"],
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      {
        name: "AES-GCM",
        length: 256,
      },
      false,
      ["decrypt"],
    );

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      ciphertext,
    );

    // Return raw bytes (works for images, pdf, text)
    return new Uint8Array(decrypted);
  } catch (e) {
    console.error("Decryption failed:", e);
    return "ERROR: ENCRYPTION_KEY_INVALID";
  }
}
