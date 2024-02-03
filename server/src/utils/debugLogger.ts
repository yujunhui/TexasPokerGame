import { Console } from 'console';
import * as fs from 'fs';

export const logger = new Console({
  stdout: fs.createWriteStream('debug.log', { flags: 'a' }),
  stderr: fs.createWriteStream('debug.err.log', { flags: 'a' }),
});

export default logger;
