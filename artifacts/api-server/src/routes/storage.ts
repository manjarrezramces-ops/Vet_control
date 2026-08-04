import { Readable } from 'stream';
import { z } from 'zod';
import {
  Router,
  express,
  type IRouter,
  type Request,
  type Response,
} from 'express';

import {
  ObjectNotFoundError,
  ObjectStorageService,
} from '../lib/objectStorage';

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

const UploadUrlRequestBody = z.object({
  name: z.string().min(1),
  size: z.number().int().positive().max(MAX_FILE_SIZE),
  contentType: z.string().min(1),
});

/*
 * El frontend solicita primero una dirección de subida.
 * Le devolvemos una ruta temporal de nuestro propio backend.
 */
router.post(
  '/storage/uploads/request-url',
  async (req: Request, res: Response) => {
    const parsed = UploadUrlRequestBody.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Missing or invalid required fields',
      });
      return;
    }

    try {
      const { name, size, contentType } = parsed.data;
      const objectId = objectStorageService.createObjectId();
      const uploadPath = objectStorageService.getUploadPath(objectId);
      const objectPath = objectStorageService.getObjectPath(objectId);

      /*
       * Ruta relativa: el rewrite del Static Site enviará /api al backend.
       * Los metadatos viajan codificados para conservar el flujo existente.
       */
      const query = new URLSearchParams({
        name,
        size: String(size),
        contentType,
      });

      const uploadURL =
        `/api/storage/uploads/${encodeURIComponent(objectId)}?${query}`;

      res.json({
        uploadURL,
        objectPath,
        metadata: {
          name,
          size,
          contentType,
          uploadPath,
        },
      });
    } catch (error) {
      req.log.error({ err: error }, 'Error generating upload URL');
      res.status(500).json({
        error: 'Failed to generate upload URL',
      });
    }
  },
);

/*
 * Recibe el PUT que ya realiza el frontend y guarda el contenido
 * dentro del bucket privado de Supabase.
 */
router.put(
  '/storage/uploads/:objectId',
  express.raw({
    type: () => true,
    limit: `${MAX_FILE_SIZE}b`,
  }),
  async (req: Request, res: Response) => {
    try {
      const objectId = req.params.objectId;
      const expectedSize = Number(req.query.size);
      const requestedContentType =
        typeof req.query.contentType === 'string'
          ? req.query.contentType
          : undefined;

      if (!objectId) {
        res.status(400).json({ error: 'Missing object ID' });
        return;
      }

      if (!Buffer.isBuffer(req.body)) {
        res.status(400).json({ error: 'Missing file body' });
        return;
      }

      if (
        Number.isFinite(expectedSize) &&
        expectedSize > 0 &&
        req.body.length !== expectedSize
      ) {
        res.status(400).json({
          error: 'Uploaded file size does not match requested size',
        });
        return;
      }

      const contentType =
        requestedContentType ||
        req.get('content-type') ||
        'application/octet-stream';

      const allowedTypes = new Set([
        'image/png',
        'image/jpeg',
        'image/jpg',
        'application/pdf',
      ]);

      if (!allowedTypes.has(contentType.toLowerCase())) {
        res.status(415).json({
          error: 'Only PNG, JPG, JPEG and PDF files are allowed',
        });
        return;
      }

      const uploadPath =
        objectStorageService.getUploadPath(objectId);

      await objectStorageService.uploadObject(
        uploadPath,
        req.body,
        contentType,
      );

      res.status(200).json({
        objectPath: objectStorageService.getObjectPath(objectId),
      });
    } catch (error) {
      req.log.error({ err: error }, 'Error uploading object');
      res.status(500).json({ error: 'Failed to upload object' });
    }
  },
);

router.get(
  '/storage/public-objects/*filePath',
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.filePath;
      const filePath = Array.isArray(raw)
        ? raw.join('/')
        : raw;

      const file =
        await objectStorageService.searchPublicObject(filePath);

      if (!file) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      await pipeObjectResponse(
        await objectStorageService.downloadObject(file),
        res,
      );
    } catch (error) {
      req.log.error({ err: error }, 'Error serving public object');
      res.status(500).json({
        error: 'Failed to serve public object',
      });
    }
  },
);

router.get(
  '/storage/objects/*path',
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.path;
      const wildcardPath = Array.isArray(raw)
        ? raw.join('/')
        : raw;

      const objectPath = `/objects/${wildcardPath}`;
      const objectFile =
        await objectStorageService.getObjectEntityFile(objectPath);

      await pipeObjectResponse(
        await objectStorageService.downloadObject(objectFile),
        res,
      );
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        res.status(404).json({ error: 'Object not found' });
        return;
      }

      req.log.error({ err: error }, 'Error serving object');
      res.status(500).json({
        error: 'Failed to serve object',
      });
    }
  },
);

async function pipeObjectResponse(
  response: globalThis.Response,
  res: Response,
): Promise<void> {
  res.status(response.status);

  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  if (response.body) {
    Readable.fromWeb(
      response.body as ReadableStream<Uint8Array>,
    ).pipe(res);
    return;
  }

  res.end();
}

export default router;
