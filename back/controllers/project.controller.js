const Project = require('../models/project.model');

const ProjectController = {
  listProjects: async (req, res, next) => {
    try {
      const projects = await Project.getAll();
      res.json(projects);
    } catch (err) {
      next(err);
    }
  },

  createProject: async (req, res, next) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: 'Name required' });

      const existing = await Project.findByName(name);
      if (existing)
        return res.status(400).json({ error: 'Project already exists' });

      const project = await Project.create(name);
      res.status(201).json(project);
    } catch (err) {
      next(err);
    }
  },

  renameProject: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { newName } = req.body;
      if (!newName) return res.status(400).json({ error: 'New name required' });

      const project = await Project.update(id, newName);
      res.json(project);
    } catch (err) {
      next(err);
    }
  },

  deleteProject: async (req, res, next) => {
    try {
      const { id } = req.params;
      await Project.delete(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};

module.exports = ProjectController;
