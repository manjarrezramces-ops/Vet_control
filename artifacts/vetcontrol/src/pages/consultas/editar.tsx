import { useParams, Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useUpdateConsulta,
  useGetConsulta,
  getGetConsultaQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  ArrowLeft,
  Loader2,
  Stethoscope,
  Activity,
  ClipboardList,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
  fecha: z.string().min(1, "La fecha es obligatoria"),
  hora: z.string().optional(),
  medico: z.string().optional(),
  motivo: z.string().min(1, "El motivo es obligatorio"),

  peso: z.coerce.number().optional().or(z.literal("")),
  temperatura: z.coerce.number().optional().or(z.literal("")),

  condicionCorporal: z.string().optional(),
  mucosas: z.string().optional(),
  estadoMental: z.string().optional(),
  trc: z.string().optional(),
  linfonodos: z.string().optional(),

  frecuenciaCardiaca: z.coerce
    .number()
    .optional()
    .or(z.literal("")),

  pulso: z.string().optional(),
  deshidratacion: z.string().optional(),

  frecuenciaRespiratoria: z.coerce
    .number()
    .optional()
    .or(z.literal("")),

  ruidosTransito: z.string().optional(),
  camposPulmonares: z.string().optional(),
  ruidosDorsales: z.string().optional(),
  palmopercusion: z.string().optional(),
  palpacionAbdominal: z.string().optional(),

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

function numberOrUndefined(value: number | "") {
  if (value === "" || Number.isNaN(Number(value))) {
    return undefined;
  }

  return Number(value);
}

export default function ConsultaEditar() {
  const params = useParams();
  const id = Number(params.id);

  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: consulta, isLoading, isError } = useGetConsulta(id, {
    query: {
      enabled: Boolean(id),
      queryKey: getGetConsultaQueryKey(id),
    },
  });

  const updateConsulta = useUpdateConsulta();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fecha: "",
      hora: "",
      medico: "",
      motivo: "",

      peso: "",
      temperatura: "",

      condicionCorporal: "",
      mucosas: "",
      estadoMental: "",
      trc: "",
      linfonodos: "",
      frecuenciaCardiaca: "",
      pulso: "",
      deshidratacion: "",
      frecuenciaRespiratoria: "",
      ruidosTransito: "",
      camposPulmonares: "",
      ruidosDorsales: "",
      palmopercusion: "",
      palpacionAbdominal: "",

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

  const initializedForId = useRef<number | null>(null);

  useEffect(() => {
    if (!consulta || initializedForId.current === id) {
      return;
    }

    initializedForId.current = id;

    form.reset({
      fecha: consulta.fecha.split("T")[0],
      hora: consulta.hora ?? "",
      medico: consulta.medico ?? "",
      motivo: consulta.motivo,

      peso: consulta.peso ?? "",
      temperatura: consulta.temperatura ?? "",

      condicionCorporal: consulta.condicionCorporal ?? "",
      mucosas: consulta.mucosas ?? "",
      estadoMental: consulta.estadoMental ?? "",
      trc: consulta.trc ?? "",
      linfonodos: consulta.linfonodos ?? "",
      frecuenciaCardiaca:
        consulta.frecuenciaCardiaca ?? "",
      pulso: consulta.pulso ?? "",
      deshidratacion: consulta.deshidratacion ?? "",
      frecuenciaRespiratoria:
        consulta.frecuenciaRespiratoria ?? "",
      ruidosTransito: consulta.ruidosTransito ?? "",
      camposPulmonares: consulta.camposPulmonares ?? "",
      ruidosDorsales: consulta.ruidosDorsales ?? "",
      palmopercusion: consulta.palmopercusion ?? "",
      palpacionAbdominal:
        consulta.palpacionAbdominal ?? "",

      anamnesis: consulta.anamnesis ?? "",
      exploracionFisica: consulta.exploracionFisica ?? "",
      diagnosticosDiferenciales:
        consulta.diagnosticosDiferenciales ?? "",
      diagnostico: consulta.diagnostico ?? "",
      plan: consulta.plan ?? "",
      tratamiento: consulta.tratamiento ?? "",
      pronostico: consulta.pronostico ?? "",
      proximaCita: consulta.proximaCita
        ? consulta.proximaCita.split("T")[0]
        : "",
      observaciones: consulta.observaciones ?? "",
    });
  }, [consulta, id, form]);

  function onSubmit(values: FormValues) {
    const payload = {
      fecha: values.fecha,
      hora: values.hora || undefined,
      medico: values.medico || undefined,
      motivo: values.motivo,

      peso: numberOrUndefined(values.peso),
      temperatura: numberOrUndefined(values.temperatura),

      condicionCorporal:
        values.condicionCorporal || undefined,
      mucosas: values.mucosas || undefined,
      estadoMental: values.estadoMental || undefined,
      trc: values.trc || undefined,
      linfonodos: values.linfonodos || undefined,

      frecuenciaCardiaca: numberOrUndefined(
        values.frecuenciaCardiaca,
      ),

      pulso: values.pulso || undefined,
      deshidratacion:
        values.deshidratacion || undefined,

      frecuenciaRespiratoria: numberOrUndefined(
        values.frecuenciaRespiratoria,
      ),

      ruidosTransito:
        values.ruidosTransito || undefined,
      camposPulmonares:
        values.camposPulmonares || undefined,
      ruidosDorsales:
        values.ruidosDorsales || undefined,
      palmopercusion:
        values.palmopercusion || undefined,
      palpacionAbdominal:
        values.palpacionAbdominal || undefined,

      anamnesis: values.anamnesis || undefined,
      exploracionFisica:
        values.exploracionFisica || undefined,
      diagnosticosDiferenciales:
        values.diagnosticosDiferenciales || undefined,
      diagnostico: values.diagnostico || undefined,
      plan: values.plan || undefined,
      tratamiento: values.tratamiento || undefined,
      pronostico: values.pronostico || undefined,
      proximaCita: values.proximaCita || undefined,
      observaciones: values.observaciones || undefined,
    };

    updateConsulta.mutate(
      {
        consultaId: id,
        data: payload,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getGetConsultaQueryKey(id),
          });

          toast({
            title: "Cambios guardados",
            description:
              "La consulta fue actualizada correctamente.",
          });

          setLocation(`/consultas/${id}`);
        },
        onError: (error) => {
          console.error(
            "Error al actualizar la consulta:",
            error,
          );

          toast({
            variant: "destructive",
            title: "Error al guardar",
            description:
              "No se pudieron actualizar los datos.",
          });
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-4xl mx-auto">
        <Skeleton className="h-16 w-3/4" />
        <Skeleton className="h-[900px] rounded-xl" />
      </div>
    );
  }

  if (isError || !consulta) {
    return (
      <div className="text-destructive font-bold text-lg text-center py-20">
        No se pudo cargar la consulta.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href={`/consultas/${id}`}>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>

        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Editar consulta
          </h1>

          <p className="text-lg text-muted-foreground mt-1 font-medium">
            Actualiza todos los datos de la consulta médica.
          </p>
        </div>
      </div>

      <Card className="shadow-sm border-t-4 border-t-primary">
        <CardContent className="p-8">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-12"
            >
              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-primary" />
                    Parámetros de la visita
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="fecha"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">
                          Fecha
                        </FormLabel>

                        <FormControl>
                          <Input
                            className="h-12 text-base"
                            type="date"
                            {...field}
                          />
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
                        <FormLabel className="text-base font-semibold">
                          Hora
                        </FormLabel>

                        <FormControl>
                          <Input
                            className="h-12 text-base"
                            type="time"
                            {...field}
                          />
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
                        <FormLabel className="text-base font-semibold">
                          Médico
                        </FormLabel>

                        <FormControl>
                          <Input
                            className="h-12 text-base"
                            placeholder="Ej. Dr. García"
                            {...field}
                          />
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
                        <FormLabel className="text-base font-bold text-primary">
                          Motivo de consulta
                        </FormLabel>

                        <FormControl>
                          <Input
                            className="h-14 text-lg bg-white mt-2 border-primary/20 shadow-sm"
                            {...field}
                          />
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
                    <Activity className="h-5 w-5 text-primary" />
                    Examen físico general
                  </h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField
                    control={form.control}
                    name="peso"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-muted-foreground">
                          Peso
                        </FormLabel>

                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="kg"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="temperatura"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-muted-foreground">
                          Temperatura
                        </FormLabel>

                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="°C"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="condicionCorporal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-muted-foreground">
                          CC
                        </FormLabel>

                        <FormControl>
                          <Input placeholder="3/5" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mucosas"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-muted-foreground">
                          MM
                        </FormLabel>

                        <FormControl>
                          <Input
                            placeholder="Rosadas"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="estadoMental"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-muted-foreground">
                          E.M.
                        </FormLabel>

                        <FormControl>
                          <Input
                            placeholder="Alerta"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="trc"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-muted-foreground">
                          TLLC
                        </FormLabel>

                        <FormControl>
                          <Input
                            placeholder="< 2 s"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="linfonodos"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-muted-foreground">
                          LN
                        </FormLabel>

                        <FormControl>
                          <Input
                            placeholder="Normales"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="frecuenciaCardiaca"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-muted-foreground">
                          FC
                        </FormLabel>

                        <FormControl>
                          <Input
                            type="number"
                            placeholder="lpm"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                                    <FormField
                    control={form.control}
                    name="pulso"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-muted-foreground">
                          P
                        </FormLabel>

                        <FormControl>
                          <Input
                            placeholder="Fuerte, débil, filiforme..."
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deshidratacion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-muted-foreground">
                          %DH
                        </FormLabel>

                        <FormControl>
                          <Input
                            placeholder="< 5%"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="frecuenciaRespiratoria"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-muted-foreground">
                          FR
                        </FormLabel>

                        <FormControl>
                          <Input
                            type="number"
                            placeholder="rpm"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ruidosTransito"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-muted-foreground">
                          RT
                        </FormLabel>

                        <FormControl>
                          <Input
                            placeholder="Presentes"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="camposPulmonares"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-muted-foreground">
                          CP
                        </FormLabel>

                        <FormControl>
                          <Input
                            placeholder="Normales"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ruidosDorsales"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-muted-foreground">
                          RD
                        </FormLabel>

                        <FormControl>
                          <Input
                            placeholder="Normales"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="palmopercusion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-muted-foreground">
                          PP
                        </FormLabel>

                        <FormControl>
                          <Input
                            placeholder="Negativa"
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="palpacionAbdominal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-muted-foreground">
                          PA
                        </FormLabel>

                        <FormControl>
                          <Input
                            placeholder="Abdomen blando..."
                            {...field}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    Exploración clínica
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  <FormField
                    control={form.control}
                    name="anamnesis"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">
                          Anamnesis
                        </FormLabel>

                        <FormControl>
                          <Textarea
                            className="min-h-[120px]"
                            {...field}
                          />
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
                        <FormLabel className="text-base font-semibold">
                          Exploración física por sistemas
                        </FormLabel>

                        <FormControl>
                          <Textarea
                            className="min-h-[120px]"
                            {...field}
                          />
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
                    <Stethoscope className="h-5 w-5 text-primary" />
                    Diagnóstico y plan
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <FormField
                    control={form.control}
                    name="diagnosticosDiferenciales"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">
                          Diagnósticos diferenciales
                        </FormLabel>

                        <FormControl>
                          <Textarea
                            className="min-h-[100px]"
                            {...field}
                          />
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
                        <FormLabel className="text-base font-bold text-primary">
                          Diagnóstico
                        </FormLabel>

                        <FormControl>
                          <Textarea
                            className="min-h-[90px]"
                            {...field}
                          />
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
                          <FormLabel className="text-base font-semibold">
                            Plan diagnóstico
                          </FormLabel>

                          <FormControl>
                            <Textarea
                              className="min-h-[120px]"
                              {...field}
                            />
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
                          <FormLabel className="text-base font-semibold">
                            Tratamiento aplicado
                          </FormLabel>

                          <FormControl>
                            <Textarea
                              className="min-h-[120px]"
                              {...field}
                            />
                          </FormControl>

                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/10 p-5 rounded-xl border">
                    <FormField
                      control={form.control}
                      name="pronostico"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">
                            Pronóstico
                          </FormLabel>

                          <FormControl>
                            <Input {...field} />
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
                          <FormLabel className="text-base font-semibold">
                            Próxima cita
                          </FormLabel>

                          <FormControl>
                            <Input type="date" {...field} />
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
                        <FormLabel className="text-base font-semibold">
                          Observaciones
                        </FormLabel>

                        <FormControl>
                          <Textarea
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-8 border-t">
                <Link href={`/consultas/${id}`}>
                  <Button
                    variant="outline"
                    size="lg"
                    type="button"
                  >
                    Cancelar
                  </Button>
                </Link>

                <Button
                  type="submit"
                  size="lg"
                  disabled={updateConsulta.isPending}
                >
                  {updateConsulta.isPending && (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  )}

                  Guardar cambios
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
