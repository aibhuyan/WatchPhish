import { Router, type IRouter } from "express";
import healthRouter from "./health";
import phishingRouter from "./phishing";
import brandsRouter from "./brands";

const router: IRouter = Router();

router.use(healthRouter);
router.use(phishingRouter);
router.use(brandsRouter);

export default router;
