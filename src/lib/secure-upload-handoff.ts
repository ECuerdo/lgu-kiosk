import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import net from "net";

export const HANDOFF_MAX_FILE_SIZE = 5 * 1024 * 1024;
export const HANDOFF_ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
export const HANDOFF_SESSION_DURATION_MS = 30 * 60 * 1000;

export type HandoffPayload = {
  userId: string;
  slot: string;
  nonce: string;
  exp: number;
};

function getSecret() {
  const secret = process.env.UPLOAD_HANDOFF_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("UPLOAD_HANDOFF_SECRET must contain at least 32 characters.");
  }
  return secret;
}

function encode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function sign(encodedPayload: string) {
  return createHmac("sha256", getSecret()).update(encodedPayload).digest("base64url");
}

export function createHandoffToken(userId: string, slot: string) {
  const payload: HandoffPayload = {
    userId,
    slot,
    nonce: randomBytes(18).toString("hex"),
    exp: Date.now() + HANDOFF_SESSION_DURATION_MS,
  };
  const encodedPayload = encode(JSON.stringify(payload));
  return {
    token: `${encodedPayload}.${sign(encodedPayload)}`,
    expiresAt: payload.exp,
  };
}

export function verifyHandoffToken(token: string): HandoffPayload {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) throw new Error("Invalid handoff token.");

  const expected = Buffer.from(sign(encodedPayload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error("Invalid handoff token.");
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as HandoffPayload;
  if (!payload.userId || !payload.slot || !payload.nonce || payload.exp <= Date.now()) {
    throw new Error("This upload handoff has expired.");
  }
  return payload;
}

export function getHandoffStoragePrefix(payload: HandoffPayload) {
  const namespace = payload.slot.startsWith("bp_")
    ? "business-permits"
    : payload.slot === "birth_id"
      ? "birth-certificates"
      : payload.slot.startsWith("lcr_")
        ? "civil-registry"
        : "building-permits";
  return `${namespace}/${payload.userId}/handoff/${payload.nonce}`;
}

export function isAllowedHandoffSlot(sessionSlot: string, uploadSlot: string) {
  if (sessionSlot === "documents") {
    return (/^req_[0-9]$/.test(uploadSlot) && uploadSlot !== "req_5") || /^permit_[0-6]$/.test(uploadSlot);
  }
  if (sessionSlot === "birth_id") {
    return uploadSlot === "idFront" || uploadSlot === "idBack";
  }
  if (sessionSlot.startsWith("bp_")) {
    return sessionSlot === uploadSlot;
  }
  return sessionSlot === uploadSlot;
}

export function inspectFileSignature(buffer: Buffer) {
  if (
    buffer.length >= 5 &&
    buffer.subarray(0, 5).toString("ascii") === "%PDF-"
  ) {
    return { mime: "application/pdf", extension: "pdf" };
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return { mime: "image/png", extension: "png" };
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: "image/jpeg", extension: "jpg" };
  }
  throw new Error("The file content is not a valid PDF, JPG, or PNG.");
}

export async function scanWithClamAv(buffer: Buffer) {
  const enabled = process.env.NEXT_PUBLIC_ENABLE_CLAMAV_SCAN?.toLowerCase() === "true";
  if (!enabled) {
    return;
  }

  const host = process.env.CLAMAV_HOST;
  const port = Number(process.env.CLAMAV_PORT || "3310");
  if (!host) {
    throw new Error("Malware scanner is unavailable. Upload was blocked.");
  }

  await new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error("Malware scan timed out. Upload was blocked."));
    }, 30_000);
    const response: Buffer[] = [];

    socket.on("connect", () => {
      socket.write("zINSTREAM\0");
      for (let offset = 0; offset < buffer.length; offset += 64 * 1024) {
        const chunk = buffer.subarray(offset, offset + 64 * 1024);
        const size = Buffer.alloc(4);
        size.writeUInt32BE(chunk.length);
        socket.write(size);
        socket.write(chunk);
      }
      socket.end(Buffer.alloc(4));
    });
    socket.on("data", chunk => response.push(chunk));
    socket.on("error", error => {
      clearTimeout(timeout);
      reject(new Error(`Malware scanner error: ${error.message}`));
    });
    socket.on("close", () => {
      clearTimeout(timeout);
      const result = Buffer.concat(response).toString("utf8");
      if (result.includes("FOUND")) {
        reject(new Error("Malware was detected. The file was rejected."));
      } else if (result.includes("OK")) {
        resolve();
      } else {
        reject(new Error("Malware scan could not be verified. Upload was blocked."));
      }
    });
  });
}
