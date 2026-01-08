import express from 'express';
import { checkAdminPassword } from '../utils/auth-middleware.js';

const router = express.Router();

router.post('/login', checkAdminPassword, (req, res) => {
  res.json({ success: true });
});

export default router;
