import { useParams, Link, useLocation } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateReceta, useGetPaciente, getGetPacienteQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Loader2, Plus, Trash2, Pill, ScrollText, Calendar } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const partidaSchema = z.object({
  medicamento: z.string().min(1, "El compuesto es obligatorio"),
  presentacion: z.string().optional(),
  dosis: z.string().min(1, "Las tomas son obligatorias"),
  via: z.string().optional(),
  frecuencia: z.string().optional(),
  duracion: z.string().optional(),
  instrucciones: z.string().optional(),
});

const formSchema = z.object({
  fecha: z.string().min(1, "La fecha de emisión es obligatoria"),
  medico: z.string().optional(),
  consultaId: z.coerce.number().optional().or(z.literal(0)),
  indicacionesGenerales: z.string().optional(),
  proximaRevision: z.string().optional(),
  partidas: z.array(partidaSchema).min(1, "Debe enlistar por lo menos una formulación"),
});

type FormValues = z.infer<typeof formSchema>;

export default function RecetaNueva() {
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

  const createReceta = useCreateReceta();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fecha: format(new Date(), "yyyy-MM-dd"),
      medico: "",
      consultaId: 0,
      indicacionesGenerales: "",
      proximaRevision: "",
      partidas: [
        {
          medicamento: "",
          presentacion: "",
          dosis: "",
          via: "",
          frecuencia: "",
          duracion: "",
          instrucciones: "",
        }
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "partidas",
  });

  function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      consultaId: values.consultaId === 0 ? undefined : values.consultaId,
    };

    createReceta.mutate(
      { pacienteId, data: payload },
      {
        onSuccess: (receta) => {
          toast({ title: "Receta elaborada exitosamente", description: "El récipe se ha integrado al expediente del paciente." });
          queryClient.invalidateQueries({ queryKey: getGetPacienteQueryKey(pacienteId) });
          setLocation(`/recetas/${receta.id}`);
        },
        onError: () => {
          toast({ variant: "destructive", title: "Error en la prescripción", description: "No se permitió procesar la solicitud de receta." });
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
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Elaboración de Receta Médica</h1>
          <p className="text-lg text-muted-foreground mt-1 font-medium">Paciente receptor: <span className="text-foreground">{pacienteData?.paciente.nombre}</span></p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="shadow-sm border-t-4 border-t-primary">
            <CardContent className="p-8">
              <div className="flex items-center gap-2 mb-6 border-b pb-4">
                <ScrollText className="h-5 w-5 text-primary" />
                <h3 className="text-xl font-semibold tracking-tight text-foreground">Detalles de Emisión</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="fecha"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Fecha de Emisión <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input className="h-12 text-base" type="date" {...field} />
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
                      <FormLabel className="text-base font-semibold">Facultativo Interviniente</FormLabel>
                      <FormControl>
                        <Input className="h-12 text-base" placeholder="Ej. Dr. A. García" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="proximaRevision"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Próxima Visita Deseada</FormLabel>
                      <FormControl>
                        <Input className="h-12 text-base" type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <div className="flex items-end justify-between px-1">
              <div>
                <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Pill className="h-6 w-6 text-primary" /> Formulario Farmacológico
                </h3>
                <p className="text-sm text-muted-foreground mt-1 font-medium">Asignar medicamentos prescritos a surtir.</p>
              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="lg"
                className="shadow-sm font-semibold"
                onClick={() => append({ medicamento: "", presentacion: "", dosis: "", via: "", frecuencia: "", duracion: "", instrucciones: "" })}
              >
                <Plus className="h-5 w-5 mr-2" /> Agregar Nueva Fila
              </Button>
            </div>

            {fields.map((field, index) => (
              <Card key={field.id} className="relative overflow-hidden border-border/60 shadow-sm transition-all hover:border-primary/40">
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-primary/20"></div>
                <CardContent className="p-8 pl-10">
                  <div className="flex justify-between items-center mb-6">
                    <div className="font-bold text-lg text-primary tracking-wide">COMPUESTO #{index + 1}</div>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-destructive border-destructive/20 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4 mr-1.5" /> Quitar
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-6">
                    <FormField
                      control={form.control}
                      name={`partidas.${index}.medicamento`}
                      render={({ field }) => (
                        <FormItem className="md:col-span-6">
                          <FormLabel className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Sustancia / Medicamento <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input className="h-12 text-base font-semibold" placeholder="Nombre genérico o de patente..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`partidas.${index}.presentacion`}
                      render={({ field }) => (
                        <FormItem className="md:col-span-6">
                          <FormLabel className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Vehículo / Presentación</FormLabel>
                          <FormControl>
                            <Input className="h-12 text-base" placeholder="Ej. Comprimidos 500mg, Suspensión..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`partidas.${index}.dosis`}
                      render={({ field }) => (
                        <FormItem className="md:col-span-3">
                          <FormLabel className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Posología <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input className="h-12 text-base font-mono" placeholder="Ej. 1 tableta, 5ml..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`partidas.${index}.via`}
                      render={({ field }) => (
                        <FormItem className="md:col-span-3">
                          <FormLabel className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Vía de Adm.</FormLabel>
                          <FormControl>
                            <Input className="h-12 text-base" placeholder="Oral, SC, Ótica..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`partidas.${index}.frecuencia`}
                      render={({ field }) => (
                        <FormItem className="md:col-span-3">
                          <FormLabel className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Intervalo</FormLabel>
                          <FormControl>
                            <Input className="h-12 text-base" placeholder="Cada 12 hrs, SID..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`partidas.${index}.duracion`}
                      render={({ field }) => (
                        <FormItem className="md:col-span-3">
                          <FormLabel className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Plazo</FormLabel>
                          <FormControl>
                            <Input className="h-12 text-base" placeholder="Por 7 días..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`partidas.${index}.instrucciones`}
                      render={({ field }) => (
                        <FormItem className="md:col-span-12 bg-muted/20 p-4 rounded-xl border border-border/50">
                          <FormLabel className="text-sm font-bold text-foreground">Especificaciones de Toma</FormLabel>
                          <FormControl>
                            <Input className="h-12 text-base bg-white mt-1 shadow-sm border-border/60" placeholder="Con alimento, ayuno previo, refrigerar..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
            {form.formState.errors.partidas?.root && (
              <div className="text-destructive text-sm font-bold bg-destructive/10 p-4 rounded-lg border border-destructive/20 flex items-center">
                <Trash2 className="h-4 w-4 mr-2" /> {form.formState.errors.partidas.root.message}
              </div>
            )}
          </div>

          <Card className="shadow-sm">
            <CardContent className="p-8">
              <div className="flex items-center gap-2 mb-4 border-b pb-3">
                <Calendar className="h-5 w-5 text-primary" />
                <h3 className="text-xl font-semibold tracking-tight text-foreground">Complementos al Tratamiento</h3>
              </div>
              <FormField
                control={form.control}
                name="indicacionesGenerales"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">Consejos Generales, Dieta y Cuidados</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Requerimientos de alojamiento, baño, tipo de alimentación ideal u observaciones para el dueño en casa..." 
                        className="min-h-[120px] text-base resize-y mt-2" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4 pt-4 border-t">
            <Link href={`/pacientes/${pacienteId}`}>
              <Button variant="outline" size="lg" type="button" className="h-12 px-6 text-base">Descartar Documento</Button>
            </Link>
            <Button type="submit" size="lg" className="h-12 px-8 text-base font-bold shadow-md" disabled={createReceta.isPending}>
              {createReceta.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Imprimir y Guardar
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}