/**
 * /api/ipfs-upload
 *
 * Pins an already-encrypted blob to IPFS and returns its CID. This endpoint
 * NEVER sees plaintext — the client encrypts the file with the recipient's
 * public key before it's ever sent here, so this function (and Pinata,
 * the actual pinning service) only ever handles ciphertext.
 *
 * Uses Pinata — real, current, active API as of this writing. An earlier
 * version of this used web3.storage's classic API, which was deprecated
 * back in January 2024 (that whole company rebranded to Storacha with a
 * completely different auth model) — worth knowing if you ever see older
 * web3.storage code referenced elsewhere, since it genuinely no longer
 * accepts uploads.
 *
 * Set PINATA_JWT in your Vercel environment variables (server-side only,
 * never exposed to the browser) — generate one at pinata.cloud/keys.
 */

export const config = {
  api: {
    bodyParser: false, // we want the raw encrypted bytes, not JSON-parsed
  },
};

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB cap — tune based on real usage/costs

async function readRawBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_UPLOAD_BYTES) {
      throw new Error("File too large");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = await readRawBody(req);
    if (body.length === 0) {
      return res.status(400).json({ error: "Empty upload" });
    }

    const formData = new FormData();
    const blob = new Blob([body], { type: "application/octet-stream" });
    formData.append("file", blob, "blockmail-ciphertext.bin");

    const uploadRes = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PINATA_JWT}`,
      },
      body: formData,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return res.status(502).json({ error: `IPFS pinning failed: ${errText}` });
    }

    const result = await uploadRes.json();
    return res.status(200).json({ cid: result.IpfsHash });
  } catch (err) {
    const status = err.message === "File too large" ? 413 : 500;
    return res.status(status).json({ error: err.message });
  }
}
