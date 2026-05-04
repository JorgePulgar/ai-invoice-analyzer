require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/auth');
const facturasRoutes = require('./routes/facturas');
const analyticsRoutes = require('./routes/analytics');
const healthRoutes = require('./routes/health');
const errorHandler = require('./middleware/errorHandler');
const { globalLimiter } = require('./middleware/rateLimit');

const app = express();

const corsOriginRaw = process.env.CORS_ORIGIN || '*';
if (process.env.NODE_ENV === 'production' && (corsOriginRaw === '*' || corsOriginRaw.trim() === '')) {
  console.error(
    '[invoice-insights] FATAL: CORS_ORIGIN must be set to a specific origin in production (e.g. https://app.example.com). ' +
    'Wildcard "*" is not allowed in production. Set CORS_ORIGIN in your environment.'
  );
  process.exit(1);
}

const corsOrigins = corsOriginRaw.split(',').map((o) => o.trim());

app.use(helmet());
app.use(cors({ origin: corsOrigins.length === 1 && corsOrigins[0] === '*' ? true : corsOrigins }));
app.use(globalLimiter);
app.use(express.json({ limit: '1mb' }));

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/facturas', facturasRoutes);
app.use('/api/analytics', analyticsRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

app.use(errorHandler);

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`[invoice-insights] API listening on http://localhost:${PORT}`);
});

module.exports = app;
