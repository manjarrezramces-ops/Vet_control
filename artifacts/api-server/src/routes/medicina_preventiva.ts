import { Router } from "express";
import {
  db,
  pacientesTable,
  vacunacionVisitasTable,
  vacunacionesTable,
  desparasitacionesTable,
  pruebasFelinasTable,
} from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod/v4";

const router = Router();

/* =========================================================
   TIPOS DEL MOTOR PREVENTIVO
========================================================= */

type EspeciePreventiva = "Perro" | "Gato";
type EtapaPreventiva = "Cachorro" | "Adulto";

type EstadoVacunacion =
  | "Aplicada"
  | "Programada/Pendiente"
  | "Cancelada";

type EstadoCalculado =
  | "Sin historial"
  | "Al corriente"
  | "Próxima"
  | "Hoy"
  | "Atrasada"
  | "Pendiente de decisión médica";

type VacunaSugerida = {
  vacuna: string;
  motivo: string;
  requiereDecisionMedica?: boolean;
};

type ResumenVacunal = {
  especie: EspeciePreventiva | null;
  etapa: EtapaPreventiva | null;
  intervaloDias: number;
  estado: EstadoCalculado;
  fechaSugerida: string | null;
  diasDiferencia: number | null;
  vacunasSiguienteVisita: VacunaSugerida[];
  vacunasPendientesPosteriores: VacunaSugerida[];
  esquemaCompleto: boolean;
  advertencias: string[];
};

/* =========================================================
   ESQUEMAS DE VALIDACIÓN
========================================================= */

const idSchema = z.coerce.number().int().positive();

const origenSchema = z.enum(["Clinica", "Externa"]);

const estadoVacunaSchema = z.enum([
  "Aplicada",
  "Programada/Pendiente",
  "Cancelada",
]);

const vacunaSchema = z.object({
  vacuna: z.string().min(1),
  especie: z.enum(["Perro", "Gato"]),
  etapa: z.enum(["Cachorro", "Adulto"]),

  marca: z.string().optional(),
  laboratorio: z.string().optional(),
  lote: z.string().optional(),
  fechaCaducidad: z.string().optional(),

  fechaAplicacion: z.string().min(1),
  fechaVencimiento: z.string().optional(),
  proximaAplicacion: z.string().optional(),

  estado: estadoVacunaSchema.optional(),

  decisionMedica: z.string().optional(),
  motivoDecision: z.string().optional(),

  tipoRegistro: z.string().optional(),

  reaccionAdversa: z.boolean().optional(),
  descripcionReaccion: z.string().optional(),
  observaciones: z.string().optional(),
});

const crearVisitaVacunacionSchema = z.object({
  consultaId: z.number().int().positive().optional(),

  fechaVisita: z.string().min(1),

  intervaloDias: z
    .union([z.literal(15), z.literal(21)])
    .optional(),

  origen: origenSchema.optional(),

  medicoResponsable: z.string().optional(),

  clinicaExterna: z.string().optional(),
  medicoExterno: z.string().optional(),

  comprobantePresentado: z.boolean().optional(),

  observaciones: z.string().optional(),

  vacunas: z.array(vacunaSchema).min(1).max(2),
});

const actualizarVacunaSchema = vacunaSchema.partial();

const crearDesparasitacionSchema = z
  .object({
    consultaId: z.number().int().positive().optional(),

    fechaAplicacion: z.string().min(1),

    producto: z.string().min(1),

    principioActivo: z.string().optional(),
    lote: z.string().optional(),
    fabricante: z.string().optional(),

    origen: origenSchema.optional(),

    clinicaExterna: z.string().optional(),
    medicoResponsable: z.string().optional(),

    cubreInternos: z.boolean().optional(),
    cubreExternos: z.boolean().optional(),

    duracionDias: z.number().int().positive().optional(),

    frecuenciaDias: z.number().int().positive().optional(),

    proximaAplicacion: z.string().optional(),

    programarProxima: z.boolean().optional(),

    tipoProgramacion: z
      .enum([
        "Duracion del producto",
        "Dias",
        "Semanas",
        "Meses",
        "Fecha exacta",
      ])
      .optional(),

    proximoProductoTipo: z
      .enum([
        "Mismo producto",
        "Otro producto",
        "Por decidir",
      ])
      .optional(),

    proximoProducto: z.string().optional(),

    decisionMedica: z.string().optional(),

    fechaFinCobertura: z.string().optional(),

    pesoAplicacion: z.string().optional(),

    observaciones: z.string().optional(),

    comprobantePresentado: z.boolean().optional(),

    archivoComprobante: z.string().optional(),
  })
  .refine(
    (data) =>
      Boolean(data.cubreInternos) ||
      Boolean(data.cubreExternos),
    {
      message:
        "La desparasitación debe cubrir internos, externos o ambos.",
      path: ["cubreInternos"],
    },
  );

const actualizarDesparasitacionSchema =
  crearDesparasitacionSchema.partial();

const crearPruebaFelinaSchema = z.object({
  consultaId: z.number().int().positive().optional(),

  fechaPrueba: z.string().min(1),
  fechaResultado: z.string().optional(),

  origen: origenSchema.optional(),

  tipoPrueba: z.string().optional(),

  laboratorio: z.string().optional(),
  clinicaExterna: z.string().optional(),

  medicoResponsable: z.string().optional(),
  medicoExterno: z.string().optional(),

  resultadoFiv: z.enum([
    "Negativo",
    "Positivo",
    "Indeterminado",
    "Pendiente",
  ]),

  resultadoFelv: z.enum([
    "Negativo",
    "Positivo",
    "Indeterminado",
    "Pendiente",
  ]),

  comprobantePresentado: z.boolean().optional(),

  archivoResultado: z.string().optional(),

  edadMeses: z.number().int().nonnegative().optional(),

  decisionLeucemia: z
    .enum([
      "Aplicar",
      "Posponer",
      "No indicada",
      "Contraindicada",
      "Pendiente",
    ])
    .optional(),

  motivoDecision: z.string().optional(),

  fechaReevaluacion: z.string().optional(),

  observaciones: z.string().optional(),
});

