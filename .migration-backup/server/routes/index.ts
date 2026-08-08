import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import chatRouter from "./chat";
import storageRouter from "./storage";
import storesRouter from "./stores";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import suppliersRouter from "./suppliers";
import inventoryRouter from "./inventory";
import customersRouter from "./customers";
import employeesRouter from "./employees";
import salesRouter from "./sales";
import restaurantRouter from "./restaurant";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(chatRouter);
router.use(storageRouter);
router.use(storesRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(suppliersRouter);
router.use(inventoryRouter);
router.use(customersRouter);
router.use(employeesRouter);
router.use(salesRouter);
router.use(restaurantRouter);
router.use(dashboardRouter);
router.use(reportsRouter);

export default router;
