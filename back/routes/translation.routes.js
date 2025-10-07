const express = require('express');
const router = express.Router();
const TranslationController = require('../controllers/translation.controller');

router.post('/translate', TranslationController.translate);

router.post('/translations', TranslationController.createTranslation);
router.get('/translations', TranslationController.getTranslationsByProject);
router.get('/translations/export', TranslationController.exportProjectTranslations);
router.get('/translations/:id', TranslationController.getTranslation);
router.put('/translations/:id', TranslationController.updateTranslation);
router.delete('/translations/:id', TranslationController.deleteTranslation);

router.get(
  '/translations/:id/values',
  TranslationController.getTranslationValues,
);
router.post(
  '/translations/:id/values',
  TranslationController.addTranslationValue,
);
router.put(
  '/translations/:id/values',
  TranslationController.updateTranslationValue,
);
router.delete(
  '/translations/:id/values',
  TranslationController.deleteTranslationValue,
);

module.exports = router;
