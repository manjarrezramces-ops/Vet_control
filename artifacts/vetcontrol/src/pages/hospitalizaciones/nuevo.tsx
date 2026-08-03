import React, { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { getGetPacienteQueryKey, useGetPaciente } from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, BedDouble, AlertTriangle, ClipboardList } from "lucide-react";

const ESTADOS = ["Crítico", "Grave", "En observación", "Estable", "En recuperación", "Hospitalizado"] as const;

const formSchema = z.object({
  fechaIngreso: z.string().min(1, "La fecha de ingreso es obligatoria"),
  estado: z.enum(ESTADOS),
  motivo: z.string().min(1, "El motivo es obligatorio"),
  jaula: z.string().optional(),
  veterinarioResponsable: z.string().optional(),
  tratamiento: z.string().optional(),
  notasEvolucion: z.string().optional(),
  observaciones: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function HospitalizacionNueva() {
  const params = useParams();
  const pacienteId = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pacienteData } = useGetPaciente(pacienteId, {
    query: { enabled: !!pacienteId, queryKey: getGetPacienteQueryKey(pacienteId) },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fechaIngreso: format(new Date(), "yyyy-MM-dd"),
      estado: "Hospitalizado",
      motivo: "",
      jaula: "",
      veterinarioResponsable: "",
      tratamiento: "",
      notasEvolucion: "",
      observaciones: "",
    },
  });

  const [isPending, setIsPending] = useState(false);

  async function onSubmit(values: FormValues) {
    setIsPending(true);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/pacientes/${pacienteId}/hospitalizaciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      toast({ title: "Ingreso Concedido", description: "La orden de hospitalización quedó en firme." });
      queryClient.invalidateQueries({ queryKey: ["hospitalizaciones", pacienteId] });
      setLocation(`/hospitalizaciones/${data.id}`);
    } catch {
      toast({ variant: "destructive", title: "Error Crítico", description: "No fue posible reservar la hospitalización a nivel de base de datos." });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href={`/pacientes/${pacienteId}`}>
          <Button variant="outline" size="icon" className="rounded-full shadow-sm shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Formulario de Ingreso</h1>
          <p className="text-lg text-muted-foreground mt-1 font-medium">Asignar cama y cuidados para paciente: <span className="text-foreground font-bold">{pacienteData?.paciente.nombre}</span></p>
        </div>
      </div>

      <Card className="shadow-sm border-t-4 border-t-primary">
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">

              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                    <BedDouble className="h-5 w-5 text-primary" /> Logística de Área
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <FormField control={form.control} name="fechaIngreso" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Día de Alta Médica (Ingreso) <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input className="h-12 text-base" type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="estado" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Estatus Evaluativo Inicial <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 text-base font-medium bg-muted/10">
                            <SelectValue placeholder="Categoriza gravedad…" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ESTADOS.map(e => <SelectItem key={e} value={e} className="font-semibold">{e}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="motivo" render={({ field }) => (
                    <FormItem className="md:col-span-2 bg-muted/10 p-5 rounded-xl border border-border/50">
                      <FormLabel className="text-base font-bold text-primary flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" /> Diagnóstico Base o Causa del Internamiento <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea className="min-h-[100px] text-lg bg-white mt-2 border-primary/20 shadow-sm" placeholder="Razón clínica imperativa para quedarse..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="veterinarioResponsable" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Tutor Médico / Especialista</FormLabel>
                      <FormControl><Input className="h-12 text-base" placeholder="Firma de turno..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                </div>
              </div>

              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" /> Esquemas Clínicos Primarios
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  <FormField control={form.control} name="tratamiento" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Pautas Farmacológicas Hospitalarias (Inmediatas)</FormLabel>
                      <FormControl>
                        <Textarea className="min-h-[120px] text-base resize-y" placeholder="Fluidoterapia planeada al colgar vía, inyectables..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="notasEvolucion" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Observaciones iniciales</FormLabel>
                      <FormControl>
                        <Textarea className="min-h-[100px] text-base resize-y bg-muted/5" placeholder="Sensaciones al momento de la custodia..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="observaciones" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Notas Paralelas o Comentarios para Relevos</FormLabel>
                      <FormControl>
                        <Textarea className="min-h-[80px] text-base" placeholder="Cosas puntuales a tomar en cuenta..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-8 border-t">
                <Link href={`/pacientes/${pacienteId}`}>
                  <Button variant="outline" size="lg" type="button" className="h-12 px-6 text-base">Declinar Reserva</Button>
                </Link>
                <Button type="submit" size="lg" className="h-12 px-8 text-base font-bold shadow-md" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Dejar Internado
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}