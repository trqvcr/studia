const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static(require('path').join(__dirname, 'public')));

const authRoutes = require('./routes/auth');
const sessionsRoutes = require('./routes/sessions');
const friendsRoutes = require('./routes/friends');

app.use('/auth', authRoutes);
app.use('/sessions', sessionsRoutes);
app.use('/friends', friendsRoutes);

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
