import { v4 as uuidv4 } from 'uuid';

export interface LogContext {
  requestId?: string;
  [key: string]: any;
}

class Logger {
  private generateRequestId(): string {
    return uuidv4();
  }

  log(level: 'info' | 'warn' | 'error', message: string, context?: LogContext) {
    const requestId = context?.requestId || this.generateRequestId();
    const timestamp = new Date().toISOString();
    
    const logEntry = {
      timestamp,
      level,
      message,
      requestId,
      ...context,
    };

    if (level === 'error') {
      console.error(JSON.stringify(logEntry));
    } else if (level === 'warn') {
      console.warn(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }

    return requestId;
  }

  info(message: string, context?: LogContext): string {
    return this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): string {
    return this.log('warn', message, context);
  }

  error(message: string, context?: LogContext): string {
    return this.log('error', message, context);
  }
}

export const logger = new Logger();

