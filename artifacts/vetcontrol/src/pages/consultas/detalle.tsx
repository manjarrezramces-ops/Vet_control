import { useParams, Link, useLocation } from "wouter";
import {
  useGetConsulta,
  getGetConsultaQueryKey,
  useDeleteConsulta,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Calendar,
  UserRound,
  Clock,
  Activity,
  FileText,
  ClipboardList,
  Paperclip,
  Upload,
  X,
  FileIcon,
  ImageIcon,
  ExternalLink,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ConsultaConArchivos = {
  archivoEstudios?: string | null;
  archivosEstudios?: string[];
};

function nombreArchivoDesdeRuta(ruta: string): string {
  const ultimoSegmento = ruta.split("/").pop() ?? "Documento";
  try {
    return decodeURIComponent(ultimoSegmento);
  } catch {
    return ultimoSegmento;
  }
}

function esImagen(ruta: string): boolean {
  return /\.(png|jpg|jpeg|webp)$/i.test(ruta);
}

export default function ConsultaDetalle() {
  const params = useParams();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: consulta, isLoading, isError } = useGetConsulta(id, {
    query: {
      enabled: !!id,
      queryKey: getGetConsultaQueryKey(id),
    },
  });

  const BASE = (import.meta.env.BASE_URL as string).replace(/\/$/, "");
  const [archivos, setArchivos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [archivoEliminando, setArchivoEliminando] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!consulta) return;

    const consultaConArchivos = consulta as typeof consulta & ConsultaConArchivos;

    if (
      Array.isArray(consultaConArchivos.archivosEstudios) &&
      consultaConArchivos.archivosEstudios.length > 0
    ) {
      setArchivos(consultaConArchivos.archivosEstudios);
      return;
    }

    if (consultaConArchivos.archivoEstudios) {
      setArchivos([consultaConArchivos.archivoEstudios]);
      return;
    }

    setArchivos([]);
  }, [consulta]);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    const allowedTypes = new Set([
      "application/pdf",
      "image/png",
      "image/jpeg",
    ]);

    const invalidos = files.filter((file) => !allowedTypes.has(file.type));

    if (invalidos.length > 0) {
      toast({
        variant: "destructive",
        title: "Formato no permitido",
        description:
          "Solo puedes adjuntar archivos PDF, PNG, JPG o JPEG.",
      });

      event.target.value = "";
      return;
    }

    setUploading(true);

    try {
      const rutasSubidas: string[] = [];

      for (const file of files) {
        const urlRes = await fetch(
          `${BASE}/api/storage/uploads/request-url`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: file.name,
              size: file.size,
              contentType: file.type,
            }),
          },
        );

        if (!urlRes.ok) {
          const message = await urlRes.text();
          throw new Error(
            `No se pudo generar la dirección de subida para ${file.name}: ${urlRes.status} ${message}`,
          );
        }

        const result = (await urlRes.json()) as {
          uploadURL?: string;
          objectPath?: string;
        };

        if (!result.uploadURL || !result.objectPath) {
          throw new Error(
            `El servidor no devolvió una ruta válida para ${file.name}.`,
          );
        }

        const uploadURL = result.uploadURL.startsWith("http")
          ? result.uploadURL
          : `${window.location.origin}${result.uploadURL}`;

        const uploadRes = await fetch(uploadURL, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        });

        if (!uploadRes.ok) {
          const message = await uploadRes.text();
          throw new Error(
            `La subida de ${file.name} fue rechazada: ${uploadRes.status} ${message}`,
          );
        }

        rutasSubidas.push(result.objectPath);
      }

      const saveRes = await fetch(
        `${BASE}/api/consultas/${id}/archivos`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            archivos: rutasSubidas,
          }),
        },
      );

      if (!saveRes.ok) {
        const message = await saveRes.text();
        throw new Error(
          `No se pudieron asociar los archivos: ${saveRes.status} ${message}`,
        );
      }

      const saved = (await saveRes.json()) as {
        archivosEstudios?: string[];
      };

      const nuevosArchivos = Array.isArray(saved.archivosEstudios)
        ? saved.archivosEstudios
        : Array.from(new Set([...archivos, ...rutasSubidas]));

      setArchivos(nuevosArchivos);

      await queryClient.invalidateQueries({
        queryKey: getGetConsultaQueryKey(id),
      });

      toast({
        title:
          files.length === 1
            ? "Archivo adjuntado"
            : "Archivos adjuntados",
        description:
          files.length === 1
            ? "El documento de estudios fue guardado."
            : `Se guardaron ${files.length} documentos de estudios.`,
      });
    } catch (error) {
      console.error("Error al adjuntar archivos:", error);

      toast({
        variant: "destructive",
        title: "Error al subir los archivos",
        description:
          error instanceof Error
            ? error.message
            : "No se pudieron subir los archivos.",
      });
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveArchivo = async (archivo: string) => {
    setArchivoEliminando(archivo);

    try {
      const response = await fetch(
        `${BASE}/api/consultas/${id}/archivos`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            archivo,
          }),
        },
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(
          `No se pudo quitar el documento: ${response.status} ${message}`,
        );
      }

      const result = (await response.json()) as {
        archivosEstudios?: string[];
      };

      setArchivos(
        Array.isArray(result.archivosEstudios)
          ? result.archivosEstudios
          : archivos.filter((item) => item !== archivo),
      );

      await queryClient.invalidateQueries({
        queryKey: getGetConsultaQueryKey(id),
      });

      toast({
        title: "Archivo eliminado",
        description:
          "El documento fue retirado sin afectar los demás archivos.",
      });
    } catch (error) {
      console.error("Error al eliminar archivo:", error);

      toast({
        variant: "destructive",
        title: "No se pudo eliminar",
        description:
          error instanceof Error
            ? error.message
            : "No se pudo retirar el documento.",
      });
    } finally {
      setArchivoEliminando(null);
    }
  };

  const deleteConsulta = useDeleteConsulta();

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <Skeleton className="h-16 w-3/4" />
        <Skeleton className="h-[800px] rounded-xl" />
      </div>
    );
  }

  if (isError || !consulta) {
    return (
      <div className="text-destructive font-bold text-lg text-center py-20">
        No se pudo recuperar el expediente de consulta.
      </div>
    );
  }

  const handleDelete = () => {
    deleteConsulta.mutate(
      { consultaId: id },
      {
        onSuccess: () => {
          toast({
            title: "Consulta eliminada",
            description:
              "El registro clínico fue borrado exitosamente.",
          });

          setLocation(`/pacientes/${consulta.pacienteId}`);
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Error",
            description:
              "Se denegó la eliminación del registro.",
          });
        },
      },
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <Link href={`/pacientes/${consulta.pacienteId}`}>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full mt-1 shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>

          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Expediente de Consulta
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-muted-foreground mt-3">
              <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                <Calendar className="h-4 w-4" />
                {format(new Date(consulta.fecha), "dd/MM/yyyy")}
              </span>

              {consulta.hora && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {consulta.hora}
                </span>
              )}

              {consulta.medico && (
                <span className="flex items-center gap-1.5">
                  <UserRound className="h-4 w-4" />
                  Dr. {consulta.medico}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href={`/consultas/${id}/editar`}>
            <Button variant="outline" size="lg" className="shadow-sm">
              <Edit className="mr-2 h-4 w-4" />
              Editar Datos
            </Button>
          </Link>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="lg"
                className="text-destructive hover:bg-destructive hover:text-destructive-foreground shadow-sm"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  ¿Eliminar de forma permanente?
                </AlertDialogTitle>

                <AlertDialogDescription className="text-base">
                  Estás a punto de borrar la información clínica de esta
                  visita. Los datos recuperados no volverán a estar
                  disponibles.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel>
                  Mantener consulta
                </AlertDialogCancel>

                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Sí, eliminar registro
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card className="shadow-sm border-t-4 border-t-primary overflow-hidden">
        <CardContent className="p-0">
          <div className="p-8 bg-muted/10 border-b">
            <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-3">
              Motivo Central de la Visita
            </h4>

            <p className="text-2xl font-bold leading-snug text-foreground">
              {consulta.motivo}
            </p>
          </div>

          <div className="p-8">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2 mb-6 uppercase tracking-wider">
              <Activity className="h-4 w-4 text-primary" />
              Constantes fisiológicas
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "PESO",
                  value:
                    consulta.peso != null
                      ? `${consulta.peso} kg`
                      : null,
                },
                {
                  label: "TEMP.",
                  value:
                    consulta.temperatura != null
                      ? `${consulta.temperatura} °C`
                      : null,
                },
                {
                  label: "CC",
                  value: consulta.condicionCorporal,
                },
                {
                  label: "MM",
                  value: consulta.mucosas,
                },
                {
                  label: "E.M.",
                  value: consulta.estadoMental,
                },
                {
                  label: "TLLC",
                  value: consulta.trc,
                },
                {
                  label: "LN",
                  value: consulta.linfonodos,
                },
                {
                  label: "FC",
                  value:
                    consulta.frecuenciaCardiaca != null
                      ? `${consulta.frecuenciaCardiaca} lpm`
                      : null,
                },
                {
                  label: "P",
                  value: consulta.pulso,
                },
                {
                  label: "%DH",
                  value: consulta.deshidratacion,
                },
                {
                  label: "FR",
                  value:
                    consulta.frecuenciaRespiratoria != null
                      ? `${consulta.frecuenciaRespiratoria} rpm`
                      : null,
                },
                {
                  label: "RT",
                  value: consulta.ruidosTransito,
                },
                {
                  label: "CP",
                  value: consulta.camposPulmonares,
                },
                {
                  label: "RD",
                  value: consulta.ruidosDorsales,
                },
                {
                  label: "PP",
                  value: consulta.palmopercusion,
                },
                {
                  label: "PA",
                  value: consulta.palpacionAbdominal,
                },
              ].map((parametro) => (
                <div
                  key={parametro.label}
                  className="bg-muted/30 p-4 rounded-xl border border-border/50 flex flex-col items-center justify-center text-center min-h-24"
                >
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                    {parametro.label}
                  </div>

                  <div className="font-bold text-base text-foreground whitespace-pre-wrap break-words">
                    {parametro.value !== null &&
                    parametro.value !== undefined &&
                    parametro.value !== "" ? (
                      parametro.value
                    ) : (
                      <span className="text-muted-foreground/40 font-sans">
                        —
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="p-8 space-y-8">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wider">
              <FileText className="h-4 w-4 text-primary" />
              Exploración Clínica Detallada
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {consulta.anamnesis && (
                <div className="bg-muted/10 p-5 rounded-xl border border-border/40">
                  <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                    Anamnesis (Historia Actual)
                  </h5>

                  <p className="text-base text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {consulta.anamnesis}
                  </p>
                </div>
              )}

              {consulta.exploracionFisica && (
                <div className="bg-muted/10 p-5 rounded-xl border border-border/40">
                  <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                    Examen Físico Especial
                  </h5>

                  <p className="text-base text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {consulta.exploracionFisica}
                  </p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          <div className="p-8 space-y-8 bg-muted/5">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wider">
              <ClipboardList className="h-4 w-4 text-primary" />
              Resolución Médica y Plan
            </h4>

            {consulta.diagnosticosDiferenciales && (
              <div>
                <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Hipótesis / Dx Diferenciales
                </h5>

                <p className="text-base text-foreground/90 whitespace-pre-wrap leading-relaxed p-4 bg-white rounded-lg border border-border/40 shadow-sm">
                  {consulta.diagnosticosDiferenciales}
                </p>
              </div>
            )}

            {consulta.diagnostico && (
              <div className="bg-primary/5 p-6 rounded-xl border border-primary/20 shadow-sm relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />

                <h5 className="text-sm font-bold text-primary uppercase tracking-widest mb-3">
                  Dictamen / Diagnóstico Definitivo
                </h5>

                <p className="text-lg font-semibold text-foreground whitespace-pre-wrap leading-relaxed">
                  {consulta.diagnostico}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {consulta.plan && (
                <div>
                  <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Protocolo a Seguir / Plan Clínico
                  </h5>

                  <p className="text-base text-foreground/90 whitespace-pre-wrap leading-relaxed p-4 bg-white rounded-lg border border-border/40 shadow-sm min-h-[100px]">
                    {consulta.plan}
                  </p>
                </div>
              )}

              {consulta.tratamiento && (
                <div>
                  <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Tratamiento Físico Aplicado (In Situ)
                  </h5>

                  <p className="text-base text-foreground/90 whitespace-pre-wrap leading-relaxed p-4 bg-white rounded-lg border border-border/40 shadow-sm min-h-[100px]">
                    {consulta.tratamiento}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white p-6 rounded-xl border border-border/40 shadow-sm">
              <div>
                <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Expectativa y Pronóstico
                </h5>

                <p className="text-lg font-bold text-foreground">
                  {consulta.pronostico || (
                    <span className="text-muted-foreground/40 font-sans font-medium text-base">
                      - No definido -
                    </span>
                  )}
                </p>
              </div>

              <div>
                <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  Próxima Evaluación Solicitada
                </h5>

                <p className="text-lg font-bold text-foreground">
                  {consulta.proximaCita ? (
                    format(new Date(consulta.proximaCita), "dd/MM/yyyy")
                  ) : (
                    <span className="text-muted-foreground/40 font-sans font-medium text-base">
                      - Sin programar -
                    </span>
                  )}
                </p>
              </div>
            </div>

            {consulta.observaciones && (
              <div className="pt-2">
                <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Apuntes Adicionales / Notas de Alta
                </h5>

                <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed p-4 bg-white rounded-lg border border-border/40 italic">
                  {consulta.observaciones}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border/60">
        <CardContent className="p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-primary" />

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Documentos de Estudios
                </h3>

                <p className="text-xs text-muted-foreground mt-1">
                  {archivos.length === 0
                    ? "No hay documentos adjuntos."
                    : `${archivos.length} documento${
                        archivos.length === 1 ? "" : "s"
                      } adjunto${archivos.length === 1 ? "" : "s"}.`}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="font-semibold"
            >
              {uploading ? (
                <>
                  <div className="h-3.5 w-3.5 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5 mr-2" />
                  {archivos.length === 0
                    ? "Adjuntar archivos"
                    : "Agregar más archivos"}
                </>
              )}
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          {archivos.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {archivos.map((archivo, index) => {
                const url = `${BASE}/api/storage${archivo}`;
                const eliminando = archivoEliminando === archivo;

                return (
                  <div
                    key={`${archivo}-${index}`}
                    className="flex flex-col gap-4 rounded-xl border border-border/50 bg-muted/20 p-4 sm:flex-row sm:items-center"
                  >
                    {esImagen(archivo) ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block shrink-0"
                      >
                        <img
                          src={url}
                          alt={`Documento de estudios ${index + 1}`}
                          className="h-24 w-32 rounded-lg border bg-white object-contain shadow-sm"
                        />
                      </a>
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <FileIcon className="h-7 w-7 text-primary" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {esImagen(archivo) ? (
                          <ImageIcon className="h-4 w-4 shrink-0 text-primary" />
                        ) : (
                          <FileIcon className="h-4 w-4 shrink-0 text-primary" />
                        )}

                        <p className="truncate font-semibold text-foreground">
                          {nombreArchivoDesdeRuta(archivo)}
                        </p>
                      </div>

                      <p className="mt-1 text-xs text-muted-foreground">
                        Documento {index + 1} de {archivos.length}
                      </p>

                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-4"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Abrir documento
                      </a>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={eliminando || uploading}
                      className="shrink-0 text-destructive hover:text-destructive"
                      onClick={() => handleRemoveArchivo(archivo)}
                    >
                      {eliminando ? (
                        <>
                          <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-destructive border-t-transparent" />
                          Quitando...
                        </>
                      ) : (
                        <>
                          <X className="mr-1.5 h-4 w-4" />
                          Quitar
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              onClick={() => {
                if (!uploading) {
                  fileInputRef.current?.click();
                }
              }}
              className="cursor-pointer rounded-xl border-2 border-dashed border-border/60 p-10 text-center transition-colors hover:border-primary/40 hover:bg-muted/20"
            >
              <Upload className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />

              <p className="text-sm font-medium text-muted-foreground">
                Haz clic para adjuntar uno o varios archivos
              </p>

              <p className="mt-1 text-xs text-muted-foreground/60">
                PDF, PNG, JPG o JPEG
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
