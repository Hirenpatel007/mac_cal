const path = require('node:path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
const macOSReactNativePath = path.dirname(
  require.resolve('react-native-macos/package.json'),
);

module.exports = mergeConfig(defaultConfig, {
  resolver: {
    // Use the macOS fork for native components and platform-specific core files.
    extraNodeModules: {
      'react-native': macOSReactNativePath,
    },
    platforms: [...defaultConfig.resolver.platforms, 'macos'],
  },
});
