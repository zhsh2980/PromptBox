#!/usr/bin/env node
/**
 * 版本号同步脚本
 * 从 src-tauri/Cargo.toml 读取版本号，同步到 package.json
 * 这样只需要在 Cargo.toml 中维护版本号
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

// 读取 Cargo.toml 中的版本号
const cargoTomlPath = resolve(rootDir, 'src-tauri/Cargo.toml');
const cargoToml = readFileSync(cargoTomlPath, 'utf-8');
const versionMatch = cargoToml.match(/^\s*version\s*=\s*"([^"]+)"/m);

if (!versionMatch) {
  console.error('无法从 Cargo.toml 中读取版本号');
  process.exit(1);
}

const version = versionMatch[1];
console.log(`从 Cargo.toml 读取版本号: ${version}`);

// 更新 package.json
const packageJsonPath = resolve(rootDir, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

if (packageJson.version !== version) {
  packageJson.version = version;
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`已更新 package.json 版本号: ${version}`);
} else {
  console.log('版本号已同步，无需更新');
}
