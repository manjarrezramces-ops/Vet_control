import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { Layout } from '@/components/layout/Layout';

// Pages
import Dashboard from '@/pages/dashboard';
import ClientesList from '@/pages/clientes/index';
import ClienteNuevo from '@/pages/clientes/nuevo';
import ClienteDetalle from '@/pages/clientes/detalle';
import ClienteEditar from '@/pages/clientes/editar';
import MovimientoNuevo from '@/pages/movimientos/nuevo';

import PacientesList from '@/pages/pacientes/index';
import PacienteNuevo from '@/pages/pacientes/nuevo';
import PacienteDetalle from '@/pages/pacientes/detalle';
import PacienteEditar from '@/pages/pacientes/editar';

import ConsultaNueva from '@/pages/consultas/nuevo';
import ConsultaDetalle from '@/pages/consultas/detalle';
import ConsultaEditar from '@/pages/consultas/editar';

import RecetaNueva from '@/pages/recetas/nuevo';
import RecetaDetalle from '@/pages/recetas/detalle';

import PruebaNueva from '@/pages/pruebas/nuevo';
import PruebaDetalle from '@/pages/pruebas/detalle';

import HospitalizacionNueva from '@/pages/hospitalizaciones/nuevo';
import HospitalizacionDetalle from '@/pages/hospitalizaciones/detalle';

import ProcedimientoNuevo from '@/pages/procedimientos/nuevo';
import ProcedimientoDetalle from '@/pages/procedimientos/detalle';

import NotFound from '@/pages/not-found';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        
        {/* Clientes */}
        <Route path="/clientes" component={ClientesList} />
        <Route path="/clientes/nuevo" component={ClienteNuevo} />
        <Route path="/clientes/:id" component={ClienteDetalle} />
        <Route path="/clientes/:id/editar" component={ClienteEditar} />
        <Route path="/clientes/:id/movimientos/nuevo" component={MovimientoNuevo} />
        
        {/* Pacientes */}
        <Route path="/pacientes" component={PacientesList} />
        <Route path="/pacientes/nuevo" component={PacienteNuevo} />
        <Route path="/pacientes/:id" component={PacienteDetalle} />
        <Route path="/pacientes/:id/editar" component={PacienteEditar} />
        <Route path="/pacientes/:id/consultas/nuevo" component={ConsultaNueva} />
        <Route path="/pacientes/:id/recetas/nuevo" component={RecetaNueva} />
        <Route path="/pacientes/:id/pruebas/nuevo" component={PruebaNueva} />
        
        {/* Consultas (read/edit are top-level for simpler URLs sometimes, but can keep pattern) */}
        <Route path="/consultas" component={Dashboard} /> {/* Optional list */}
        <Route path="/consultas/:id" component={ConsultaDetalle} />
        <Route path="/consultas/:id/editar" component={ConsultaEditar} />
        
        {/* Recetas / Pruebas View */}
        <Route path="/recetas/:id" component={RecetaDetalle} />
        <Route path="/pruebas/:id" component={PruebaDetalle} />

        {/* Hospitalizaciones */}
        <Route path="/pacientes/:id/hospitalizaciones/nuevo" component={HospitalizacionNueva} />
        <Route path="/hospitalizaciones/:id" component={HospitalizacionDetalle} />

        {/* Procedimientos */}
        <Route path="/pacientes/:id/procedimientos/nuevo" component={ProcedimientoNuevo} />
        <Route path="/procedimientos/:id" component={ProcedimientoDetalle} />
        
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
