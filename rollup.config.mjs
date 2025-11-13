import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'rollup';
import swc from '@rollup/plugin-swc';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  input: path.resolve(__dirname, 'src/index.ts'),
  external: (id) => !path.isAbsolute(id) && !id.startsWith('.'),
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',
      exports: 'auto',
      sourcemap: true,
    },
    {
      file: 'dist/index.mjs',
      format: 'esm',
      exports: 'auto',
      sourcemap: true,
    },
  ],
  plugins: [
    json(),
    nodeResolve({
      extensions: ['.ts', '.js', '.json'],
    }),
    commonjs({
      ignoreDynamicRequires: true,
    }),
    swc({
      swc: {
        jsc: {
          parser: {
            syntax: 'typescript',
          },
          target: 'es2020',
        },
        sourceMaps: true,
      },
    }),
  ],
});
