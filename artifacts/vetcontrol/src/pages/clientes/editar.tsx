import { useParams, Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useGetCliente, getGetClienteQueryKey, useUpdateCliente } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Loader2, UserCog } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  apellidos: z.string().optional(),
  telefono: z.string().min(1, "El teléfono es obligatorio"),
  telefonoAlterno: z.string().optional(),
  email: z.string().email("Correo inválido").optional().or(z.literal("")),
  rfc: z.string().optional(),
  direccion: z.string().optional(),
  notas: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function ClienteEditar() {
  const params = useParams();
  const id = Number(params.id);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useGetCliente(id, {
    query: {
      enabled: !!id,
      queryKey: getGetClienteQueryKey(id),
    },
  });

  const updateCliente = useUpdateCliente();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: "",
      apellidos: "",
      telefono: "",
      telefonoAlterno: "",
      email: "",
      rfc: "",
      direccion: "",
      notas: "",
    },
  });

  const initializedForId = useRef<number | null>(null);

  useEffect(() => {
    if (data?.cliente && initializedForId.current !== id) {
      initializedForId.current = id;
      form.reset({
        nombre: data.cliente.nombre,
        apellidos: data.cliente.apellidos || "",
        telefono: data.cliente.telefono,
        telefonoAlterno: data.cliente.telefonoAlterno || "",
        email: data.cliente.email || "",
        rfc: data.cliente.rfc || "",
        direccion: data.cliente.direccion || "",
        notas: data.cliente.notas || "",
      });
    }
  }, [data, id, form]);

  function onSubmit(values: FormValues) {
    updateCliente.mutate(
      { clienteId: id, data: values },
      {
        onSuccess: () => {
          toast({ title: "Perfil actualizado", description: "Los datos se guardaron correctamente." });
          queryClient.invalidateQueries({ queryKey: getGetClienteQueryKey(id) });
          setLocation(`/clientes/${id}`);
        },
        onError: () => {
          toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el perfil." });
        },
      }
    );
  }

  if (isLoading) {
    return <div className="space-y-8 max-w-3xl mx-auto"><Skeleton className="h-12 w-64" /><Skeleton className="h-[600px] rounded-xl" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Link href={`/clientes/${id}`}>
          <Button variant="outline" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
            Editar Perfil
          </h1>
          <p className="text-lg text-muted-foreground mt-1">Actualizar información de {data?.cliente.nombre}.</p>
        </div>
      </div>

      <Card className="shadow-sm border-t-4 border-t-primary">
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
              
              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                    <UserCog className="h-5 w-5 text-primary" /> Datos Personales
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Información principal del propietario.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="nombre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Nombre <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input className="h-12 text-base" placeholder="Ej. Juan" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="apellidos"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Apellidos</FormLabel>
                        <FormControl>
                          <Input className="h-12 text-base" placeholder="Ej. Pérez García" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-xl font-semibold tracking-tight text-foreground">Contacto y Facturación</h3>
                  <p className="text-sm text-muted-foreground mt-1">Medios para comunicar y facturar.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="telefono"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Teléfono <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input className="h-12 text-base" placeholder="10 dígitos" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="telefonoAlterno"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Teléfono Alterno</FormLabel>
                        <FormControl>
                          <Input className="h-12 text-base" placeholder="Opcional" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">Correo Electrónico</FormLabel>
                        <FormControl>
                          <Input className="h-12 text-base" type="email" placeholder="correo@ejemplo.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="rfc"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">RFC</FormLabel>
                        <FormControl>
                          <Input className="h-12 text-base" placeholder="Para facturación" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="direccion"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel className="text-base font-semibold">Dirección</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Calle, número, colonia, ciudad..." className="resize-none min-h-[100px] text-base" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="border-b pb-4">
                  <h3 className="text-xl font-semibold tracking-tight text-foreground">Información Adicional</h3>
                  <p className="text-sm text-muted-foreground mt-1">Notas internas de la clínica.</p>
                </div>
                <FormField
                  control={form.control}
                  name="notas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Notas Administrativas</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Información relevante, historial particular, preferencias..." className="resize-none min-h-[120px] text-base" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-4 pt-6">
                <Link href={`/clientes/${id}`}>
                  <Button variant="outline" size="lg" type="button" className="text-base h-12 px-6">Cancelar</Button>
                </Link>
                <Button size="lg" type="submit" className="text-base h-12 px-8" disabled={updateCliente.isPending}>
                  {updateCliente.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Guardar Cambios
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}