const actualizarPruebaFelinaSchema =
  crearPruebaFelinaSchema.partial();

/* =========================================================
   FUNCIONES GENERALES
========================================================= */

function readId(
  value: string | string[] | undefined,
): number | null {
  const parsed = idSchema.safeParse(
    Array.isArray(value) ? value[0] : value,
  );

  return parsed.success ? parsed.data : null;
}

function addDays(
  dateString: string,
  days: number,
): string {
  const date = new Date(
    `${dateString.slice(0, 10)}T12:00:00`,
  );

  date.setDate(date.getDate() + days);

  return date.toISOString().slice(0, 10);
}

function differenceInDays(
  targetDate: string,
  baseDate = new Date(),
): number {
  const target = new Date(
    `${targetDate.slice(0, 10)}T12:00:00`,
  );

  const base = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    12,
    0,
    0,
  );

  return Math.round(
    (target.getTime() - base.getTime()) /
      86_400_000,
  );
}

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ");
}

function normalizarEspecie(
  especie: string | null | undefined,
): EspeciePreventiva | null {
  if (!especie) {
    return null;
  }

  const normalizada = normalizeText(especie);

  if (
    normalizada === "perro" ||
    normalizada === "canino"
  ) {
    return "Perro";
  }

  if (
    normalizada === "gato" ||
    normalizada === "felino"
  ) {
    return "Gato";
  }

  return null;
}

function calcularEdadMeses(
  fechaNacimiento: string | null | undefined,
): number | null {
  if (!fechaNacimiento) {
    return null;
  }

  const nacimiento = new Date(
    `${fechaNacimiento.slice(0, 10)}T12:00:00`,
  );

  if (Number.isNaN(nacimiento.getTime())) {
    return null;
  }

  const hoy = new Date();

  let meses =
    (hoy.getFullYear() - nacimiento.getFullYear()) *
      12 +
    hoy.getMonth() -
    nacimiento.getMonth();

  if (hoy.getDate() < nacimiento.getDate()) {
    meses -= 1;
  }

  return Math.max(0, meses);
}

function determinarEtapa(
  edadMeses: number | null,
  ultimaEtapa?: string | null,
): EtapaPreventiva | null {
  if (ultimaEtapa === "Cachorro") {
    return "Cachorro";
  }

  if (ultimaEtapa === "Adulto") {
    return "Adulto";
  }

  if (edadMeses === null) {
    return null;
  }

  return edadMeses < 12
    ? "Cachorro"
    : "Adulto";
}

async function getPatient(
  pacienteId: number,
) {
  const [paciente] = await db
    .select()
    .from(pacientesTable)
    .where(eq(pacientesTable.id, pacienteId));

  return paciente ?? null;
}

async function patientExists(
  pacienteId: number,
): Promise<boolean> {
  return Boolean(await getPatient(pacienteId));
}

/* =========================================================
   NORMALIZACIÓN DE NOMBRES DE VACUNAS
========================================================= */

function identificarVacuna(
  nombre: string,
):
  | "Cuadruple"
  | "Sextuple"
  | "Octuple"
  | "Bordetella"
  | "Giardia"
  | "Rabia"
  | "Triple felina"
  | "Cuadruple felina"
  | "Leucemia felina"
  | null {
  const normalizada = normalizeText(nombre);

  if (
    normalizada.includes("triple") &&
    normalizada.includes("fel")
  ) {
    return "Triple felina";
  }

  if (
    normalizada.includes("cuadruple") &&
    normalizada.includes("fel")
  ) {
    return "Cuadruple felina";
  }

  if (
    normalizada.includes("leucemia") ||
    normalizada.includes("felv")
  ) {
    return "Leucemia felina";
  }

  if (normalizada.includes("bordetella")) {
    return "Bordetella";
  }

  if (normalizada.includes("giardia")) {
    return "Giardia";
  }

  if (
    normalizada.includes("rabia") ||
    normalizada.includes("antirrab")
  ) {
    return "Rabia";
  }

  if (
    normalizada.includes("octuple") ||
    normalizada.includes("octupla")
  ) {
    return "Octuple";
  }

  if (
    normalizada.includes("sextuple") ||
    normalizada.includes("sextupla")
  ) {
    return "Sextuple";
  }

  if (
    normalizada.includes("cuadruple") ||
    normalizada.includes("cuadrupla")
  ) {
    return "Cuadruple";
  }

  return null;
}

/* =========================================================
   SERIALIZADORES
========================================================= */

function serializeVaccinationVisit<
  T extends {
    creadoEn: Date;
    actualizadoEn: Date;
  },
>(record: T) {
  return {
    ...record,
    creadoEn: record.creadoEn.toISOString(),
    actualizadoEn:
      record.actualizadoEn.toISOString(),
  };
}

function serializeVaccine<
  T extends {
    creadoEn: Date;
    actualizadoEn: Date;
  },
>(record: T) {
  return {
    ...record,
    creadoEn: record.creadoEn.toISOString(),
    actualizadoEn:
      record.actualizadoEn.toISOString(),
  };
}

