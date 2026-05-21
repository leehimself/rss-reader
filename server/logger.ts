import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

let logDir = path.join(process.cwd(), 'logs');

export function setLogDir(dir: string) {
  logDir = dir;
}

export const log = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(logDir, 'rss-reader-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  });
  consoleTransport.on('error', (err) => {
    // Ignore EPIPE errors from closed stdout
    if (err.code !== 'EPIPE') {
      console.error('Logger error:', err);
    }
  });
  log.add(consoleTransport);
}

export function setLogLevel(level: string) {
  log.level = level;
}
