import { useParams, Link, useLocation } from "wouter";
import { useGetCliente, getGetClienteQueryKey, useDeleteCliente } from "@workspace/api-client-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Plus, Edit, Trash2, MapPin, Phone, Mail, FileText, User, Cat, Calendar,
  Upload, X, ImageIcon, Loader2
} from "lucide-react";

const BASE = () => (import.meta.env.BASE_URL as string).replace(/\/$/, "");
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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingAdeudo, setEditingAdeudo] = useState(false);
  const [adeudoInput, setAdeudoInput] = useState("");

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

  const { cliente, saldo, pacientes } = data;

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const urlRes = await fetch(`${BASE()}/api/storage/uploads/request-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      const { uploadURL, objectPath } = await urlRes.json();
      await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      await fetch(`${BASE()}/api/clientes/${id}/hoja-conceptos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hojaConceptos: objectPath }),
      });
      queryClient.invalidateQueries({ queryKey: getGetClienteQueryKey(id) });
      toast({ title: "Hoja de conceptos actualizada" });
    } catch {
      toast({ variant: "destructive", title: "Error al subir el archivo" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveAdeudo = async (liquidado: boolean) => {
    const monto = parseFloat(adeudoInput.replace(/,/g, ""));
    try {
      await fetch(`${BASE()}/api/clientes/${id}/adeudo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adeudoMonto: isNaN(monto) ? null : monto, adeudoLiquidado: liquidado }),
      });
      queryClient.invalidateQueries({ queryKey: getGetClienteQueryKey(id) });
      setEditingAdeudo(false);
      toast({ title: "Adeudo actualizado" });
    } catch {
      toast({ variant: "destructive", title: "Error al guardar el adeudo" });
    }
  };

  const handleToggleLiquidado = async () => {
    const current = cliente.adeudoLiquidado ?? false;
    try {
      await fetch(`${BASE()}/api/clientes/${id}/adeudo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adeudoMonto: cliente.adeudoMonto ?? null, adeudoLiquidado: !current }),
      });
      queryClient.invalidateQueries({ queryKey: getGetClienteQueryKey(id) });
      toast({ title: !current ? "Marcada como liquidada" : "Marcada como pendiente" });
    } catch {
      toast({ variant: "destructive", title: "Error al actualizar" });
    }
  };

  const handleRemoveHoja = async () => {
    try {
      await fetch(`${BASE()}/api/clientes/${id}/hoja-conceptos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hojaConceptos: null }),
      });
      queryClient.invalidateQueries({ queryKey: getGetClienteQueryKey(id) });
      toast({ title: "Archivo eliminado" });
    } catch {
      toast({ variant: "destructive", title: "Error al eliminar" });
    }
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

        {/* Adeudo + Hoja de conceptos */}
        <div className="space-y-6">

          {/* Adeudo */}
          {(() => {
            const monto = cliente.adeudoMonto ?? null;
            const liquidado = cliente.adeudoLiquidado ?? false;
            const tieneAdeudo = monto !== null;
            return (
              <Card className={`shadow-sm border-t-4 ${liquidado ? "border-t-emerald-500" : tieneAdeudo ? "border-t-destructive" : "border-t-primary"}`}>
                <CardHeader className="pb-3 border-b bg-muted/10 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-bold">Adeudo</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-xs"
                    onClick={() => {
                      setAdeudoInput(monto != null ? String(monto) : "");
                      setEditingAdeudo(true);
                    }}
                  >
                    <Edit className="h-3 w-3 mr-1" /> Editar
                  </Button>
                </CardHeader>
                <CardContent className="p-6 text-center space-y-4">
                  {editingAdeudo ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Monto del adeudo</label>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-muted-foreground">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={adeudoInput}
                            onChange={(e) => setAdeudoInput(e.target.value)}
                            className="flex-1 h-12 text-xl font-bold font-mono border border-border rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary/40 text-center"
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 bg-destructive hover:bg-destructive/90" onClick={() => handleSaveAdeudo(false)}>
                          Guardar — Pendiente
                        </Button>
                        <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleSaveAdeudo(true)}>
                          Guardar — Liquidada
                        </Button>
                      </div>
                      <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setEditingAdeudo(false)}>
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="text-xs text-muted-foreground font-medium">
                        {format(new Date(), "dd 'de' MMMM 'de' yyyy")}
                      </div>
                      {tieneAdeudo ? (
                        <div className={`text-5xl font-black tracking-tight ${liquidado ? "text-emerald-600" : "text-destructive"}`}>
                          {formatMoney(Number(monto))}
                        </div>
                      ) : (
                        <div className="text-2xl font-semibold text-muted-foreground/50 py-2">—</div>
                      )}
                      <button
                        onClick={tieneAdeudo ? handleToggleLiquidado : undefined}
                        disabled={!tieneAdeudo}
                        className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
                          liquidado
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 cursor-pointer"
                            : tieneAdeudo
                            ? "bg-red-100 text-red-800 hover:bg-red-200 cursor-pointer"
                            : "bg-muted text-muted-foreground cursor-default"
                        }`}
                      >
                        {liquidado ? "✓ Liquidada" : tieneAdeudo ? "Pendiente de pago" : "Sin adeudo registrado"}
                      </button>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {/* Hoja de conceptos */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4 border-b bg-muted/20">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Hoja de conceptos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                onChange={handleFileChange}
              />
              {cliente.hojaConceptos ? (
                <div className="space-y-4">
                  <div className="rounded-xl overflow-hidden border border-border shadow-sm">
                    <img
                      src={`${BASE()}/api/storage/files/${encodeURIComponent(cliente.hojaConceptos)}`}
                      alt="Hoja de conceptos"
                      className="w-full object-contain max-h-[500px]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                      Reemplazar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={handleRemoveHoja}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center gap-3 hover:border-primary/50 hover:bg-muted/20 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
                  ) : (
                    <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                  )}
                  <span className="text-sm font-medium text-muted-foreground">
                    {uploading ? "Subiendo..." : "Adjuntar PNG / JPG"}
                  </span>
                </button>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}