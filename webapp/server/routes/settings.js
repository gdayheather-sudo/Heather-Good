import { Router } from 'express';
import { getSetting, setSetting, publicSettings } from '../settings.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(publicSettings());
});

router.put('/', (req, res) => {
  const { anthropic_api_key, openai_api_key, anthropic_model, openai_model, openai_image_model } = req.body || {};

  // Only overwrite a key when a non-empty value is supplied (so the UI can show
  // a redacted hint without clobbering the stored key on every save).
  if (typeof anthropic_api_key === 'string' && anthropic_api_key.trim()) {
    setSetting('anthropic_api_key', anthropic_api_key.trim());
  }
  if (typeof openai_api_key === 'string' && openai_api_key.trim()) {
    setSetting('openai_api_key', openai_api_key.trim());
  }
  if (typeof anthropic_model === 'string') setSetting('anthropic_model', anthropic_model.trim());
  if (typeof openai_model === 'string') setSetting('openai_model', openai_model.trim());
  if (typeof openai_image_model === 'string') setSetting('openai_image_model', openai_image_model.trim());

  res.json(publicSettings());
});

// Allow clearing a stored key explicitly.
router.delete('/key/:which', (req, res) => {
  const which = req.params.which;
  if (which === 'anthropic') setSetting('anthropic_api_key', '');
  else if (which === 'openai') setSetting('openai_api_key', '');
  else return res.status(400).json({ error: 'Unknown key' });
  res.json(publicSettings());
});

export default router;
