const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
const config = getDefaultConfig(projectRoot);

// Watch the monorepo packages directory
config.watchFolders = [
  path.join(monorepoRoot, 'packages'),
];

// Force Metro to resolve dependencies from the mobile app itself to avoid pulling React from the repo root.
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [
  path.join(projectRoot, 'node_modules'),
  path.join(monorepoRoot, 'node_modules'),
];
config.resolver.extraNodeModules = {
  react: path.join(projectRoot, 'node_modules/react'),
  'react-dom': path.join(projectRoot, 'node_modules/react-dom'),
  'react-native': path.join(projectRoot, 'node_modules/react-native'),
  'react-native-web': path.join(projectRoot, 'node_modules/react-native-web'),
  '@react-native/virtualized-lists': path.join(projectRoot, 'node_modules/@react-native/virtualized-lists'),
  // Shared packages
  '@lms/core': path.join(monorepoRoot, 'packages/core'),
  '@lms/auth': path.join(monorepoRoot, 'packages/auth'),
  '@lms/api': path.join(monorepoRoot, 'packages/api'),
  '@lms/events': path.join(monorepoRoot, 'packages/events'),
};

module.exports = config;

