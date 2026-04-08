const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

router.post('/login', async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }
  if (!process.env.DASHBOARD_PASSWORD_HASH) {
    return res.status(500).json({ error: 'Dashboard password not configured' });
  }
  const valid = await bcrypt.compare(password, process.env.DASHBOARD_PASSWORD_HASH);
  if (!valid) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '24h' });
  res.json({ token });
});

module.exports = router;
