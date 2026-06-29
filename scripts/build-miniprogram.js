const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = process.cwd();
const outputRoot = path.join(root, 'dist', 'miniprogram');
const vantSourceRoot = path.join(root, 'node_modules', '@vant', 'weapp', 'dist');
const vantOutputRoot = path.join(outputRoot, 'miniprogram_npm', '@vant', 'weapp');

const rootFiles = ['app.json', 'app.wxss', 'sitemap.json'];
const staticRoots = [
  { from: path.join(root, 'pages'), to: path.join(outputRoot, 'pages'), extensions: new Set(['.json', '.wxml', '.wxss']) },
  { from: path.join(root, 'local-assets'), to: path.join(outputRoot, 'local-assets') }
];

function assertExists(targetPath, label) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`${label} does not exist: ${path.relative(root, targetPath)}`);
  }
}

function copyFile(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function copyDirectory(source, target, options = {}) {
  assertExists(source, 'Build input');
  const entries = fs.readdirSync(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath, options);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (options.extensions && !options.extensions.has(path.extname(entry.name))) {
      continue;
    }

    copyFile(sourcePath, targetPath);
  }
}

function writeProjectConfig() {
  const sourcePath = path.join(root, 'project.config.json');
  assertExists(sourcePath, 'Project config');
  const config = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  config.miniprogramRoot = './';
  config.cloudfunctionRoot = 'cloudfunctions/';
  fs.writeFileSync(path.join(outputRoot, 'project.config.json'), `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

function runTypeScriptBuild() {
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(command, ['tsc', '-p', 'tsconfig.build.json'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error('TypeScript build failed.');
  }
}

function main() {
  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(outputRoot, { recursive: true });

  for (const fileName of rootFiles) {
    const sourcePath = path.join(root, fileName);
    assertExists(sourcePath, 'Root miniprogram file');
    copyFile(sourcePath, path.join(outputRoot, fileName));
  }

  for (const item of staticRoots) {
    copyDirectory(item.from, item.to, { extensions: item.extensions });
  }

  assertExists(vantSourceRoot, 'Vant Weapp dist');
  copyDirectory(vantSourceRoot, vantOutputRoot);
  writeProjectConfig();
  runTypeScriptBuild();

  console.log('Built dist/miniprogram');
}

main();
