import { useParams, Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Scissors } from "lucide-react";

const TIPOS = [
  "Cirugía", "Profilaxis Dental", "Radiografía", "Ultrasonido",
  "Electrocardiograma", "Endoscopía", "Biopsia", "Desparasitación", "Vacunación", "Otro",
] as const;

const formSchema = z.object({
  fecha: z.string().min(1, "La fecha es obligatoria"),
  tipo: z.enum(TIPOS, { required_error: "Selecciona un tipo" }),
  descripcion: z.string().optional(),
  veterinario: z.string().optional(),
  resultado: z.string().optional(),
  notas: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const BASE = () => (import.meta.env.BASE_URL as string).replace(/\/$/, "");

export default function ProcedimientoNuevo() {
  const params = useParams();
  const pacienteId = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fecha: format(new Date(), "yyyy-MM-dd"),
      tipo: undefined,
      descripcion: "",
      veterinario: "",
      resultado: "",
      notas: "",
    },
  });

  const createMut = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await fetch(`${BASE()}/api/pacientes/${pacienteId}/procedimientos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    onSuccess: (proc) => {
      toast({ title: "Procedimiento registrado", description: "El procedimiento ha sido guardado correctamente." });
      queryClient.invalidateQueries({ queryKey: ["procedimientos", pacienteId] });
      setLocation(`/procedimientos/${proc.id}`);
    },
    onError: () => toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el procedimiento." }),
  });

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href={`/pacientes/${pacienteId}`}>
          <Button variant="outline" size="icon" className="rounded-full shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Nuevo Procedimiento</h1>
          <p className="text-lg text-muted-foreground mt-1">Registra una intervención o procedimiento clínico.</p>
        </div>
      </div>

      <Card className="shadow-sm border-t-4 border-t-primary">
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => createMut.mutate(v))} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="fecha" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">Fecha <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input className="h-12 text-base" type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="tipo" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">Tipo de procedimiento <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 text-base font-medium">
                          <SelectValue placeholder="Seleccionar tipo..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIPOS.map(t => <SelectItem key={t} value={t} className="font-medium">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="veterinario" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-base font-semibold">Médico responsable</FormLabel>
                    <FormControl><Input className="h-12 text-base" placeholder="Ej. Dr. García" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="descripcion" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-base font-semibold">Descripción / Técnica utilizada</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-[120px] text-base resize-y" placeholder="Describe el procedimiento realizado..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="resultado" render={({ field }) => (
                  <FormItem className="md:col-span-2 bg-primary/5 p-5 rounded-xl border border-primary/20">
                    <FormLabel className="text-base font-bold text-primary">Resultado / Hallazgos</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-[100px] text-base mt-2 bg-white border-primary/20" placeholder="Hallazgos, resultados obtenidos..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="notas" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-base font-semibold">Observaciones</FormLabel>
                    <FormControl>
                      <Textarea className="min-h-[100px] text-base" placeholder="Notas adicionales, indicaciones postprocedimiento..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t">
                <Link href={`/pacientes/${pacienteId}`}>
                  <Button variant="outline" size="lg" type="button" className="h-12 px-6 text-base">Cancelar</Button>
                </Link>
                <Button type="submit" size="lg" className="h-12 px-8 text-base font-bold shadow-md" disabled={createMut.isPending}>
                  {createMut.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  <Scissors className="mr-2 h-5 w-5" /> Guardar procedimiento
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
