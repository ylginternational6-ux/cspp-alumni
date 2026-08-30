import { Router } from "express";
import multer from "multer";
import { createContext } from "./context";
import { requireActiveAccount } from "../permissions";
import { storagePut } from "../storage";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 Mo

const ALLOWED_MIME_TYPES_BY_PURPOSE: Record<string, string[]> = {
  avatar: ["image/jpeg", "image/png", "image/webp"],
  verification_document: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  message_attachment: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
};

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_SIZE_BYTES } });

export const uploadRouter = Router();

/**
 * Upload générique, protégé par la même session que le reste de
 * l'application (cookie de session tRPC). Le champ "purpose" détermine les
 * types MIME acceptés et le préfixe de rangement du fichier. Un compte
 * suspendu ou désactivé ne peut rien uploader (requireActiveAccount).
 */
uploadRouter.post("/", upload.single("file"), async (req, res) => {
  try {
    const ctx = await createContext({ req, res });
    if (!ctx.user) {
      res.status(401).json({ error: "Vous devez être connecté pour envoyer un fichier." });
      return;
    }
    requireActiveAccount(ctx.user.accountStatus);

    const purpose = typeof req.body?.purpose === "string" ? req.body.purpose : "message_attachment";
    const allowedMimeTypes = ALLOWED_MIME_TYPES_BY_PURPOSE[purpose];
    if (!allowedMimeTypes) {
      res.status(400).json({ error: "Type d'envoi inconnu." });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "Aucun fichier reçu." });
      return;
    }
    if (!allowedMimeTypes.includes(file.mimetype)) {
      res.status(400).json({ error: "Type de fichier non autorisé pour cet usage." });
      return;
    }

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
    const relKey = `${purpose}/${ctx.user.id}/${safeName}`;
    const { key, url } = await storagePut(relKey, file.buffer, file.mimetype);

    res.json({ storageKey: key, url, originalName: file.originalname, mimeType: file.mimetype, sizeBytes: file.size });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Échec de l'envoi du fichier.";
    res.status(400).json({ error: message });
  }
});
