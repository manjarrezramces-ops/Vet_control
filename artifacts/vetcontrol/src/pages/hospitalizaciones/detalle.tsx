import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Loader2, Trash2, BedDouble, CalendarCheck, AlertTriangle, ClipboardList, Edit, Calendar, Paperclip, Upload, X, FileIcon } from "lucide-react";

const BASE = () => (import.meta.env.BASE_URL as string).replace(/\/$/, "");

type Hospitalizacion = {
  id: number; pacienteId: number; consultaId: number | null;
  fechaIngreso: string; fechaAlta: string | null;
  tipoAlta: string | null; altaVoluntariaRazon: string | null;
  estado: string; motivo: string;
  jaula: string | null; veterinarioResponsable: string | null;
  tratamiento: string | null; notasEvolucion: string | null;
  observaciones: string | null; creadoEn: string;
};

const ESTADOS = ["Crítico", "Grave", "En observación", "Estable", "En recuperación", "Hospitalizado"] as const;
const TIPOS_ALTA = ["Médica", "Voluntaria", "Defunción", "Traslado"] as const;

const editSchema = z.object({
  estado: z.enum(ESTADOS),
  motivo: z.string().min(1),
  jaula: z.string().optional().nullable(),
  veterinarioResponsable: z.string().optional().nullable(),
  tratamiento: z.string().optional().nullable(),
  notasEvolucion: z.string().optional().nullable(),
  observaciones: z.string().optional().nullable(),
});

const altaSchema = z.object({
  fechaAlta: z.string().min(1, "La fecha de alta es obligatoria"),
  tipoAlta: z.enum(TIPOS_ALTA),
  altaVoluntariaRazon: z.string().optional(),
});

type EditValues = z.infer<typeof editSchema>;
type AltaValues = z.infer<typeof altaSchema>;

const estadoColor: Record<string, string> = {
  "Crítico":          "bg-red-100 text-red-800 border-red-200",
  "Grave":            "bg-orange-100 text-orange-800 border-orange-200",
  "En observación":   "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Estable":          "bg-blue-100 text-blue-800 border-blue-200",
  "En recuperación":  "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Hospitalizado":    "bg-slate-100 text-slate-700 border-slate-200",
};

