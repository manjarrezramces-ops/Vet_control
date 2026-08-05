import {
  useGetDashboard,
  getGetDashboardQueryKey,
} from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  Cat,
  Stethoscope,
  Clock,
  CalendarCheck,
  Activity,
  BedDouble,
  AlertTriangle,
  Syringe,
  Bug,
  ShieldCheck,
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

type EstadoPreventivo = "Atrasada" | "Hoy" | "Próxima";

type VisitaPreventiva = {
  id: number;
  pacienteId: number;
  paciente: string;
  propietario: string;
  tipo: "Vacunación" | "Desparasitación";
  concepto: string;
  fecha: string;
  estado: EstadoPreventivo;
  diasDiferencia: number;
  detalle: string | null;
};

type DashboardExtendido = {
  stats: {
    clientes: number;
    pacientes: number;
    consultas: number;
    consultasHoy: number;
    proximasCitas: number;
    hospitalizados: number;
    medicinaPreventiva: number;
  };
  recientes: Array<{
    id: number;
    fecha: string;
    pacienteId: number;
    paciente: string;
    propietario: string;
    motivo: string;
  }>;
  proximasCitasLista: Array<{
    id: number;
    pacienteId: number;
    paciente: string;
    propietario: string;
    proximaCita: string;
    motivo: string | null;
  }>;
  hospitalizadosLista: Array<{
    id: number;
    pacienteId: number;
    paciente: string;
    propietario: string;
    estado: string;
    fechaIngreso: string;
    motivo: string;
  }>;
  visitasPreventivas: VisitaPreventiva[];
};

function colorEstadoPreventivo(estado: EstadoPreventivo): string {
  switch (estado) {
    case "Atrasada":
      return "bg-red-100 text-red-800 border-red-200";
    case "Hoy":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "Próxima":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
  }
}

function descripcionPreventiva(visita: VisitaPreventiva): string {
  if (visita.estado === "Hoy") return "Corresponde hoy";
  if (visita.estado === "Atrasada") {
    const retraso = Math.abs(visita.diasDiferencia);
    return `Atrasada ${retraso} día${retraso !== 1 ? "s" : ""}`;
  }
  return `Faltan ${visita.diasDiferencia} día${visita.diasDiferencia !== 1 ? "s" : ""}`;
}

