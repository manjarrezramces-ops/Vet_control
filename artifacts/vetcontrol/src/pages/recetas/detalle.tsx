import { useParams, Link } from "wouter";
import { useGetReceta, getGetRecetaQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Printer, ShieldCheck, Upload, X, ImageIcon } from "lucide-react";

export default function RecetaDetalle() {
  const params = useParams();
  const id = Number(params.id);

  const { data: receta, isLoading, isError } = useGetReceta(id, {
    query: {
      enabled: !!id,
      queryKey: getGetRecetaQueryKey(id),
    },
  });

  const BASE = (import.meta.env.BASE_URL as string).replace(/\/$/, "");
  const [archivo, setArchivo] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (receta) setArchivo((receta as typeof receta & { archivoImagen?: string | null }).archivoImagen ?? null);
  }, [receta]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const urlRes = await fetch(`${BASE}/api/storage/uploads/request-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      const { uploadURL, objectPath } = await urlRes.json();
      await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      await fetch(`${BASE}/api/recetas/${id}/archivo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archivoImagen: objectPath }),
      });
      setArchivo(objectPath);
    } catch {
      alert("No se pudo subir la imagen.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    await fetch(`${BASE}/api/recetas/${id}/archivo`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archivoImagen: null }),
    });
    setArchivo(null);
  };

  if (isLoading) {
    return <div className="space-y-8 max-w-3xl mx-auto"><Skeleton className="h-12 w-64" /><Skeleton className="h-[900px] rounded-xl" /></div>;
  }

  if (isError || !receta) {
    return <div className="text-destructive text-lg font-bold text-center py-20">El documento médico solicitado no es accesible.</div>;
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Action Bar - Hidden when printing */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/pacientes/${receta.pacienteId}`}>
            <Button variant="outline" size="icon" className="rounded-full shadow-sm">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Vista de Recetario</h1>
        </div>
        <Button onClick={handlePrint} size="lg" className="shadow-sm font-bold text-base bg-foreground text-background hover:bg-foreground/90">
          <Printer className="mr-2 h-5 w-5" /> Iniciar Impresión
        </Button>
      </div>

      {/* Printable Area */}
      <Card className="print:border-none print:shadow-none bg-white shadow-md border-t-8 border-t-primary rounded-xl overflow-hidden">
        <CardContent className="p-10 sm:p-14">
          
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-primary/20 pb-8 mb-8">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center shrink-0 shadow-sm">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <div className="mt-1">
                <h2 className="text-4xl font-bold text-primary tracking-tight font-serif">VetControl</h2>
                <p className="text-muted-foreground text-sm mt-1 uppercase tracking-widest font-semibold">Hospital Clínico Veterinario</p>
              </div>
            </div>
            <div className="text-right text-sm space-y-1.5 mt-1">
              <div className="font-semibold text-lg text-foreground">{format(new Date(receta.fecha), "dd/MM/yyyy")}</div>
              <div className="text-muted-foreground">Folio Control: <span className="font-mono text-foreground font-semibold">RC-{receta.id.toString().padStart(5, '0')}</span></div>
              {receta.medico && <div className="font-medium text-foreground">Facultativo: Dr. {receta.medico}</div>}
            </div>
          </div>

          {/* Patient Info */}
          <div className="bg-muted/10 border border-border/50 p-6 rounded-xl mb-10 grid grid-cols-2 gap-x-8 gap-y-4 text-base">
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">Identidad de la Mascota</span>
              <span className="font-bold text-lg text-foreground block leading-tight">{receta.paciente}</span>
              {receta.especie && <span className="text-sm font-medium text-muted-foreground">{receta.especie}{receta.raza ? ` · ${receta.raza}` : ''}</span>}
            </div>
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">Nombre del Titular Responsable</span>
              <span className="font-bold text-lg text-foreground block leading-tight">{receta.propietario}</span>
            </div>
          </div>

          {/* Medication List */}
          <div className="space-y-8 min-h-[350px]">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-5xl font-serif font-black text-primary italic pr-2">Rx</div>
              <div className="h-px bg-border flex-1 ml-4" />
            </div>
            
            {receta.partidas.map((p, index) => (
              <div key={p.id} className="relative pl-10 pr-4 py-2 hover:bg-muted/5 rounded-lg transition-colors">
                <div className="absolute left-2 top-3 font-black text-primary/40 text-lg">{index + 1}.</div>
                <div className="font-bold text-xl text-foreground">
                  {p.medicamento} 
                  {p.presentacion && <span className="font-medium text-muted-foreground text-base ml-2">({p.presentacion})</span>}
                </div>
                
                <div className="mt-2 text-foreground/90 text-base leading-relaxed bg-white inline-block">
                  <span className="font-bold uppercase text-xs tracking-wider text-muted-foreground mr-2">Esquema:</span> 
                  <span className="font-semibold">{p.dosis}</span>
                  {p.via && <span>, vía de admin. <span className="font-semibold text-primary">{p.via.toLowerCase()}</span></span>}
                  {p.frecuencia && <span>, a intervalar <span className="font-semibold">{p.frecuencia.toLowerCase()}</span></span>}
                  {p.duracion && <span>, bajo el plazo continuo de <span className="font-semibold underline decoration-primary/30 underline-offset-4">{p.duracion.toLowerCase()}</span></span>}.
                </div>
                
                {p.instrucciones && (
                  <div className="mt-2 text-sm text-foreground/80 italic border-l-2 border-primary/30 pl-3 py-0.5">
                    <span className="font-semibold not-italic">Nota directa:</span> {p.instrucciones}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer Info */}
          <div className="mt-16 space-y-10">
            {receta.indicacionesGenerales && (
              <div className="bg-primary/5 p-6 rounded-xl border border-primary/20 relative">
                <div className="absolute top-0 left-0 w-2 bottom-0 bg-primary rounded-l-xl"></div>
                <h4 className="font-bold text-primary mb-3 text-sm uppercase tracking-widest pl-2">Vigencia General de Cuidados</h4>
                <p className="text-base font-medium whitespace-pre-wrap leading-relaxed text-foreground/90 pl-2">{receta.indicacionesGenerales}</p>
              </div>
            )}

            <div className="flex justify-between items-end pt-16 mt-4">
              <div className="max-w-[50%]">
                {receta.proximaRevision && (
                  <div className="text-base bg-muted/20 px-4 py-3 rounded-lg border border-border/50">
                    <span className="font-bold text-primary uppercase text-xs tracking-wider block mb-1">Cita de revaloración proyectada:</span> 
                    <span className="font-bold text-foreground">{format(new Date(receta.proximaRevision), "dd/MM/yyyy")}</span>
                  </div>
                )}
              </div>
              <div className="text-center w-72">
                <div className="border-t-2 border-foreground pt-3 text-base font-bold uppercase tracking-widest text-foreground">
                  Firma y Sello del Facultativo
                </div>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* ── Imagen de receta ── */}
      <div className="print:hidden">
        <Card className="shadow-sm border-border/60">
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Imagen de Receta</h3>
              </div>
              {!archivo && (
                <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()} className="font-semibold">
                  {uploading ? (
                    <><div className="h-3.5 w-3.5 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />Subiendo...</>
                  ) : (
                    <><Upload className="h-3.5 w-3.5 mr-2" />Adjuntar imagen</>
                  )}
                </Button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg"
              className="hidden"
              onChange={handleFileChange}
            />

            {archivo ? (
              <div className="flex items-start gap-4 p-4 bg-muted/20 rounded-xl border border-border/50">
                <img
                  src={`${BASE}/api/storage${archivo}`}
                  alt="Imagen de receta"
                  className="max-h-72 rounded-lg object-contain border shadow-sm"
                />
                <div className="ml-auto shrink-0 flex flex-col gap-2">
                  <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    <Upload className="h-4 w-4 mr-1.5" />Cambiar
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleRemove}>
                    <X className="h-4 w-4 mr-1.5" />Quitar
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border/60 rounded-xl p-10 text-center cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-colors"
              >
                <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm font-medium text-muted-foreground">Haz clic para adjuntar la imagen</p>
                <p className="text-xs text-muted-foreground/60 mt-1">PNG o JPG</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}