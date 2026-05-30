import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';

const isProd = process.env.NODE_ENV === 'production';

export default {
  input: 'src/plugin.ts',
  output: {
    file: 'com.corrugator.brightness.sdPlugin/bin/plugin.js',
    format: 'esm',
    sourcemap: !isProd,
  },
  external: [
    'child_process',
    'events',
    'fs',
    'net',
    'os',
    'path',
    'stream',
    'tls',
    'url',
    'util',
    'http',
    'https',
    'crypto',
    'buffer',
  ],
  plugins: [
    resolve({
      preferBuiltins: true,
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      sourceMap: !isProd,
    }),
  ],
};
