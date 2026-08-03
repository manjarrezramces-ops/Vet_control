import { useParams, Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateMovimiento, useGetCliente, getGetClienteQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Moon, Sun, Stethoscope, Banknote, ArrowDownUp } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

// ---------- Tarifa de consulta por horario ----------
function getTarifaConsulta(): { importe: number; turno: "Diurno" | "Nocturno"; horario: string } {
  const now = new Date();
  const minutos = now.getHours() * 60 + now.getMinutes();
  const inicio = 8 * 60;   // 08:00
  const fin = 22 * 60;     // 22:00
  if (minutos >= inicio && minutos <= fin) {
    return { importe: 400, turno: "Diurno", horario: "8:00 – 22:00" };
  }
  return { importe: 700, turno: "Nocturno", horario: "22:01 – 7:59" };
}

const formSchema = z.object({
  fecha: z.string().min(1, "La fecha es obligatoria"),
  tipo: z.enum(["Cargo", "Pago", "Ajuste"]),
  pacienteId: z.coerce.number().optional().or(z.literal(0)),
  concepto: z.string().min(1, "El concepto es obligatorio"),
  importe: z.coerce.number().min(0.01, "El importe debe ser mayor a 0"),
  metodoPago: z.string().optional(),
  referencia: z.string().optional(),
  notas: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function MovimientoNuevo() {
  const params = useParams();
  const clienteId = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [defaultTipo, setDefaultTipo] = useState<"Cargo" | "Pago" | "Ajuste">("Pago");
  const tarifa = getTarifaConsulta();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tipoParam = params.get("tipo");
    if (tipoParam === "Cargo" || tipoParam === "Pago" || tipoParam === "Ajuste") {
      setDefaultTipo(tipoParam);
    }
  }, []);

  const { data: clienteData, isLoading: isLoadingCliente } = useGetCliente(clienteId, {
    query: {
      enabled: !!clienteId,
      queryKey: getGetClienteQueryKey(clienteId),
    },
  });

  const createMovimiento = useCreateMovimiento();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fecha: format(new Date(), "yyyy-MM-dd"),
      tipo: defaultTipo,
      pacienteId: 0,
      concepto: "",
      importe: 0,
      metodoPago: "",
      referencia: "",
      notas: "",
    },
  });

  useEffect(() => {
    form.setValue("tipo", defaultTipo);
  }, [defaultTipo, form]);

  function onSubmit(values: FormValues) {
    const payload = {
      ...values,
      pacienteId: values.pacienteId === 0 ? undefined : values.pacienteId
    };

    createMovimiento.mutate(
      { clienteId, data: payload },
      {
        onSuccess: () => {
          toast({ title: "Asiento completado", description: "Se reflejó la transacción financiera sobre el estado de cuenta local." });
          queryClient.invalidateQueries({ queryKey: getGetClienteQueryKey(clienteId) });
          setLocation(`/clientes/${clienteId}`);
        },
        onError: () => {
          toast({ variant: "destructive", title: "Fracaso de asiento", description: "Imposible dictaminar la grabación del apunte monetario." });
        },
      }
    );
  }

  const tipoOperacion = form.watch("tipo");
  const isPago = tipoOperacion === "Pago";
  const isCargo = tipoOperacion === "Cargo";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href={`/clientes/${clienteId}`}>
          <Button variant="outline" size="icon" className="rounded-full shadow-sm shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Operación Financiera Directa</h1>
          <p className="text-lg text-muted-foreground mt-1 font-medium">
            {isLoadingCliente ? "Cargando titular..." : `Modificando balance de titular: ${clienteData?.cliente.nombre} ${clienteData?.cliente.apellidos}`}
          </p>
        </div>
      </div>

      <Card className={`shadow-sm border-t-4 transition-colors ${isPago ? "border-t-emerald-500" : isCargo ? "border-t-destructive" : "border-t-primary"}`}>
            <CardContent className="p-8">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  
                  <div className="bg-muted/10 p-6 rounded-xl border border-border/50">
                    <FormField
                      control={form.control}
                      name="tipo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-bold flex items-center gap-2 mb-3">
                            <ArrowDownUp className="h-4 w-4" /> Naturaleza de la Operación <span className="text-destructive">*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className={`h-14 text-lg font-bold bg-white shadow-sm border-border/60 ${field.value === 'Pago' ? 'text-emerald-700' : field.value === 'Cargo' ? 'text-destructive' : ''}`}>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Cargo" className="font-bold text-destructive">Cargo Fijo (+ Aumenta la deuda del cliente)</SelectItem>
                              <SelectItem value="Pago" className="font-bold text-emerald-700">Abono / Pago (- Reduce la deuda del cliente)</SelectItem>
                              <SelectItem value="Ajuste" className="font-bold">Ajuste de Saldo a Favor</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="fecha"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">Fecha Contable <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input className="h-12 text-base" type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pacienteId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">Vincular a Paciente (Opcional)</FormLabel>
                          <Select 
                            onValueChange={(val) => field.onChange(Number(val))} 
                            value={field.value?.toString() || "0"}
                          >
                            <FormControl>
                              <SelectTrigger className="h-12 text-base">
                                <SelectValue placeholder="Aplicación a Nivel General" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="0" className="font-medium italic">General (Cuenta Madre)</SelectItem>
                              {clienteData?.pacientes?.map(p => (
                                <SelectItem key={p.id} value={p.id.toString()} className="font-medium">Mascota: {p.nombre} ({p.especie})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="concepto"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-base font-semibold">Motivo Específico / Concepto <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input className="h-12 text-base font-medium" placeholder="Ej. Consulta general, Vacuna múltiple, Pago de saldo vencido..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="importe"
                      render={({ field }) => (
                        <FormItem className="bg-primary/5 p-4 rounded-xl border border-primary/20">
                          <FormLabel className="text-base font-bold text-primary">Monto ($) <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Input className="h-14 text-2xl font-black font-mono text-primary bg-white shadow-sm mt-2" type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="metodoPago"
                      render={({ field }) => (
                        <FormItem className={isPago ? "bg-emerald-50 p-4 rounded-xl border border-emerald-200" : ""}>
                          <FormLabel className={`text-base font-bold ${isPago ? 'text-emerald-700' : ''}`}>Método de pago {isPago && <span className="text-destructive">*</span>}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className={`h-14 text-base mt-2 shadow-sm ${isPago ? 'bg-white font-medium border-emerald-200' : ''}`}>
                                <SelectValue placeholder="Seleccionar..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Efectivo" className="font-medium">Efectivo</SelectItem>
                              <SelectItem value="Transferencia" className="font-medium">Transferencia</SelectItem>
                              <SelectItem value="Mixto" className="font-medium">Mixto</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {isPago && (
                      <FormField
                        control={form.control}
                        name="referencia"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel className="text-base font-semibold">Folio o Referencia Bancaria</FormLabel>
                            <FormControl>
                              <Input className="h-12 text-base font-mono" placeholder="Clave de rastreo, número de autorización de la tarjeta..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="notas"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-base font-semibold">Notas Anexas / Privadas</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Anotaciones extra sobre este movimiento particular..." className="resize-none min-h-[100px] text-base" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-4 pt-6 border-t">
                    <Link href={`/clientes/${clienteId}`}>
                      <Button variant="outline" size="lg" type="button" className="h-12 px-6 text-base">Abortar Operación</Button>
                    </Link>
                    <Button 
                      type="submit" 
                      size="lg" 
                      className={`h-12 px-8 text-base font-bold shadow-md transition-colors ${isPago ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : isCargo ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' : ''}`} 
                      disabled={createMovimiento.isPending}
                    >
                      {createMovimiento.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                      {isPago ? "Efectuar Abono" : isCargo ? "Cargar Importe" : "Asentar Ajuste"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
    </div>
  );
}