import { useParams, Link, useLocation } from "wouter";
import { useState, useRef } from "react";
import { useGetPaciente, getGetPacienteQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Upload, FileText, Loader2, ImageIcon } from "lucide-react";

const BASE = () => (import.meta.env.BASE_URL as string).replace(/\/$/, "");

export default function RecetaNueva() {
  const params = useParams();
  const pacienteId = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [fecha, setFecha] = useState(format(new Date(), "yyyy-MM-dd"));
  const [archivo, setArchivo] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: pacienteData } = useGetPaciente(pacienteId, {
    query: { enabled: !!pacienteId, queryKey: getGetPacienteQueryKey(pacienteId) },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setArchivo(f);
  };

  const handleSubmit = async () => {
    if (!fecha) return;
    setSaving(true);
    try {
      // 1. Crear la receta
      const recetaRes = await fetch(`${BASE()}/api/pacientes/${pacienteId}/recetas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha, partidas: [] }),
      });
      if (!recetaRes.ok) throw new Error();
      const receta = await recetaRes.json();

      // 2. Si hay archivo, subirlo
      if (archivo) {
        const urlRes = await fetch(`${BASE()}/api/storage/uploads/request-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: archivo.name, size: archivo.size, contentType: archivo.type }),
        });
        if (!urlRes.ok) throw new Error();
        const { uploadURL, objectPath } = await urlRes.json();
        await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": archivo.type }, body: archivo });
        await fetch(`${BASE()}/api/recetas/${receta.id}/archivo`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archivoImagen: objectPath }),
        });
      }

      queryClient.invalidateQueries({ queryKey: getGetPacienteQueryKey(pacienteId) });
      toast({ title: "Receta guardada" });
      setLocation(`/recetas/${receta.id}`);
    } catch {
      toast({ variant: "destructive", title: "Error al guardar la receta" });
    } finally {
      setSaving(false);
    }
  };

  const isPdf = archivo?.name.toLowerCase().endsWith(".pdf");

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href={`/pacientes/${pacienteId}`}>
          <Button variant="outline" size="icon" className="rounded-full shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Nueva Receta</h1>
          <p className="text-muted-foreground mt-1">{pacienteData?.paciente.nombre}</p>
        </div>
      </div>

      <Card className="shadow-sm border-t-4 border-t-primary">
        <CardContent className="p-8 space-y-6">
          {/* Fecha */}
          <div className="space-y-2">
            <label className="text-base font-semibold">Fecha <span className="text-destructive">*</span></label>
            <Input
              type="date"
              className="h-12 text-base"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
            />
          </div>

          {/* Archivo */}
          <div className="space-y-2">
            <label className="text-base font-semibold">Archivo de receta</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.pdf"
              className="hidden"
              onChange={handleFileSelect}
            />

            {archivo ? (
              <div className="flex items-center gap-4 p-4 bg-muted/20 rounded-xl border border-border/50">
                {isPdf ? (
                  <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shrink-0">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                ) : (
                  <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shrink-0">
                    <ImageIcon className="h-6 w-6 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{archivo.name}</p>
                  <p className="text-xs text-muted-foreground">{(archivo.size / 1024).toFixed(0)} KB</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>Cambiar</Button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border/60 rounded-xl p-10 text-center cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-colors"
              >
                <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">Haz clic para adjuntar el archivo</p>
                <p className="text-xs text-muted-foreground/60 mt-1">PNG, JPG o PDF</p>
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <Link href={`/pacientes/${pacienteId}`}>
              <Button variant="outline" size="lg" type="button" className="h-12 px-6">Cancelar</Button>
            </Link>
            <Button
              size="lg"
              className="h-12 px-8 font-bold shadow-md"
              onClick={handleSubmit}
              disabled={saving || !fecha}
            >
              {saving && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Guardar receta
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
