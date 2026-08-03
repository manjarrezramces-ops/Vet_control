import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { useCreatePaciente, useGetClientes, getGetPacientesQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Loader2, Cat, ClipboardList } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
  clienteId: z.coerce.number().min(1, "Debe seleccionar un propietario"),
  nombre: z.string().min(1, "El nombre es obligatorio"),
  apellido: z.string().optional(),
  especie: z.enum(["Perro", "Gato", "Ave", "Conejo", "Reptil", "Otro"], {
    required_error: "Especie requerida",
  }),
  raza: z.string().optional(),
  sexo: z.enum(["Macho", "Hembra", "No especificado"]).optional(),
  fechaNacimiento: z.string().optional(),
  color: z.string().optional(),
  peso: z.coerce.number().optional(),
  microchip: z.string().optional(),
  esterilizado: z.boolean().default(false),
  estado: z.enum(["Activo", "Inactivo", "Fallecido"]).default("Activo"),
  alergias: z.string().optional(),
  antecedentes: z.string().optional(),
  vacunas: z.string().optional(),
  alimentacion: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function PacienteNuevo() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [defaultClienteId, setDefaultClienteId] = useState<number>(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const clienteId = params.get("clienteId");
    if (clienteId) {
      setDefaultClienteId(Number(clienteId));
    }
  }, []);

  const { data: clientes } = useGetClientes();
  const createPaciente = useCreatePaciente();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clienteId: defaultClienteId,
      nombre: "",
      apellido: "",
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

  useEffect(() => {
    if (defaultClienteId > 0 && form.getValues("clienteId") === 0) {
      form.setValue("clienteId", defaultClienteId);
    }
  }, [defaultClienteId, form]);

  function onSubmit(values: FormValues) {
    createPaciente.mutate(
      { data: values },
      {
        onSuccess: (paciente) => {
          toast({ title: "Expediente creado", description: "La mascota se ha registrado correctamente en el sistema." });
          queryClient.invalidateQueries({ queryKey: getGetPacientesQueryKey() });
          setLocation(`/pacientes/${paciente.id}`);
        },
        onError: () => {
          toast({ variant: "destructive", title: "Error", description: "No se pudo crear el registro clínico del paciente." });
        },
      }
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="rounded-full shrink-0" onClick={() => window.history.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Apertura de Expediente</h1>
          <p className="text-lg text-muted-foreground mt-1">Registrar una nueva mascota y vincularla a un propietario.</p>
        </div>
      </div>

      <Card className="shadow-sm border-t-4 border-t-primary">
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
              
              {/* Sección: Datos Generales */}
              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                    <Cat className="h-5 w-5 text-primary" /> Ficha de Identificación
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Información básica del paciente.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <FormField
                    control={form.control}
                    name="clienteId"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2 bg-muted/20 p-4 rounded-xl border border-border/50">
                        <FormLabel className="text-base font-bold text-primary">Propietario / Cliente <span className="text-destructive">*</span></FormLabel>
                        <Select 
                          onValueChange={(v) => field.onChange(Number(v))} 
                          value={field.value > 0 ? field.value.toString() : ""}
                        >
                          <FormControl>
                            <SelectTrigger className="h-12 text-base bg-white border-primary/20 shadow-sm">
                              <SelectValue placeholder="Seleccione al responsable de la mascota..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clientes?.map(c => (
                              <SelectItem key={c.id} value={c.id.toString()}>
                                <span className="font-semibold">{c.nombre} {c.apellidos}</span> 
                                <span className="text-muted-foreground ml-2">({c.telefono})</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                    name="apellido"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Apellido</FormLabel>
                        <FormControl>
                          <Input className="h-12 text-base" placeholder="Ej. García" {...field} />
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                          <Input className="h-12 text-base" placeholder="Ej. Golden Retriever, Mestizo..." {...field} />
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 text-base">
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Macho">Macho</SelectItem>
                            <SelectItem value="Hembra">Hembra</SelectItem>
                            <SelectItem value="No especificado">Indeterminado / No especificado</SelectItem>
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
                        <FormLabel className="text-base font-semibold">Fecha de Nacimiento (Aprox.)</FormLabel>
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
                        <FormLabel className="text-base font-semibold">Color / Rasgos distintivos</FormLabel>
                        <FormControl>
                          <Input className="h-12 text-base" placeholder="Ej. Negro con parche blanco en el pecho..." {...field} />
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
                          <FormLabel className="text-base font-semibold">Peso Inicial (kg)</FormLabel>
                          <FormControl>
                            <Input className="h-12 text-base font-mono" type="number" step="0.01" min="0" placeholder="0.00" {...field} value={field.value || ""} />
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
                          <FormLabel className="text-base font-semibold">Microchip / Tatuaje</FormLabel>
                          <FormControl>
                            <Input className="h-12 text-base font-mono" placeholder="Núm. de registro ID..." {...field} />
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
                        <FormLabel className="text-base font-semibold">Estado en la Clínica</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 text-base">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Activo">Activo (Paciente regular)</SelectItem>
                            <SelectItem value="Inactivo">Inactivo (No visita frecuentemente)</SelectItem>
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
                          <p className="text-xs text-muted-foreground">Marcar si el procedimiento ya fue realizado.</p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Sección: Historial Médico */}
              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" /> Antecedentes Iniciales
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Historial médico previo a la apertura del expediente.</p>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <FormField
                    control={form.control}
                    name="alergias"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold text-destructive">Alergias Conocidas</FormLabel>
                        <FormControl>
                          <Textarea className="resize-none min-h-[80px] text-base border-destructive/30 focus-visible:ring-destructive/30" placeholder="Fármacos, alimentos, factores ambientales..." {...field} />
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
                        <FormLabel className="text-base font-semibold">Protocolo de Vacunación y Desparasitación</FormLabel>
                        <FormControl>
                          <Textarea className="resize-none min-h-[80px] text-base" placeholder="Cartilla actual, fechas de última aplicación..." {...field} />
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
                        <FormLabel className="text-base font-semibold">Antecedentes Clínicos y Quirúrgicos</FormLabel>
                        <FormControl>
                          <Textarea className="resize-none min-h-[100px] text-base" placeholder="Cirugías previas, padecimientos crónicos, traumatismos de importancia..." {...field} />
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
                        <FormLabel className="text-base font-semibold">Dieta y Alimentación</FormLabel>
                        <FormControl>
                          <Textarea className="resize-none min-h-[80px] text-base" placeholder="Tipo de dieta (Croquetas, BARF, Húmeda), marca, porciones diarias..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button variant="outline" size="lg" type="button" className="h-12 px-6 text-base" onClick={() => window.history.back()}>Cancelar Operación</Button>
                <Button type="submit" size="lg" className="h-12 px-8 text-base font-bold shadow-md" disabled={createPaciente.isPending}>
                  {createPaciente.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Confirmar y Crear Expediente
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}