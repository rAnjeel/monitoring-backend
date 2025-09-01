import express from "express";
import crypto from "crypto";
import bodyParser from "body-parser";

const app = express();
const PORT = 4000; // tu peux changer le port

app.use(bodyParser.json());

const algorithm = "aes-256-ctr";
const password = "NocAdmin123";

/**
 * Encrypt a text
 */
function encrypt(text) {
  const cipher = crypto.createCipher(algorithm, password);
  let crypted = cipher.update(text, "utf8", "hex");
  crypted += cipher.final("hex");
  return crypted;
}

/**
 * Decrypt a text
 */
function decrypt(text) {
  const decipher = crypto.createDecipher(algorithm, password);
  let decrypted = decipher.update(text, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// Route pour encrypter
app.post("/encrypt", (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Text is required" });
  try {
    const encrypted = encrypt(text);
    res.json({ encrypted });
  } catch (err) {
    res.status(500).json({ error: "Encryption failed", details: err.message });
  }
});

// Route pour décrypter
app.post("/decrypt", (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "Text is required" });
  try {
    const decrypted = decrypt(text);
    res.json({ decrypted });
  } catch (err) {
    res.status(500).json({ error: "Decryption failed", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Express server running on http://localhost:${PORT}`);
});
