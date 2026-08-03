import { useParams, Link, useLocation } from "wouter";
import { useGetPaciente, getGetPacienteQueryKey, useDeletePaciente } from "@workspace/api-client-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Plus, Edit, Trash2, Cat, Dog, Bird, User, FileText, ClipboardList, Calendar, BedDouble, AlertTriangle, Activity, Stethoscope, Weight, Scissors
} from "lucide-react";
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

export default function PacienteDetalle() {
  const params = useParams();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useGetPaciente(id, {
    query: {
      enabled: !!id,
      queryKey: getGetPacienteQueryKey(id),
    },
  });

  const deletePaciente = useDeletePaciente();

  if (isLoading) {
    return <div className="space-y-8">
      <Skeleton className="h-12 w-64" />
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-[500px] rounded-xl" />
    </div>;
  }

  if (isError || !data) {
    return <div className="text-destructive font-medium text-lg">Error al cargar el expediente clínico.</div>;
  }

  const { paciente, propietario, propietarioId, consultas, recetas, pruebas } = data;

  const getSpeciesIcon = (especie: string) => {
    switch (especie.toLowerCase()) {
      case "perro": return <Dog className="h-8 w-8" />;
      case "gato": return <Cat className="h-8 w-8" />;
      case "ave": return <Bird className="h-8 w-8" />;
      default: return <Cat className="h-8 w-8" />;
    }
  };

  const handleDelete = () => {
    deletePaciente.mutate(
      { pacienteId: id },
      {
        onSuccess: () => {
          toast({ title: "Expediente eliminado", description: "El expediente del paciente ha sido eliminado permanentemente." });
          setLocation(`/clientes/${propietarioId}`);
        },
        onError: () => {
          toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el expediente." });
        }
      }
    );
  };

  const age = paciente.fechaNacimiento 
    ? new Date().getFullYear() - new Date(paciente.fechaNacimiento).getFullYear()
    : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <Link href={`/clientes/${propietarioId}`}>
            <Button variant="outline" size="icon" className="rounded-full mt-1 shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-md shrink-0">
              {getSpeciesIcon(paciente.especie)}
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground">{paciente.nombre}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-2 font-medium">
                <Link href={`/clientes/${propietarioId}`} className="hover:text-primary transition-colors flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                  <User className="h-4 w-4" /> {propietario}
                </Link>
                <span className="text-muted-foreground/40">•</span>
                <span className="flex items-center gap-1.5"><Cat className="h-4 w-4"/> {paciente.especie} {paciente.raza ? `· ${paciente.raza}` : ""}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/pacientes/${id}/editar`}>
            <Button variant="outline" size="lg" className="shadow-sm">
              <Edit className="mr-2 h-4 w-4" /> Editar Expediente
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="lg" className="text-destructive hover:bg-destructive hover:text-destructive-foreground shadow-sm">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar expediente clínico?</AlertDialogTitle>
                <AlertDialogDescription className="text-base">
                  Esta acción no se puede deshacer. Se eliminarán permanentemente el perfil del paciente y todo su historial de consultas, recetas y pruebas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Sí, eliminar todo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Info Column Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-sm border-t-4 border-t-primary">
            <CardHeader className="bg-muted/10 pb-4 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" /> Ficha Técnica
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Estado General</div>
                <Badge variant={paciente.estado === "Activo" ? "default" : paciente.estado === "Fallecido" ? "destructive" : "secondary"} className="text-sm px-3 py-1">
                  {paciente.estado}
                </Badge>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Sexo</div>
                  <div className="font-semibold text-base">{paciente.sexo || "No esp."}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Edad</div>
                  <div className="font-semibold text-base">{age !== null ? `${age} años` : "Desc."}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1"><Weight className="h-3 w-3" /> Peso</div>
                  <div className="font-semibold text-base">{paciente.peso ? `${paciente.peso} kg` : "-"}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Castrado</div>
                  <div className="font-semibold text-base">{paciente.esterilizado ? "Sí" : "No"}</div>
                </div>
              </div>

              {paciente.microchip && (
                <>
                  <Separator />
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Registro / Microchip</div>
                    <div className="font-mono text-sm font-bold bg-muted/40 p-2 rounded-md border text-center">{paciente.microchip}</div>
                  </div>
                </>
              )}
              
              {paciente.alergias && (
                <>
                  <Separator />
                  <div className="bg-destructive/5 border border-destructive/20 p-4 rounded-xl">
                    <div className="text-xs font-bold text-destructive uppercase tracking-wider flex items-center gap-1 mb-2">
                      <AlertTriangle className="h-3.5 w-3.5" /> Alergias
                    </div>
                    <p className="text-sm font-medium text-destructive/90">{paciente.alergias}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Clinical History Main Area */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="consultas" className="w-full">
            <TabsList className="w-full justify-start h-14 bg-transparent border-b-2 rounded-none p-0 mb-8 space-x-8 overflow-x-auto">
              <TabsTrigger 
                value="consultas" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 h-14 text-base font-semibold data-[state=active]:text-primary text-muted-foreground"
              >
                <Stethoscope className="w-5 h-5 mr-2" /> Consultas Médicas
              </TabsTrigger>
              <TabsTrigger 
                value="recetas" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 h-14 text-base font-semibold data-[state=active]:text-primary text-muted-foreground"
              >
                <FileText className="w-5 h-5 mr-2" /> Recetario
              </TabsTrigger>
              <TabsTrigger 
                value="hospitalizaciones" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 h-14 text-base font-semibold data-[state=active]:text-primary text-muted-foreground"
              >
                <BedDouble className="w-5 h-5 mr-2" /> Hospitalización
              </TabsTrigger>
              <TabsTrigger 
                value="procedimientos" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-none px-2 h-14 text-base font-semibold data-[state=active]:text-primary text-muted-foreground"
              >
                <Scissors className="w-5 h-5 mr-2" /> Procedimientos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="consultas" className="space-y-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-foreground">Historial de Consultas</h3>
                  <p className="text-sm text-muted-foreground mt-1">Registro cronológico de visitas clínicas.</p>
                </div>
                <Link href={`/pacientes/${id}/consultas/nuevo`}>
                  <Button size="lg" className="shadow-sm"><Plus className="w-5 h-5 mr-2"/> Nueva Consulta</Button>
                </Link>
              </div>
              
              {consultas.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10">
                  <Stethoscope className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium text-foreground">Aún no hay historial clínico</p>
                  <p className="text-sm mt-1">Apertura la primera consulta médica de este paciente.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {consultas.map(consulta => (
                    <Card key={consulta.id} className="hover:shadow-md transition-shadow group overflow-hidden border-l-4 border-l-transparent hover:border-l-primary">
                      <CardContent className="p-0 flex flex-col sm:flex-row items-stretch">
                        <div className="p-6 bg-muted/20 border-r flex flex-col justify-center min-w-[180px] shrink-0">
                          <div className="flex items-center gap-2 font-bold text-lg text-primary">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(consulta.fecha), "dd/MM/yyyy")}
                          </div>
                          {consulta.medico && <div className="text-sm font-medium text-muted-foreground mt-1">Dr. {consulta.medico}</div>}
                        </div>
                        <div className="p-6 flex-1 flex flex-col justify-center space-y-2">
                          <div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Motivo Principal</div>
                            <p className="text-base font-bold text-foreground">{consulta.motivo}</p>
                          </div>
                          {consulta.diagnostico && (
                            <div className="bg-primary/5 p-3 rounded-lg border border-primary/10 inline-block self-start mt-2">
                              <span className="text-xs font-bold text-primary uppercase tracking-wider mr-2">Diagnóstico:</span>
                              <span className="text-sm font-medium">{consulta.diagnostico}</span>
                            </div>
                          )}
                        </div>
                        <div className="p-6 flex items-center justify-end border-l bg-muted/5 sm:bg-transparent sm:border-l-0">
                          <Link href={`/consultas/${consulta.id}`}>
                            <Button variant="outline" className="font-medium group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                              Ver Expediente
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="recetas" className="space-y-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-foreground">Recetario Médico</h3>
                  <p className="text-sm text-muted-foreground mt-1">Historial de tratamientos prescritos.</p>
                </div>
                <Link href={`/pacientes/${id}/recetas/nuevo`}>
                  <Button size="lg" className="shadow-sm"><Plus className="w-5 h-5 mr-2"/> Emitir Receta</Button>
                </Link>
              </div>
              
              {recetas.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium text-foreground">No hay recetas emitidas</p>
                  <p className="text-sm mt-1">El historial farmacológico está vacío.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {recetas.map(receta => (
                    <Card key={receta.id} className="hover:shadow-md transition-shadow group">
                      <CardHeader className="bg-muted/30 pb-4 border-b">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                              <Calendar className="w-4 h-4 text-muted-foreground" /> {format(new Date(receta.fecha), "dd/MM/yyyy")}
                            </CardTitle>
                          </div>
                          <Badge variant="secondary" className="font-medium px-2 py-1">
                            {receta.partidas.length} Med{receta.partidas.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-5 pb-5">
                        <div className="space-y-3 mb-6 min-h-[80px]">
                          {receta.partidas.slice(0, 3).map((p, i) => (
                            <div key={i} className="text-sm flex items-start gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                              <div className="leading-tight">
                                <span className="font-bold text-foreground">{p.medicamento}</span>
                                <span className="text-muted-foreground block text-xs mt-0.5">{p.dosis}</span>
                              </div>
                            </div>
                          ))}
                          {receta.partidas.length > 3 && (
                            <div className="text-xs font-semibold text-primary uppercase tracking-wider pl-4 pt-2">
                              + {receta.partidas.length - 3} medicamentos más
                            </div>
                          )}
                        </div>
                        <Link href={`/recetas/${receta.id}`}>
                          <Button variant="outline" className="w-full font-medium group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            Abrir y Consultar
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="hospitalizaciones" className="space-y-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-foreground">Registro de Hospitalización</h3>
                  <p className="text-sm text-muted-foreground mt-1">Estancias médicas y cuidados intensivos.</p>
                </div>
                <Link href={`/pacientes/${id}/hospitalizaciones/nuevo`}>
                  <Button size="lg" className="shadow-sm"><Plus className="w-5 h-5 mr-2" /> Ingresar Paciente</Button>
                </Link>
              </div>
              <HospitalizacionesTab pacienteId={id} />
            </TabsContent>

            <TabsContent value="procedimientos" className="space-y-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-foreground">Procedimientos</h3>
                  <p className="text-sm text-muted-foreground mt-1">Cirugías, profilaxis dental, imagenología y más.</p>
                </div>
                <Link href={`/pacientes/${id}/procedimientos/nuevo`}>
                  <Button size="lg" className="shadow-sm"><Plus className="w-5 h-5 mr-2" /> Nuevo Procedimiento</Button>
                </Link>
              </div>
              <ProcedimientosTab pacienteId={id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

// ── Sub-componente procedimientos ─────────────────────────────────────────
const tipoColorProc: Record<string, string> = {
  "Cirugía":           "bg-red-100 text-red-800 border-red-200",
  "Profilaxis Dental": "bg-blue-100 text-blue-800 border-blue-200",
  "Radiografía":       "bg-purple-100 text-purple-800 border-purple-200",
  "Ultrasonido":       "bg-cyan-100 text-cyan-800 border-cyan-200",
  "Electrocardiograma":"bg-orange-100 text-orange-800 border-orange-200",
  "Vacunación":        "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Desparasitación":   "bg-yellow-100 text-yellow-800 border-yellow-200",
};

function ProcedimientosTab({ pacienteId }: { pacienteId: number }) {
  const BASE = (import.meta.env.BASE_URL as string).replace(/\/$/, "");

  const { data: procs = [], isLoading } = useQuery<Array<{
    id: number; fecha: string; tipo: string; descripcion: string | null;
    veterinario: string | null; resultado: string | null;
  }>>({
    queryKey: ["procedimientos", pacienteId],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/pacientes/${pacienteId}/procedimientos`);
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    enabled: !!pacienteId,
  });

  if (isLoading) return <div className="py-12 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  if (procs.length === 0) return (
    <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10">
      <Scissors className="h-12 w-12 mx-auto mb-4 opacity-20" />
      <p className="text-lg font-medium text-foreground">Sin procedimientos registrados</p>
      <p className="text-sm mt-1">Agrega cirugías, profilaxis dental, radiografías y más.</p>
    </div>
  );

  return (
    <div className="grid gap-4">
      {procs.map(p => (
        <Card key={p.id} className="hover:shadow-md transition-shadow group overflow-hidden border-l-4 border-l-transparent hover:border-l-primary">
          <CardContent className="p-0 flex flex-col sm:flex-row items-stretch">
            <div className="p-6 bg-muted/20 border-r flex flex-col justify-center min-w-[160px] shrink-0">
              <div className="flex items-center gap-2 font-bold text-base text-primary mb-1">
                <Calendar className="w-4 h-4" />
                {format(new Date(p.fecha), "dd/MM/yyyy")}
              </div>
              {p.veterinario && <div className="text-sm text-muted-foreground">Dr. {p.veterinario}</div>}
            </div>
            <div className="p-6 flex-1 flex flex-col justify-center space-y-2">
              <Badge className={`self-start text-xs font-bold px-2 py-0.5 border ${tipoColorProc[p.tipo] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                {p.tipo}
              </Badge>
              {p.descripcion && <p className="text-sm text-foreground/80 line-clamp-2">{p.descripcion}</p>}
              {p.resultado && (
                <div className="bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/10 inline-block self-start">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider mr-2">Resultado:</span>
                  <span className="text-sm font-medium">{p.resultado.slice(0, 80)}{p.resultado.length > 80 ? "…" : ""}</span>
                </div>
              )}
            </div>
            <div className="p-6 flex items-center justify-end border-l bg-muted/5 sm:bg-transparent sm:border-l-0">
              <Link href={`/procedimientos/${p.id}`}>
                <Button variant="outline" className="font-medium group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  Ver detalle
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Sub-componente hospitalizaciones ──────────────────────────────────────
const estadoColor: Record<string, string> = {
  "Crítico":         "bg-red-100 text-red-800 border-red-200",
  "Grave":           "bg-orange-100 text-orange-800 border-orange-200",
  "En observación":  "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Estable":         "bg-blue-100 text-blue-800 border-blue-200",
  "En recuperación": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Hospitalizado":   "bg-slate-100 text-slate-700 border-slate-200",
};

function HospitalizacionesTab({ pacienteId }: { pacienteId: number }) {
  const BASE = (import.meta.env.BASE_URL as string).replace(/\/$/, "");

  const { data: hosps = [], isLoading } = useQuery<Array<{
    id: number; estado: string; motivo: string; fechaIngreso: string;
    fechaAlta: string | null; tipoAlta: string | null; jaula: string | null;
    veterinarioResponsable: string | null;
  }>>({
    queryKey: ["hospitalizaciones", pacienteId],
    queryFn: async () => {
      const res = await fetch(`${BASE}/api/pacientes/${pacienteId}/hospitalizaciones`);
      if (!res.ok) throw new Error("Error");
      return res.json();
    },
    enabled: !!pacienteId,
  });

  if (isLoading) return <div className="py-12 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent shadow-sm" /></div>;

  return (
    <>
      {hosps.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10">
          <BedDouble className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium text-foreground">No hay registros de internamiento</p>
          <p className="text-sm mt-1">El paciente no ha sido ingresado a piso previamente.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {hosps.map(h => {
            const activa = !h.fechaAlta;
            const dias = h.fechaAlta
              ? Math.ceil((new Date(h.fechaAlta).getTime() - new Date(h.fechaIngreso).getTime()) / 86400000)
              : Math.ceil((Date.now() - new Date(h.fechaIngreso).getTime()) / 86400000);
            return (
              <Card key={h.id} className={`hover:shadow-md transition-shadow group overflow-hidden ${activa ? "border-l-4 border-l-emerald-500 bg-emerald-50/30" : "border-l-4 border-l-transparent hover:border-l-primary"}`}>
                <CardContent className="p-0 flex flex-col sm:flex-row items-stretch">
                  <div className={`p-6 border-r flex flex-col justify-center min-w-[180px] shrink-0 ${activa ? "bg-emerald-100/50" : "bg-muted/20"}`}>
                    <div className="flex items-center gap-2 font-bold text-lg text-foreground mb-1">
                      <BedDouble className={`w-5 h-5 ${activa ? "text-emerald-600" : "text-muted-foreground"}`} />
                      {format(new Date(h.fechaIngreso), "dd/MM/yyyy")}
                    </div>
                    {h.fechaAlta ? (
                      <div className="text-sm font-medium text-muted-foreground">→ Alta: {format(new Date(h.fechaAlta), "dd/MM/yyyy")}</div>
                    ) : (
                      <div className="inline-block self-start mt-1">
                        <Badge variant="default" className="bg-emerald-600 text-white font-bold animate-pulse px-2 py-0.5 text-xs tracking-wider uppercase">Activo</Badge>
                      </div>
                    )}
                  </div>
                  <div className="p-6 flex-1 flex flex-col justify-center space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 border ${estadoColor[h.estado] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                        {h.estado === "Crítico" && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {h.estado}
                      </Badge>
                      <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 text-muted-foreground">
                        {dias} Día{dias !== 1 ? "s" : ""}
                      </Badge>
                      {!activa && h.tipoAlta && (
                        <Badge variant="outline" className="text-xs font-semibold px-2 py-0.5 border-emerald-200 text-emerald-700 bg-emerald-50">
                          Alta {h.tipoAlta}
                        </Badge>
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Motivo de Ingreso</div>
                      <p className="text-base font-bold text-foreground line-clamp-2">{h.motivo}</p>
                    </div>
                    {h.jaula && (
                      <div className="text-sm font-medium text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-md inline-flex items-center w-fit border border-border/50">
                        {h.jaula}
                      </div>
                    )}
                  </div>
                  <div className="p-6 flex items-center justify-end border-l bg-muted/5 sm:bg-transparent sm:border-l-0">
                    <Link href={`/hospitalizaciones/${h.id}`}>
                      <Button variant={activa ? "default" : "outline"} className={`font-medium ${activa ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "group-hover:bg-primary group-hover:text-primary-foreground transition-colors"}`}>
                        Gestionar
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}