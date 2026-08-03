import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Loader2, Scissors, Edit, Trash2, ClipboardList } from "lucide-react";

const TIPOS = [
  "Cirugía", "Profilaxis Dental", "Radiografía", "Ultrasonido",
  "Electrocardiograma", "Endoscopía", "Biopsia", "Desparasitación", "Vacunación", "Otro",
] as const;

type Procedimiento = {
  id: number; pacienteId: number; fecha: string; tipo: string;
  descripcion: string | null; veterinario: string | null;
  resultado: string | null; notas: string | null; creadoEn: string;
};

const editSchema = z.object({
  fecha: z.string().min(1),
  tipo: z.enum(TIPOS),
  descripcion: z.string().optional().nullable(),
  veterinario: z.string().optional().nullable(),
  resultado: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
});

const BASE = () => (import.meta.env.BASE_URL as string).replace(/\/$/, "");

const tipoColor: Record<string, string> = {
  "Cirugía":          "bg-red-100 text-red-800 border-red-200",
  "Profilaxis Dental":"bg-blue-100 text-blue-800 border-blue-200",
  "Radiografía":      "bg-purple-100 text-purple-800 border-purple-200",
  "Ultrasonido":      "bg-cyan-100 text-cyan-800 border-cyan-200",
  "Electrocardiograma":"bg-orange-100 text-orange-800 border-orange-200",
  "Vacunación":       "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Desparasitación":  "bg-yellow-100 text-yellow-800 border-yellow-200",
};

export default function ProcedimientoDetalle() {
  const params = useParams();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: proc, isLoading, isError } = useQuery<Procedimiento>({
    queryKey: ["procedimiento", id],
    queryFn: async () => {
      const res = await fetch(`${BASE()}/api/procedimientos/${id}`);
      if (!res.ok) throw new Error("No encontrado");
      return res.json();
    },
    enabled: !!id,
  });

  const updateMut = useMutation({
    mutationFn: async (data: z.infer<typeof editSchema>) => {
      const res = await fetch(`${BASE()}/api/procedimientos/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["procedimiento", id] });
      queryClient.invalidateQueries({ queryKey: ["procedimientos"] });
      toast({ title: "Cambios guardados" });
      setEditing(false);
    },
    onError: () => toast({ variant: "destructive", title: "Error al guardar" }),
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE()}/api/procedimientos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error");
    },
    onSuccess: () => {
      toast({ title: "Procedimiento eliminado" });
      if (proc) setLocation(`/pacientes/${proc.pacienteId}`);
    },
    onError: () => toast({ variant: "destructive", title: "No se pudo eliminar" }),
  });

  const form = useForm<z.infer<typeof editSchema>>({
    resolver: zodResolver(editSchema),
    values: proc ? {
      fecha: proc.fecha,
      tipo: proc.tipo as typeof TIPOS[number],
      descripcion: proc.descripcion ?? "",
      veterinario: proc.veterinario ?? "",
      resultado: proc.resultado ?? "",
      notas: proc.notas ?? "",
    } : undefined,
  });

  if (isLoading) return <div className="space-y-8 max-w-3xl mx-auto"><Skeleton className="h-12 w-64" /><Skeleton className="h-96 rounded-xl" /></div>;
  if (isError || !proc) return <div className="text-destructive font-medium text-lg text-center py-20">Procedimiento no encontrado.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <Link href={`/pacientes/${proc.pacienteId}`}>
            <Button variant="outline" size="icon" className="rounded-full mt-1 shrink-0 shadow-sm">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                <Scissors className="h-7 w-7 text-primary" /> Procedimiento
              </h1>
              <Badge className={`text-sm px-3 py-1 font-bold border ${tipoColor[proc.tipo] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                {proc.tipo}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground font-medium">
              <span>{format(new Date(proc.fecha), "dd/MM/yyyy")}</span>
              {proc.veterinario && <span>· Dr. {proc.veterinario}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
            <Edit className="h-4 w-4 mr-1.5" /> {editing ? "Cancelar edición" : "Editar"}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-destructive-foreground">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar procedimiento?</AlertDialogTitle>
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
      </div>

      {editing ? (
        <Card className="shadow-sm border-t-4 border-t-primary">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2"><Edit className="h-5 w-5 text-primary" /> Editar procedimiento</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => updateMut.mutate(v))} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="fecha" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Fecha</FormLabel>
                      <FormControl><Input className="h-11" type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="tipo" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Tipo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger className="h-11"><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="veterinario" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="font-semibold">Médico</FormLabel>
                      <FormControl><Input className="h-11" placeholder="Dr. García" {...field} value={field.value ?? ""} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="descripcion" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="font-semibold">Descripción</FormLabel>
                      <FormControl><Textarea className="min-h-[100px]" {...field} value={field.value ?? ""} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="resultado" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="font-semibold">Resultado / Hallazgos</FormLabel>
                      <FormControl><Textarea className="min-h-[100px]" {...field} value={field.value ?? ""} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="notas" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="font-semibold">Observaciones</FormLabel>
                      <FormControl><Textarea className="min-h-[80px]" {...field} value={field.value ?? ""} /></FormControl>
                    </FormItem>
                  )} />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
                  <Button type="submit" disabled={updateMut.isPending}>
                    {updateMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar cambios
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm border-t-4 border-t-primary overflow-hidden">
          <CardContent className="p-0">
            <div className="p-8 space-y-8">
              {proc.descripcion && (
                <div>
                  <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-primary" /> Descripción / Técnica
                  </h4>
                  <p className="text-base text-foreground/90 whitespace-pre-wrap leading-relaxed bg-white border border-border/50 p-5 rounded-xl shadow-sm">{proc.descripcion}</p>
                </div>
              )}
              {proc.resultado && (
                <div>
                  <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">Resultado / Hallazgos</h4>
                  <p className="text-base text-foreground/90 whitespace-pre-wrap leading-relaxed bg-primary/5 border border-primary/20 p-5 rounded-xl">{proc.resultado}</p>
                </div>
              )}
              {proc.notas && (
                <div>
                  <h4 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">Observaciones</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed border-l-4 border-muted p-4 italic">{proc.notas}</p>
                </div>
              )}
              {!proc.descripcion && !proc.resultado && !proc.notas && (
                <div className="py-12 text-center text-muted-foreground">
                  <Scissors className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">Sin detalles adicionales registrados.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
