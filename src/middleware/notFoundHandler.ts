import { Request, Response } from 'express';

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `The requested endpoint ${req.method} ${req.path} does not exist`,
    timestamp: new Date().toISOString(),
  });
};