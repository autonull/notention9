import fs from 'fs/promises';
import path from 'path';
import {fileURLToPath} from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const output = path.join(root, 'doc/screenshot');

await fs.rm(output, {recursive: true, force: true});
await fs.mkdir(output, {recursive: true});
