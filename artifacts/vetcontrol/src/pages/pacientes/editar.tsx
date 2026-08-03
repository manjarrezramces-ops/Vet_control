import { useParams, Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGetPaciente, getGetPacienteQueryKey, useUpdatePaciente } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Loader2, Cat, ClipboardList } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
  clienteId: z.coerce.number().min(1, "Debe seleccionar un propietario"),
  nombre: z.string().min(1, "El nombre es obligatorio"),
  especie: z.string().min(1, "Especie requerida"),
  raza: z.string().optional(),
  sexo: z.string().optional(),
  fechaNacimiento: z.string().optional().or(z.literal("")),
  color: z.string().optional(),
  peso: z.coerce.number().optional().or(z.literal("")),
  microchip: z.string().optional(),
  esterilizado: z.boolean().default(false),
  estado: z.string().default("Activo"),
  alergias: z.string().optional(),
  antecedentes: z.string().optional(),
  vacunas: z.string().optional(),
  alimentacion: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function PacienteEditar() {
  const params = useParams();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useGetPaciente(id, {
    query: {
      enabled: !!id,
      queryKey: getGetPacienteQueryKey(id),
    },
  });

  const updatePaciente = useUpdatePaciente();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clienteId: 0,
      nombre: "",
      especie: "Perro",
      raza: "",
      sexo: "No especificado",
      fechaNacimiento: "",
      color: "",
      peso: undefined,
      microchip: "",
      esterilizado: false,
      estado: "Activo",
      alergias: "",
      antecedentes: "",
      vacunas: "",
      alimentacion: "",
    },
  });

  const initializedForId = useRef<number | null>(null);

  useEffect(() => {
    if (data?.paciente && initializedForId.current !== id) {
      initializedForId.current = id;
      const p = data.paciente;
      form.reset({
        clienteId: p.clienteId,
        nombre: p.nombre,
        especie: p.especie,
        raza: p.raza || "",
        sexo: p.sexo || "No especificado",
        fechaNacimiento: p.fechaNacimiento || "",
        color: p.color || "",
        peso: p.peso || undefined,
        microchip: p.microchip || "",
        esterilizado: p.esterilizado || false,
        estado: p.estado || "Activo",
        alergias: p.alergias || "",
        antecedentes: p.antecedentes || "",
        vacunas: p.vacunas || "",
        alimentacion: p.alimentacion || "",
      });
    }
  }, [data, id, form]);

  function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      peso: (values.peso === "" || isNaN(Number(values.peso))) ? undefined : Number(values.peso)
    };

    updatePaciente.mutate(
      { pacienteId: id, data: payload },
      {
        onSuccess: () => {
          toast({ title: "Expediente actualizado", description: "La ficha técnica se guardó con éxito." });
          queryClient.invalidateQueries({ queryKey: getGetPacienteQueryKey(id) });
          setLocation(`/pacientes/${id}`);
        },
        onError: () => {
          toast({ variant: "destructive", title: "Error", description: "No se pudieron actualizar los datos del paciente." });
        },
      }
    );
  }

  if (isLoading) {
    return <div className="space-y-8 max-w-4xl mx-auto"><Skeleton className="h-12 w-64" /><Skeleton className="h-[800px] rounded-xl" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="rounded-full shrink-0" onClick={() => window.history.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
            Editar Ficha Clínica
          </h1>
          <p className="text-lg text-muted-foreground mt-1">Actualizando expediente de {data?.paciente.nombre}.</p>
        </div>
      </div>

      <Card className="shadow-sm border-t-4 border-t-primary">
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
              
              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                    <Cat className="h-5 w-5 text-primary" /> Datos Generales
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Identificación biométrica e información de raza.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <FormField
                    control={form.control}
                    name="nombre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Nombre de la mascota <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input className="h-12 text-base" placeholder="Ej. Firulais" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="especie"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Especie <span className="text-destructive">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 text-base">
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Perro">Perro (Canino)</SelectItem>
                            <SelectItem value="Gato">Gato (Felino)</SelectItem>
                            <SelectItem value="Ave">Ave</SelectItem>
                            <SelectItem value="Conejo">Conejo</SelectItem>
                            <SelectItem value="Reptil">Reptil</SelectItem>
                            <SelectItem value="Otro">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="raza"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Raza</FormLabel>
                        <FormControl>
                          <Input className="h-12 text-base" placeholder="Ej. Golden Retriever" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sexo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Sexo</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 text-base">
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Macho">Macho</SelectItem>
                            <SelectItem value="Hembra">Hembra</SelectItem>
                            <SelectItem value="No especificado">Indeterminado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fechaNacimiento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Fecha de Nacimiento</FormLabel>
                        <FormControl>
                          <Input className="h-12 text-base" type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Color / Marcas</FormLabel>
                        <FormControl>
                          <Input className="h-12 text-base" placeholder="Ej. Negro con manchas blancas" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4 md:col-span-2">
                    <FormField
                      control={form.control}
                      name="peso"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">Peso Histórico (kg)</FormLabel>
                          <FormControl>
                            <Input className="h-12 text-base font-mono" type="number" step="0.01" min="0" placeholder="0.00" {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="microchip"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">Microchip / ID</FormLabel>
                          <FormControl>
                            <Input className="h-12 text-base font-mono" placeholder="Número de registro..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="estado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Estado Clínico</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 text-base">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Activo">Activo (Visitante habitual)</SelectItem>
                            <SelectItem value="Inactivo">Inactivo (Sin visitas recientes)</SelectItem>
                            <SelectItem value="Fallecido">Fallecido</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="esterilizado"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-xl border border-primary/20 bg-primary/5 p-4 h-[92px]">
                        <FormControl>
                          <Checkbox className="h-5 w-5 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1">
                          <FormLabel className="text-base font-bold text-primary cursor-pointer">Paciente Esterilizado / Castrado</FormLabel>
                          <p className="text-xs text-muted-foreground">Desmarca si aún está intacto.</p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" /> Historial de Base
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Registros de importancia antes de iniciar visitas a la clínica.</p>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <FormField
                    control={form.control}
                    name="alergias"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold text-destructive">Alergias Documentadas</FormLabel>
                        <FormControl>
                          <Textarea className="resize-none min-h-[80px] text-base border-destructive/30 focus-visible:ring-destructive/30" placeholder="Fármacos intolerables o alérgenos..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vacunas"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Esquema Previo de Inmunización</FormLabel>
                        <FormControl>
                          <Textarea className="resize-none min-h-[80px] text-base" placeholder="Vacunas de años anteriores y fechas..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="antecedentes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Enfermedades o Cirugías Previas</FormLabel>
                        <FormControl>
                          <Textarea className="resize-none min-h-[100px] text-base" placeholder="Historico quirúrgico y patologías previas de relevancia clínica..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="alimentacion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Manejo Nutricional</FormLabel>
                        <FormControl>
                          <Textarea className="resize-none min-h-[80px] text-base" placeholder="Preferencias dietéticas y marcas empleadas..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button variant="outline" size="lg" type="button" className="h-12 px-6 text-base" onClick={() => window.history.back()}>Cancelar Cambios</Button>
                <Button type="submit" size="lg" className="h-12 px-8 text-base font-bold shadow-md" disabled={updatePaciente.isPending}>
                  {updatePaciente.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Guardar Ficha Técnica
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}