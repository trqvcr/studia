const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static(require('path').join(__dirname, 'public')));

const authRoutes = require('./routes/auth');
const sessionsRoutes = require('./routes/sessions');
const friendsRoutes = require('./routes/friends');
const requireAuth = require('./middleware/requireAuth');
const profileRoutes = require('./routes/profile');

app.use('/profile', requireAuth, profileRoutes);
app.use('/auth', authRoutes);
app.use('/sessions', requireAuth, sessionsRoutes);
app.use('/friends', requireAuth, friendsRoutes);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
