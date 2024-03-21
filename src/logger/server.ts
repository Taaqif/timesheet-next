import winston from "winston";
import { env } from "~/env";
const { combine, timestamp, printf, colorize, errors, splat } = winston.format;
import jsonStringify from "safe-stable-stringify";

export const logger = winston.createLogger({
  level: env.LOG_LEVEL || "info",
  format: combine(
    errors({ stack: true }),
    splat(),
    colorize(),
    timestamp(),
    printf((info) => {
      const stripped = Object.assign({}, info, {
        level: undefined,
        message: undefined,
        splat: undefined,
      });
      // eslint-disable-next-line
      delete stripped["timestamp"];

      const stringifiedRest = jsonStringify(stripped);

      // eslint-disable-next-line
      const padding = (info.padding && info.padding[info.level]) || " ";
      if (stringifiedRest !== "{}") {
        return `${info.level}${padding}[${info.timestamp}]${padding}${info.message} ${stringifiedRest}`;
      } else {
        return `${info.level}${padding}[${info.timestamp}]${padding}${info.message}`;
      }
    }),
  ),
  transports: [new winston.transports.Console()],
});
