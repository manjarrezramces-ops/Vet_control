import { useState } from "react";
import { Link } from "wouter";
import { useGetClientes, getGetClientesQueryKey } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, User, Phone, Mail, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function ClientesList() {
  const [search, setSearch] = useState("");
  
  const { data: clientes, isLoading } = useGetClientes(
    { q: search || undefined },
    { query: { queryKey: getGetClientesQueryKey({ q: search || undefined }) } }
  );

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Directorio de Clientes</h1>
          <p className="text-lg text-muted-foreground mt-2">Administra los propietarios y su información de contacto.</p>
        </div>
        <Link href="/clientes/nuevo">
          <Button size="lg" className="shadow-sm">
            <Plus className="mr-2 h-5 w-5" /> Nuevo Cliente
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, teléfono o correo..."
          className="pl-11 h-12 text-base max-w-xl bg-white shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="shadow-sm border-t-4 border-t-primary overflow-hidden">
        <CardContent className="p-0">
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b bg-muted/30">
                <tr className="border-b transition-colors">
                  <th className="h-14 px-6 text-left align-middle text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre del Cliente</th>
                  <th className="h-14 px-6 text-left align-middle text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contacto</th>
                  <th className="h-14 px-6 text-center align-middle text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mascotas</th>
                  <th className="h-14 px-6 text-right align-middle text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saldo pendiente</th>
                  <th className="h-14 px-6 text-right align-middle font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0 bg-white">
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-6"><Skeleton className="h-6 w-48" /></td>
                      <td className="p-6"><Skeleton className="h-6 w-56" /></td>
                      <td className="p-6"><Skeleton className="h-6 w-12 mx-auto" /></td>
                      <td className="p-6"><Skeleton className="h-6 w-20 ml-auto" /></td>
                      <td className="p-6"><Skeleton className="h-9 w-24 ml-auto" /></td>
                    </tr>
                  ))
                ) : clientes?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
                          <Users className="h-8 w-8 text-muted-foreground opacity-50" />
                        </div>
                        <p className="text-lg font-medium text-foreground">No se encontraron clientes</p>
                        <p className="text-sm">Intenta con otros términos de búsqueda.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  clientes?.map((cliente) => (
                    <tr key={cliente.id} className="border-b transition-colors hover:bg-muted/30 group">
                      <td className="p-6 align-middle">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            <User className="h-5 w-5" />
                          </div>
                          <div className="font-semibold text-base text-foreground">
                            {cliente.nombre} {cliente.apellidos}
                          </div>
                        </div>
                      </td>
                      <td className="p-6 align-middle">
                        <div className="flex flex-col gap-2 text-sm">
                          <div className="flex items-center gap-2 text-foreground/80">
                            <Phone className="h-4 w-4 text-muted-foreground" /> {cliente.telefono}
                          </div>
                          {cliente.email && (
                            <div className="flex items-center gap-2 text-foreground/80">
                              <Mail className="h-4 w-4 text-muted-foreground" /> {cliente.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-6 align-middle text-center">
                        <Badge variant="secondary" className="font-medium text-sm px-3 py-1">
                          {cliente.totalPacientes}
                        </Badge>
                      </td>
                      <td className="p-6 align-middle text-right">
                        <div className={`font-semibold text-base ${cliente.saldo > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                          {formatMoney(cliente.saldo)}
                        </div>
                      </td>
                      <td className="p-6 align-middle text-right">
                        <Link href={`/clientes/${cliente.id}`}>
                          <Button variant="outline" size="sm" className="font-medium">Ver Perfil</Button>
                        </Link>
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
  );
}