import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adminPostsRouter from "./admin-posts";
import processPostRouter from "./process-post";
import postAnalysisRouter from "./post-analysis";
import webhookLemonSqueezyRouter from "./webhook-lemonsqueezy";

const router: IRouter = Router();

router.use(healthRouter);
router.use(adminPostsRouter);
router.use(processPostRouter);
router.use(postAnalysisRouter);
router.use(webhookLemonSqueezyRouter);

export default router;
