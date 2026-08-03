import { useParams, Link, useLocation } from "wouter";
import { useGetCliente, getGetClienteQueryKey, useDeleteCliente } from "@workspace/api-client-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Plus, Edit, Trash2, MapPin, Phone, Mail, FileText, User, Cat, CreditCard, Calendar
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

export default function ClienteDetalle() {
  const params = useParams();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useGetCliente(id, {
    query: {
      enabled: !!id,
      queryKey: getGetClienteQueryKey(id),
    },
  });

  const deleteCliente = useDeleteCliente();

  if (isLoading) {
    return <div className="space-y-8">
      <Skeleton className="h-12 w-64" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Skeleton className="h-96 lg:col-span-2 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>;
  }

  if (isError || !data) {
    return <div className="text-destructive font-medium text-lg">Error al cargar el cliente.</div>;
  }

  const { cliente, saldo, pacientes, movimientos } = data;

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);
  };

  const handleDelete = () => {
    deleteCliente.mutate(
      { clienteId: id },
      {
        onSuccess: () => {
          toast({ title: "Cliente eliminado", description: "El cliente ha sido eliminado exitosamente." });
          setLocation("/clientes");
        },
        onError: () => {
          toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el cliente." });
        }
      }
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <Link href="/clientes">
            <Button variant="outline" size="icon" className="rounded-full mt-1 shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
              {cliente.nombre} {cliente.apellidos}
            </h1>
            <div className="flex items-center gap-2 text-muted-foreground mt-2 text-sm font-medium">
              <Calendar className="h-4 w-4" />
              Registrado el {format(new Date(cliente.creadoEn), "dd/MM/yyyy")}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/clientes/${id}/editar`}>
            <Button variant="outline" size="lg" className="shadow-sm">
              <Edit className="mr-2 h-4 w-4" /> Editar Perfil
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
                <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
                <AlertDialogDescription className="text-base">
                  Esta acción no se puede deshacer. Se eliminarán permanentemente el cliente, sus pacientes, consultas, recetas e historial de pagos.
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Info Column */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="shadow-sm border-t-4 border-t-primary">
            <CardHeader className="bg-muted/20 pb-4 border-b">
              <CardTitle className="text-xl flex items-center gap-2">
                <User className="h-5 w-5 text-primary" /> Información de Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Phone className="h-3 w-3" /> Teléfono Principal
                  </div>
                  <div className="text-lg font-medium">{cliente.telefono}</div>
                </div>
                {cliente.telefonoAlterno && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-2">
                      <Phone className="h-3 w-3" /> Teléfono Alterno
                    </div>
                    <div className="text-lg font-medium">{cliente.telefonoAlterno}</div>
                  </div>
                )}
                {cliente.email && (
                  <div className="sm:col-span-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-2">
                      <Mail className="h-3 w-3" /> Correo Electrónico
                    </div>
                    <div className="text-lg font-medium">{cliente.email}</div>
                  </div>
                )}
                {cliente.rfc && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-2">
                      <FileText className="h-3 w-3" /> RFC
                    </div>
                    <div className="text-lg font-medium">{cliente.rfc}</div>
                  </div>
                )}
                {cliente.direccion && (
                  <div className="sm:col-span-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-2">
                      <MapPin className="h-3 w-3" /> Dirección
                    </div>
                    <div className="text-lg font-medium leading-relaxed">{cliente.direccion}</div>
                  </div>
                )}
              </div>
              {cliente.notas && (
                <>
                  <Separator />
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notas Administrativas</div>
                    <p className="text-base text-foreground/80 whitespace-pre-wrap bg-muted/30 p-4 rounded-lg border border-border/50">{cliente.notas}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between bg-muted/20 pb-4 border-b">
              <CardTitle className="text-xl flex items-center gap-2">
                <Cat className="h-5 w-5 text-primary" /> Mascotas Registradas
              </CardTitle>
              <Link href={`/pacientes/nuevo?clienteId=${id}`}>
                <Button size="sm" className="shadow-sm">
                  <Plus className="mr-2 h-4 w-4" /> Registrar Mascota
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-6">
              {pacientes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10">
                  <Cat className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">No hay pacientes registrados</p>
                  <p className="text-sm">Agrega la primera mascota de este cliente.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {pacientes.map((paciente) => (
                    <Link key={paciente.id} href={`/pacientes/${paciente.id}`}>
                      <div className="flex items-center gap-4 p-5 rounded-xl border bg-card hover:bg-muted/40 hover:border-primary/40 transition-all cursor-pointer shadow-sm group">
                        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                          <Cat className="h-7 w-7" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-lg font-bold truncate text-foreground">{paciente.nombre}</div>
                          <div className="text-sm text-muted-foreground truncate font-medium mt-0.5">{paciente.especie} {paciente.raza ? `· ${paciente.raza}` : ""}</div>
                        </div>
                        <Badge variant={paciente.estado === "Activo" ? "default" : "secondary"} className="shrink-0">
                          {paciente.estado}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Saldo & Movimientos Column */}
        <div className="space-y-8">
          <Card className={`shadow-sm overflow-hidden ${saldo > 0 ? "border-t-4 border-t-destructive" : "border-t-4 border-t-primary"}`}>
            <CardContent className="p-8 text-center bg-muted/10">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Balance de Cuenta</div>
              <div className={`text-5xl font-black mb-4 tracking-tight ${saldo > 0 ? "text-destructive" : "text-foreground"}`}>
                {formatMoney(saldo)}
              </div>
              {saldo > 0 && (
                <Badge variant="destructive" className="mb-6 px-3 py-1 text-xs uppercase tracking-wider font-bold">Adeudo Pendiente</Badge>
              )}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Link href={`/clientes/${id}/movimientos/nuevo?tipo=Cargo`} className="w-full">
                  <Button variant="outline" className="w-full h-12 shadow-sm border-destructive/20 hover:bg-destructive/5 text-destructive" size="lg">
                    <CreditCard className="mr-2 h-5 w-5" /> Cargo
                  </Button>
                </Link>
                <Link href={`/clientes/${id}/movimientos/nuevo?tipo=Pago`} className="w-full">
                  <Button variant="default" className="w-full h-12 shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white" size="lg">
                    <Plus className="mr-2 h-5 w-5" /> Abono
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="bg-muted/20 pb-4 border-b">
              <CardTitle className="text-xl">Historial Financiero</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative w-full overflow-auto max-h-[500px]">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b sticky top-0 bg-white shadow-sm z-10">
                    <tr className="border-b transition-colors">
                      <th className="h-12 px-5 text-left align-middle text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fecha</th>
                      <th className="h-12 px-5 text-left align-middle text-xs font-semibold text-muted-foreground uppercase tracking-wider">Concepto</th>
                      <th className="h-12 px-5 text-right align-middle text-xs font-semibold text-muted-foreground uppercase tracking-wider">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {movimientos.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-12 text-center text-muted-foreground">
                          <p className="font-medium">No hay movimientos registrados.</p>
                        </td>
                      </tr>
                    ) : (
                      movimientos.map((mov) => (
                        <tr key={mov.id} className="border-b transition-colors hover:bg-muted/30">
                          <td className="p-5 align-middle whitespace-nowrap text-muted-foreground font-medium">
                            {format(new Date(mov.fecha), "dd/MM/yy")}
                          </td>
                          <td className="p-5 align-middle">
                            <div className="font-semibold text-foreground">{mov.concepto}</div>
                            {mov.metodoPago && (
                              <div className="text-xs text-muted-foreground mt-1 font-medium">{mov.metodoPago}</div>
                            )}
                          </td>
                          <td className="p-5 align-middle text-right">
                            <Badge 
                              variant={mov.tipo === "Cargo" ? "destructive" : mov.tipo === "Pago" ? "default" : "secondary"}
                              className={`font-mono text-sm px-2 py-1 ${mov.tipo === "Pago" ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : ""}`}
                            >
                              {mov.tipo === "Cargo" ? "+" : "-"}{formatMoney(mov.importe)}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}