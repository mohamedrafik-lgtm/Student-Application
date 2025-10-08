const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    alias: {
      '@react-native-async-storage/async-storage': '@react-native-async-storage/async-storage/lib/commonjs/index.js',
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