export default function HospitalizacionDetalle() {
  const params = useParams();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: hosp, isLoading, isError } = useQuery<Hospitalizacion>({
    queryKey: ["hospitalizacion", id],
    queryFn: async () => {
      const res = await fetch(`${BASE()}/api/hospitalizaciones/${id}`);
      if (!res.ok) throw new Error("No encontrado");
      return res.json();
    },
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Hospitalizacion>) => {
      const res = await fetch(`${BASE()}/api/hospitalizaciones/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Error al actualizar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hospitalizacion", id] });
      queryClient.invalidateQueries({ queryKey: ["hospitalizaciones"] });
      toast({ title: "Cambios guardados" });
    },
    onError: () => toast({ variant: "destructive", title: "Error", description: "No se pudieron guardar los cambios." }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE()}/api/hospitalizaciones/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error");
    },
    onSuccess: () => {
      toast({ title: "Hospitalización eliminada" });
      if (hosp) setLocation(`/pacientes/${hosp.pacienteId}`);
    },
    onError: () => toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el registro." }),
  });

  const editForm = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    values: hosp ? {
      estado: hosp.estado as typeof ESTADOS[number],
      motivo: hosp.motivo,
      jaula: hosp.jaula ?? "",
      veterinarioResponsable: hosp.veterinarioResponsable ?? "",
      tratamiento: hosp.tratamiento ?? "",
      notasEvolucion: hosp.notasEvolucion ?? "",
      observaciones: hosp.observaciones ?? "",
    } : undefined,
  });

  const altaForm = useForm<AltaValues>({
    resolver: zodResolver(altaSchema),
    defaultValues: {
      fechaAlta: format(new Date(), "yyyy-MM-dd"),
      tipoAlta: "Médica",
      altaVoluntariaRazon: "",
    },
  });

  const tipoAltaWatch = altaForm.watch("tipoAlta");

  if (isLoading) return <div className="space-y-8 max-w-4xl mx-auto"><Skeleton className="h-16 w-3/4" /><Skeleton className="h-[800px] rounded-xl" /></div>;
  if (isError || !hosp) return <div className="text-destructive font-bold text-center text-lg py-20">No se encontró el registro de hospitalización.</div>;

  const yaDeAlta = !!hosp.fechaAlta;
  const diasHospitalizado = hosp.fechaAlta
    ? Math.ceil((new Date(hosp.fechaAlta).getTime() - new Date(hosp.fechaIngreso).getTime()) / 86400000)
    : Math.ceil((Date.now() - new Date(hosp.fechaIngreso).getTime()) / 86400000);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <Link href={`/pacientes/${hosp.pacienteId}`}>
            <Button variant="outline" size="icon" className="rounded-full mt-1 shrink-0 shadow-sm">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-4">
              <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3 text-foreground">
                <BedDouble className={`h-8 w-8 ${yaDeAlta ? "text-muted-foreground" : "text-emerald-600"}`} />
                Hospitalización
              </h1>
              <Badge className={`text-sm px-3 py-1 font-bold tracking-wider uppercase border shadow-sm ${estadoColor[hosp.estado] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                {hosp.estado === "Crítico" && <AlertTriangle className="h-4 w-4 mr-1.5" />}
                {hosp.estado}
              </Badge>
              {yaDeAlta ? (
                <Badge variant="outline" className="text-sm px-3 py-1 font-bold border-emerald-300 text-emerald-700 bg-emerald-50 shadow-sm uppercase tracking-wider">Alta {hosp.tipoAlta}</Badge>
              ) : (
                <Badge variant="default" className="text-sm px-3 py-1 font-bold border border-emerald-400 text-white bg-emerald-600 shadow-sm uppercase tracking-wider animate-pulse">Hospitalizado</Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-base font-medium text-muted-foreground mt-3">
              <span className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-lg"><Calendar className="h-4 w-4" /> Ingreso: {format(new Date(hosp.fechaIngreso), "dd/MM/yyyy")}</span>
              {hosp.fechaAlta && <span className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-lg"><CalendarCheck className="h-4 w-4 text-emerald-600" /> Alta Final: {format(new Date(hosp.fechaAlta), "dd/MM/yyyy")}</span>}
              <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg border border-primary/20">{diasHospitalizado} día{diasHospitalizado !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="lg" className="text-destructive hover:bg-destructive hover:text-destructive-foreground shadow-sm">
              <Trash2 className="h-4 w-4 mr-2" /> Eliminar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar hospitalización?</AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                Esta acción no se puede deshacer. Se eliminará permanentemente el registro de esta hospitalización.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={yaDeAlta ? "detalle" : "detalle"}>
        <TabsList className="w-full justify-start h-14 bg-transparent border-b-2 rounded-none p-0 mb-8 space-x-8 overflow-x-auto">
          <TabsTrigger 
            value="detalle" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 h-14 text-base font-bold data-[state=active]:text-primary text-muted-foreground"
          >
            <ClipboardList className="h-5 w-5 mr-2" /> Detalle
          </TabsTrigger>
          {!yaDeAlta && (
            <TabsTrigger 
              value="alta"
              className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 h-14 text-base font-bold data-[state=active]:text-emerald-600 text-muted-foreground"
            >
              <CalendarCheck className="h-5 w-5 mr-2" /> Dar de alta
            </TabsTrigger>
          )}
          <TabsTrigger 
            value="estudios"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 h-14 text-base font-bold data-[state=active]:text-primary text-muted-foreground"
          >
            <Paperclip className="h-5 w-5 mr-2" /> Estudios
          </TabsTrigger>
          <TabsTrigger 
            value="editar"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 h-14 text-base font-bold data-[state=active]:text-primary text-muted-foreground"
          >
            <Edit className="h-5 w-5 mr-2" /> Editar
          </TabsTrigger>
        </TabsList>

        {/* ── FICHA ── */}
        <TabsContent value="detalle" className="space-y-6">
          <Card className="shadow-sm border-t-4 border-t-primary overflow-hidden">
            <CardContent className="p-0">
              <div className="p-8 bg-muted/10 border-b">
                <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Motivo de ingreso</h4>
                <p className="text-2xl font-bold leading-snug text-foreground">{hosp.motivo}</p>
                {hosp.veterinarioResponsable && <div className="mt-4 text-sm font-semibold text-muted-foreground">Veterinario: Dr. {hosp.veterinarioResponsable}</div>}
              </div>

              <div className="p-8 space-y-8">
                {hosp.tratamiento && (
                  <div>
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wider mb-4">
                      Tratamiento
                    </h4>
                    <p className="text-base text-foreground/90 whitespace-pre-wrap leading-relaxed bg-white border border-border/50 p-6 rounded-xl shadow-sm min-h-[120px] font-medium">{hosp.tratamiento}</p>
                  </div>
                )}

                {hosp.notasEvolucion && (
                  <div>
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wider mb-4">
                      Notas de evolución
                    </h4>
                    <p className="text-base text-foreground/90 whitespace-pre-wrap leading-relaxed bg-muted/10 border border-border/40 p-6 rounded-xl min-h-[120px]">{hosp.notasEvolucion}</p>
                  </div>
                )}

                {hosp.observaciones && (
                  <div>
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-wider mb-4">
                      Observaciones
                    </h4>
                    <p className="text-sm font-medium text-muted-foreground whitespace-pre-wrap leading-relaxed border-l-4 border-muted p-4 italic">{hosp.observaciones}</p>
                  </div>
                )}
              </div>

              {yaDeAlta && (
                <div className="p-8 bg-emerald-50 border-t border-emerald-200">
                  <h4 className="text-sm font-bold text-emerald-800 flex items-center gap-2 uppercase tracking-wider mb-4">
                    <CalendarCheck className="h-5 w-5" /> Alta
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-sm">
                      <div className="text-xs font-bold text-emerald-600/70 uppercase tracking-widest mb-1">Fecha de alta</div>
                      <div className="text-2xl font-black text-emerald-800">{format(new Date(hosp.fechaAlta!), "dd/MM/yyyy")}</div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-sm">
                      <div className="text-xs font-bold text-emerald-600/70 uppercase tracking-widest mb-1">Tipo de alta</div>
                      <div className="text-2xl font-black text-emerald-800">{hosp.tipoAlta}</div>
                    </div>
                  </div>
                  {hosp.tipoAlta === "Voluntaria" && hosp.altaVoluntariaRazon && (
                    <div className="mt-6 bg-white p-5 rounded-xl border border-emerald-200 shadow-sm border-l-4 border-l-emerald-600">
                      <div className="text-xs font-bold text-emerald-600/70 uppercase tracking-widest mb-2">Razón del alta voluntaria</div>
                      <div className="text-base font-semibold text-emerald-900/90 leading-relaxed">{hosp.altaVoluntariaRazon}</div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── DAR DE ALTA ── */}
        {!yaDeAlta && (
          <TabsContent value="alta" className="space-y-6">
            <Card className="shadow-sm border-t-4 border-t-emerald-500">
              <CardHeader className="bg-emerald-50/50 pb-6 border-b border-emerald-100">
                <CardTitle className="text-2xl font-bold flex items-center gap-3 text-emerald-800">
                  <CalendarCheck className="h-6 w-6 text-emerald-600" />
                  Dar de alta al paciente
                </CardTitle>
                <p className="text-emerald-700/80 font-medium">Registra la fecha y tipo de alta para cerrar esta hospitalización.</p>
              </CardHeader>
              <CardContent className="pt-8">
                <Form {...altaForm}>
                  <form onSubmit={altaForm.handleSubmit((v) => updateMutation.mutate({ ...v, estado: "En recuperación" }))} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                      <FormField control={altaForm.control} name="fechaAlta" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold text-emerald-900">Fecha de alta <span className="text-destructive">*</span></FormLabel>
                          <FormControl><Input className="h-12 text-base border-emerald-200 focus-visible:ring-emerald-500" type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={altaForm.control} name="tipoAlta" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold text-emerald-900">Tipo de alta <span className="text-destructive">*</span></FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 text-base font-bold text-emerald-800 bg-white border-emerald-200">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Médica" className="font-semibold">Médica</SelectItem>
                              <SelectItem value="Voluntaria" className="font-semibold">Voluntaria</SelectItem>
                              <SelectItem value="Traslado" className="font-semibold">Traslado</SelectItem>
                              <SelectItem value="Defunción" className="font-semibold text-destructive">Defunción</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      {tipoAltaWatch === "Voluntaria" && (
                        <FormField control={altaForm.control} name="altaVoluntariaRazon" render={({ field }) => (
                          <FormItem className="md:col-span-2 bg-emerald-50 p-6 rounded-xl border border-emerald-200">
                            <FormLabel className="text-base font-bold text-emerald-900">Razón del alta voluntaria</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Razones del propietario para solicitar el alta voluntaria..." className="min-h-[100px] text-base bg-white border-emerald-200 mt-2" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      )}
                    </div>

                    <div className="flex justify-end pt-6 border-t border-emerald-100">
                      <Button type="submit" size="lg" disabled={updateMutation.isPending} className="h-12 px-8 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
                        {updateMutation.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                        <CalendarCheck className="mr-2 h-5 w-5" /> Confirmar alta
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ── ESTUDIOS ── */}
        <TabsContent value="estudios" className="space-y-6">
          <EstudiosTab hospitalizacionId={id} />
        </TabsContent>

        {/* ── EDITAR ── */}
        <TabsContent value="editar" className="space-y-6">
          <Card className="shadow-sm border-t-4 border-t-primary">
            <CardContent className="p-8">
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit((v) => updateMutation.mutate(v))} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <FormField control={editForm.control} name="estado" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Estado</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 text-base font-bold">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ESTADOS.map(e => <SelectItem key={e} value={e} className="font-semibold">{e}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={editForm.control} name="veterinarioResponsable" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="text-base font-semibold">Veterinario responsable</FormLabel>
                        <FormControl><Input className="h-12 text-base" placeholder="Dr. Pérez" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={editForm.control} name="motivo" render={({ field }) => (
                      <FormItem className="md:col-span-2 bg-muted/10 p-5 rounded-xl border border-border/50">
                        <FormLabel className="text-base font-bold text-primary">Motivo de ingreso</FormLabel>
                        <FormControl><Textarea className="min-h-[100px] text-lg font-medium bg-white mt-2 shadow-sm border-primary/20" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={editForm.control} name="tratamiento" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="text-base font-semibold">Tratamiento</FormLabel>
                        <FormControl><Textarea className="min-h-[140px] text-base" placeholder="Fluidoterapia, medicamentos…" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={editForm.control} name="notasEvolucion" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="text-base font-semibold">Notas de evolución</FormLabel>
                        <FormControl><Textarea className="min-h-[120px] text-base bg-muted/5" placeholder="Evolución clínica, cambios…" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={editForm.control} name="observaciones" render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="text-base font-semibold">Observaciones</FormLabel>
                        <FormControl><Textarea className="min-h-[100px] text-base" {...field} value={field.value ?? ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="flex justify-end gap-4 pt-8 border-t">
                    <Button type="submit" size="lg" className="h-12 px-8 text-base font-bold shadow-md" disabled={updateMutation.isPending}>
                      {updateMutation.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                      Guardar cambios
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Sub-componente Estudios ────────────────────────────────────────────────
type Archivo = { id: number; objectPath: string; nombre: string; tipo: string | null; creadoEn: string };

function EstudiosTab({ hospitalizacionId }: { hospitalizacionId: number }) {
  const BASE = (import.meta.env.BASE_URL as string).replace(/\/$/, "");
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const { data: archivos = [], isLoading } = useQuery<Archivo[]>({
    queryKey: ["hosp-archivos", hospitalizacionId],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/hospitalizaciones/${hospitalizacionId}/archivos`);
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    enabled: !!hospitalizacionId,
  });

  const deleteMut = useMutation({
    mutationFn: async (archivoId: number) => {
      const res = await fetch(`${BASE}/api/hospitalizaciones/${hospitalizacionId}/archivos/${archivoId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hosp-archivos", hospitalizacionId] }),
    onError: () => toast({ variant: "destructive", title: "Error al eliminar archivo" }),
  });

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const urlRes = await fetch(`${BASE}/api/storage/uploads/request-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
        });
        const { uploadURL, objectPath } = await urlRes.json();
        await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
        const tipo = file.type.startsWith("image/") ? "image" : "pdf";
        await fetch(`${BASE}/api/hospitalizaciones/${hospitalizacionId}/archivos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ objectPath, nombre: file.name, tipo }),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["hosp-archivos", hospitalizacionId] });
      toast({ title: `${files.length === 1 ? "Archivo adjuntado" : `${files.length} archivos adjuntados`}` });
    } catch {
      toast({ variant: "destructive", title: "Error al subir archivo" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="shadow-sm border-t-4 border-t-primary overflow-hidden">
      <CardContent className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-primary" /> Estudios Realizados Durante el Internamiento
            </h3>
            <p className="text-sm text-muted-foreground mt-1">Adjunta los resultados de laboratorio, radiografías, ultrasonidos, etc.</p>
          </div>
          <Button variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()} className="font-semibold">
            {uploading
              ? <><div className="h-3.5 w-3.5 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />Subiendo...</>
              : <><Upload className="h-3.5 w-3.5 mr-2" />Agregar archivo</>}
          </Button>
        </div>

        <input ref={fileInputRef} type="file" accept=".pdf,.png" multiple className="hidden" onChange={handleFiles} />

        {isLoading ? (
          <div className="py-8 flex justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
        ) : archivos.length === 0 ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border/60 rounded-xl p-12 text-center cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-colors"
          >
            <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">Haz clic para adjuntar estudios</p>
            <p className="text-xs text-muted-foreground/60 mt-1">PDF o PNG · Puedes subir varios a la vez</p>
          </div>
        ) : (
          <div className="space-y-3">
            {archivos.map(a => {
              const isImage = a.tipo === "image";
              const src = `${BASE}/api/storage${a.objectPath}`;
              return (
                <div key={a.id} className="flex items-center gap-4 p-4 bg-muted/10 rounded-xl border border-border/50 group hover:bg-muted/20 transition-colors">
                  {isImage ? (
                    <img src={src} alt={a.nombre} className="h-14 w-14 rounded-lg object-cover border shadow-sm shrink-0" />
                  ) : (
                    <div className="h-14 w-14 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 border border-primary/20">
                      <FileIcon className="h-7 w-7 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{a.nombre}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{new Date(a.creadoEn).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a href={src} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="sm" className="font-medium">Ver</Button>
                    </a>
                    <Button
                      variant="ghost" size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteMut.mutate(a.id)}
                      disabled={deleteMut.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full mt-2 p-3 rounded-xl border-2 border-dashed border-border/40 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="h-4 w-4" /> Agregar más archivos
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}