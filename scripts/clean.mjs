import { rmSync } from 'node:fs';
import { join } from 'node:path';

const paths = [
  'dist',
  '.vite',
  join('node_modules', '.vite'),
];

for (const target of paths) {
  rmSync(target, { recursive: true, force: true });
  console.log(`Removed ${target}`);
}
