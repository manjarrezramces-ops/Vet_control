import { useParams, Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateConsulta, useGetPaciente, getGetPacienteQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Loader2, Stethoscope, Activity, ClipboardList } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
  fecha: z.string().min(1, "La fecha es obligatoria"),
  hora: z.string().optional(),
  medico: z.string().optional(),
  motivo: z.string().min(1, "El motivo es obligatorio"),
  peso: z.coerce.number().optional().or(z.literal("")),
  temperatura: z.coerce.number().optional().or(z.literal("")),
  frecuenciaCardiaca: z.coerce.number().optional().or(z.literal("")),
  frecuenciaRespiratoria: z.coerce.number().optional().or(z.literal("")),
  mucosas: z.string().optional(),
  trc: z.string().optional(),
  condicionCorporal: z.string().optional(),
  anamnesis: z.string().optional(),
  exploracionFisica: z.string().optional(),
  diagnosticosDiferenciales: z.string().optional(),
  diagnostico: z.string().optional(),
  plan: z.string().optional(),
  tratamiento: z.string().optional(),
  pronostico: z.string().optional(),
  proximaCita: z.string().optional(),
  observaciones: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function ConsultaNueva() {
  const params = useParams();
  const pacienteId = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pacienteData } = useGetPaciente(pacienteId, {
    query: {
      enabled: !!pacienteId,
      queryKey: getGetPacienteQueryKey(pacienteId),
    },
  });

  const createConsulta = useCreateConsulta();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fecha: format(new Date(), "yyyy-MM-dd"),
      hora: format(new Date(), "HH:mm"),
      medico: "",
      motivo: "",
      peso: pacienteData?.paciente.peso || "",
      temperatura: "",
      frecuenciaCardiaca: "",
      frecuenciaRespiratoria: "",
      mucosas: "",
      trc: "",
      condicionCorporal: "",
      anamnesis: "",
      exploracionFisica: "",
      diagnosticosDiferenciales: "",
      diagnostico: "",
      plan: "",
      tratamiento: "",
      pronostico: "",
      proximaCita: "",
      observaciones: "",
    },
  });

  function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      peso: (values.peso === "" || isNaN(Number(values.peso))) ? undefined : Number(values.peso),
      temperatura: (values.temperatura === "" || isNaN(Number(values.temperatura))) ? undefined : Number(values.temperatura),
      frecuenciaCardiaca: (values.frecuenciaCardiaca === "" || isNaN(Number(values.frecuenciaCardiaca))) ? undefined : Number(values.frecuenciaCardiaca),
      frecuenciaRespiratoria: (values.frecuenciaRespiratoria === "" || isNaN(Number(values.frecuenciaRespiratoria))) ? undefined : Number(values.frecuenciaRespiratoria),
    };

    createConsulta.mutate(
      { pacienteId, data: payload },
      {
        onSuccess: (consulta) => {
          toast({ title: "Consulta registrada", description: "La consulta ha sido guardada correctamente." });
          queryClient.invalidateQueries({ queryKey: getGetPacienteQueryKey(pacienteId) });
          setLocation(`/consultas/${consulta.id}`);
        },
        onError: () => {
          toast({ variant: "destructive", title: "Error", description: "No se pudo guardar la consulta. Intenta de nuevo." });
        },
      }
    );
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
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Nueva Consulta</h1>
          <p className="text-lg text-muted-foreground mt-1 font-medium">Paciente: <span className="text-foreground">{pacienteData?.paciente.nombre}</span></p>
        </div>
      </div>

      <Card className="shadow-sm border-t-4 border-t-primary">
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
              
              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-primary" /> Parámetros de la Visita
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Metadatos primarios de atención en cabina.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="fecha"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Fecha <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input className="h-12 text-base" type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hora"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Hora de Inicio</FormLabel>
                        <FormControl>
                          <Input className="h-12 text-base" type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="medico"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Médico</FormLabel>
                        <FormControl>
                          <Input className="h-12 text-base" placeholder="Ej. Dr. García" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="motivo"
                    render={({ field }) => (
                      <FormItem className="md:col-span-3 bg-muted/20 p-5 rounded-xl border border-border/50">
                        <FormLabel className="text-base font-bold text-primary">Motivo Principal de Consulta <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input className="h-14 text-lg bg-white mt-2 border-primary/20 shadow-sm" placeholder="Ej. Revisión anual, vómito, vacunas..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" /> Examen físico general
                  </h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-6">
                  <FormField
                    control={form.control}
                    name="peso"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Peso (kg)</FormLabel>
                        <FormControl>
                          <Input className="h-12 text-base font-mono bg-primary/5" type="number" step="0.01" placeholder="0.0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="temperatura"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Temp. Central (°C)</FormLabel>
                        <FormControl>
                          <Input className="h-12 text-base font-mono" type="number" step="0.1" placeholder="38.5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="frecuenciaCardiaca"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">F. Cardíaca (lpm)</FormLabel>
                        <FormControl>
                          <Input className="h-12 text-base font-mono" type="number" placeholder="100" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="frecuenciaRespiratoria"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">F. Resp. (rpm)</FormLabel>
                        <FormControl>
                          <Input className="h-12 text-base font-mono" type="number" placeholder="20" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mucosas"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="text-base font-semibold">Estado de Mucosas</FormLabel>
                        <FormControl>
                          <Input className="h-12 text-base" placeholder="Rosadas, pálidas, cianóticas, ictéricas..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="trc"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">T.R.C. (seg)</FormLabel>
                        <FormControl>
                          <Input className="h-12 text-base font-mono" placeholder="< 2" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="condicionCorporal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">C.C. (escala)</FormLabel>
                        <FormControl>
                          <Input className="h-12 text-base font-mono" placeholder="3/5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" /> Exploración clínica
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-8">
                  <FormField
                    control={form.control}
                    name="anamnesis"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Anamnesis</FormLabel>
                        <FormControl>
                          <Textarea className="min-h-[120px] text-base resize-y" placeholder="Evolución de síntomas, cambios de comportamiento, tiempo de inicio..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="exploracionFisica"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Exploración física por sistemas</FormLabel>
                        <FormControl>
                          <Textarea className="min-h-[120px] text-base resize-y" placeholder="Auscultación, palpación abdominal, reflejos, nódulos linfáticos..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-primary" /> Diagnóstico y plan
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                  <FormField
                    control={form.control}
                    name="diagnosticosDiferenciales"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Diagnósticos Diferenciales</FormLabel>
                        <FormControl>
                          <Textarea className="min-h-[100px] text-base" placeholder="Listado de posibles patologías correlacionadas con el cuadro..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="diagnostico"
                    render={({ field }) => (
                      <FormItem className="bg-primary/5 p-5 rounded-xl border border-primary/20">
                        <FormLabel className="text-base font-bold text-primary">Diagnóstico <span className="font-normal text-muted-foreground">(confirmado / presuntivo)</span></FormLabel>
                        <FormControl>
                          <Textarea className="min-h-[80px] text-base mt-2 border-primary/30 font-medium" placeholder="Diagnóstico principal..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormField
                      control={form.control}
                      name="plan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">Plan diagnóstico</FormLabel>
                          <FormControl>
                            <Textarea className="min-h-[120px] text-base" placeholder="Laboratorio, imagenología, dieta..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="tratamiento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">Tratamiento aplicado en consulta</FormLabel>
                          <FormControl>
                            <Textarea className="min-h-[120px] text-base" placeholder="Procedimientos e inyecciones aplicados durante esta visita..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/10 p-5 rounded-xl border border-border/40">
                    <FormField
                      control={form.control}
                      name="pronostico"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">Pronóstico Clínico</FormLabel>
                          <FormControl>
                            <Input className="h-12 text-base" placeholder="Ej. Favorable, Reservado, Grave..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="proximaCita"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">Próxima cita</FormLabel>
                          <FormControl>
                            <Input className="h-12 text-base" type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="observaciones"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Observaciones</FormLabel>
                        <FormControl>
                          <Textarea className="min-h-[100px] text-base" placeholder="Indicaciones al propietario, notas adicionales..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-8 border-t">
                <Link href={`/pacientes/${pacienteId}`}>
                  <Button variant="outline" size="lg" type="button" className="h-12 px-6 text-base">Cancelar</Button>
                </Link>
                <Button type="submit" size="lg" className="h-12 px-8 text-base font-bold shadow-md" disabled={createConsulta.isPending}>
                  {createConsulta.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Guardar consulta
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}