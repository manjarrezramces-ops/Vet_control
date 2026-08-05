import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Bug,
  Calendar,
  Plus,
  ShieldCheck,
  Syringe,
  TestTube2,
  Trash2,
  X,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

/* =========================================================
   TIPOS
========================================================= */

type Vacunacion = {
  id: number;
  visitaId: number;
  pacienteId: number;
  vacuna: string;
  especie: string;
  etapa: string;
  marca: string | null;
  laboratorio: string | null;
  lote: string | null;
  fechaCaducidad: string | null;
  fechaAplicacion: string;
  fechaVencimiento: string | null;
  proximaAplicacion: string | null;
  estado: string;
  decisionMedica: string | null;
  motivoDecision: string | null;
  tipoRegistro: string;
  reaccionAdversa: boolean;
  descripcionReaccion: string | null;
  observaciones: string | null;
};

type VisitaVacunacion = {
  id: number;
  fechaVisita: string;
  intervaloDias: number | null;
  origen: string;
  medicoResponsable: string | null;
  clinicaExterna: string | null;
  medicoExterno: string | null;
  observaciones: string | null;
  vacunas: Vacunacion[];
};

type Desparasitacion = {
  id: number;
  fechaAplicacion: string;
  producto: string;
  principioActivo: string | null;
  lote: string | null;
  fabricante: string | null;
  origen: string;
  clinicaExterna: string | null;
  medicoResponsable: string | null;
  cubreInternos: boolean;
  cubreExternos: boolean;
  duracionDias: number | null;
  frecuenciaDias: number | null;
  proximaAplicacion: string | null;
  pesoAplicacion: string | null;
  observaciones: string | null;
};

type PruebaFelina = {
  id: number;
  fechaPrueba: string;
  fechaResultado: string | null;
  origen: string;
  tipoPrueba: string;
  laboratorio: string | null;
  clinicaExterna: string | null;
  medicoResponsable: string | null;
  medicoExterno: string | null;
  resultadoFiv: string;
  resultadoFelv: string;
  edadMeses: number | null;
  decisionLeucemia: string | null;
  motivoDecision: string | null;
  fechaReevaluacion: string | null;
  observaciones: string | null;
};

type MedicinaPreventivaResponse = {
  pacienteId: number;
  visitasVacunacion: VisitaVacunacion[];
  vacunaciones: Vacunacion[];
  desparasitaciones: Desparasitacion[];
  pruebasFelinas: PruebaFelina[];
};

type VacunaFormulario = {
  vacuna: string;
  etapa: "Cachorro" | "Adulto";
  marca: string;
  laboratorio: string;
  lote: string;
  fechaCaducidad: string;
  fechaAplicacion: string;
  fechaVencimiento: string;
  proximaAplicacion: string;
  estado: string;
  decisionMedica: string;
  motivoDecision: string;
  reaccionAdversa: boolean;
  descripcionReaccion: string;
  observaciones: string;
};

/* =========================================================
   UTILIDADES
========================================================= */

const campoClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30";

function fechaActual() {
  return format(new Date(), "yyyy-MM-dd");
}

function mostrarFecha(fecha?: string | null) {
  if (!fecha) {
    return "Sin programar";
  }

  return format(
    new Date(`${fecha.slice(0, 10)}T12:00:00`),
    "dd/MM/yyyy",
  );
}

function textoOpcional(valor: string) {
  const limpio = valor.trim();
  return limpio.length > 0 ? limpio : undefined;
}

function vacunaVacia(): VacunaFormulario {
  return {
    vacuna: "",
    etapa: "Cachorro",
    marca: "",
    laboratorio: "",
    lote: "",
    fechaCaducidad: "",
    fechaAplicacion: fechaActual(),
    fechaVencimiento: "",
    proximaAplicacion: "",
    estado: "Aplicada",
    decisionMedica: "",
    motivoDecision: "",
    reaccionAdversa: false,
    descripcionReaccion: "",
    observaciones: "",
  };
}

function estadoColor(estado: string) {
  switch (estado) {
    case "Aplicada":
    case "Vigente":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";

    case "Vencida":
    case "Contraindicada":
      return "bg-red-100 text-red-800 border-red-200";

    case "Pendiente":
    case "Proxima":
    case "Pospuesta":
    case "Pendiente de decision medica":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";

    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>

      {children}
    </label>
  );
}

/* =========================================================
   COMPONENTE PRINCIPAL
========================================================= */

