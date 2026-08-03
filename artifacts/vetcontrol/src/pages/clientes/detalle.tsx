import { useParams, Link, useLocation } from "wouter";
import { useGetCliente, getGetClienteQueryKey, useDeleteCliente } from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Plus, Edit, Trash2, MapPin, Phone, Mail, FileText, User, Cat, Calendar,
  Upload, X, ImageIcon, Loader2, CheckCircle2, Clock, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const BASE = () => (import.meta.env.BASE_URL as string).replace(/\/$/, "");

type Cuenta = {
  id: number;
  clienteId: number;
  fecha: string;
  monto: number;
  liquidado: boolean;
  liquidadoEn: string | null;
  montoPagado: number | null;
  tipoPago: "total" | "parcial" | null;
  hojaConceptos: string | null;
  notas: string | null;
  creadoEn: string;
};

/* ── small sub-component for one cuenta row ── */
function CuentaRow({ cuenta, clienteId }: { cuenta: Cuenta; clienteId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPago, setShowPago] = useState(false);
  const [pagoMonto, setPagoMonto] = useState("");
  const [savingPago, setSavingPago] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const QK = ["cuentas", clienteId];

  const registrarPago = async (tipoPago: "total" | "parcial") => {
    const montoPagado = tipoPago === "total" ? cuenta.monto : parseFloat(pagoMonto.replace(/,/g, ""));
    if (isNaN(montoPagado) || montoPagado <= 0) {
      toast({ variant: "destructive", title: "Ingresa un monto válido" });
      return;
    }
    setSavingPago(true);
    try {
      const res = await fetch(`${BASE()}/api/cuentas/${cuenta.id}/liquidar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ montoPagado, tipoPago }),
      });
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: QK });
      setShowPago(false);
      setPagoMonto("");
      toast({ title: tipoPago === "total" ? "✓ Cuenta liquidada en su totalidad" : "Pago parcial registrado" });
    } catch { toast({ variant: "destructive", title: "Error al registrar el pago" }); }
    finally { setSavingPago(false); }
  };

  const deshacerPago = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE()}/api/cuentas/${cuenta.id}/liquidar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ montoPagado: 0, tipoPago: null }),
      });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: QK }); toast({ title: "Pago deshecho" }); },
    onError: () => toast({ variant: "destructive", title: "Error al deshacer" }),
  });

  const deleteCuenta = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${BASE()}/api/cuentas/${cuenta.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: QK }); toast({ title: "Cuenta eliminada" }); },
    onError: () => toast({ variant: "destructive", title: "Error al eliminar" }),
  });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const urlRes = await fetch(`${BASE()}/api/storage/uploads/request-url`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      const { uploadURL, objectPath } = await urlRes.json();
      await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      await fetch(`${BASE()}/api/cuentas/${cuenta.id}/hoja`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hojaConceptos: objectPath }),
      });
      queryClient.invalidateQueries({ queryKey: QK });
      toast({ title: "Hoja adjuntada" });
    } catch { toast({ variant: "destructive", title: "Error al subir" }); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const removeHoja = async () => {
    await fetch(`${BASE()}/api/cuentas/${cuenta.id}/hoja`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hojaConceptos: null }),
    });
    queryClient.invalidateQueries({ queryKey: QK });
  };

  const fmt = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

  const saldoRestante = Math.max(0, cuenta.monto - (cuenta.montoPagado ?? 0));
  const tienePago = cuenta.montoPagado != null && cuenta.montoPagado > 0;
  const esParcial = tienePago && !cuenta.liquidado;
  const borderColor = cuenta.liquidado ? "border-emerald-200 bg-emerald-50/40" : esParcial ? "border-amber-200 bg-amber-50/30" : "border-border bg-card";

  return (
    <div className={`rounded-xl border ${borderColor} overflow-hidden`}>
      {/* Header row */}
      <div className="flex items-center gap-3 p-4">
        <div className="shrink-0">
          {cuenta.liquidado
            ? <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            : esParcial
            ? <Clock className="h-6 w-6 text-amber-500" />
            : <Clock className="h-6 w-6 text-destructive" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={`text-xl font-black tracking-tight ${cuenta.liquidado ? "text-emerald-700" : esParcial ? "text-amber-700" : "text-destructive"}`}>
              {fmt(cuenta.monto)}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              {format(new Date(cuenta.fecha + "T12:00:00"), "dd/MM/yyyy")}
            </span>
          </div>
          {cuenta.liquidado && cuenta.liquidadoEn && (
            <p className="text-xs text-emerald-600 font-medium mt-0.5">
              ✓ Liquidada el {format(new Date(cuenta.liquidadoEn), "dd/MM/yyyy 'a las' HH:mm")}
            </p>
          )}
          {esParcial && (
            <p className="text-xs text-amber-700 font-medium mt-0.5">
              Pagó {fmt(cuenta.montoPagado!)} · Resta {fmt(saldoRestante)}
            </p>
          )}
          {!tienePago && !cuenta.liquidado && (
            <p className="text-xs text-destructive font-medium mt-0.5">Pendiente de pago</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-4 bg-muted/10">
          {/* Hoja de conceptos */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Hoja de conceptos</p>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={handleFile} />
            {cuenta.hojaConceptos ? (
              <div className="space-y-2">
                <div className="rounded-lg overflow-hidden border">
                  <img src={`${BASE()}/api/storage${cuenta.hojaConceptos}`} alt="Hoja" className="w-full object-contain max-h-64" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />} Reemplazar
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={removeHoja}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center gap-2 hover:border-primary/40 hover:bg-muted/20 transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-7 w-7 text-muted-foreground animate-spin" /> : <ImageIcon className="h-7 w-7 text-muted-foreground/40" />}
                <span className="text-xs text-muted-foreground">{uploading ? "Subiendo..." : "Adjuntar PNG / JPG"}</span>
              </button>
            )}
          </div>

          {/* Notas */}
          {cuenta.notas && (
            <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">{cuenta.notas}</p>
          )}

          {/* Payment actions */}
          <div className="space-y-2 pt-1">
            {/* Show payment form */}
            {showPago && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
                <p className="text-xs font-bold text-primary uppercase tracking-wider">¿Cuánto pagó?</p>
                {/* Pago total */}
                <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => registrarPago("total")} disabled={savingPago}>
                  {savingPago ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                  Pago total — {fmt(cuenta.monto)}
                </Button>
                {/* Pago parcial */}
                <div className="flex gap-2">
                  <input
                    type="number" step="0.01" min="0" placeholder="Monto parcial..."
                    value={pagoMonto} onChange={e => setPagoMonto(e.target.value)}
                    className="flex-1 h-9 text-sm font-mono border border-border rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <Button size="sm" variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-50 shrink-0" onClick={() => registrarPago("parcial")} disabled={savingPago}>
                    Pago parcial
                  </Button>
                </div>
                <Button size="sm" variant="ghost" className="w-full text-muted-foreground text-xs" onClick={() => { setShowPago(false); setPagoMonto(""); }}>
                  Cancelar
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              {!showPago && (
                tienePago ? (
                  <Button size="sm" variant="outline" className="flex-1 text-muted-foreground text-xs" onClick={() => deshacerPago.mutate()} disabled={deshacerPago.isPending}>
                    {deshacerPago.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                    Deshacer pago
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="flex-1 border-emerald-400 text-emerald-700 hover:bg-emerald-50 font-semibold" onClick={() => setShowPago(true)}>
                    Registrar pago
                  </Button>
                )
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar esta cuenta?</AlertDialogTitle>
                    <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteCuenta.mutate()} className="bg-destructive text-white hover:bg-destructive/90">
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── main page ── */
export default function ClienteDetalle() {
  const params = useParams();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useGetCliente(id, {
    query: { enabled: !!id, queryKey: getGetClienteQueryKey(id) },
  });

  const { data: cuentas = [] } = useQuery<Cuenta[]>({
    queryKey: ["cuentas", id],
    queryFn: async () => {
      const res = await fetch(`${BASE()}/api/clientes/${id}/cuentas`);
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: !!id,
  });

  const deleteCliente = useDeleteCliente();

  // nueva cuenta
  const [showNueva, setShowNueva] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState(format(new Date(), "yyyy-MM-dd"));
  const [nuevaMonto, setNuevaMonto] = useState("");
  const [nuevaNotas, setNuevaNotas] = useState("");
  const [savingNueva, setSavingNueva] = useState(false);

  const handleCrearCuenta = async () => {
    const monto = parseFloat(nuevaMonto.replace(/,/g, ""));
    if (!nuevaFecha || isNaN(monto) || monto <= 0) {
      toast({ variant: "destructive", title: "Fecha y monto son requeridos" });
      return;
    }
    setSavingNueva(true);
    try {
      const res = await fetch(`${BASE()}/api/clientes/${id}/cuentas`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: nuevaFecha, monto, notas: nuevaNotas || undefined }),
      });
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: ["cuentas", id] });
      setShowNueva(false);
      setNuevaMonto(""); setNuevaNotas("");
      toast({ title: "Cuenta registrada" });
    } catch { toast({ variant: "destructive", title: "Error al registrar" }); }
    finally { setSavingNueva(false); }
  };

  const handleDelete = () => {
    deleteCliente.mutate(
      { clienteId: id },
      {
        onSuccess: () => { toast({ title: "Cliente eliminado" }); setLocation("/clientes"); },
        onError: () => toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el cliente." }),
      }
    );
  };

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

  const { cliente, pacientes } = data;
  const formatMoney = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

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
            <h1 className="text-4xl font-bold tracking-tight text-foreground">{cliente.nombre} {cliente.apellidos}</h1>
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

        {/* Cuentas / Historial de pagos */}
        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-4 border-b bg-muted/20 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Cuentas
                {cuentas.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">{cuentas.length}</Badge>
                )}
              </CardTitle>
              <Button size="sm" onClick={() => setShowNueva(v => !v)}>
                <Plus className="h-3 w-3 mr-1" /> Nueva
              </Button>
            </CardHeader>

            {showNueva && (
              <div className="border-b px-4 py-4 bg-primary/5 space-y-3">
                <p className="text-xs font-bold text-primary uppercase tracking-wider">Registrar nueva cuenta</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Fecha</label>
                    <input type="date" value={nuevaFecha} onChange={e => setNuevaFecha(e.target.value)}
                      className="w-full h-10 text-sm border border-border rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Monto ($)</label>
                    <input type="number" step="0.01" min="0" placeholder="0.00" value={nuevaMonto} onChange={e => setNuevaMonto(e.target.value)}
                      className="w-full h-10 text-sm font-mono border border-border rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Notas <span className="font-normal">(opcional)</span></label>
                  <input type="text" placeholder="Descripción breve..." value={nuevaNotas} onChange={e => setNuevaNotas(e.target.value)}
                    className="w-full h-10 text-sm border border-border rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={handleCrearCuenta} disabled={savingNueva}>
                    {savingNueva && <Loader2 className="h-3 w-3 animate-spin mr-1" />} Registrar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowNueva(false)}>Cancelar</Button>
                </div>
              </div>
            )}

            <CardContent className="p-4 space-y-3">
              {cuentas.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm font-medium">Sin cuentas registradas</p>
                  <p className="text-xs mt-1">Presiona "+ Nueva" para agregar la primera.</p>
                </div>
              ) : (
                cuentas.map(c => <CuentaRow key={c.id} cuenta={c} clienteId={id} />)
              )}
            </CardContent>
          </Card>

          {/* resumen rápido */}
          {cuentas.length > 0 && (() => {
            const totalPendiente = cuentas.reduce((s, c) => s + Math.max(0, c.monto - (c.montoPagado ?? 0)), 0);
            const cuentasPendientes = cuentas.filter(c => !c.liquidado).length;
            return (
              <div className={`rounded-xl p-4 text-center ${totalPendiente > 0 ? "bg-red-50 border border-red-200" : "bg-emerald-50 border border-emerald-200"}`}>
                <p className="text-xs font-bold uppercase tracking-wider mb-1 text-muted-foreground">Saldo pendiente</p>
                <p className={`text-3xl font-black tracking-tight ${totalPendiente > 0 ? "text-destructive" : "text-emerald-700"}`}>
                  {formatMoney(totalPendiente)}
                </p>
                <p className="text-xs mt-1 text-muted-foreground">
                  {totalPendiente === 0 ? "Al corriente ✓" : `${cuentasPendientes} cuenta${cuentasPendientes !== 1 ? "s" : ""} pendiente${cuentasPendientes !== 1 ? "s" : ""}`}
                </p>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