export default function Dashboard() {
  const { data, isLoading, isError } = useGetDashboard({
    query: { queryKey: getGetDashboardQueryKey() },
  });
  const [showCitas, setShowCitas] = useState(false);
  const [showHospitalizados, setShowHospitalizados] = useState(false);
  const [showPreventivas, setShowPreventivas] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-10">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Inicio</h1>
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <Activity className="h-12 w-12 text-destructive opacity-50" />
        <div className="text-xl font-medium text-destructive">Error al cargar el dashboard</div>
        <p className="text-muted-foreground">Por favor, intenta recargar la página.</p>
      </div>
    );
  }

  const dashboard = data as unknown as DashboardExtendido;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Inicio</h1>
        <p className="text-lg text-muted-foreground mt-2">Resumen general de la clínica.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Clientes</CardTitle>
            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent><div className="text-3xl font-bold text-foreground">{dashboard.stats.clientes}</div></CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Pacientes</CardTitle>
            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Cat className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent><div className="text-3xl font-bold text-foreground">{dashboard.stats.pacientes}</div></CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Consultas hoy</CardTitle>
            <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <Clock className="h-5 w-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{dashboard.stats.consultasHoy}</div>
            <p className="text-xs text-muted-foreground mt-1">{dashboard.stats.consultas} en total</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300 hover:ring-1 hover:ring-blue-200 select-none" onClick={() => setShowCitas(true)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Próximas citas</CardTitle>
            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
              <CalendarCheck className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{dashboard.stats.proximasCitas}</div>
            <p className="text-xs text-blue-500 mt-1 font-medium">Ver detalle →</p>
          </CardContent>
        </Card>
      </div>

      <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-teal-300 hover:ring-1 hover:ring-teal-200 select-none border-l-4 border-l-teal-500" onClick={() => setShowPreventivas(true)}>
        <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-teal-100 rounded-full flex items-center justify-center shrink-0">
              <ShieldCheck className="h-6 w-6 text-teal-700" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Visitas de medicina preventiva</p>
              <p className="text-3xl font-bold text-foreground">{dashboard.stats.medicinaPreventiva}</p>
              <p className="text-xs text-muted-foreground mt-1">Vacunas y desparasitaciones atrasadas, de hoy o próximas.</p>
            </div>
          </div>
          <p className="text-xs text-teal-700 font-medium">Ver avisos →</p>
        </CardContent>
      </Card>

      {dashboard.stats.hospitalizados > 0 && (
        <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-orange-300 hover:ring-1 hover:ring-orange-200 select-none border-l-4 border-l-orange-400" onClick={() => setShowHospitalizados(true)}>
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                <BedDouble className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Pacientes hospitalizados</p>
                <p className="text-3xl font-bold text-foreground">{dashboard.stats.hospitalizados}</p>
              </div>
            </div>
            <p className="text-xs text-orange-500 font-medium">Ver quiénes son →</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={showPreventivas} onOpenChange={setShowPreventivas}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ShieldCheck className="h-5 w-5 text-teal-700" />
              Visitas de medicina preventiva
            </DialogTitle>
          </DialogHeader>
          {dashboard.visitasPreventivas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No hay vacunas ni desparasitaciones próximas, de hoy o atrasadas.</p>
            </div>
          ) : (
            <div className="divide-y">
              {dashboard.visitasPreventivas.map((visita) => (
                <Link key={`${visita.tipo}-${visita.id}`} href={`/pacientes/${visita.pacienteId}`} onClick={() => setShowPreventivas(false)}>
                  <div className="py-4 flex items-start gap-4 hover:bg-muted/30 -mx-6 px-6 transition-colors cursor-pointer">
                    <div className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0 ${visita.tipo === "Vacunación" ? "bg-blue-100" : "bg-teal-100"}`}>
                      {visita.tipo === "Vacunación" ? <Syringe className="h-5 w-5 text-blue-700" /> : <Bug className="h-5 w-5 text-teal-700" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{visita.paciente}</p>
                        <Badge variant="outline" className={visita.tipo === "Vacunación" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-teal-50 text-teal-700 border-teal-200"}>{visita.tipo}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{visita.propietario}</p>
                      <p className="text-sm font-medium mt-1">{visita.concepto}</p>
                      {visita.detalle && <p className="text-xs text-muted-foreground mt-1">{visita.detalle}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Badge className={`border ${colorEstadoPreventivo(visita.estado)}`}>{visita.estado}</Badge>
                      <span className="text-xs font-medium">{format(new Date(`${visita.fecha.slice(0, 10)}T12:00:00`), "dd/MM/yyyy")}</span>
                      <span className="text-xs text-muted-foreground">{descripcionPreventiva(visita)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showHospitalizados} onOpenChange={setShowHospitalizados}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <BedDouble className="h-5 w-5 text-orange-600" /> Pacientes hospitalizados actualmente
            </DialogTitle>
          </DialogHeader>
          <div className="divide-y">
            {dashboard.hospitalizadosLista.map((h) => {
              const estadoColor: Record<string, string> = {
                "Crítico": "bg-red-100 text-red-800 border-red-200",
                "Grave": "bg-orange-100 text-orange-800 border-orange-200",
                "Estable": "bg-blue-100 text-blue-800 border-blue-200",
                "En recuperación": "bg-emerald-100 text-emerald-800 border-emerald-200",
              };
              const dias = Math.ceil((Date.now() - new Date(h.fechaIngreso + "T12:00:00").getTime()) / 86400000);
              return (
                <Link key={h.id} href={`/hospitalizaciones/${h.id}`} onClick={() => setShowHospitalizados(false)}>
                  <div className="py-4 flex items-center gap-4 hover:bg-muted/30 -mx-6 px-6 transition-colors cursor-pointer">
                    <div className="h-11 w-11 bg-orange-100 rounded-full flex items-center justify-center shrink-0"><BedDouble className="h-5 w-5 text-orange-600" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{h.paciente}</p>
                      <p className="text-sm text-muted-foreground">{h.propietario}</p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">{h.motivo}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${estadoColor[h.estado] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                        {h.estado === "Crítico" && <AlertTriangle className="inline h-3 w-3 mr-1" />}{h.estado}
                      </span>
                      <span className="text-xs text-muted-foreground">{dias} día{dias !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCitas} onOpenChange={setShowCitas}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl"><CalendarCheck className="h-5 w-5 text-blue-600" /> Próximas citas programadas</DialogTitle>
          </DialogHeader>
          {dashboard.proximasCitasLista.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarCheck className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No hay citas próximas registradas.</p>
            </div>
          ) : (
            <div className="divide-y">
              {dashboard.proximasCitasLista.map((cita) => (
                <Link key={cita.id} href={`/pacientes/${cita.pacienteId}`} onClick={() => setShowCitas(false)}>
                  <div className="py-4 flex items-center gap-4 hover:bg-muted/30 -mx-6 px-6 transition-colors cursor-pointer">
                    <div className="h-11 w-11 bg-blue-100 rounded-full flex items-center justify-center shrink-0"><Cat className="h-5 w-5 text-blue-600" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">{cita.paciente}</p>
                      <p className="text-sm text-muted-foreground">{cita.propietario}</p>
                      {cita.motivo && <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">{cita.motivo}</p>}
                    </div>
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200 border font-semibold text-xs shrink-0">{format(new Date(cita.proximaCita + "T12:00:00"), "dd/MM/yyyy")}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card className="border-t-4 border-t-primary shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 pb-6"><CardTitle className="text-xl">Consultas recientes</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b bg-muted/50">
                <tr className="border-b transition-colors">
                  <th className="h-14 px-6 text-left align-middle text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fecha</th>
                  <th className="h-14 px-6 text-left align-middle text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paciente</th>
                  <th className="h-14 px-6 text-left align-middle text-xs font-semibold text-muted-foreground uppercase tracking-wider">Propietario</th>
                  <th className="h-14 px-6 text-left align-middle text-xs font-semibold text-muted-foreground uppercase tracking-wider">Motivo</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {dashboard.recientes.length === 0 ? (
                  <tr><td colSpan={4} className="py-16 text-center text-muted-foreground"><div className="flex flex-col items-center justify-center space-y-3"><Stethoscope className="h-10 w-10 opacity-20" /><p>No hay consultas recientes.</p></div></td></tr>
                ) : (
                  dashboard.recientes.map((consulta) => (
                    <tr key={consulta.id} className="border-b transition-colors hover:bg-muted/40">
                      <td className="p-6 align-middle font-medium">{format(new Date(consulta.fecha), "dd/MM/yyyy")}</td>
                      <td className="p-6 align-middle font-semibold text-primary"><Link href={`/pacientes/${consulta.pacienteId}`} className="hover:underline flex items-center gap-2"><Cat className="h-4 w-4 opacity-50" />{consulta.paciente}</Link></td>
                      <td className="p-6 align-middle text-foreground/80">{consulta.propietario}</td>
                      <td className="p-6 align-middle text-muted-foreground max-w-xs truncate">{consulta.motivo}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
