const express = require('express');
const router = express.Router();
const ProjectController = require('../controllers/project.controller');

router.get('/', ProjectController.listProjects);
router.put('/:oldName', ProjectController.renameProject);
router.delete('/:project', ProjectController.deleteProject);

router.get('/:project', ProjectController.exportProject);
router.get('/:project/zip', ProjectController.exportProjectZip);

module.exports = router;
