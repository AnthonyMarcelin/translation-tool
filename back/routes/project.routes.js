const express = require('express');
const router = express.Router();
const ProjectController = require('../controllers/project.controller');

router.get('/projects', ProjectController.listProjects);
router.post('/projects', ProjectController.createProject);
router.put('/projects/:id', ProjectController.renameProject);
router.delete('/projects/:id', ProjectController.deleteProject);

module.exports = router;