function serializeDeworming<
  T extends {
    creadoEn: Date;
    actualizadoEn: Date;
  },
>(record: T) {
  return {
    ...record,
    creadoEn: record.creadoEn.toISOString(),
    actualizadoEn:
      record.actualizadoEn.toISOString(),
  };
}

function serializeFelineTest<
  T extends {
    creadoEn: Date;
    actualizadoEn: Date;
  },
>(record: T) {
  return {
    ...record,
    creadoEn: record.creadoEn.toISOString(),
    actualizadoEn:
      record.actualizadoEn.toISOString(),
  };
}

/* =========================================================
   MOTOR DE RECOMENDACIÓN VACUNAL
========================================================= */

function estadoPorFecha(
  fecha: string | null,
): {
  estado: EstadoCalculado;
  diasDiferencia: number | null;
} {
  if (!fecha) {
    return {
      estado: "Sin historial",
      diasDiferencia: null,
    };
  }

  const dias = differenceInDays(fecha);

  if (dias < 0) {
    return {
      estado: "Atrasada",
      diasDiferencia: dias,
    };
  }

  if (dias === 0) {
    return {
      estado: "Hoy",
      diasDiferencia: 0,
    };
  }

  if (dias <= 15) {
    return {
      estado: "Próxima",
      diasDiferencia: dias,
    };
  }

  return {
    estado: "Al corriente",
    diasDiferencia: dias,
  };
}

function tieneVacunaAplicada(
  aplicadas: Set<string>,
  vacuna: string,
): boolean {
  return aplicadas.has(vacuna);
}

function construirPendientesPerro(
  etapa: EtapaPreventiva,
  aplicadas: Set<string>,
): VacunaSugerida[] {
  const pendientes: VacunaSugerida[] = [];

  if (etapa === "Cachorro") {
    if (
      !tieneVacunaAplicada(
        aplicadas,
        "Cuadruple",
      )
    ) {
      pendientes.push({
        vacuna: "Cuádruple",
        motivo:
          "Primera vacuna del esquema de cachorro.",
      });
    }

    if (
      !tieneVacunaAplicada(
        aplicadas,
        "Sextuple",
      )
    ) {
      pendientes.push({
        vacuna: "Séxtuple",
        motivo:
          "Refuerzo posterior a la vacuna cuádruple.",
      });
    }

    if (
      !tieneVacunaAplicada(
        aplicadas,
        "Octuple",
      )
    ) {
      pendientes.push({
        vacuna: "Óctuple",
        motivo:
          "Refuerzo posterior dentro del esquema de cachorro.",
      });
    }
  } else if (
    !tieneVacunaAplicada(
      aplicadas,
      "Octuple",
    )
  ) {
    pendientes.push({
      vacuna: "Óctuple",
      motivo:
        "Refuerzo principal del esquema anual adulto.",
    });
  }

  if (
    !tieneVacunaAplicada(
      aplicadas,
      "Bordetella",
    )
  ) {
    pendientes.push({
      vacuna: "Bordetella",
      motivo:
        "Vacuna pendiente del esquema preventivo.",
    });
  }

  if (
    !tieneVacunaAplicada(
      aplicadas,
      "Giardia",
    )
  ) {
    pendientes.push({
      vacuna: "Giardia",
      motivo:
        "Vacuna pendiente del esquema preventivo.",
    });
  }

  if (
    !tieneVacunaAplicada(
      aplicadas,
      "Rabia",
    )
  ) {
    pendientes.push({
      vacuna: "Rabia",
      motivo:
        "Vacuna antirrábica pendiente.",
    });
  }

  return pendientes;
}

function construirPendientesGato(
  etapa: EtapaPreventiva,
  aplicadas: Set<string>,
  ultimaPruebaFelina:
    | {
        resultadoFelv: string;
        decisionLeucemia: string | null;
      }
    | null,
): {
  pendientes: VacunaSugerida[];
  advertencias: string[];
} {
  const pendientes: VacunaSugerida[] = [];
  const advertencias: string[] = [];

  const tieneTriple =
    tieneVacunaAplicada(
      aplicadas,
      "Triple felina",
    );

  const tieneCuadruple =
    tieneVacunaAplicada(
      aplicadas,
      "Cuadruple felina",
    );

  if (etapa === "Cachorro") {
    if (!tieneTriple) {
      pendientes.push({
        vacuna: "Triple felina",
        motivo:
          "Primera vacuna obligatoria del esquema felino de cachorro.",
      });
    } else if (!tieneCuadruple) {
      pendientes.push({
        vacuna:
          "Triple felina o Cuádruple felina",
        motivo:
          "Refuerzo posterior a la primera triple felina.",
      });
    }
  } else if (
    !tieneTriple &&
    !tieneCuadruple
  ) {
    pendientes.push({
      vacuna:
        "Triple felina o Cuádruple felina",
      motivo:
        "Refuerzo preventivo del gato adulto.",
    });
  }

  if (
    !tieneVacunaAplicada(
      aplicadas,
      "Rabia",
    )
  ) {
    pendientes.push({
      vacuna: "Rabia",
      motivo:
        "Vacuna antirrábica pendiente.",
    });
  }

  if (
    !tieneVacunaAplicada(
      aplicadas,
      "Leucemia felina",
    )
  ) {
    if (!ultimaPruebaFelina) {
      pendientes.push({
        vacuna: "Prueba FIV/FeLV",
        motivo:
          "Se requiere evaluación antes de decidir sobre leucemia felina.",
        requiereDecisionMedica: true,
      });

      advertencias.push(
        "No hay prueba FIV/FeLV registrada para valorar leucemia felina.",
      );
    } else if (
      ultimaPruebaFelina.resultadoFelv ===
        "Negativo" &&
      ultimaPruebaFelina.decisionLeucemia ===
        "Aplicar"
    ) {
      pendientes.push({
        vacuna: "Leucemia felina",
        motivo:
          "Prueba FeLV negativa y decisión médica de aplicar.",
        requiereDecisionMedica: true,
      });
    } else if (
      ultimaPruebaFelina.resultadoFelv ===
      "Negativo"
    ) {
      pendientes.push({
        vacuna:
          "Leucemia felina: decisión médica",
        motivo:
          "Existe prueba FeLV negativa, pero falta confirmar la decisión médica.",
        requiereDecisionMedica: true,
      });

      advertencias.push(
        "La vacuna de leucemia felina permanece pendiente de decisión médica.",
      );
    } else if (
      ultimaPruebaFelina.resultadoFelv ===
      "Positivo"
    ) {
      advertencias.push(
        "La última prueba FeLV es positiva. No se sugiere automáticamente vacuna de leucemia.",
      );
    } else {
      pendientes.push({
        vacuna:
          "Reevaluar prueba FIV/FeLV",
        motivo:
          "El resultado FeLV no es concluyente.",
        requiereDecisionMedica: true,
      });
    }
  }

  return {
    pendientes,
    advertencias,
  };
}

