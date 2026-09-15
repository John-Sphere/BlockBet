import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";
import { keccak256, toUtf8Bytes } from "ethers";

/**
 * BlockMail crypto layer — generalized to encrypt/decrypt arbitrary bytes,
 * not just text. Message bodies and file attachments both go through the
 * same nacl.box primitive; text helpers are thin wrappers around the byte
 * helpers.
 */

const KEY_DERIVATION_MESSAGE =
  "Sign this message to generate your BlockMail encryption key.\n\n" +
  "This does NOT cost gas and will NOT trigger a blockchain transaction.\n" +
  "Signing again will always produce the same BlockMail identity.";

export async function deriveMailKeypair(signMessageFn) {
  const signature = await signMessageFn(KEY_DERIVATION_MESSAGE);
  const seedHex = keccak256(toUtf8Bytes(signature)).slice(2);
  const seed = hexToBytes(seedHex);
  return nacl.box.keyPair.fromSecretKey(seed);
}

/** Core: encrypt raw bytes for a recipient. Works for text OR file data. */
export function encryptBytes(plaintextBytes, recipientPublicKey, senderSecretKey) {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const ciphertext = nacl.box(plaintextBytes, nonce, recipientPublicKey, senderSecretKey);
  return { ciphertext, nonce };
}

/** Core: decrypt raw bytes. Returns null on failure (wrong key / tampered data). */
export function decryptBytes(ciphertext, nonce, senderPublicKey, recipientSecretKey) {
  return nacl.box.open(ciphertext, nonce, senderPublicKey, recipientSecretKey); // Uint8Array | null
}

/** Text convenience wrappers (message bodies). */
export function encryptMail(plaintext, recipientPublicKey, senderSecretKey) {
  return encryptBytes(naclUtil.decodeUTF8(plaintext), recipientPublicKey, senderSecretKey);
}
export function decryptMail(ciphertext, nonce, senderPublicKey, recipientSecretKey) {
  const opened = decryptBytes(ciphertext, nonce, senderPublicKey, recipientSecretKey);
  return opened ? naclUtil.encodeUTF8(opened) : null;
}

/** File convenience wrappers — same primitive, raw bytes in/out instead of UTF-8 text. */
export function encryptFileBytes(fileBytes, recipientPublicKey, senderSecretKey) {
  return encryptBytes(fileBytes, recipientPublicKey, senderSecretKey);
}
export function decryptFileBytes(ciphertext, nonce, senderPublicKey, recipientSecretKey) {
  return decryptBytes(ciphertext, nonce, senderPublicKey, recipientSecretKey); // Uint8Array | null
}

export function bytesToHex(bytes) {
  return "0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
export function hexToBytes(hex) {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}
