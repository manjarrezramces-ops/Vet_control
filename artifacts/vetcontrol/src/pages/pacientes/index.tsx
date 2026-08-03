import { useState } from "react";
import { Link } from "wouter";
import { useGetPacientes, getGetPacientesQueryKey } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, Cat, Dog, Bird, User, Stethoscope } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function PacientesList() {
  const [search, setSearch] = useState("");
  
  const { data: pacientes, isLoading } = useGetPacientes(
    { q: search || undefined },
    { query: { queryKey: getGetPacientesQueryKey({ q: search || undefined }) } }
  );

  const getSpeciesIcon = (especie: string) => {
    switch (especie.toLowerCase()) {
      case "perro": return <Dog className="h-5 w-5" />;
      case "gato": return <Cat className="h-5 w-5" />;
      case "ave": return <Bird className="h-5 w-5" />;
      default: return <Cat className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Directorio de Pacientes</h1>
          <p className="text-lg text-muted-foreground mt-2">Expedientes clínicos de todas las mascotas registradas.</p>
        </div>
        <Link href="/pacientes/nuevo">
          <Button size="lg" className="shadow-sm">
            <Plus className="mr-2 h-5 w-5" /> Nuevo Paciente
          </Button>
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, especie, raza o propietario..."
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
                  <th className="h-14 px-6 text-left align-middle text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mascota</th>
                  <th className="h-14 px-6 text-left align-middle text-xs font-semibold text-muted-foreground uppercase tracking-wider">Propietario</th>
                  <th className="h-14 px-6 text-left align-middle text-xs font-semibold text-muted-foreground uppercase tracking-wider">Peso</th>
                  <th className="h-14 px-6 text-left align-middle text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                  <th className="h-14 px-6 text-right align-middle text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0 bg-white">
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-6"><Skeleton className="h-8 w-48" /></td>
                      <td className="p-6"><Skeleton className="h-6 w-32" /></td>
                      <td className="p-6"><Skeleton className="h-6 w-16" /></td>
                      <td className="p-6"><Skeleton className="h-6 w-24" /></td>
                      <td className="p-6"><Skeleton className="h-9 w-24 ml-auto" /></td>
                    </tr>
                  ))
                ) : pacientes?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
                          <Stethoscope className="h-8 w-8 text-muted-foreground opacity-50" />
                        </div>
                        <p className="text-lg font-medium text-foreground">No se encontraron pacientes</p>
                        <p className="text-sm">Intenta con otros términos de búsqueda.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pacientes?.map((paciente) => (
                    <tr key={paciente.id} className="border-b transition-colors hover:bg-muted/30 group">
                      <td className="p-6 align-middle">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                            {getSpeciesIcon(paciente.especie)}
                          </div>
                          <div>
                            <div className="font-bold text-base text-foreground">{paciente.nombre}</div>
                            <div className="text-sm font-medium text-muted-foreground mt-0.5">{paciente.especie} {paciente.raza ? `· ${paciente.raza}` : ""}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-6 align-middle">
                        <div className="flex items-center gap-2 font-medium text-foreground/80">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <Link href={`/clientes/${paciente.clienteId}`} className="hover:underline hover:text-primary transition-colors">
                            {paciente.propietario}
                          </Link>
                        </div>
                      </td>
                      <td className="p-6 align-middle font-medium text-foreground/80">
                        {paciente.peso ? `${paciente.peso} kg` : <span className="text-muted-foreground font-normal">-</span>}
                      </td>
                      <td className="p-6 align-middle">
                        <Badge 
                          variant={paciente.estado === "Activo" ? "default" : paciente.estado === "Fallecido" ? "destructive" : "secondary"}
                          className="px-3 py-1 text-sm font-medium"
                        >
                          {paciente.estado}
                        </Badge>
                      </td>
                      <td className="p-6 align-middle text-right">
                        <Link href={`/pacientes/${paciente.id}`}>
                          <Button variant="outline" size="sm" className="font-medium">Expediente</Button>
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