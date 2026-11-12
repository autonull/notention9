import fs from 'fs/promises';
import path from 'path';
import {fileURLToPath} from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const output = path.join(root, 'doc/screenshot');
const tmpOutput = path.join(output, '.tmp');

// Remove old .tmp directory if it exists, then create fresh one
await fs.rm(tmpOutput, {recursive: true, force: true});
await fs.mkdir(tmpOutput, {recursive: true});
