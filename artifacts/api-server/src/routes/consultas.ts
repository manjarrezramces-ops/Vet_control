import { Router } from "express";
import {
  db,
  consultasTable,
  pacientesTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateConsultaParams,
  CreateConsultaBody,
  CreateConsultaResponse,
  GetConsultaParams,
  GetConsultaResponse,
  UpdateConsultaParams,
  UpdateConsultaBody,
  UpdateConsultaResponse,
  DeleteConsultaParams,
} from "@workspace/api-zod";

const router = Router();

function parseArchivosEstudios(
  valor: string | null | undefined,
): string[] {
  if (!valor?.trim()) return [];

  try {
    const parsed: unknown = JSON.parse(valor);

    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0,
      );
    }

    if (typeof parsed === "string" && parsed.trim()) {
      return [parsed];
    }
  } catch {
    // Compatibilidad con consultas antiguas que guardaban una sola ruta.
  }

  return [valor];
}

function serializeArchivosEstudios(
  archivos: string[],
): string | null {
  const unicos = Array.from(
    new Set(
      archivos
        .map((archivo) => archivo.trim())
        .filter(Boolean),
    ),
  );

  return unicos.length > 0 ? JSON.stringify(unicos) : null;
}

function readId(
  value: string | string[] | undefined,
): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const id = Number.parseInt(raw ?? "", 10);
  return Number.isNaN(id) ? null : id;
}

router.post(
  "/pacientes/:pacienteId/consultas",
  async (req, res): Promise<void> => {
    const pacienteId = readId(req.params.pacienteId);

    if (pacienteId === null) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const paramsParsed = CreateConsultaParams.safeParse({ pacienteId });
    if (!paramsParsed.success) {
      res.status(400).json({ error: paramsParsed.error.message });
      return;
    }

    const parsed = CreateConsultaBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [paciente] = await db
      .select({ id: pacientesTable.id })
      .from(pacientesTable)
      .where(eq(pacientesTable.id, pacienteId));

    if (!paciente) {
      res.status(404).json({ error: "Paciente no encontrado" });
      return;
    }

    const [consulta] = await db
      .insert(consultasTable)
      .values({ ...parsed.data, pacienteId })
      .returning();

    res.status(201).json(
      CreateConsultaResponse.parse({
        ...consulta,
        peso: consulta.peso != null ? Number(consulta.peso) : null,
        temperatura:
          consulta.temperatura != null
            ? Number(consulta.temperatura)
            : null,
        creadoEn: consulta.creadoEn.toISOString(),
      }),
    );
  },
);

router.get(
  "/consultas/:consultaId",
  async (req, res): Promise<void> => {
    const consultaId = readId(req.params.consultaId);

    if (consultaId === null) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const paramsParsed = GetConsultaParams.safeParse({ consultaId });
    if (!paramsParsed.success) {
      res.status(400).json({ error: paramsParsed.error.message });
      return;
    }

    const [consulta] = await db
      .select()
      .from(consultasTable)
      .where(eq(consultasTable.id, consultaId));

    if (!consulta) {
      res.status(404).json({ error: "Consulta no encontrada" });
      return;
    }

    const respuestaBase = GetConsultaResponse.parse({
      ...consulta,
      peso: consulta.peso != null ? Number(consulta.peso) : null,
      temperatura:
        consulta.temperatura != null
          ? Number(consulta.temperatura)
          : null,
      creadoEn: consulta.creadoEn.toISOString(),
    });

    const archivosEstudios = parseArchivosEstudios(
      consulta.archivoEstudios,
    );

    res.json({
      ...respuestaBase,
      archivosEstudios,
      archivoEstudios: archivosEstudios[0] ?? null,
    });
  },
);

