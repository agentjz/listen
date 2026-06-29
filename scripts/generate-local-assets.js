const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const assetsRoot = path.join(root, 'local-assets');
const outputDir = path.join(root, 'miniprogram', 'generated');
const outputFile = path.join(outputDir, 'localAssets.ts');
const audioFormats = ['mp3', 'm4a', 'wav'];
const defaultMetadata = {
  libraryId: 'public-library',
  libraryName: '公共资源',
  libraryKind: 'general'
};

function titleFromFolderId(folderId) {
  return folderId
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function readMaterials() {
  if (!fs.existsSync(assetsRoot)) {
    return [];
  }

  return fs
    .readdirSync(assetsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const folderId = entry.name;
      const materialDir = path.join(assetsRoot, folderId);
      const textPath = path.join(materialDir, 'text.txt');
      const metadata = readMetadata(materialDir);
      const content = fs.existsSync(textPath) ? fs.readFileSync(textPath, 'utf8').trim() : '';
      const audioFormat = audioFormats.find((format) => fs.existsSync(path.join(materialDir, `audio.${format}`)));

      return {
        id: folderId,
        title: titleFromFolderId(folderId),
        libraryId: metadata.libraryId,
        libraryName: metadata.libraryName,
        libraryKind: metadata.libraryKind,
        content,
        audio: audioFormat
          ? {
              format: audioFormat,
              cloudFileId: `/local-assets/${folderId}/audio.${audioFormat}`
            }
          : null,
      };
    });
}

function readMetadata(materialDir) {
  const metadataPath = path.join(materialDir, 'metadata.json');
  if (!fs.existsSync(metadataPath)) {
    return defaultMetadata;
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  return {
    libraryId: metadata.libraryId || defaultMetadata.libraryId,
    libraryName: metadata.libraryName || defaultMetadata.libraryName,
    libraryKind: metadata.libraryKind || defaultMetadata.libraryKind
  };
}

function writeOutput(materials) {
  fs.mkdirSync(outputDir, { recursive: true });
  const serialized = JSON.stringify(materials, null, 2)
    .replace(/"format": "([^"]+)"/g, '"format": "$1" as AudioFormat')
    .replace(/"audio": null/g, '"audio": null');
  const body = `import { AudioFormat } from '../types/domain';

export interface LocalAssetMaterial {
  id: string;
  title: string;
  libraryId: string;
  libraryName: string;
  libraryKind: 'system' | 'general' | 'user';
  content: string;
  audio: {
    format: AudioFormat;
    cloudFileId: string;
  } | null;
}

export const LOCAL_ASSET_MATERIALS: LocalAssetMaterial[] = ${serialized};
`;
  fs.writeFileSync(outputFile, body, 'utf8');
}

writeOutput(readMaterials());
console.log('Generated miniprogram/generated/localAssets.ts');
