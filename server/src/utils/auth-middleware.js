export function requireAdmin(req, res, next) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminPassword) {
    return next();
  }
  
  if (req.session.isAdmin) {
    return next();
  }
  
  res.status(401).json({ error: 'Admin authentication required' });
}

export function checkAdminPassword(req, res, next) {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminPassword || password === adminPassword) {
    req.session.isAdmin = true;
    return next();
  }
  
  res.status(401).json({ error: 'Invalid password' });
}
