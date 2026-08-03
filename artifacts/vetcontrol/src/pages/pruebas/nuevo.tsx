import { useParams, Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreatePrueba, useGetPaciente, getGetPacienteQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { ArrowLeft, Loader2, FlaskConical, Scan, Microscope, ChevronRight, Activity } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

const CATALOG: Record<string, { group: string; nombres: string[] }> = {
  "Laboratorio - BH (Biometría Hemática)":     { group: "Laboratorio", nombres: ["BH completa", "Diferencial de leucocitos", "Reticulocitos"] },
  "Laboratorio - QS (Química Sanguínea)":      { group: "Laboratorio", nombres: ["Perfil renal", "Perfil hepático", "Glucosa", "Proteínas totales", "Electrolitos"] },
  "Laboratorio - Urianálisis":                 { group: "Laboratorio", nombres: ["Urianálisis completo", "Sedimento urinario"] },
  "Laboratorio - Perfil Hepático":             { group: "Laboratorio", nombres: ["ALT", "AST", "GGT", "Fosfatasa alcalina", "Bilirrubinas"] },
  "Laboratorio - Perfil Renal":                { group: "Laboratorio", nombres: ["BUN", "Creatinina", "Fósforo", "SDMA"] },
  "Laboratorio - Coprológico":                 { group: "Laboratorio", nombres: ["Coproparasitoscópico", "Flotación fecal", "Cultivo fecal"] },
  "Laboratorio - Cultivo y Antibiograma":      { group: "Laboratorio", nombres: ["Cultivo aeróbico", "Cultivo anaeróbico", "Antibiograma", "Cultivo de orina"] },
  "Laboratorio - Citología":                   { group: "Laboratorio", nombres: ["Citología de masa", "Citología exfoliativa", "Raspado cutáneo", "Citología de líquido"] },
  "Laboratorio - Hemostasia":                  { group: "Laboratorio", nombres: ["Tiempo de protrombina (TP)", "TTPA", "Tiempo de sangrado"] },
  "Laboratorio - Serología / PCR":             { group: "Laboratorio", nombres: ["Panel VectorBorne", "PCR Erlichia", "PCR Parvovirus", "Toxoplasma IgG/IgM"] },
  "Imagen - Radiografía":                      { group: "Imagen", nombres: ["Rx tórax L-L", "Rx tórax V-D", "Rx abdomen", "Rx columna", "Rx extremidad", "Rx cráneo"] },
  "Imagen - Ultrasonido":                      { group: "Imagen", nombres: ["US abdominal", "US cardíaco (Ecocardiograma)", "US de tiroides", "US dirigido"] },
  "Imagen - Tomografía (TC)":                  { group: "Imagen", nombres: ["TC cráneo", "TC tórax", "TC abdomen", "TC columna"] },
  "Imagen - Resonancia Magnética (RM)":        { group: "Imagen", nombres: ["RM cerebro", "RM columna", "RM musculoesquelético"] },
  "Histopatología / Biopsia":                  { group: "Histopatología", nombres: ["Biopsia incisional", "Biopsia excisional", "Biopsia de piel", "Punch biopsia"] },
  "Electrocardiograma (ECG)":                  { group: "Otros", nombres: ["ECG de 6 derivaciones", "Holter 24h"] },
  "Microbiología":                             { group: "Laboratorio", nombres: ["Gram", "KOH", "Cultivo fúngico", "Tinción de Ziehl-Neelsen"] },
  "Otro":                                      { group: "Otros", nombres: [] },
};

const GROUPS = ["Laboratorio", "Imagen", "Histopatología", "Otros"];

const TIPO_ICON: Record<string, React.ReactNode> = {
  "Laboratorio":    <FlaskConical className="h-4 w-4" />,
  "Imagen":         <Scan className="h-4 w-4" />,
  "Histopatología": <Microscope className="h-4 w-4" />,
  "Otros":          <Activity className="h-4 w-4" />,
};

const formSchema = z.object({
  fecha: z.string().min(1, "La fecha es obligatoria"),
  tipo: z.string().min(1, "Selecciona el tipo de estudio"),
  nombre: z.string().min(1, "El nombre del estudio es obligatorio"),
  laboratorio: z.string().optional(),
  resultado: z.string().optional(),
  interpretacion: z.string().optional(),
  costo: z.coerce.number().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

export default function PruebaNueva() {
  const params = useParams();
  const pacienteId = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const consultaId = (() => {
    const qs = new URLSearchParams(window.location.search);
    const v = parseInt(qs.get("consultaId") ?? "", 10);
    return isNaN(v) ? undefined : v;
  })();

  const { data: pacienteData } = useGetPaciente(pacienteId, {
    query: { enabled: !!pacienteId, queryKey: getGetPacienteQueryKey(pacienteId) },
  });

  const createPrueba = useCreatePrueba();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fecha: format(new Date(), "yyyy-MM-dd"),
      tipo: "",
      nombre: "",
      laboratorio: "",
      resultado: "",
      interpretacion: "",
      costo: "",
    },
  });

  const tipoActual = form.watch("tipo");
  const sugeridos = CATALOG[tipoActual]?.nombres ?? [];

  useEffect(() => {
    form.setValue("nombre", "");
  }, [tipoActual]); // eslint-disable-line react-hooks/exhaustive-deps

  function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      costo: (values.costo === "" || isNaN(Number(values.costo))) ? undefined : Number(values.costo),
      ...(consultaId ? { consultaId } : {}),
    };

    createPrueba.mutate(
      { pacienteId, data: payload },
      {
        onSuccess: (prueba) => {
          toast({ title: "Estudio ingresado", description: "Los resultados se cargaron apropiadamente al perfil médico." });
          queryClient.invalidateQueries({ queryKey: getGetPacienteQueryKey(pacienteId) });
          if (consultaId) {
            setLocation(`/consultas/${consultaId}`);
          } else {
            setLocation(`/pruebas/${prueba.id}`);
          }
        },
        onError: () => {
          toast({ variant: "destructive", title: "Error procedimental", description: "Hubo fallos al almacenar la orden diagnóstica." });
        },
      }
    );
  }

  const backHref = consultaId ? `/consultas/${consultaId}` : `/pacientes/${pacienteId}`;
  const grupo = CATALOG[tipoActual]?.group ?? "";

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href={backHref}>
          <Button variant="outline" size="icon" className="rounded-full shadow-sm shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Añadir Archivo Diagnóstico</h1>
          <p className="text-lg text-muted-foreground mt-1 font-medium">
            Estudio ordenado para: <span className="text-foreground">{pacienteData?.paciente.nombre}</span>
            {consultaId && <span className="ml-3 text-sm px-2 py-0.5 bg-muted/50 rounded-md">Vinc. a consulta #{consultaId}</span>}
          </p>
        </div>
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
                        <FormLabel className="text-base font-semibold">Grupo y Familia Diagnóstica <span className="text-destructive">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12 text-base">
                              <SelectValue placeholder="Categorización de la prueba..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {GROUPS.map(grp => (
                              <SelectGroup key={grp}>
                                <SelectLabel className="flex items-center gap-2 font-bold text-foreground bg-muted/20 py-2">
                                  {TIPO_ICON[grp]} <span className="uppercase tracking-widest text-xs">{grp}</span>
                                </SelectLabel>
                                {Object.entries(CATALOG)
                                  .filter(([, v]) => v.group === grp)
                                  .map(([key]) => (
                                    <SelectItem key={key} value={key} className="pl-8 font-medium">
                                      {key.replace(/^[^-]+ - /, "")}
                                    </SelectItem>
                                  ))}
                              </SelectGroup>
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
                      <FormItem className="md:col-span-2 bg-muted/10 p-5 rounded-xl border border-border/50">
                        <FormLabel className="text-base font-semibold text-primary">Término Específico del Estudio <span className="text-destructive">*</span></FormLabel>
                        {sugeridos.length > 0 && (
                          <div className="flex flex-wrap gap-2 my-3">
                            {sugeridos.map(s => (
                              <Badge
                                key={s}
                                variant={field.value === s ? "default" : "outline"}
                                className={`cursor-pointer px-3 py-1 font-medium transition-all ${field.value === s ? "shadow-md bg-primary hover:bg-primary/90" : "bg-white hover:bg-muted"}`}
                                onClick={() => form.setValue("nombre", s)}
                              >
                                {s}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <FormControl>
                          <Input
                            className="h-14 text-lg border-primary/20 shadow-sm bg-white"
                            placeholder={sugeridos.length ? "Digita un nombre diferente si no está entre los recomendados..." : "Escribe la descripción concreta, p. ej. 'Perfil Renal Completo'..."}
                            {...field}
                          />
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

                  {(grupo === "Laboratorio" || grupo === "Histopatología") && (
                    <FormField
                      control={form.control}
                      name="laboratorio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">Entidad Receptora (Laboratorio)</FormLabel>
                          <FormControl>
                            <Input className="h-12 text-base" placeholder="Identificador de la instancia procesadora..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="costo"
                    render={({ field }) => (
                      <FormItem className={grupo !== "Laboratorio" && grupo !== "Histopatología" ? "md:col-start-2" : ""}>
                        <FormLabel className="text-base font-semibold">Coste Financiero ($)</FormLabel>
                        <FormControl>
                          <Input className="h-12 text-base font-mono" type="number" step="0.01" min="0" placeholder="0.00" {...field} />
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
                            className="min-h-[160px] text-base font-mono bg-muted/5 border-border/60"
                            placeholder="Anote los índices, descripciones morfológicas brutas o hallazgos literales del papel..."
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
                            className="min-h-[120px] text-base font-medium mt-2 bg-white"
                            placeholder="Traduzca las anomalías hacia un cuadro patológico reconocible..."
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
                <Link href={backHref}>
                  <Button variant="outline" size="lg" type="button" className="h-12 px-6 text-base">Desestimar Carga</Button>
                </Link>
                <Button type="submit" size="lg" className="h-12 px-8 text-base font-bold shadow-md" disabled={createPrueba.isPending}>
                  {createPrueba.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Fichar Estudio
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}