async function calcularResumenVacunal(
  pacienteId: number,
): Promise<ResumenVacunal> {
  const paciente = await getPatient(pacienteId);

  if (!paciente) {
    throw new Error("Paciente no encontrado.");
  }

  const vacunas = await db
    .select()
    .from(vacunacionesTable)
    .where(
      eq(
        vacunacionesTable.pacienteId,
        pacienteId,
      ),
    )
    .orderBy(
      desc(vacunacionesTable.fechaAplicacion),
    );

  const visitas = await db
    .select()
    .from(vacunacionVisitasTable)
    .where(
      eq(
        vacunacionVisitasTable.pacienteId,
        pacienteId,
      ),
    )
    .orderBy(
      desc(vacunacionVisitasTable.fechaVisita),
    );

  const [ultimaPruebaFelina] = await db
    .select()
    .from(pruebasFelinasTable)
    .where(
      eq(
        pruebasFelinasTable.pacienteId,
        pacienteId,
      ),
    )
    .orderBy(
      desc(pruebasFelinasTable.fechaPrueba),
    )
    .limit(1);

  const especie = normalizarEspecie(
    paciente.especie,
  );

  const edadMeses = calcularEdadMeses(
    paciente.fechaNacimiento,
  );

  const ultimaVacuna = vacunas[0] ?? null;

  const etapa = determinarEtapa(
    edadMeses,
    ultimaVacuna?.etapa,
  );

  const intervaloDias =
    visitas[0]?.intervaloDias === 21
      ? 21
      : 15;

  if (!especie || !etapa) {
    return {
      especie,
      etapa,
      intervaloDias,
      estado: "Sin historial",
      fechaSugerida: null,
      diasDiferencia: null,
      vacunasSiguienteVisita: [],
      vacunasPendientesPosteriores: [],
      esquemaCompleto: false,
      advertencias: [
        "No fue posible determinar la especie o etapa de vida del paciente.",
      ],
    };
  }

  const vacunasAplicadas = vacunas.filter(
    (vacuna) =>
      vacuna.estado === "Aplicada",
  );

  const aplicadasNormalizadas = new Set<string>();

  for (const vacuna of vacunasAplicadas) {
    const identificada = identificarVacuna(
      vacuna.vacuna,
    );

    if (identificada) {
      aplicadasNormalizadas.add(
        identificada,
      );
    }
  }

  let pendientes: VacunaSugerida[] = [];
  let advertencias: string[] = [];

  if (especie === "Perro") {
    pendientes = construirPendientesPerro(
      etapa,
      aplicadasNormalizadas,
    );
  } else {
    const resultadoFelino =
      construirPendientesGato(
        etapa,
        aplicadasNormalizadas,
        ultimaPruebaFelina
          ? {
              resultadoFelv:
                ultimaPruebaFelina.resultadoFelv,
              decisionLeucemia:
                ultimaPruebaFelina.decisionLeucemia,
            }
          : null,
      );

    pendientes = resultadoFelino.pendientes;
    advertencias =
      resultadoFelino.advertencias;
  }

  const vacunasSiguienteVisita =
    pendientes.slice(0, 2);

  const vacunasPendientesPosteriores =
    pendientes.slice(2);

  const fechaBase =
    ultimaVacuna?.fechaAplicacion ??
    visitas[0]?.fechaVisita ??
    null;

  const fechaSugerida =
    pendientes.length > 0 && fechaBase
      ? addDays(fechaBase, intervaloDias)
      : pendientes.length > 0
        ? new Date().toISOString().slice(0, 10)
        : null;

  const estadoFecha =
    estadoPorFecha(fechaSugerida);

  const requiereDecision = pendientes.some(
    (pendiente) =>
      pendiente.requiereDecisionMedica,
  );

  const estado: EstadoCalculado =
    pendientes.length === 0
      ? "Al corriente"
      : requiereDecision &&
          vacunasSiguienteVisita.every(
            (vacuna) =>
              vacuna.requiereDecisionMedica,
          )
        ? "Pendiente de decisión médica"
        : estadoFecha.estado;

  return {
    especie,
    etapa,
    intervaloDias,
    estado,
    fechaSugerida,
    diasDiferencia:
      estadoFecha.diasDiferencia,
    vacunasSiguienteVisita,
    vacunasPendientesPosteriores,
    esquemaCompleto:
      pendientes.length === 0,
    advertencias,
  };
}

