declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

export {};
