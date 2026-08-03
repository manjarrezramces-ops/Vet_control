import { Router, type IRouter } from "express";
import healthRouter from "./health";
import storageRouter from "./storage";
import dashboardRouter from "./dashboard";
import clientesRouter from "./clientes";
import pacientesRouter from "./pacientes";
import consultasRouter from "./consultas";
import recetasRouter from "./recetas";
import pruebasRouter from "./pruebas";
import movimientosRouter from "./movimientos";
import hospitalizacionesRouter from "./hospitalizaciones";
import hospitalizacionArchivosRouter from "./hospitalizacion_archivos";
import procedimientosRouter from "./procedimientos";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(clientesRouter);
router.use(pacientesRouter);
router.use(consultasRouter);
router.use(recetasRouter);
router.use(pruebasRouter);
router.use(movimientosRouter);
router.use(hospitalizacionesRouter);
router.use(hospitalizacionArchivosRouter);
router.use(procedimientosRouter);
router.use(storageRouter);

export default router;