/* =========================================================
   RESUMEN COMPLETO DE MEDICINA PREVENTIVA
========================================================= */

// GET /pacientes/:pacienteId/medicina-preventiva
router.get(
  "/pacientes/:pacienteId/medicina-preventiva",
  async (req, res): Promise<void> => {
    const pacienteId = readId(
      req.params.pacienteId,
    );

    if (!pacienteId) {
      res.status(400).json({
        error:
          "Identificador de paciente inválido.",
      });
      return;
    }

    if (!(await patientExists(pacienteId))) {
      res.status(404).json({
        error: "Paciente no encontrado.",
      });
      return;
    }

    const visitas = await db
      .select()
      .from(vacunacionVisitasTable)
      .where(
        eq(
          vacunacionVisitasTable.pacienteId,
          pacienteId,
        ),
      )
      .orderBy(
        desc(vacunacionVisitasTable.fechaVisita),
      );

    const vacunas = await db
      .select()
      .from(vacunacionesTable)
      .where(
        eq(
          vacunacionesTable.pacienteId,
          pacienteId,
        ),
      )
      .orderBy(
        desc(vacunacionesTable.fechaAplicacion),
      );

    const desparasitaciones = await db
      .select()
      .from(desparasitacionesTable)
      .where(
        eq(
          desparasitacionesTable.pacienteId,
          pacienteId,
        ),
      )
      .orderBy(
        desc(
          desparasitacionesTable.fechaAplicacion,
        ),
      );

    const pruebasFelinas = await db
      .select()
      .from(pruebasFelinasTable)
      .where(
        eq(
          pruebasFelinasTable.pacienteId,
          pacienteId,
        ),
      )
      .orderBy(
        desc(pruebasFelinasTable.fechaPrueba),
      );

    const visitasConVacunas = visitas.map(
      (visita) => ({
        ...serializeVaccinationVisit(visita),

        vacunas: vacunas
          .filter(
            (vacuna) =>
              vacuna.visitaId === visita.id,
          )
          .map(serializeVaccine),
      }),
    );

    const resumenVacunal =
      await calcularResumenVacunal(
        pacienteId,
      );

    res.json({
      pacienteId,

      resumenVacunal,

      visitasVacunacion:
        visitasConVacunas,

      vacunaciones:
        vacunas.map(serializeVaccine),

      desparasitaciones:
        desparasitaciones.map(
          serializeDeworming,
        ),

      pruebasFelinas:
        pruebasFelinas.map(
          serializeFelineTest,
        ),
    });
  },
);

// GET /pacientes/:pacienteId/recomendacion-vacunal
router.get(
  "/pacientes/:pacienteId/recomendacion-vacunal",
  async (req, res): Promise<void> => {
    const pacienteId = readId(
      req.params.pacienteId,
    );

    if (!pacienteId) {
      res.status(400).json({
        error:
          "Identificador de paciente inválido.",
      });
      return;
    }

    if (!(await patientExists(pacienteId))) {
      res.status(404).json({
        error: "Paciente no encontrado.",
      });
      return;
    }

    const resumen =
      await calcularResumenVacunal(
        pacienteId,
      );

    res.json(resumen);
  },
);

/* =========================================================
   VACUNACIONES
========================================================= */

