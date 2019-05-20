import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import typescript from 'rollup-plugin-typescript';
import {uglify} from 'rollup-plugin-uglify';

const isDev = false;

const plugins = [resolve(), commonjs(), typescript()];

if (!isDev) {
    plugins.push(uglify());
}

export default {
    input: './src/index.ts',
    plugins: plugins,
    output: {
        file: 'example/map-list.js',
        name: 'MapList',
        format: 'umd',
        sourcemap: isDev,
        compact: !isDev
    }
}