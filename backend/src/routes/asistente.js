const express = require('express');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

const resolveN8nWebhookUrl = () => {
  let url = (process.env.N8N_WEBHOOK_URL || '').trim();
  if (!url) return '';

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url.replace(/^\/+/, '')}`;
  }

  if (!url.includes('/webhook')) {
    url = `${url.replace(/\/+$/, '')}/webhook/fiadocheck-asistente`;
  }

  return url;
};

router.post('/chat', async (req, res) => {
  try {
    const n8nUrl = resolveN8nWebhookUrl();
    if (!n8nUrl) {
      return res.status(503).json({
        error: 'Asistente IA no configurado. Define N8N_WEBHOOK_URL en el backend.',
      });
    }

    const { sessionId, message, mensaje, userId, metadata } = req.body;
    const texto = (message || mensaje || '').trim();

    if (!texto) {
      return res.status(400).json({ error: 'message es requerido' });
    }

    const authHeader = req.headers.authorization || '';
    const authToken = authHeader.replace(/^Bearer\s+/i, '');

    const idTendero = req.user.id_tendero;
    if (!idTendero) {
      return res.status(403).json({
        error: 'El asistente IA solo está disponible para tenderos autenticados.',
      });
    }

    const payload = {
      sessionId: sessionId || `sess_${req.user.id_usuario}`,
      userId: userId || String(idTendero),
      id_tendero: idTendero,
      message: texto,
      authToken,
      metadata: {
        ...(metadata || {}),
        id_tendero: idTendero,
        id_usuario: req.user.id_usuario,
        platform: 'mobile',
      },
    };

    const n8nRes = await fetch(n8nUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await n8nRes.json().catch(() => ({}));

    if (!n8nRes.ok) {
      const mensajeError = [
        json?.error,
        json?.message,
        json?.detail,
      ].find(Boolean) || 'Error al contactar el asistente IA';

      const isInactive = /not active|workflow.*inactive|workflow.*not.*active|inactive workflow/i.test(mensajeError);
      const errorFinal = isInactive
        ? 'El workflow de n8n está inactivo. Actívalo desde n8n y vuelve a intentarlo.'
        : mensajeError;

      return res.status(n8nRes.status).json({
        error: errorFinal,
      });
    }

    const writeActions = new Set(['agregar_credito', 'agregar_pago', 'agregar_cliente']);
    const actionExecuted = json.action_executed ?? null;
    const isWriteAction = actionExecuted && writeActions.has(actionExecuted);

    const refreshScope = isWriteAction
      ? actionExecuted === 'agregar_cliente'
        ? ['clientes']
        : actionExecuted === 'agregar_credito'
        ? ['clientes', 'dashboard']
        : ['clientes', 'dashboard', 'pagos'] // agregar_pago
      : null;

    res.json({
      respuesta: json.respuesta ?? json.mensaje ?? json.output ?? '',
      mensaje: json.mensaje ?? json.respuesta ?? json.output ?? '',
      sugerencias: json.sugerencias ?? [],
      action_executed: actionExecuted,
      refresh: isWriteAction ? true : false,
      refresh_scope: refreshScope,
      sessionId: json.sessionId ?? payload.sessionId,
      success: json.success !== false,
    });
  } catch (err) {
    console.error('Error en asistente/chat:', err.message);
    res.status(502).json({
      error: 'No se pudo conectar con el asistente IA. Verifica que n8n esté activo.',
    });
  }
});

module.exports = router;