// POST /pacientes/:pacienteId/vacunaciones/visitas
router.post(
  "/pacientes/:pacienteId/vacunaciones/visitas",
  async (req, res): Promise<void> => {
    const pacienteId = readId(
      req.params.pacienteId,
    );

    if (!pacienteId) {
      res.status(400).json({
        error:
          "Identificador de paciente inválido.",
      });
      return;
    }

    const parsed =
      crearVisitaVacunacionSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.message,
      });
      return;
    }

    const paciente =
      await getPatient(pacienteId);

    if (!paciente) {
      res.status(404).json({
        error: "Paciente no encontrado.",
      });
      return;
    }

    const data = parsed.data;

    const especies = new Set(
      data.vacunas.map(
        (vacuna) => vacuna.especie,
      ),
    );

    if (especies.size !== 1) {
      res.status(400).json({
        error:
          "Todas las vacunas de la visita deben corresponder a la misma especie.",
      });
      return;
    }

    const etapas = new Set(
      data.vacunas.map(
        (vacuna) => vacuna.etapa,
      ),
    );

    if (etapas.size !== 1) {
      res.status(400).json({
        error:
          "Todas las vacunas de la visita deben corresponder a la misma etapa.",
      });
      return;
    }

    const especie =
      data.vacunas[0]?.especie;

    const etapa =
      data.vacunas[0]?.etapa;

    const especiePaciente =
      normalizarEspecie(paciente.especie);

    if (
      especiePaciente &&
      especiePaciente !== especie
    ) {
      res.status(400).json({
        error:
          "La especie seleccionada no coincide con la especie registrada del paciente.",
      });
      return;
    }

    if (
      especie === "Gato" &&
      etapa === "Cachorro"
    ) {
      const vacunasFelinasPrevias =
        await db
          .select({
            id: vacunacionesTable.id,
            estado:
              vacunacionesTable.estado,
          })
          .from(vacunacionesTable)
          .where(
            and(
              eq(
                vacunacionesTable.pacienteId,
                pacienteId,
              ),
              eq(
                vacunacionesTable.especie,
                "Gato",
              ),
            ),
          );

      const tieneAplicacionesPrevias =
        vacunasFelinasPrevias.some(
          (vacuna) =>
            vacuna.estado === "Aplicada",
        );

      if (!tieneAplicacionesPrevias) {
        const primeraVacuna =
          data.vacunas[0];

        const identificada =
          primeraVacuna
            ? identificarVacuna(
                primeraVacuna.vacuna,
              )
            : null;

        if (
          data.vacunas.length !== 1 ||
          identificada !==
            "Triple felina"
        ) {
          res.status(400).json({
            error:
              "La primera vacunación de un gato cachorro debe ser únicamente Triple felina.",
          });
          return;
        }
      }
    }

    const incluyeLeucemia =
      data.vacunas.some(
        (vacuna) =>
          identificarVacuna(
            vacuna.vacuna,
          ) === "Leucemia felina",
      );

    if (incluyeLeucemia) {
      const [ultimaPrueba] = await db
        .select()
        .from(pruebasFelinasTable)
        .where(
          eq(
            pruebasFelinasTable.pacienteId,
            pacienteId,
          ),
        )
        .orderBy(
          desc(
            pruebasFelinasTable.fechaPrueba,
          ),
        )
        .limit(1);

      if (!ultimaPrueba) {
        res.status(400).json({
          error:
            "Para registrar la vacuna contra leucemia felina debe existir una prueba FIV/FeLV previa.",
        });
        return;
      }

      if (
        ultimaPrueba.resultadoFelv !==
        "Negativo"
      ) {
        res.status(400).json({
          error:
            "La última prueba FeLV registrada no tiene resultado negativo.",
        });
        return;
      }

      if (
        ultimaPrueba.decisionLeucemia !==
        "Aplicar"
      ) {
        res.status(400).json({
          error:
            "La última prueba felina no tiene registrada la decisión médica de aplicar leucemia.",
        });
        return;
      }
    }

    const result = await db.transaction(
      async (transaction) => {
        const [visita] =
          await transaction
            .insert(
              vacunacionVisitasTable,
            )
            .values({
              pacienteId,
              consultaId:
                data.consultaId,

              fechaVisita:
                data.fechaVisita,

              intervaloDias:
                data.intervaloDias,

              origen:
                data.origen ??
                "Clinica",

              medicoResponsable:
                data.medicoResponsable ||
                null,

              clinicaExterna:
                data.clinicaExterna ||
                null,

              medicoExterno:
                data.medicoExterno ||
                null,

              comprobantePresentado:
                data.comprobantePresentado ??
                false,

              observaciones:
                data.observaciones ||
                null,
            })
            .returning();

        if (!visita) {
          throw new Error(
            "No se pudo crear la visita de vacunación.",
          );
        }

        const aplicaciones =
          data.vacunas.map(
            (vacuna) => ({
              visitaId: visita.id,
              pacienteId,

              vacuna:
                vacuna.vacuna.trim(),

              especie:
                vacuna.especie,

              etapa:
                vacuna.etapa,

              marca:
                vacuna.marca || null,

              laboratorio:
                vacuna.laboratorio ||
                null,

              lote:
                vacuna.lote || null,

              fechaCaducidad:
                vacuna.fechaCaducidad ||
                null,

              fechaAplicacion:
                vacuna.fechaAplicacion,

              fechaVencimiento:
                vacuna.fechaVencimiento ||
                null,

              proximaAplicacion:
                vacuna.proximaAplicacion ||
                (data.intervaloDias
                  ? addDays(
                      vacuna.fechaAplicacion,
                      data.intervaloDias,
                    )
                  : null),

              estado:
                vacuna.estado ??
                "Aplicada",

              decisionMedica:
                vacuna.decisionMedica ||
                null,

              motivoDecision:
                vacuna.motivoDecision ||
                null,

              tipoRegistro:
                vacuna.tipoRegistro ??
                "Aplicacion",

              reaccionAdversa:
                vacuna.reaccionAdversa ??
                false,

              descripcionReaccion:
                vacuna.descripcionReaccion ||
                null,

              observaciones:
                vacuna.observaciones ||
                null,
            }),
          );

        const vacunasCreadas =
          await transaction
            .insert(vacunacionesTable)
            .values(aplicaciones)
            .returning();

        return {
          visita,
          vacunas: vacunasCreadas,
        };
      },
    );

    const resumenVacunal =
      await calcularResumenVacunal(
        pacienteId,
      );

    res.status(201).json({
      visita:
        serializeVaccinationVisit(
          result.visita,
        ),

      vacunas:
        result.vacunas.map(
          serializeVaccine,
        ),

      resumenVacunal,
    });
  },
);

// PUT /vacunaciones/:vacunacionId
router.put(
  "/vacunaciones/:vacunacionId",
  async (req, res): Promise<void> => {
    const vacunacionId = readId(
      req.params.vacunacionId,
    );

    if (!vacunacionId) {
      res.status(400).json({
        error:
          "Identificador de vacunación inválido.",
      });
      return;
    }

    const parsed =
      actualizarVacunaSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.message,
      });
      return;
    }

    const [updated] = await db
      .update(vacunacionesTable)
      .set({
        ...parsed.data,
        actualizadoEn: new Date(),
      })
      .where(
        eq(
          vacunacionesTable.id,
          vacunacionId,
        ),
      )
      .returning();

    if (!updated) {
      res.status(404).json({
        error:
          "Vacunación no encontrada.",
      });
      return;
    }

    res.json(
      serializeVaccine(updated),
    );
  },
);

