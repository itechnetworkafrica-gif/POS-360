import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import {
  ObjectStorageService,
  ObjectNotFoundError,
  ObjectStorageUnavailableError,
  IS_REPLIT_STORAGE_AVAILABLE,
} from "../lib/objectStorage";
import {
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
  ObjectPermission,
} from "../lib/objectAcl";
import {
  signReservationToken,
  verifyReservationToken,
} from "../lib/auth";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * Runtime guard for all storage routes.
 * On non-Replit runtimes (e.g. Vercel) returns 503 after authentication.
 * Auth is intentionally required before 503 so unauthenticated callers cannot
 * probe for runtime characteristics.
 */
function requireReplitStorage(_req: Request, res: Response, next: () => void): void {
  if (!IS_REPLIT_STORAGE_AVAILABLE) {
    res.status(503).json({
      error:
        "Object storage is only available when deployed on Replit. " +
        "Configure Replit Object Storage to enable this feature.",
    });
    return;
  }
  next();
}

/**
 * Step 1 of two-step upload: request a signed PUT URL.
 *
 * Returns a `reservationToken` — a SERVER_SECRET-signed JWT containing objectPath and
 * ownerId — that the client must send back with /confirm. This token is verifiable on
 * any instance without shared state (no process-local map), so it works correctly in
 * autoscale/multi-instance deployments.
 */
router.post(
  "/storage/uploads/request-url",
  requireReplitStorage,
  async (req: Request, res: Response) => {
    const { name, size, contentType } = req.body as {
      name?: string; size?: number; contentType?: string;
    };
    if (!name || !contentType) {
      res.status(400).json({ error: "name and contentType are required" });
      return;
    }
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      const ownerId = String(req.user!.id);
      // Signed token binds this objectPath to the uploading user across all instances.
      const reservationToken = signReservationToken(objectPath, ownerId);
      res.json({ uploadURL, objectPath, reservationToken, metadata: { name, size, contentType } });
    } catch (error) {
      if (error instanceof ObjectStorageUnavailableError) {
        res.status(503).json({ error: (error as Error).message }); return;
      }
      req.log.error({ err: error }, "Error generating upload URL");
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  }
);

/**
 * Step 2 of two-step upload: verify the reservationToken and set the private ACL.
 *
 * The token is verified with SESSION_SECRET (shared across instances).
 * Only the user whose ID is in the token can confirm.
 * ACL is set atomically after verification; on failure the client may retry.
 */
router.post(
  "/storage/uploads/confirm",
  requireReplitStorage,
  async (req: Request, res: Response) => {
    const { objectPath, reservationToken } = req.body as {
      objectPath?: string; reservationToken?: string;
    };
    if (!objectPath || !reservationToken) {
      res.status(400).json({ error: "objectPath and reservationToken are required" }); return;
    }
    const userId = String(req.user!.id);
    const reservation = verifyReservationToken(reservationToken);
    if (!reservation) {
      res.status(400).json({ error: "Invalid or expired reservationToken." }); return;
    }
    if (reservation.objectPath !== objectPath) {
      res.status(400).json({ error: "reservationToken does not match the supplied objectPath." }); return;
    }
    if (reservation.ownerId !== userId) {
      res.status(403).json({ error: "Upload confirmation must be performed by the user who requested the URL." }); return;
    }
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
      // Set ACL before returning success so any subsequent GET can find the policy.
      await setObjectAclPolicy(objectFile, { owner: userId, visibility: "private" });
      res.json({ objectPath, owner: userId });
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        // Object doesn't exist yet — GCS PUT may still be in flight. Client can retry.
        res.status(404).json({ error: "Object not found — ensure the GCS PUT completed before confirming." });
        return;
      }
      if (error instanceof ObjectStorageUnavailableError) {
        res.status(503).json({ error: (error as Error).message }); return;
      }
      req.log.error({ err: error }, "Error confirming upload");
      res.status(500).json({ error: "Failed to confirm upload" });
    }
  }
);

router.get(
  "/storage/public-objects/*filePath",
  requireReplitStorage,
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.filePath;
      const filePath = Array.isArray(raw) ? raw.join("/") : raw;
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) { res.status(404).json({ error: "File not found" }); return; }
      const response = await objectStorageService.downloadObject(file);
      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));
      if (response.body) {
        const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (error) {
      if (error instanceof ObjectStorageUnavailableError) {
        res.status(503).json({ error: (error as Error).message }); return;
      }
      req.log.error({ err: error }, "Error serving public object");
      res.status(500).json({ error: "Failed to serve public object" });
    }
  }
);

router.get(
  "/storage/objects/*path",
  requireReplitStorage,
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.path;
      const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
      const objectPath = `/objects/${wildcardPath}`;
      const userId = String(req.user!.id);
      const objectFile = await objectStorageService.getObjectEntityFile(objectPath);

      const aclPolicy = await getObjectAclPolicy(objectFile);
      if (!aclPolicy) {
        // No ACL set — the upload was not confirmed. The client must call /confirm first.
        res.status(403).json({
          error: "Object has no access policy. Call POST /storage/uploads/confirm to establish ownership.",
        }); return;
      }

      const canAccess = await canAccessObject({
        userId,
        objectFile,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        res.status(403).json({ error: "Access denied" }); return;
      }

      const response = await objectStorageService.downloadObject(objectFile);
      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));
      if (response.body) {
        const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (error) {
      if (error instanceof ObjectStorageUnavailableError) {
        res.status(503).json({ error: (error as Error).message }); return;
      }
      if (error instanceof ObjectNotFoundError) {
        req.log.warn({ err: error }, "Object not found");
        res.status(404).json({ error: "Object not found" }); return;
      }
      req.log.error({ err: error }, "Error serving object");
      res.status(500).json({ error: "Failed to serve object" });
    }
  }
);

export default router;
