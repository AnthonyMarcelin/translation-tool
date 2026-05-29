const db = require('../db-better');

function getOrgRole(userId, orgId) {
  const m = db.prepare('SELECT role FROM org_members WHERE org_id=? AND user_id=?').get(orgId, userId);
  return m?.role || null;
}

function getProjectRole(userId, projectId) {
  const m = db.prepare('SELECT role FROM project_members WHERE project_id=? AND user_id=?').get(projectId, userId);
  return m?.role || null;
}

function canAccessProject(userId, projectId) {
  return !!getProjectRole(userId, projectId);
}

function canManageProject(userId, projectId) {
  const role = getProjectRole(userId, projectId);
  return role === 'owner' || role === 'manager';
}

module.exports = { getOrgRole, getProjectRole, canAccessProject, canManageProject };