// DELETE /vacunaciones/:vacunacionId
router.delete(
  "/vacunaciones/:vacunacionId",
  async (req, res): Promise<void> => {
    const vacunacionId = readId(
      req.params.vacunacionId,
    );

    if (!vacunacionId) {
      res.status(400).json({
        error:
          "Identificador de vacunación inválido.",
      });
      return;
    }

    const [deleted] = await db
      .delete(vacunacionesTable)
      .where(
        eq(
          vacunacionesTable.id,
          vacunacionId,
        ),
      )
      .returning();

    if (!deleted) {
      res.status(404).json({
        error:
          "Vacunación no encontrada.",
      });
      return;
    }

    res.status(204).send();
  },
);

// DELETE /vacunaciones/visitas/:visitaId
router.delete(
  "/vacunaciones/visitas/:visitaId",
  async (req, res): Promise<void> => {
    const visitaId = readId(
      req.params.visitaId,
    );

    if (!visitaId) {
      res.status(400).json({
        error:
          "Identificador de visita de vacunación inválido.",
      });
      return;
    }

    const [deleted] = await db
      .delete(vacunacionVisitasTable)
      .where(
        eq(
          vacunacionVisitasTable.id,
          visitaId,
        ),
      )
      .returning();

    if (!deleted) {
      res.status(404).json({
        error:
          "Visita de vacunación no encontrada.",
      });
      return;
    }

    res.status(204).send();
  },
);

/* =========================================================
   DESPARASITACIONES
========================================================= */

// POST /pacientes/:pacienteId/desparasitaciones
router.post(
  "/pacientes/:pacienteId/desparasitaciones",
  async (req, res): Promise<void> => {
    const pacienteId = readId(
      req.params.pacienteId,
    );

    if (!pacienteId) {
      res.status(400).json({
        error:
          "Identificador de paciente inválido.",
      });
      return;
    }

    const parsed =
      crearDesparasitacionSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.message,
      });
      return;
    }

    if (!(await patientExists(pacienteId))) {
      res.status(404).json({
        error: "Paciente no encontrado.",
      });
      return;
    }

    const data = parsed.data;

    if (
      data.programarProxima &&
      !data.proximaAplicacion &&
      !data.frecuenciaDias
    ) {
      res.status(400).json({
        error:
          "Para programar la próxima desparasitación debes indicar una fecha o frecuencia.",
      });
      return;
    }

    const proximaAplicacion =
      data.programarProxima
        ? data.proximaAplicacion ||
          (data.frecuenciaDias
            ? addDays(
                data.fechaAplicacion,
                data.frecuenciaDias,
              )
            : null)
        : null;

    const fechaFinCobertura =
      data.fechaFinCobertura ||
      (data.duracionDias
        ? addDays(
            data.fechaAplicacion,
            data.duracionDias,
          )
        : null);

    const [created] = await db
      .insert(
        desparasitacionesTable,
      )
      .values({
        pacienteId,

        consultaId:
          data.consultaId,

        fechaAplicacion:
          data.fechaAplicacion,

        producto:
          data.producto.trim(),

        principioActivo:
          data.principioActivo ||
          null,

        lote:
          data.lote || null,

        fabricante:
          data.fabricante || null,

        origen:
          data.origen ?? "Clinica",

        clinicaExterna:
          data.clinicaExterna ||
          null,

        medicoResponsable:
          data.medicoResponsable ||
          null,

        cubreInternos:
          data.cubreInternos ??
          false,

        cubreExternos:
          data.cubreExternos ??
          false,

        duracionDias:
          data.duracionDias,

        frecuenciaDias:
          data.frecuenciaDias,

        proximaAplicacion,

        programarProxima:
          data.programarProxima ??
          false,

        tipoProgramacion:
          data.programarProxima
            ? data.tipoProgramacion ||
              null
            : null,

        proximoProductoTipo:
          data.programarProxima
            ? data.proximoProductoTipo ||
              "Por decidir"
            : null,

        proximoProducto:
          data.programarProxima
            ? data.proximoProducto ||
              null
            : null,

        decisionMedica:
          data.programarProxima
            ? data.decisionMedica ||
              null
            : null,

        fechaFinCobertura,

        pesoAplicacion:
          data.pesoAplicacion ||
          null,

        observaciones:
          data.observaciones ||
          null,

        comprobantePresentado:
          data.comprobantePresentado ??
          false,

        archivoComprobante:
          data.archivoComprobante ||
          null,
      })
      .returning();

    if (!created) {
      res.status(500).json({
        error:
          "No se pudo registrar la desparasitación.",
      });
      return;
    }

    res.status(201).json(
      serializeDeworming(created),
    );
  },
);

