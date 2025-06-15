import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body
  });

  // Default error response
  let status = 500;
  let message = 'Internal server error';

  // Handle specific error types
  if (error.name === 'ValidationError') {
    status = 400;
    message = 'Invalid input data';
  } else if (error.name === 'UnauthorizedError') {
    status = 401;
    message = 'Unauthorized';
  } else if (error.message?.includes('not found')) {
    status = 404;
    message = 'Resource not found';
  }

  res.status(status).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { 
      details: error.message,
      stack: error.stack 
    })
  });
}
