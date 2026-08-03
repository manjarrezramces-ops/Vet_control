import { useLocation } from "wouter";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <Card className="w-full max-w-md text-center border-dashed">
        <CardContent className="pt-6 pb-8 px-6 space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
            <ArrowLeft className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Página no encontrada</h1>
          <p className="text-muted-foreground">
            La ruta a la que intentas acceder no existe en el sistema VetControl.
          </p>
          <div className="pt-4">
            <Link href="/">
              <Button>Volver al Inicio</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