// PUT /desparasitaciones/:desparasitacionId
router.put(
  "/desparasitaciones/:desparasitacionId",
  async (req, res): Promise<void> => {
    const desparasitacionId = readId(
      req.params.desparasitacionId,
    );

    if (!desparasitacionId) {
      res.status(400).json({
        error:
          "Identificador de desparasitación inválido.",
      });
      return;
    }

    const parsed =
      actualizarDesparasitacionSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.message,
      });
      return;
    }

    const cambios = {
      ...parsed.data,

      proximaAplicacion:
        parsed.data.programarProxima ===
        false
          ? null
          : parsed.data
              .proximaAplicacion,

      tipoProgramacion:
        parsed.data.programarProxima ===
        false
          ? null
          : parsed.data
              .tipoProgramacion,

      proximoProductoTipo:
        parsed.data.programarProxima ===
        false
          ? null
          : parsed.data
              .proximoProductoTipo,

      proximoProducto:
        parsed.data.programarProxima ===
        false
          ? null
          : parsed.data
              .proximoProducto,

      decisionMedica:
        parsed.data.programarProxima ===
        false
          ? null
          : parsed.data
              .decisionMedica,

      actualizadoEn: new Date(),
    };

    const [updated] = await db
      .update(
        desparasitacionesTable,
      )
      .set(cambios)
      .where(
        eq(
          desparasitacionesTable.id,
          desparasitacionId,
        ),
      )
      .returning();

    if (!updated) {
      res.status(404).json({
        error:
          "Desparasitación no encontrada.",
      });
      return;
    }

    res.json(
      serializeDeworming(updated),
    );
  },
);

// DELETE /desparasitaciones/:desparasitacionId
router.delete(
  "/desparasitaciones/:desparasitacionId",
  async (req, res): Promise<void> => {
    const desparasitacionId = readId(
      req.params.desparasitacionId,
    );

    if (!desparasitacionId) {
      res.status(400).json({
        error:
          "Identificador de desparasitación inválido.",
      });
      return;
    }

    const [deleted] = await db
      .delete(
        desparasitacionesTable,
      )
      .where(
        eq(
          desparasitacionesTable.id,
          desparasitacionId,
        ),
      )
      .returning();

    if (!deleted) {
      res.status(404).json({
        error:
          "Desparasitación no encontrada.",
      });
      return;
    }

    res.status(204).send();
  },
);

/* =========================================================
   PRUEBAS FELINAS FIV / FeLV
========================================================= */

// POST /pacientes/:pacienteId/pruebas-felinas
router.post(
  "/pacientes/:pacienteId/pruebas-felinas",
  async (req, res): Promise<void> => {
    const pacienteId = readId(
      req.params.pacienteId,
    );

    if (!pacienteId) {
      res.status(400).json({
        error:
          "Identificador de paciente inválido.",
      });
      return;
    }

    const parsed =
      crearPruebaFelinaSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.message,
      });
      return;
    }

    if (!(await patientExists(pacienteId))) {
      res.status(404).json({
        error: "Paciente no encontrado.",
      });
      return;
    }

    const data = parsed.data;

    const [created] = await db
      .insert(pruebasFelinasTable)
      .values({
        pacienteId,

        consultaId:
          data.consultaId,

        fechaPrueba:
          data.fechaPrueba,

        fechaResultado:
          data.fechaResultado ||
          null,

        origen:
          data.origen ?? "Clinica",

        tipoPrueba:
          data.tipoPrueba ??
          "FIV/FeLV",

        laboratorio:
          data.laboratorio || null,

        clinicaExterna:
          data.clinicaExterna ||
          null,

        medicoResponsable:
          data.medicoResponsable ||
          null,

        medicoExterno:
          data.medicoExterno ||
          null,

        resultadoFiv:
          data.resultadoFiv,

        resultadoFelv:
          data.resultadoFelv,

        comprobantePresentado:
          data.comprobantePresentado ??
          false,

        archivoResultado:
          data.archivoResultado ||
          null,

        edadMeses:
          data.edadMeses,

        decisionLeucemia:
          data.decisionLeucemia ??
          "Pendiente",

        motivoDecision:
          data.motivoDecision ||
          null,

        fechaReevaluacion:
          data.fechaReevaluacion ||
          null,

        observaciones:
          data.observaciones ||
          null,
      })
      .returning();

    if (!created) {
      res.status(500).json({
        error:
          "No se pudo registrar la prueba felina.",
      });
      return;
    }

    res.status(201).json(
      serializeFelineTest(created),
    );
  },
);

// PUT /pruebas-felinas/:pruebaFelinaId
router.put(
  "/pruebas-felinas/:pruebaFelinaId",
  async (req, res): Promise<void> => {
    const pruebaFelinaId = readId(
      req.params.pruebaFelinaId,
    );

    if (!pruebaFelinaId) {
      res.status(400).json({
        error:
          "Identificador de prueba felina inválido.",
      });
      return;
    }

    const parsed =
      actualizarPruebaFelinaSchema.safeParse(
        req.body,
      );

    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.message,
      });
      return;
    }

    const [updated] = await db
      .update(pruebasFelinasTable)
      .set({
        ...parsed.data,
        actualizadoEn: new Date(),
      })
      .where(
        eq(
          pruebasFelinasTable.id,
          pruebaFelinaId,
        ),
      )
      .returning();

    if (!updated) {
      res.status(404).json({
        error:
          "Prueba felina no encontrada.",
      });
      return;
    }

    res.json(
      serializeFelineTest(updated),
    );
  },
);

// DELETE /pruebas-felinas/:pruebaFelinaId
router.delete(
  "/pruebas-felinas/:pruebaFelinaId",
  async (req, res): Promise<void> => {
    const pruebaFelinaId = readId(
      req.params.pruebaFelinaId,
    );

    if (!pruebaFelinaId) {
      res.status(400).json({
        error:
          "Identificador de prueba felina inválido.",
      });
      return;
    }

    const [deleted] = await db
      .delete(pruebasFelinasTable)
      .where(
        eq(
          pruebasFelinasTable.id,
          pruebaFelinaId,
        ),
      )
      .returning();

    if (!deleted) {
      res.status(404).json({
        error:
          "Prueba felina no encontrada.",
      });
      return;
    }

    res.status(204).send();
  },
);

export default router;