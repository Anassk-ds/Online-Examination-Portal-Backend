// Catches anything that falls through without an explicit response and
// anything thrown asynchronously that Express's default handler would
// otherwise turn into an unhelpful HTML stack trace in the browser.
export const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

export const errorHandler = (err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error.' });
};
