import { useGetDashboard, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Cat, Stethoscope, Clock, CalendarCheck, Activity } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data, isLoading, isError } = useGetDashboard({
    query: { queryKey: getGetDashboardQueryKey() }
  });

  if (isLoading) {
    return (
      <div className="space-y-10">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Inicio</h1>
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
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
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{data.stats.clientes}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Pacientes</CardTitle>
            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Cat className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{data.stats.pacientes}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Consultas hoy</CardTitle>
            <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center">
              <Clock className="h-5 w-5 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{data.stats.consultasHoy}</div>
            <p className="text-xs text-muted-foreground mt-1">{data.stats.consultas} en total</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Próximas citas</CardTitle>
            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
              <CalendarCheck className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{data.stats.proximasCitas}</div>
            <p className="text-xs text-muted-foreground mt-1">programadas</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-t-4 border-t-primary shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 pb-6">
          <CardTitle className="text-xl">Consultas recientes</CardTitle>
        </CardHeader>
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
                {data.recientes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-16 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <Stethoscope className="h-10 w-10 opacity-20" />
                        <p>No hay consultas recientes.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.recientes.map((consulta) => (
                    <tr key={consulta.id} className="border-b transition-colors hover:bg-muted/40">
                      <td className="p-6 align-middle font-medium">
                        {format(new Date(consulta.fecha), "dd/MM/yyyy")}
                      </td>
                      <td className="p-6 align-middle font-semibold text-primary">
                        <Link href={`/pacientes/${consulta.pacienteId}`} className="hover:underline flex items-center gap-2">
                          <Cat className="h-4 w-4 opacity-50" />
                          {consulta.paciente}
                        </Link>
                      </td>
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
