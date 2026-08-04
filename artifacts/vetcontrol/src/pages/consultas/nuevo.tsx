import { useParams, Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useCreateConsulta, useGetPaciente, getGetPacienteQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2, Stethoscope, Activity, ClipboardList, BedDouble } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const BASE = () => (import.meta.env.BASE_URL as string).replace(/\/$/, "");
const ESTADOS_HOSP = ["Estable", "Crítico", "Grave", "En recuperación"] as const;

const formSchema = z.object({
  fecha: z.string().min(1, "La fecha es obligatoria"),
  hora: z.string().optional(),
  medico: z.string().optional(),
  motivo: z.string().min(1, "El motivo es obligatorio"),
  // EFG
  cc: z.string().optional(),
  mm: z.string().optional(),
  em: z.string().optional(),
  tllc: z.string().optional(),
  ln: z.string().optional(),
  fc: z.coerce.number().optional().or(z.literal("")),
  dh: z.string().optional(),
  fr: z.coerce.number().optional().or(z.literal("")),
  rt: z.string().optional(),
  cp: z.string().optional(),
  rd: z.string().optional(),
  pp: z.string().optional(),
  pa: z.string().optional(),
  p: z. string().optional(),
  anamnesis: z.string().optional(),
  exploracionFisica: z.string().optional(),
  diagnosticosDiferenciales: z.string().optional(),
  diagnostico: z.string().optional(),
  plan: z.string().optional(),
  tratamiento: z.string().optional(),
  pronostico: z.string().optional(),
  proximaCita: z.string().optional(),
  observaciones: z.string().optional(),
  // Hospitalización
  hospitalizar: z.boolean().default(false),
  hospEstado: z.enum(ESTADOS_HOSP).optional(),
  hospVeterinario: z.string().optional(),
  hospTratamiento: z.string().optional(),
  hospObservaciones: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function ConsultaNueva() {
  const params = useParams();
  const pacienteId = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const { data: pacienteData } = useGetPaciente(pacienteId, {
    query: { enabled: !!pacienteId, queryKey: getGetPacienteQueryKey(pacienteId) },
  });


  const createConsulta = useCreateConsulta();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fecha: format(new Date(), "yyyy-MM-dd"),
      hora: format(new Date(), "HH:mm"),
      medico: "",
      motivo: "",
      cc: "", em: "", mm: "", tllc: "", ln: "",
      fc: "", dh: "", fr: "", rt: "", cp: "", rd: "", pp: "", pa: "", p: "",
      anamnesis: "",
      diagnosticosDiferenciales: "",
      diagnostico: "",
      plan: "",
      tratamiento: "",
      pronostico: "",
      proximaCita: "",
      observaciones: "",
      hospitalizar: false,
      hospEstado: "Estable",
      hospVeterinario: "",
      hospTratamiento: "",
      hospObservaciones: "",
    },
  });

  const hospitalizarWatch = form.watch("hospitalizar");

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      const payload = {
        fecha: values.fecha,
        hora: values.hora || undefined,
        medico: values.medico || undefined,
        motivo: values.motivo,
        frecuenciaCardiaca: (values.fc === "" || isNaN(Number(values.fc))) ? undefined : Number(values.fc),
        pulso: values.p || undefined,
        frecuenciaRespiratoria: (values.fr === "" || isNaN(Number(values.fr))) ? undefined : Number(values.fr),
        mucosas: values.mm || undefined,
        trc: values.tllc || undefined,
        condicionCorporal: values.cc || undefined,
        estadoMental: values.em || undefined,
        linfonodos: values.ln || undefined,
        deshidratacion: values.dh || undefined,
        ruidosTransito: values.rt || undefined,
        camposPulmonares: values.cp || undefined,
        ruidosDorsales: values.rd || undefined,
        palmopercusion: values.pp || undefined,
        palpacionAbdominal: values.pa || undefined,
        anamnesis: values.anamnesis || undefined,
        diagnostico: values.diagnostico || undefined,
        diagnosticosDiferenciales: values.diagnosticosDiferenciales || undefined,
        plan: values.plan || undefined,
        tratamiento: values.tratamiento || undefined,
        pronostico: values.pronostico || undefined,
        proximaCita: values.proximaCita || undefined,
        observaciones: values.observaciones || undefined,
      };

      // 1. Crear consulta
      const consulta = await new Promise<{ id: number }>((resolve, reject) => {
        createConsulta.mutate(
          { pacienteId, data: payload },
          { onSuccess: resolve, onError: reject }
        );
      });

      queryClient.invalidateQueries({ queryKey: getGetPacienteQueryKey(pacienteId) });

      // 2. Si se marcó hospitalizar, crear la hospitalización vinculada
      if (values.hospitalizar) {
        const hospRes = await fetch(`${BASE()}/api/pacientes/${pacienteId}/hospitalizaciones`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            consultaId: consulta.id,
            fechaIngreso: values.fecha,
            estado: values.hospEstado ?? "Estable",
            motivo: values.motivo,
            veterinarioResponsable: values.hospVeterinario || values.medico || undefined,
            tratamiento: values.hospTratamiento || values.tratamiento || undefined,
            observaciones: values.hospObservaciones || undefined,
          }),
        });

        if (!hospRes.ok) throw new Error("No se pudo crear la hospitalización");
        const hosp = await hospRes.json();

        toast({ title: "Consulta y hospitalización registradas" });
        setLocation(`/hospitalizaciones/${hosp.id}`);
      } else {
        toast({ title: "Consulta registrada" });
        setLocation(`/consultas/${consulta.id}`);
      }
    } catch {
      toast({ variant: "destructive", title: "Error al guardar", description: "Intenta de nuevo." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href={`/pacientes/${pacienteId}`}>
          <Button variant="outline" size="icon" className="rounded-full shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Nueva Consulta test </h1>
          <p className="text-lg text-muted-foreground mt-1 font-medium">Paciente: <span className="text-foreground">{pacienteData?.paciente.nombre}</span></p>
        </div>
      </div>

      <Card className="shadow-sm border-t-4 border-t-primary">
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">

              {/* ── Parámetros de la visita ── */}
              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-primary" /> Parámetros de la Visita
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField control={form.control} name="fecha" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Fecha <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input className="h-12 text-base" type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="hora" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Hora</FormLabel>
                      <FormControl><Input className="h-12 text-base" type="time" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="medico" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Médico</FormLabel>
                      <FormControl><Input className="h-12 text-base" placeholder="Ej. Dr. García" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="motivo" render={({ field }) => (
                    <FormItem className="md:col-span-3 bg-muted/20 p-5 rounded-xl border border-border/50">
                      <FormLabel className="text-base font-bold text-primary">Motivo de consulta <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input className="h-14 text-lg bg-white mt-2 border-primary/20 shadow-sm" placeholder="Ej. Revisión anual, vómito, vacunas..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* ── Examen físico general ── */}
              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" /> Examen físico general
                  </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {/* CC */}
                  <FormField control={form.control} name="cc" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-muted-foreground tracking-wider">CC</FormLabel>
                      <FormControl><Input className="h-11 text-base font-mono" placeholder="3/5" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  {/* MM */}
                  <FormField control={form.control} name="mm" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-muted-foreground tracking-wider">MM</FormLabel>
                      <FormControl><Input className="h-11 text-base" placeholder="Rosadas" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  {/* E.M. */}
                  <FormField control={form.control} name="em" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-muted-foreground tracking-wider">E.M.</FormLabel>
                      <FormControl><Input className="h-11 text-base" placeholder="Alerta" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  {/* TLLC */}
                  <FormField control={form.control} name="tllc" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-muted-foreground tracking-wider">TLLC</FormLabel>
                      <FormControl><Input className="h-11 text-base font-mono" placeholder="&lt; 2s" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  {/* LN */}
                  <FormField control={form.control} name="ln" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-muted-foreground tracking-wider">LN</FormLabel>
                      <FormControl><Input className="h-11 text-base" placeholder="Normales" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  {/* FC */}
                  <FormField control={form.control} name="fc" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-muted-foreground tracking-wider">FC</FormLabel>
                      <FormControl><Input className="h-11 text-base font-mono" type="number" placeholder="lpm" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  {/* %DH */}
                  <FormField control={form.control} name="dh" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-muted-foreground tracking-wider">%DH</FormLabel>
                      <FormControl><Input className="h-11 text-base font-mono" placeholder="&lt; 5%" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  {/* FR */}
                  <FormField control={form.control} name="fr" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-muted-foreground tracking-wider">FR</FormLabel>
                      <FormControl><Input className="h-11 text-base font-mono" type="number" placeholder="rpm" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  {/* RT */}
                  <FormField control={form.control} name="rt" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-muted-foreground tracking-wider">RT</FormLabel>
                      <FormControl><Input className="h-11 text-base" placeholder="Presentes" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  {/* CP */}
                  <FormField control={form.control} name="cp" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-muted-foreground tracking-wider">CP</FormLabel>
                      <FormControl><Input className="h-11 text-base" placeholder="Fuerte" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  {/* RD */}
                  <FormField control={form.control} name="rd" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-muted-foreground tracking-wider">RD</FormLabel>
                      <FormControl><Input className="h-11 text-base" placeholder="Normales" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  {/* PP */}
                  <FormField control={form.control} name="pp" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-muted-foreground tracking-wider">PP</FormLabel>
                      <FormControl><Input className="h-11 text-base font-mono" placeholder="—" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  {/* PA */}
                  <FormField control={form.control} name="pa" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-muted-foreground tracking-wider">PA</FormLabel>
                      <FormControl><Input className="h-11 text-base font-mono" placeholder="mmHg" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* ── Exploración clínica ── */}
              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" /> Exploración clínica
                  </h3>
                </div>
                <FormField control={form.control} name="anamnesis" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">Anamnesis</FormLabel>
                    <FormControl><Textarea className="min-h-[120px] text-base resize-y" placeholder="Evolución de síntomas, tiempo de inicio..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* ── Diagnóstico y plan ── */}
              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-primary" /> Diagnóstico y plan
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <FormField control={form.control} name="diagnosticosDiferenciales" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Diagnósticos diferenciales</FormLabel>
                      <FormControl><Textarea className="min-h-[100px] text-base" placeholder="Listado de posibles patologías..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="diagnostico" render={({ field }) => (
                    <FormItem className="bg-primary/5 p-5 rounded-xl border border-primary/20">
                      <FormLabel className="text-base font-bold text-primary">Diagnóstico <span className="font-normal text-muted-foreground">(confirmado / presuntivo)</span></FormLabel>
                      <FormControl><Textarea className="min-h-[80px] text-base mt-2 border-primary/30 font-medium" placeholder="Diagnóstico principal..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormField control={form.control} name="plan" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Plan diagnóstico</FormLabel>
                        <FormControl><Textarea className="min-h-[120px] text-base" placeholder="Laboratorio, imagenología, dieta..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="tratamiento" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Tratamiento aplicado</FormLabel>
                        <FormControl><Textarea className="min-h-[120px] text-base" placeholder="Procedimientos aplicados durante esta visita..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/10 p-5 rounded-xl border border-border/40">
                    <FormField control={form.control} name="pronostico" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Pronóstico</FormLabel>
                        <FormControl><Input className="h-12 text-base" placeholder="Ej. Favorable, Reservado, Grave..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="proximaCita" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Próxima cita</FormLabel>
                        <FormControl><Input className="h-12 text-base" type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="observaciones" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Observaciones</FormLabel>
                      <FormControl><Textarea className="min-h-[100px] text-base" placeholder="Indicaciones al propietario, notas adicionales..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* ── Hospitalización ── */}
              <div className="space-y-6">
                <div className="border-b pb-4 flex items-center justify-between">
                  <h3 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                    <BedDouble className="h-5 w-5 text-orange-500" /> Hospitalización
                  </h3>
                  <FormField control={form.control} name="hospitalizar" render={({ field }) => (
                    <FormItem className="flex items-center gap-3 space-y-0">
                      <FormLabel className="text-base font-semibold text-muted-foreground cursor-pointer">
                        {field.value ? "El paciente se hospitalizará" : "No requiere hospitalización"}
                      </FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>

                {hospitalizarWatch && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 space-y-6">
                    <p className="text-sm text-orange-700 font-medium">
                      Al guardar se creará automáticamente el registro de hospitalización vinculado a esta consulta. El motivo y el tratamiento se tomarán de lo indicado arriba.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="hospEstado" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold text-orange-900">Estado inicial del paciente <span className="text-destructive">*</span></FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 text-base font-bold bg-white border-orange-200">
                                <SelectValue placeholder="Seleccionar estado..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Estable">Estable</SelectItem>
                              <SelectItem value="Crítico">Crítico</SelectItem>
                              <SelectItem value="Grave">Grave</SelectItem>
                              <SelectItem value="En recuperación">En recuperación</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="hospVeterinario" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold text-orange-900">Veterinario responsable</FormLabel>
                          <FormControl>
                            <Input className="h-12 text-base bg-white border-orange-200" placeholder="Se toma del médico de la consulta si se deja vacío" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="hospTratamiento" render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-base font-semibold text-orange-900">Tratamiento de hospitalización</FormLabel>
                          <FormControl>
                            <Textarea className="min-h-[100px] text-base bg-white border-orange-200" placeholder="Se toma del tratamiento de la consulta si se deja vacío. Agrega indicaciones adicionales..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="hospObservaciones" render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-base font-semibold text-orange-900">Observaciones de hospitalización</FormLabel>
                          <FormControl>
                            <Textarea className="min-h-[80px] text-base bg-white border-orange-200" placeholder="Notas adicionales para el internamiento..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                )}
              </div>

              {/* ── Acciones ── */}
              <div className="flex justify-end gap-4 pt-8 border-t">
                <Link href={`/pacientes/${pacienteId}`}>
                  <Button variant="outline" size="lg" type="button" className="h-12 px-6 text-base">Cancelar</Button>
                </Link>
                <Button
                  type="submit"
                  size="lg"
                  className={`h-12 px-8 text-base font-bold shadow-md ${hospitalizarWatch ? "bg-orange-600 hover:bg-orange-700" : ""}`}
                  disabled={saving}
                >
                  {saving && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  {hospitalizarWatch ? "Guardar consulta y hospitalizar" : "Guardar consulta"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
