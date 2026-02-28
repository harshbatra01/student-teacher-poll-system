import { Router, Request, Response } from 'express';
import { pollService } from '../services/PollService';

const apiRouter = Router();

// GET /api/polls/history
apiRouter.get('/polls/history', async (_req: Request, res: Response) => {
    try {
        const pastPolls = await pollService.getPollHistory();
        res.json({ success: true, data: pastPolls });
    } catch (fetchError) {
        res.status(500).json({ success: false, error: 'Failed to fetch poll history' });
    }
});

// GET /api/health
apiRouter.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

export default apiRouter;
