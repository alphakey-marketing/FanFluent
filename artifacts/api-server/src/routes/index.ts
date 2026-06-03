import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adminPostsRouter from "./admin-posts";
import processPostRouter from "./process-post";
import postAnalysisRouter from "./post-analysis";
import webhookLemonSqueezyRouter from "./webhook-lemonsqueezy";
import checkoutLinksRouter from "./checkout-links";
import ingestXRouter from "./ingest-x";

const router: IRouter = Router();

router.use(healthRouter);
router.use(adminPostsRouter);
router.use(processPostRouter);
router.use(postAnalysisRouter);
router.use(webhookLemonSqueezyRouter);
router.use(checkoutLinksRouter);
router.use(ingestXRouter);

export default router;
