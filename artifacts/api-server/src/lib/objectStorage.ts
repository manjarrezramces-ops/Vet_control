import { randomUUID } from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import {
  ObjectAclPolicy,
  ObjectPermission,
} from './objectAcl';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = process.env.SUPABASE_BUCKET || 'estudios';

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL environment variable is required.');
}

if (!supabaseSecretKey) {
  throw new Error(
    'SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is required.',
  );
}

const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseSecretKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

export interface SupabaseObjectFile {
  name: string;
  bucket: string;
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super('Object not found');
    this.name = 'ObjectNotFoundError';
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  getBucketName(): string {
    return bucketName;
  }

  createObjectId(): string {
    return randomUUID();
  }

  getUploadPath(objectId: string): string {
    return `uploads/${objectId}`;
  }

  getObjectPath(objectId: string): string {
    return `/objects/uploads/${objectId}`;
  }

  async uploadObject(
    objectName: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(objectName, body, {
        contentType: contentType || 'application/octet-stream',
        upsert: false,
      });

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }
  }

  async searchPublicObject(
    filePath: string,
  ): Promise<SupabaseObjectFile | null> {
    const normalizedPath = filePath.replace(/^\/+/, '');

    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(getParentDirectory(normalizedPath), {
        search: getBaseName(normalizedPath),
      });

    if (error) {
      throw new Error(`Supabase search failed: ${error.message}`);
    }

    const expectedName = getBaseName(normalizedPath);
    const exists = data.some((item) => item.name === expectedName);

    return exists
      ? { name: normalizedPath, bucket: bucketName }
      : null;
  }

  async downloadObject(
    file: SupabaseObjectFile,
    cacheTtlSec: number = 3600,
  ): Promise<Response> {
    const { data, error } = await supabase.storage
      .from(file.bucket)
      .download(file.name);

    if (error || !data) {
      if (error?.message.toLowerCase().includes('not found')) {
        throw new ObjectNotFoundError();
      }

      throw new Error(
        `Supabase download failed: ${error?.message || 'Unknown error'}`,
      );
    }

    const arrayBuffer = await data.arrayBuffer();
    const body = Buffer.from(arrayBuffer);

    return new Response(body, {
      headers: {
        'Content-Type': data.type || 'application/octet-stream',
        'Content-Length': String(body.length),
        'Cache-Control': `private, max-age=${cacheTtlSec}`,
      },
    });
  }

  async getObjectEntityFile(
    objectPath: string,
  ): Promise<SupabaseObjectFile> {
    if (!objectPath.startsWith('/objects/')) {
      throw new ObjectNotFoundError();
    }

    const objectName = objectPath
      .slice('/objects/'.length)
      .replace(/^\/+/, '');

    if (!objectName) {
      throw new ObjectNotFoundError();
    }

    const parentDirectory = getParentDirectory(objectName);
    const fileName = getBaseName(objectName);

    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(parentDirectory, {
        search: fileName,
        limit: 100,
      });

    if (error) {
      throw new Error(`Supabase lookup failed: ${error.message}`);
    }

    if (!data.some((item) => item.name === fileName)) {
      throw new ObjectNotFoundError();
    }

    return {
      name: objectName,
      bucket: bucketName,
    };
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (rawPath.startsWith('/objects/')) {
      return rawPath;
    }

    try {
      const url = new URL(rawPath);
      const marker = `/storage/v1/object/${bucketName}/`;
      const markerIndex = url.pathname.indexOf(marker);

      if (markerIndex >= 0) {
        const objectName = url.pathname.slice(
          markerIndex + marker.length,
        );
        return `/objects/${objectName}`;
      }
    } catch {
      // El valor no es una URL; se devuelve sin modificar.
    }

    return rawPath;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    _aclPolicy: ObjectAclPolicy,
  ): Promise<string> {
    /*
     * El bucket es privado y los archivos se entregan solamente a través
     * del backend. Supabase controla el acceso al bucket; no necesitamos
     * los metadatos ACL particulares de Replit.
     */
    return this.normalizeObjectEntityPath(rawPath);
  }

  async canAccessObjectEntity({
    requestedPermission,
  }: {
    userId?: string;
    objectFile: SupabaseObjectFile;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    /*
     * Conserva la interfaz que utiliza el resto de la aplicación.
     * La autorización clínica debe controlarse en las rutas/autenticación.
     */
    return (
      requestedPermission === undefined ||
      requestedPermission === ObjectPermission.READ ||
      requestedPermission === ObjectPermission.WRITE
    );
  }
}

function getParentDirectory(objectName: string): string {
  const slashIndex = objectName.lastIndexOf('/');
  return slashIndex >= 0 ? objectName.slice(0, slashIndex) : '';
}

function getBaseName(objectName: string): string {
  const slashIndex = objectName.lastIndexOf('/');
  return slashIndex >= 0
    ? objectName.slice(slashIndex + 1)
    : objectName;
}
