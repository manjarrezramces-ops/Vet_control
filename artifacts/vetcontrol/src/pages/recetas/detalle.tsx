import { useParams, Link, useLocation } from "wouter";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Upload, FileText, ImageIcon, Calendar, Clock, Trash2, X } from "lucide-react";

const BASE = () => (import.meta.env.BASE_URL as string).replace(/\/$/, "");

type Receta = {
  id: number;
  pacienteId: number;
  fecha: string;
  paciente: string;
  archivoImagen: string | null;
  archivoAdjuntadoEn: string | null;
  creadoEn: string;
};

export default function RecetaDetalle() {
  const params = useParams();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: receta, isLoading, isError } = useQuery<Receta>({
    queryKey: ["receta", id],
    queryFn: async () => {
      const res = await fetch(`${BASE()}/api/recetas/${id}`);
      if (!res.ok) throw new Error("No encontrada");
      return res.json();
    },
    enabled: !!id,
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE()}/api/recetas/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      toast({ title: "Receta eliminada" });
      if (receta) setLocation(`/pacientes/${receta.pacienteId}`);
    },
    onError: () => toast({ variant: "destructive", title: "No se pudo eliminar" }),
  });

  const handleFileChange = async (
  e: React.ChangeEvent<HTMLInputElement>,
) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const allowedTypes = new Set([
    "application/pdf",
    "image/png",
    "image/jpeg",
  ]);

  if (!allowedTypes.has(file.type)) {
    toast({
      variant: "destructive",
      title: "Formato no permitido",
      description: "Solo puedes adjuntar PDF, PNG, JPG o JPEG.",
    });

    e.target.value = "";
    return;
  }

  setUploading(true);

  try {
    const urlRes = await fetch(
      `${BASE()}/api/storage/uploads/request-url`,
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
        `No se pudo preparar la subida: ${urlRes.status} ${message}`,
      );
    }

    const result = (await urlRes.json()) as {
      uploadURL?: string;
      objectPath?: string;
    };

    if (!result.uploadURL || !result.objectPath) {
      throw new Error(
        "El servidor no devolvió uploadURL u objectPath.",
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
        `La subida fue rechazada: ${uploadRes.status} ${message}`,
      );
    }

    const saveRes = await fetch(
      `${BASE()}/api/recetas/${id}/archivo`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          archivoImagen: result.objectPath,
        }),
      },
    );

    if (!saveRes.ok) {
      const message = await saveRes.text();
      throw new Error(
        `No se pudo asociar el archivo a la receta: ${saveRes.status} ${message}`,
      );
    }

    await queryClient.invalidateQueries({
      queryKey: ["receta", id],
    });

    toast({
      title: "Archivo adjuntado",
      description: "La receta fue guardada correctamente.",
    });
  } catch (error) {
    console.error("Error al adjuntar receta:", error);

    toast({
      variant: "destructive",
      title: "Error al subir el archivo",
      description:
        error instanceof Error
          ? error.message
          : "No se pudo subir el archivo.",
    });
  } finally {
    setUploading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }
};

  const handleRemove = async () => {
    await fetch(`${BASE()}/api/recetas/${id}/archivo`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archivoImagen: null }),
    });
    queryClient.invalidateQueries({ queryKey: ["receta", id] });
    toast({ title: "Archivo eliminado" });
  };

  if (isLoading) return (
    <div className="max-w-xl mx-auto space-y-6">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );

  if (isError || !receta) return (
    <div className="text-center py-20 text-destructive font-medium text-lg">Receta no encontrada.</div>
  );

  const archivo = receta.archivoImagen;
  const isPdf = archivo?.toLowerCase().endsWith(".pdf");
  const adjuntadoEn = receta.archivoAdjuntadoEn;

  return (
    <div className="max-w-xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href={`/pacientes/${receta.pacienteId}`}>
            <Button variant="outline" size="icon" className="rounded-full shrink-0 mt-1">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Receta</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground font-medium">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" /> {format(new Date(receta.fecha), "dd/MM/yyyy")}
              </span>
              <span>·</span>
              <span>{receta.paciente}</span>
            </div>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-destructive-foreground mt-1">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar receta?</AlertDialogTitle>
              <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteMut.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Archivo */}
      <Card className="shadow-sm border-t-4 border-t-primary">
        <CardContent className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Archivo de receta
            </h3>
            {!archivo && (
              <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()} className="font-semibold">
                {uploading
                  ? <><div className="h-3.5 w-3.5 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />Subiendo...</>
                  : <><Upload className="h-3.5 w-3.5 mr-2" />Adjuntar archivo</>
                }
              </Button>
            )}
          </div>

          <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.pdf" className="hidden" onChange={handleFileChange} />

          {archivo ? (
            <div className="space-y-4">
              {/* Vista previa */}
              {isPdf ? (
                <div className="flex items-center gap-4 p-5 bg-primary/5 rounded-xl border border-primary/20">
                  <div className="h-14 w-14 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shrink-0">
                    <FileText className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">Documento PDF</p>
                    <a href={`${BASE()}/api/storage${archivo}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline font-medium">Abrir PDF →</a>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden border shadow-sm">
                  <img
                    src={`${BASE()}/api/storage${archivo}`}
                    alt="Archivo de receta"
                    className="w-full max-h-96 object-contain bg-muted/20"
                  />
                </div>
              )}

              {/* Fecha de adjunto */}
              {adjuntadoEn && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                  <Clock className="h-3.5 w-3.5" />
                  Adjuntado el {format(new Date(adjuntadoEn), "dd/MM/yyyy 'a las' HH:mm")}
                </div>
              )}

              {/* Acciones */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="font-medium">
                  <Upload className="h-4 w-4 mr-1.5" /> Cambiar archivo
                </Button>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive font-medium" onClick={handleRemove}>
                  <X className="h-4 w-4 mr-1.5" /> Quitar
                </Button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border/60 rounded-xl p-12 text-center cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-colors"
            >
              <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">Haz clic para adjuntar el archivo de receta</p>
              <p className="text-xs text-muted-foreground/60 mt-1">PNG, JPG o PDF</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