export default function MedicinaPreventivaTab({
  pacienteId,
  especie,
}: {
  pacienteId: number;
  especie: string;
}) {
  const BASE = (import.meta.env.BASE_URL as string).replace(/\/$/, "");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const especieNormalizada =
    especie.toLowerCase() === "perro"
      ? "Perro"
      : especie.toLowerCase() === "gato"
        ? "Gato"
        : null;

  const [formularioActivo, setFormularioActivo] = useState<
    "vacunacion" | "desparasitacion" | "prueba" | null
  >(null);

  /* ---------------------------------------------------------
     ESTADO DE VACUNACIÓN
  --------------------------------------------------------- */

  const [visitaVacunacion, setVisitaVacunacion] = useState({
    fechaVisita: fechaActual(),
    intervaloDias: "15",
    origen: "Clinica",
    medicoResponsable: "",
    clinicaExterna: "",
    medicoExterno: "",
    comprobantePresentado: false,
    observaciones: "",
  });

  const [vacunas, setVacunas] = useState<VacunaFormulario[]>([
    vacunaVacia(),
  ]);

  /* ---------------------------------------------------------
     ESTADO DE DESPARASITACIÓN
  --------------------------------------------------------- */

  const [desparasitacion, setDesparasitacion] = useState({
    fechaAplicacion: fechaActual(),
    producto: "",
    principioActivo: "",
    lote: "",
    fabricante: "",
    origen: "Clinica",
    clinicaExterna: "",
    medicoResponsable: "",
    cubreInternos: true,
    cubreExternos: false,
    duracionDias: "",
    frecuenciaDias: "",
    proximaAplicacion: "",
    pesoAplicacion: "",
    observaciones: "",
    comprobantePresentado: false,
  });

  /* ---------------------------------------------------------
     ESTADO DE PRUEBA FELINA
  --------------------------------------------------------- */

  const [pruebaFelina, setPruebaFelina] = useState({
    fechaPrueba: fechaActual(),
    fechaResultado: fechaActual(),
    origen: "Clinica",
    laboratorio: "",
    clinicaExterna: "",
    medicoResponsable: "",
    medicoExterno: "",
    resultadoFiv: "Pendiente",
    resultadoFelv: "Pendiente",
    edadMeses: "",
    decisionLeucemia: "Pendiente",
    motivoDecision: "",
    fechaReevaluacion: "",
    observaciones: "",
    comprobantePresentado: false,
  });

  /* =========================================================
     CONSULTA DEL HISTORIAL
  ========================================================= */

  const {
    data,
    isLoading,
    isError,
  } = useQuery<MedicinaPreventivaResponse>({
    queryKey: ["medicina-preventiva", pacienteId],

    queryFn: async () => {
      const respuesta = await fetch(
        `${BASE}/api/pacientes/${pacienteId}/medicina-preventiva`,
      );

      if (!respuesta.ok) {
        throw new Error(
          "No se pudo cargar el historial de medicina preventiva.",
        );
      }

      return respuesta.json();
    },

    enabled: Boolean(pacienteId),
  });

  const actualizarHistorial = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["medicina-preventiva", pacienteId],
    });
  };

  /* =========================================================
     REGISTRAR VACUNACIÓN
  ========================================================= */

  const registrarVacunacion = useMutation({
    mutationFn: async () => {
      if (!especieNormalizada) {
        throw new Error(
          "La vacunación preventiva solo está configurada para perros y gatos.",
        );
      }

      if (vacunas.some((vacuna) => !vacuna.vacuna.trim())) {
        throw new Error("Debes indicar el nombre de cada vacuna.");
      }

      const respuesta = await fetch(
        `${BASE}/api/pacientes/${pacienteId}/vacunaciones/visitas`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            fechaVisita: visitaVacunacion.fechaVisita,

            intervaloDias: visitaVacunacion.intervaloDias
              ? Number(visitaVacunacion.intervaloDias)
              : undefined,

            origen: visitaVacunacion.origen,

            medicoResponsable: textoOpcional(
              visitaVacunacion.medicoResponsable,
            ),

            clinicaExterna: textoOpcional(
              visitaVacunacion.clinicaExterna,
            ),

            medicoExterno: textoOpcional(
              visitaVacunacion.medicoExterno,
            ),

            comprobantePresentado:
              visitaVacunacion.comprobantePresentado,

            observaciones: textoOpcional(
              visitaVacunacion.observaciones,
            ),

            vacunas: vacunas.map((vacuna) => ({
              vacuna: vacuna.vacuna.trim(),
              especie: especieNormalizada,
              etapa: vacuna.etapa,

              marca: textoOpcional(vacuna.marca),
              laboratorio: textoOpcional(vacuna.laboratorio),
              lote: textoOpcional(vacuna.lote),

              fechaCaducidad:
                vacuna.fechaCaducidad || undefined,

              fechaAplicacion: vacuna.fechaAplicacion,

              fechaVencimiento:
                vacuna.fechaVencimiento || undefined,

              proximaAplicacion:
                vacuna.proximaAplicacion || undefined,

              estado: vacuna.estado,

              decisionMedica: textoOpcional(
                vacuna.decisionMedica,
              ),

              motivoDecision: textoOpcional(
                vacuna.motivoDecision,
              ),

              reaccionAdversa: vacuna.reaccionAdversa,

              descripcionReaccion: textoOpcional(
                vacuna.descripcionReaccion,
              ),

              observaciones: textoOpcional(
                vacuna.observaciones,
              ),
            })),
          }),
        },
      );

      const contenido = await respuesta.json().catch(() => null);

      if (!respuesta.ok) {
        throw new Error(
          contenido?.error ||
            "No se pudo registrar la vacunación.",
        );
      }

      return contenido;
    },

    onSuccess: async () => {
      await actualizarHistorial();

      setVisitaVacunacion({
        fechaVisita: fechaActual(),
        intervaloDias: "15",
        origen: "Clinica",
        medicoResponsable: "",
        clinicaExterna: "",
        medicoExterno: "",
        comprobantePresentado: false,
        observaciones: "",
      });

      setVacunas([vacunaVacia()]);
      setFormularioActivo(null);

      toast({
        title: "Vacunación registrada",
        description:
          "La visita de vacunación fue guardada correctamente.",
      });
    },

    onError: (error) => {
      toast({
        variant: "destructive",
        title: "No se pudo registrar",
        description:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado.",
      });
    },
  });

  /* =========================================================
     REGISTRAR DESPARASITACIÓN
  ========================================================= */

  const registrarDesparasitacion = useMutation({
    mutationFn: async () => {
      if (!desparasitacion.producto.trim()) {
        throw new Error(
          "Debes indicar el producto desparasitante.",
        );
      }

      if (
        !desparasitacion.cubreInternos &&
        !desparasitacion.cubreExternos
      ) {
        throw new Error(
          "Debes indicar si cubre parásitos internos, externos o ambos.",
        );
      }

      const respuesta = await fetch(
        `${BASE}/api/pacientes/${pacienteId}/desparasitaciones`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            fechaAplicacion: desparasitacion.fechaAplicacion,
            producto: desparasitacion.producto.trim(),

            principioActivo: textoOpcional(
              desparasitacion.principioActivo,
            ),

            lote: textoOpcional(desparasitacion.lote),

            fabricante: textoOpcional(
              desparasitacion.fabricante,
            ),

            origen: desparasitacion.origen,

            clinicaExterna: textoOpcional(
              desparasitacion.clinicaExterna,
            ),

            medicoResponsable: textoOpcional(
              desparasitacion.medicoResponsable,
            ),

            cubreInternos: desparasitacion.cubreInternos,
            cubreExternos: desparasitacion.cubreExternos,

            duracionDias: desparasitacion.duracionDias
              ? Number(desparasitacion.duracionDias)
              : undefined,

            frecuenciaDias: desparasitacion.frecuenciaDias
              ? Number(desparasitacion.frecuenciaDias)
              : undefined,

            proximaAplicacion:
              desparasitacion.proximaAplicacion || undefined,

            pesoAplicacion: textoOpcional(
              desparasitacion.pesoAplicacion,
            ),

            observaciones: textoOpcional(
              desparasitacion.observaciones,
            ),

            comprobantePresentado:
              desparasitacion.comprobantePresentado,
          }),
        },
      );

      const contenido = await respuesta.json().catch(() => null);

      if (!respuesta.ok) {
        throw new Error(
          contenido?.error ||
            "No se pudo registrar la desparasitación.",
        );
      }

      return contenido;
    },

    onSuccess: async () => {
      await actualizarHistorial();

      setDesparasitacion({
        fechaAplicacion: fechaActual(),
        producto: "",
        principioActivo: "",
        lote: "",
        fabricante: "",
        origen: "Clinica",
        clinicaExterna: "",
        medicoResponsable: "",
        cubreInternos: true,
        cubreExternos: false,
        duracionDias: "",
        frecuenciaDias: "",
        proximaAplicacion: "",
        pesoAplicacion: "",
        observaciones: "",
        comprobantePresentado: false,
      });

      setFormularioActivo(null);

      toast({
        title: "Desparasitación registrada",
      });
    },

    onError: (error) => {
      toast({
        variant: "destructive",
        title: "No se pudo registrar",
        description:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado.",
      });
    },
  });

  /* =========================================================
     REGISTRAR PRUEBA FELINA
  ========================================================= */

  const registrarPruebaFelina = useMutation({
    mutationFn: async () => {
      const respuesta = await fetch(
        `${BASE}/api/pacientes/${pacienteId}/pruebas-felinas`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            fechaPrueba: pruebaFelina.fechaPrueba,

            fechaResultado:
              pruebaFelina.fechaResultado || undefined,

            origen: pruebaFelina.origen,
            tipoPrueba: "FIV/FeLV",

            laboratorio: textoOpcional(
              pruebaFelina.laboratorio,
            ),

            clinicaExterna: textoOpcional(
              pruebaFelina.clinicaExterna,
            ),

            medicoResponsable: textoOpcional(
              pruebaFelina.medicoResponsable,
            ),

            medicoExterno: textoOpcional(
              pruebaFelina.medicoExterno,
            ),

            resultadoFiv: pruebaFelina.resultadoFiv,
            resultadoFelv: pruebaFelina.resultadoFelv,

            edadMeses: pruebaFelina.edadMeses
              ? Number(pruebaFelina.edadMeses)
              : undefined,

            decisionLeucemia:
              pruebaFelina.decisionLeucemia,

            motivoDecision: textoOpcional(
              pruebaFelina.motivoDecision,
            ),

            fechaReevaluacion:
              pruebaFelina.fechaReevaluacion || undefined,

            observaciones: textoOpcional(
              pruebaFelina.observaciones,
            ),

            comprobantePresentado:
              pruebaFelina.comprobantePresentado,
          }),
        },
      );

      const contenido = await respuesta.json().catch(() => null);

      if (!respuesta.ok) {
        throw new Error(
          contenido?.error ||
            "No se pudo registrar la prueba felina.",
        );
      }

      return contenido;
    },

    onSuccess: async () => {
      await actualizarHistorial();
      setFormularioActivo(null);

      toast({
        title: "Prueba FIV/FeLV registrada",
      });
    },

    onError: (error) => {
      toast({
        variant: "destructive",
        title: "No se pudo registrar",
        description:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado.",
      });
    },
  });

  /* =========================================================
     ELIMINAR REGISTROS
  ========================================================= */

  const eliminarRegistro = async (
    ruta: string,
    nombre: string,
  ) => {
    const confirmado = window.confirm(
      `¿Eliminar ${nombre}? Esta acción no se puede deshacer.`,
    );

    if (!confirmado) {
      return;
    }

    try {
      const respuesta = await fetch(`${BASE}/api/${ruta}`, {
        method: "DELETE",
      });

      if (!respuesta.ok && respuesta.status !== 204) {
        throw new Error("No se pudo eliminar el registro.");
      }

      await actualizarHistorial();

      toast({
        title: "Registro eliminado",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo eliminar el registro.",
      });
    }
  };

  /* =========================================================
     ESTADOS DE CARGA
  ========================================================= */

  if (isLoading) {
    return (
      <div className="py-16 flex justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-destructive">
        No se pudo cargar el historial de medicina preventiva.
      </div>
    );
  }

  /* =========================================================
     INTERFAZ
  ========================================================= */

  return (
    <div className="space-y-8">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">
            Medicina preventiva
          </h3>

          <p className="text-sm text-muted-foreground mt-1">
            Historial de vacunas, desparasitaciones y pruebas
            preventivas.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() =>
              setFormularioActivo(
                formularioActivo === "vacunacion"
                  ? null
                  : "vacunacion",
              )
            }
          >
            <Syringe className="h-4 w-4 mr-2" />
            Registrar vacunación
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setFormularioActivo(
                formularioActivo === "desparasitacion"
                  ? null
                  : "desparasitacion",
              )
            }
          >
            <Bug className="h-4 w-4 mr-2" />
            Registrar desparasitación
          </Button>

          {especieNormalizada === "Gato" && (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setFormularioActivo(
                  formularioActivo === "prueba"
                    ? null
                    : "prueba",
                )
              }
            >
              <TestTube2 className="h-4 w-4 mr-2" />
              Prueba FIV/FeLV
            </Button>
          )}
        </div>
      </div>

      {/* =====================================================
          FORMULARIO DE VACUNACIÓN
      ====================================================== */}

      {formularioActivo === "vacunacion" && (
        <Card className="border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Syringe className="h-5 w-5 text-primary" />
                Nueva visita de vacunación
              </CardTitle>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setFormularioActivo(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Campo label="Fecha de visita">
                <input
                  type="date"
                  className={campoClass}
                  value={visitaVacunacion.fechaVisita}
                  onChange={(event) =>
                    setVisitaVacunacion((actual) => ({
                      ...actual,
                      fechaVisita: event.target.value,
                    }))
                  }
                />
              </Campo>

              <Campo label="Intervalo del esquema">
                <select
                  className={campoClass}
                  value={visitaVacunacion.intervaloDias}
                  onChange={(event) =>
                    setVisitaVacunacion((actual) => ({
                      ...actual,
                      intervaloDias: event.target.value,
                    }))
                  }
                >
                  <option value="15">15 días</option>
                  <option value="21">21 días</option>
                  <option value="">Sin intervalo inmediato</option>
                </select>
              </Campo>

              <Campo label="Origen">
                <select
                  className={campoClass}
                  value={visitaVacunacion.origen}
                  onChange={(event) =>
                    setVisitaVacunacion((actual) => ({
                      ...actual,
                      origen: event.target.value,
                    }))
                  }
                >
                  <option value="Clinica">Nuestra clínica</option>
                  <option value="Externa">Aplicación externa</option>
                </select>
              </Campo>

              <Campo label="Médico responsable">
                <input
                  className={campoClass}
                  value={visitaVacunacion.medicoResponsable}
                  onChange={(event) =>
                    setVisitaVacunacion((actual) => ({
                      ...actual,
                      medicoResponsable: event.target.value,
                    }))
                  }
                />
              </Campo>

              {visitaVacunacion.origen === "Externa" && (
                <>
                  <Campo label="Clínica externa">
                    <input
                      className={campoClass}
                      value={visitaVacunacion.clinicaExterna}
                      onChange={(event) =>
                        setVisitaVacunacion((actual) => ({
                          ...actual,
                          clinicaExterna: event.target.value,
                        }))
                      }
                    />
                  </Campo>

                  <Campo label="Médico externo">
                    <input
                      className={campoClass}
                      value={visitaVacunacion.medicoExterno}
                      onChange={(event) =>
                        setVisitaVacunacion((actual) => ({
                          ...actual,
                          medicoExterno: event.target.value,
                        }))
                      }
                    />
                  </Campo>
                </>
              )}
            </div>

            {vacunas.map((vacuna, indice) => (
              <div
                key={indice}
                className="rounded-xl border bg-muted/10 p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold">
                    Vacuna {indice + 1}
                  </h4>

                  {vacunas.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() =>
                        setVacunas((actuales) =>
                          actuales.filter(
                            (_, posicion) => posicion !== indice,
                          ),
                        )
                      }
                    >
                      Quitar
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Campo label="Vacuna">
                    <input
                      className={campoClass}
                      placeholder={
                        especieNormalizada === "Gato"
                          ? "Triple felina, leucemia, rabia..."
                          : "Cuádruple, séxtuple, óctuple..."
                      }
                      value={vacuna.vacuna}
                      onChange={(event) =>
                        setVacunas((actuales) =>
                          actuales.map((elemento, posicion) =>
                            posicion === indice
                              ? {
                                  ...elemento,
                                  vacuna: event.target.value,
                                }
                              : elemento,
                          ),
                        )
                      }
                    />
                  </Campo>

                  <Campo label="Etapa">
                    <select
                      className={campoClass}
                      value={vacuna.etapa}
                      onChange={(event) =>
                        setVacunas((actuales) =>
                          actuales.map((elemento, posicion) =>
                            posicion === indice
                              ? {
                                  ...elemento,
                                  etapa: event.target.value as
                                    | "Cachorro"
                                    | "Adulto",
                                }
                              : elemento,
                          ),
                        )
                      }
                    >
                      <option value="Cachorro">Cachorro</option>
                      <option value="Adulto">Adulto</option>
                    </select>
                  </Campo>

                  <Campo label="Fecha de aplicación">
                    <input
                      type="date"
                      className={campoClass}
                      value={vacuna.fechaAplicacion}
                      onChange={(event) =>
                        setVacunas((actuales) =>
                          actuales.map((elemento, posicion) =>
                            posicion === indice
                              ? {
                                  ...elemento,
                                  fechaAplicacion:
                                    event.target.value,
                                }
                              : elemento,
                          ),
                        )
                      }
                    />
                  </Campo>

                  <Campo label="Marca">
                    <input
                      className={campoClass}
                      value={vacuna.marca}
                      onChange={(event) =>
                        setVacunas((actuales) =>
                          actuales.map((elemento, posicion) =>
                            posicion === indice
                              ? {
                                  ...elemento,
                                  marca: event.target.value,
                                }
                              : elemento,
                          ),
                        )
                      }
                    />
                  </Campo>

                  <Campo label="Laboratorio">
                    <input
                      className={campoClass}
                      value={vacuna.laboratorio}
                      onChange={(event) =>
                        setVacunas((actuales) =>
                          actuales.map((elemento, posicion) =>
                            posicion === indice
                              ? {
                                  ...elemento,
                                  laboratorio:
                                    event.target.value,
                                }
                              : elemento,
                          ),
                        )
                      }
                    />
                  </Campo>

                  <Campo label="Lote">
                    <input
                      className={campoClass}
                      value={vacuna.lote}
                      onChange={(event) =>
                        setVacunas((actuales) =>
                          actuales.map((elemento, posicion) =>
                            posicion === indice
                              ? {
                                  ...elemento,
                                  lote: event.target.value,
                                }
                              : elemento,
                          ),
                        )
                      }
                    />
                  </Campo>

                  <Campo label="Caducidad">
                    <input
                      type="date"
                      className={campoClass}
                      value={vacuna.fechaCaducidad}
                      onChange={(event) =>
                        setVacunas((actuales) =>
                          actuales.map((elemento, posicion) =>
                            posicion === indice
                              ? {
                                  ...elemento,
                                  fechaCaducidad:
                                    event.target.value,
                                }
                              : elemento,
                          ),
                        )
                      }
                    />
                  </Campo>

                  <Campo label="Próxima aplicación">
                    <input
                      type="date"
                      className={campoClass}
                      value={vacuna.proximaAplicacion}
                      onChange={(event) =>
                        setVacunas((actuales) =>
                          actuales.map((elemento, posicion) =>
                            posicion === indice
                              ? {
                                  ...elemento,
                                  proximaAplicacion:
                                    event.target.value,
                                }
                              : elemento,
                          ),
                        )
                      }
                    />
                  </Campo>

                  <Campo label="Estado">
                    <select
                      className={campoClass}
                      value={vacuna.estado}
                      onChange={(event) =>
                        setVacunas((actuales) =>
                          actuales.map((elemento, posicion) =>
                            posicion === indice
                              ? {
                                  ...elemento,
                                  estado: event.target.value,
                                }
                              : elemento,
                          ),
                        )
                      }
                    >
                      <option value="Aplicada">Aplicada</option>
                      <option value="Vigente">Vigente</option>
                      <option value="Pendiente">Pendiente</option>
                      <option value="Pospuesta">Pospuesta</option>
                      <option value="No indicada">
                        No indicada
                      </option>
                      <option value="Contraindicada">
                        Contraindicada
                      </option>
                      <option value="Pendiente de decision medica">
                        Pendiente de decisión médica
                      </option>
                    </select>
                  </Campo>
                </div>
              </div>
            ))}

            {vacunas.length < 2 && (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setVacunas((actuales) => [
                    ...actuales,
                    vacunaVacia(),
                  ])
                }
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar segunda vacuna
              </Button>
            )}

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormularioActivo(null)}
              >
                Cancelar
              </Button>

              <Button
                type="button"
                disabled={registrarVacunacion.isPending}
                onClick={() => registrarVacunacion.mutate()}
              >
                {registrarVacunacion.isPending
                  ? "Guardando..."
                  : "Guardar vacunación"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* =====================================================
          FORMULARIO DE DESPARASITACIÓN
      ====================================================== */}

      {formularioActivo === "desparasitacion" && (
        <Card className="border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5 text-primary" />
                Nueva desparasitación
              </CardTitle>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setFormularioActivo(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Campo label="Fecha de aplicación">
                <input
                  type="date"
                  className={campoClass}
                  value={desparasitacion.fechaAplicacion}
                  onChange={(event) =>
                    setDesparasitacion((actual) => ({
                      ...actual,
                      fechaAplicacion: event.target.value,
                    }))
                  }
                />
              </Campo>

              <Campo label="Producto">
                <input
                  className={campoClass}
                  value={desparasitacion.producto}
                  onChange={(event) =>
                    setDesparasitacion((actual) => ({
                      ...actual,
                      producto: event.target.value,
                    }))
                  }
                />
              </Campo>

              <Campo label="Principio activo">
                <input
                  className={campoClass}
                  value={desparasitacion.principioActivo}
                  onChange={(event) =>
                    setDesparasitacion((actual) => ({
                      ...actual,
                      principioActivo: event.target.value,
                    }))
                  }
                />
              </Campo>

              <Campo label="Fabricante">
                <input
                  className={campoClass}
                  value={desparasitacion.fabricante}
                  onChange={(event) =>
                    setDesparasitacion((actual) => ({
                      ...actual,
                      fabricante: event.target.value,
                    }))
                  }
                />
              </Campo>

              <Campo label="Lote">
                <input
                  className={campoClass}
                  value={desparasitacion.lote}
                  onChange={(event) =>
                    setDesparasitacion((actual) => ({
                      ...actual,
                      lote: event.target.value,
                    }))
                  }
                />
              </Campo>

              <Campo label="Origen">
                <select
                  className={campoClass}
                  value={desparasitacion.origen}
                  onChange={(event) =>
                    setDesparasitacion((actual) => ({
                      ...actual,
                      origen: event.target.value,
                    }))
                  }
                >
                  <option value="Clinica">Nuestra clínica</option>
                  <option value="Externa">Aplicación externa</option>
                </select>
              </Campo>

              <Campo label="Duración del efecto (días)">
                <input
                  type="number"
                  min="1"
                  className={campoClass}
                  value={desparasitacion.duracionDias}
                  onChange={(event) =>
                    setDesparasitacion((actual) => ({
                      ...actual,
                      duracionDias: event.target.value,
                    }))
                  }
                />
              </Campo>

              <Campo label="Repetir cada (días)">
                <input
                  type="number"
                  min="1"
                  className={campoClass}
                  value={desparasitacion.frecuenciaDias}
                  onChange={(event) =>
                    setDesparasitacion((actual) => ({
                      ...actual,
                      frecuenciaDias: event.target.value,
                    }))
                  }
                />
              </Campo>

              <Campo label="Próxima aplicación">
                <input
                  type="date"
                  className={campoClass}
                  value={desparasitacion.proximaAplicacion}
                  onChange={(event) =>
                    setDesparasitacion((actual) => ({
                      ...actual,
                      proximaAplicacion: event.target.value,
                    }))
                  }
                />
              </Campo>

              <Campo label="Peso al aplicar">
                <input
                  className={campoClass}
                  placeholder="Ej. 8.5 kg"
                  value={desparasitacion.pesoAplicacion}
                  onChange={(event) =>
                    setDesparasitacion((actual) => ({
                      ...actual,
                      pesoAplicacion: event.target.value,
                    }))
                  }
                />
              </Campo>

              {desparasitacion.origen === "Externa" && (
                <Campo label="Clínica externa">
                  <input
                    className={campoClass}
                    value={desparasitacion.clinicaExterna}
                    onChange={(event) =>
                      setDesparasitacion((actual) => ({
                        ...actual,
                        clinicaExterna: event.target.value,
                      }))
                    }
                  />
                </Campo>
              )}
            </div>

            <div className="flex flex-wrap gap-5">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={desparasitacion.cubreInternos}
                  onChange={(event) =>
                    setDesparasitacion((actual) => ({
                      ...actual,
                      cubreInternos: event.target.checked,
                    }))
                  }
                />

                <span className="text-sm font-medium">
                  Cubre parásitos internos
                </span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={desparasitacion.cubreExternos}
                  onChange={(event) =>
                    setDesparasitacion((actual) => ({
                      ...actual,
                      cubreExternos: event.target.checked,
                    }))
                  }
                />

                <span className="text-sm font-medium">
                  Cubre parásitos externos
                </span>
              </label>
            </div>

            <Campo label="Observaciones">
              <textarea
                rows={3}
                className={campoClass}
                value={desparasitacion.observaciones}
                onChange={(event) =>
                  setDesparasitacion((actual) => ({
                    ...actual,
                    observaciones: event.target.value,
                  }))
                }
              />
            </Campo>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormularioActivo(null)}
              >
                Cancelar
              </Button>

              <Button
                type="button"
                disabled={registrarDesparasitacion.isPending}
                onClick={() =>
                  registrarDesparasitacion.mutate()
                }
              >
                {registrarDesparasitacion.isPending
                  ? "Guardando..."
                  : "Guardar desparasitación"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* =====================================================
          FORMULARIO DE PRUEBA FELINA
      ====================================================== */}

      {formularioActivo === "prueba" &&
        especieNormalizada === "Gato" && (
          <Card className="border-primary/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TestTube2 className="h-5 w-5 text-primary" />
                  Nueva prueba FIV/FeLV
                </CardTitle>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setFormularioActivo(null)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Campo label="Fecha de prueba">
                  <input
                    type="date"
                    className={campoClass}
                    value={pruebaFelina.fechaPrueba}
                    onChange={(event) =>
                      setPruebaFelina((actual) => ({
                        ...actual,
                        fechaPrueba: event.target.value,
                      }))
                    }
                  />
                </Campo>

                <Campo label="Fecha de resultado">
                  <input
                    type="date"
                    className={campoClass}
                    value={pruebaFelina.fechaResultado}
                    onChange={(event) =>
                      setPruebaFelina((actual) => ({
                        ...actual,
                        fechaResultado: event.target.value,
                      }))
                    }
                  />
                </Campo>

                <Campo label="Edad en meses">
                  <input
                    type="number"
                    min="0"
                    className={campoClass}
                    value={pruebaFelina.edadMeses}
                    onChange={(event) =>
                      setPruebaFelina((actual) => ({
                        ...actual,
                        edadMeses: event.target.value,
                      }))
                    }
                  />
                </Campo>

                <Campo label="Resultado FIV">
                  <select
                    className={campoClass}
                    value={pruebaFelina.resultadoFiv}
                    onChange={(event) =>
                      setPruebaFelina((actual) => ({
                        ...actual,
                        resultadoFiv: event.target.value,
                      }))
                    }
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Negativo">Negativo</option>
                    <option value="Positivo">Positivo</option>
                    <option value="Indeterminado">
                      Indeterminado
                    </option>
                  </select>
                </Campo>

                <Campo label="Resultado FeLV">
                  <select
                    className={campoClass}
                    value={pruebaFelina.resultadoFelv}
                    onChange={(event) =>
                      setPruebaFelina((actual) => ({
                        ...actual,
                        resultadoFelv: event.target.value,
                      }))
                    }
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Negativo">Negativo</option>
                    <option value="Positivo">Positivo</option>
                    <option value="Indeterminado">
                      Indeterminado
                    </option>
                  </select>
                </Campo>

                <Campo label="Decisión sobre leucemia">
                  <select
                    className={campoClass}
                    value={pruebaFelina.decisionLeucemia}
                    onChange={(event) =>
                      setPruebaFelina((actual) => ({
                        ...actual,
                        decisionLeucemia: event.target.value,
                      }))
                    }
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Aplicar">Aplicar</option>
                    <option value="Posponer">Posponer</option>
                    <option value="No indicada">
                      No indicada
                    </option>
                    <option value="Contraindicada">
                      Contraindicada
                    </option>
                  </select>
                </Campo>

                <Campo label="Fecha de reevaluación">
                  <input
                    type="date"
                    className={campoClass}
                    value={pruebaFelina.fechaReevaluacion}
                    onChange={(event) =>
                      setPruebaFelina((actual) => ({
                        ...actual,
                        fechaReevaluacion:
                          event.target.value,
                      }))
                    }
                  />
                </Campo>

                <Campo label="Laboratorio">
                  <input
                    className={campoClass}
                    value={pruebaFelina.laboratorio}
                    onChange={(event) =>
                      setPruebaFelina((actual) => ({
                        ...actual,
                        laboratorio: event.target.value,
                      }))
                    }
                  />
                </Campo>

                <Campo label="Origen">
                  <select
                    className={campoClass}
                    value={pruebaFelina.origen}
                    onChange={(event) =>
                      setPruebaFelina((actual) => ({
                        ...actual,
                        origen: event.target.value,
                      }))
                    }
                  >
                    <option value="Clinica">Nuestra clínica</option>
                    <option value="Externa">
                      Prueba externa
                    </option>
                  </select>
                </Campo>
              </div>

              <Campo label="Motivo de decisión">
                <textarea
                  rows={2}
                  className={campoClass}
                  value={pruebaFelina.motivoDecision}
                  onChange={(event) =>
                    setPruebaFelina((actual) => ({
                      ...actual,
                      motivoDecision: event.target.value,
                    }))
                  }
                />
              </Campo>

              <Campo label="Observaciones">
                <textarea
                  rows={3}
                  className={campoClass}
                  value={pruebaFelina.observaciones}
                  onChange={(event) =>
                    setPruebaFelina((actual) => ({
                      ...actual,
                      observaciones: event.target.value,
                    }))
                  }
                />
              </Campo>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormularioActivo(null)}
                >
                  Cancelar
                </Button>

                <Button
                  type="button"
                  disabled={registrarPruebaFelina.isPending}
                  onClick={() => registrarPruebaFelina.mutate()}
                >
                  {registrarPruebaFelina.isPending
                    ? "Guardando..."
                    : "Guardar prueba"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

      {/* =====================================================
          HISTORIAL
      ====================================================== */}

      <Tabs defaultValue="vacunas" className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="vacunas">
            <Syringe className="h-4 w-4 mr-2" />
            Vacunaciones
          </TabsTrigger>

          <TabsTrigger value="desparasitaciones">
            <Bug className="h-4 w-4 mr-2" />
            Desparasitaciones
          </TabsTrigger>

          {especieNormalizada === "Gato" && (
            <TabsTrigger value="pruebas">
              <TestTube2 className="h-4 w-4 mr-2" />
              FIV/FeLV
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="vacunas" className="space-y-4">
          {data.visitasVacunacion.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed py-16 text-center text-muted-foreground">
              <Syringe className="h-12 w-12 mx-auto mb-4 opacity-20" />

              <p className="font-semibold text-foreground">
                Sin vacunas registradas
              </p>
            </div>
          ) : (
            data.visitasVacunacion.map((visita) => (
              <Card key={visita.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />

                      {mostrarFecha(visita.fechaVisita)}
                    </CardTitle>

                    <Badge variant="outline">
                      {visita.origen === "Externa"
                        ? "Aplicación externa"
                        : "Nuestra clínica"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {visita.vacunas.map((vacuna) => (
                    <div
                      key={vacuna.id}
                      className="rounded-xl border p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold">
                            {vacuna.vacuna}
                          </p>

                          <Badge
                            className={`border ${estadoColor(
                              vacuna.estado,
                            )}`}
                          >
                            {vacuna.estado}
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground">
                          Aplicación:{" "}
                          {mostrarFecha(
                            vacuna.fechaAplicacion,
                          )}
                        </p>

                        <p className="text-sm text-muted-foreground">
                          Próxima:{" "}
                          {mostrarFecha(
                            vacuna.proximaAplicacion,
                          )}
                        </p>

                        {(vacuna.marca ||
                          vacuna.laboratorio ||
                          vacuna.lote) && (
                          <p className="text-xs text-muted-foreground">
                            {[vacuna.marca, vacuna.laboratorio]
                              .filter(Boolean)
                              .join(" · ")}

                            {vacuna.lote
                              ? ` · Lote ${vacuna.lote}`
                              : ""}
                          </p>
                        )}
                      </div>

                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() =>
                          eliminarRegistro(
                            `vacunaciones/${vacuna.id}`,
                            "esta vacunación",
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent
          value="desparasitaciones"
          className="space-y-4"
        >
          {data.desparasitaciones.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed py-16 text-center text-muted-foreground">
              <Bug className="h-12 w-12 mx-auto mb-4 opacity-20" />

              <p className="font-semibold text-foreground">
                Sin desparasitaciones registradas
              </p>
            </div>
          ) : (
            data.desparasitaciones.map((registro) => (
              <Card key={registro.id}>
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-lg">
                        {registro.producto}
                      </p>

                      {registro.cubreInternos && (
                        <Badge variant="outline">
                          Internos
                        </Badge>
                      )}

                      {registro.cubreExternos && (
                        <Badge variant="outline">
                          Externos
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground">
                      Aplicación:{" "}
                      {mostrarFecha(
                        registro.fechaAplicacion,
                      )}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      Próxima:{" "}
                      {mostrarFecha(
                        registro.proximaAplicacion,
                      )}
                    </p>

                    {registro.principioActivo && (
                      <p className="text-xs text-muted-foreground">
                        Principio activo:{" "}
                        {registro.principioActivo}
                      </p>
                    )}
                  </div>

                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() =>
                      eliminarRegistro(
                        `desparasitaciones/${registro.id}`,
                        "esta desparasitación",
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {especieNormalizada === "Gato" && (
          <TabsContent value="pruebas" className="space-y-4">
            {data.pruebasFelinas.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed py-16 text-center text-muted-foreground">
                <TestTube2 className="h-12 w-12 mx-auto mb-4 opacity-20" />

                <p className="font-semibold text-foreground">
                  Sin pruebas FIV/FeLV registradas
                </p>
              </div>
            ) : (
              data.pruebasFelinas.map((prueba) => (
                <Card key={prueba.id}>
                  <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <p className="font-bold">
                        Prueba FIV/FeLV
                      </p>

                      <p className="text-sm text-muted-foreground">
                        Fecha:{" "}
                        {mostrarFecha(prueba.fechaPrueba)}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">
                          FIV: {prueba.resultadoFiv}
                        </Badge>

                        <Badge variant="outline">
                          FeLV: {prueba.resultadoFelv}
                        </Badge>

                        {prueba.decisionLeucemia && (
                          <Badge className="bg-primary/10 text-primary border-primary/20">
                            Leucemia:{" "}
                            {prueba.decisionLeucemia}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() =>
                        eliminarRegistro(
                          `pruebas-felinas/${prueba.id}`,
                          "esta prueba",
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        )}
      </Tabs>

      <div className="rounded-xl border bg-primary/5 p-4 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />

        <p className="text-sm text-muted-foreground">
          Los esquemas y fechas sugeridas son auxiliares. La decisión
          final de aplicación, intervalo, refuerzo o contraindicación
          permanece bajo criterio médico.
        </p>
      </div>
    </div>
  );
}