router.put(
  "/consultas/:consultaId",
  async (req, res): Promise<void> => {
    const consultaId = readId(req.params.consultaId);

    if (consultaId === null) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const paramsParsed = UpdateConsultaParams.safeParse({ consultaId });
    if (!paramsParsed.success) {
      res.status(400).json({ error: paramsParsed.error.message });
      return;
    }

    const parsed = UpdateConsultaBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [updated] = await db
      .update(consultasTable)
      .set(parsed.data)
      .where(eq(consultasTable.id, consultaId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Consulta no encontrada" });
      return;
    }

    res.json(
      UpdateConsultaResponse.parse({
        ...updated,
        peso: updated.peso != null ? Number(updated.peso) : null,
        temperatura:
          updated.temperatura != null
            ? Number(updated.temperatura)
            : null,
        creadoEn: updated.creadoEn.toISOString(),
      }),
    );
  },
);

router.patch(
  "/consultas/:consultaId/archivos",
  async (req, res): Promise<void> => {
    const consultaId = readId(req.params.consultaId);

    if (consultaId === null) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const body = req.body as { archivos?: unknown };

    if (
      !Array.isArray(body.archivos) ||
      !body.archivos.every(
        (archivo) =>
          typeof archivo === "string" && archivo.trim().length > 0,
      )
    ) {
      res.status(400).json({
        error: "Debes enviar archivos como una lista de rutas válidas.",
      });
      return;
    }

    const [consulta] = await db
      .select({
        id: consultasTable.id,
        archivoEstudios: consultasTable.archivoEstudios,
      })
      .from(consultasTable)
      .where(eq(consultasTable.id, consultaId));

    if (!consulta) {
      res.status(404).json({ error: "Consulta no encontrada" });
      return;
    }

    const actuales = parseArchivosEstudios(consulta.archivoEstudios);
    const nuevos = (body.archivos as string[]).map((archivo) =>
      archivo.trim(),
    );
    const combinados = Array.from(new Set([...actuales, ...nuevos]));

    const [updated] = await db
      .update(consultasTable)
      .set({
        archivoEstudios: serializeArchivosEstudios(combinados),
      })
      .where(eq(consultasTable.id, consultaId))
      .returning({
        archivoEstudios: consultasTable.archivoEstudios,
      });

    res.json({
      archivosEstudios: parseArchivosEstudios(updated.archivoEstudios),
    });
  },
);

router.delete(
  "/consultas/:consultaId/archivos",
  async (req, res): Promise<void> => {
    const consultaId = readId(req.params.consultaId);

    if (consultaId === null) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const body = req.body as { archivo?: unknown };

    if (typeof body.archivo !== "string" || !body.archivo.trim()) {
      res.status(400).json({
        error: "Debes indicar el archivo que deseas eliminar.",
      });
      return;
    }

    const archivoAEliminar = body.archivo.trim();

    const [consulta] = await db
      .select({
        id: consultasTable.id,
        archivoEstudios: consultasTable.archivoEstudios,
      })
      .from(consultasTable)
      .where(eq(consultasTable.id, consultaId));

    if (!consulta) {
      res.status(404).json({ error: "Consulta no encontrada" });
      return;
    }

    const restantes = parseArchivosEstudios(
      consulta.archivoEstudios,
    ).filter((archivo) => archivo !== archivoAEliminar);

    const [updated] = await db
      .update(consultasTable)
      .set({
        archivoEstudios: serializeArchivosEstudios(restantes),
      })
      .where(eq(consultasTable.id, consultaId))
      .returning({
        archivoEstudios: consultasTable.archivoEstudios,
      });

    res.json({
      archivosEstudios: parseArchivosEstudios(updated.archivoEstudios),
    });
  },
);

// Compatibilidad con el endpoint anterior.
router.patch(
  "/consultas/:consultaId/archivo",
  async (req, res): Promise<void> => {
    const consultaId = readId(req.params.consultaId);

    if (consultaId === null) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const body = req.body as {
      archivoEstudios?: string | null;
    };

    if (
      body.archivoEstudios !== null &&
      typeof body.archivoEstudios !== "string"
    ) {
      res.status(400).json({
        error: "archivoEstudios debe ser una ruta o null.",
      });
      return;
    }

    const [consulta] = await db
      .select({
        id: consultasTable.id,
        archivoEstudios: consultasTable.archivoEstudios,
      })
      .from(consultasTable)
      .where(eq(consultasTable.id, consultaId));

    if (!consulta) {
      res.status(404).json({ error: "Consulta no encontrada" });
      return;
    }

    const actuales = parseArchivosEstudios(consulta.archivoEstudios);
    const siguientes =
      body.archivoEstudios === null
        ? []
        : Array.from(new Set([...actuales, body.archivoEstudios]));

    const [updated] = await db
      .update(consultasTable)
      .set({
        archivoEstudios: serializeArchivosEstudios(siguientes),
      })
      .where(eq(consultasTable.id, consultaId))
      .returning({
        archivoEstudios: consultasTable.archivoEstudios,
      });

    const archivosEstudios = parseArchivosEstudios(
      updated.archivoEstudios,
    );

    res.json({
      archivosEstudios,
      archivoEstudios: archivosEstudios[0] ?? null,
    });
  },
);

router.delete(
  "/consultas/:consultaId",
  async (req, res): Promise<void> => {
    const consultaId = readId(req.params.consultaId);

    if (consultaId === null) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const paramsParsed = DeleteConsultaParams.safeParse({ consultaId });
    if (!paramsParsed.success) {
      res.status(400).json({ error: paramsParsed.error.message });
      return;
    }

    const [deleted] = await db
      .delete(consultasTable)
      .where(eq(consultasTable.id, consultaId))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Consulta no encontrada" });
      return;
    }

    res.status(204).send();
  },
);

export default router;
