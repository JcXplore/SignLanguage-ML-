// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The sign classifier's weights (assets/models/fsl105/weights.bin) ship as an asset.
config.resolver.assetExts.push('bin');

module.exports = config;
