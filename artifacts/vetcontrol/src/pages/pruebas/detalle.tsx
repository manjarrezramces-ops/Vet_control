import { useParams, Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useUpdatePrueba, useGetPrueba, getGetPruebaQueryKey, useDeletePrueba } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef } from "react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Trash2, Microscope, Scan, FlaskConical } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const formSchema = z.object({
  fecha: z.string().min(1, "La fecha es obligatoria"),
  tipo: z.string().optional(),
  nombre: z.string().min(1, "El nombre de la prueba es obligatorio"),
  laboratorio: z.string().optional(),
  resultado: z.string().optional(),
  interpretacion: z.string().optional(),
  costo: z.coerce.number().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

export default function PruebaDetalle() {
  const params = useParams();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: prueba, isLoading, isError } = useGetPrueba(id, {
    query: {
      enabled: !!id,
      queryKey: getGetPruebaQueryKey(id),
    },
  });

  const updatePrueba = useUpdatePrueba();
  const deletePrueba = useDeletePrueba();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fecha: "",
      tipo: "Laboratorio",
      nombre: "",
      laboratorio: "",
      resultado: "",
      interpretacion: "",
      costo: "",
    },
  });

  const initializedForId = useRef<number | null>(null);

  useEffect(() => {
    if (prueba && initializedForId.current !== id) {
      initializedForId.current = id;
      form.reset({
        fecha: prueba.fecha.split('T')[0],
        tipo: prueba.tipo || "Laboratorio",
        nombre: prueba.nombre,
        laboratorio: prueba.laboratorio || "",
        resultado: prueba.resultado || "",
        interpretacion: prueba.interpretacion || "",
        costo: prueba.costo || "",
      });
    }
  }, [prueba, id, form]);

  function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      costo: (values.costo === "" || isNaN(Number(values.costo))) ? undefined : Number(values.costo),
    };

    updatePrueba.mutate(
      { pruebaId: id, data: payload },
      {
        onSuccess: () => {
          toast({ title: "Modificación consolidada", description: "El estudio diagnóstico reescribió sus datos internos a nivel de base." });
          queryClient.invalidateQueries({ queryKey: getGetPruebaQueryKey(id) });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Defecto en grabación", description: "Incapacidad para aplicar la corrección a la instancia del estudio." });
        },
      }
    );
  }

  const handleDelete = () => {
    if (!prueba) return;
    deletePrueba.mutate(
      { pruebaId: id },
      {
        onSuccess: () => {
          toast({ title: "Anulación forzada", description: "El compendio del estudio se eliminó del expediente." });
          setLocation(`/pacientes/${prueba.pacienteId}`);
        },
        onError: () => {
          toast({ variant: "destructive", title: "Error en supresión", description: "Permisos u orden fallida durante la exclusión del recurso." });
        }
      }
    );
  };

  if (isLoading) {
    return <div className="space-y-8 max-w-4xl mx-auto"><Skeleton className="h-16 w-3/4" /><Skeleton className="h-[800px] rounded-xl" /></div>;
  }

  if (isError || !prueba) {
    return <div className="text-destructive font-bold text-center text-lg py-20">El reporte documental de laboratorio requerido arroja fallos.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <Link href={`/pacientes/${prueba.pacienteId}`}>
            <Button variant="outline" size="icon" className="rounded-full mt-1 shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0">
              <Microscope className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground">Gestión de Estudio Clínico</h1>
              <p className="text-lg text-muted-foreground mt-2 font-medium">Visualización en panel editable del análisis procesado.</p>
            </div>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="lg" className="text-destructive hover:bg-destructive hover:text-destructive-foreground shadow-sm">
              <Trash2 className="mr-2 h-4 w-4" /> Triturar Expediente
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supresión permanente y categórica</AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                Anularás la constancia física y analítica generada en el tiempo para el paciente. No hay sistema de reversión configurado para esta operación directa.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abandonar Proceso</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Confirmar Borrado
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card className="shadow-sm border-t-4 border-t-primary">
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
              
              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                    <Scan className="h-5 w-5 text-primary" /> Identidad del Procedimiento
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <FormField
                    control={form.control}
                    name="tipo"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="text-base font-semibold">Grupo y Familia Diagnóstica</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 text-base bg-muted/10">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Laboratorio" className="font-medium">Laboratorio clínico general y cultivos</SelectItem>
                            <SelectItem value="Imagenologia" className="font-medium">Imagenología (Rx contrastada, USG de rastreo)</SelectItem>
                            <SelectItem value="Prueba rapida" className="font-medium">Inmunoensayos y Pruebas Rápidas Físicas (Snap)</SelectItem>
                            <SelectItem value="Citologia" className="font-medium">Muestreo Citológico de superficie</SelectItem>
                            <SelectItem value="Histopatologia" className="font-medium">Deducción Histopatológica Profunda</SelectItem>
                            <SelectItem value="Otro" className="font-medium">Categorías Aisladas Mixtas</SelectItem>
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
                      <FormItem className="md:col-span-2 bg-muted/10 p-5 rounded-xl border border-border/50">
                        <FormLabel className="text-base font-semibold text-primary">Término Específico del Estudio <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input className="h-14 text-lg border-primary/20 shadow-sm bg-white mt-2 font-bold" placeholder="Designación clara del panel..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fecha"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Fecha de Extracción / Emisión <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input className="h-12 text-base" type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="laboratorio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Entidad Receptora (Laboratorio)</FormLabel>
                        <FormControl>
                          <Input className="h-12 text-base" placeholder="Firma operativa del procesador..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="costo"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2 md:w-1/2">
                        <FormLabel className="text-base font-semibold">Coste Financiero ($)</FormLabel>
                        <FormControl>
                          <Input className="h-12 text-base font-mono bg-muted/5" type="number" step="0.01" min="0" placeholder="0.00" {...field} />
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
                    <FlaskConical className="h-5 w-5 text-primary" /> Resultados y Dictamen
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  <FormField
                    control={form.control}
                    name="resultado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Registro de Valores Extraídos</FormLabel>
                        <FormControl>
                          <Textarea 
                            className="min-h-[200px] text-base font-mono bg-muted/5 border-border/60" 
                            placeholder="Data pura tabulada y listada en transcripción directa..." 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="interpretacion"
                    render={({ field }) => (
                      <FormItem className="bg-primary/5 p-6 rounded-xl border border-primary/20">
                        <FormLabel className="text-base font-bold text-primary">Decodificación Clínica (Interpretación)</FormLabel>
                        <FormControl>
                          <Textarea 
                            className="min-h-[160px] text-base font-medium mt-2 bg-white" 
                            placeholder="Análisis deductivo para ser referenciado por el veterinario interviniente..." 
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
                <Link href={`/pacientes/${prueba.pacienteId}`}>
                  <Button variant="outline" size="lg" type="button" className="h-12 px-6 text-base">Omitir Edición</Button>
                </Link>
                <Button type="submit" size="lg" className="h-12 px-8 text-base font-bold shadow-md" disabled={updatePrueba.isPending}>
                  {updatePrueba.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Consolidar Rescritura de Análisis
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}