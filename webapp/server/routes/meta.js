import { Router } from 'express';
import { PLATFORMS, STATUSES } from '../constants.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({ platforms: PLATFORMS, statuses: STATUSES });
});

export default router;
