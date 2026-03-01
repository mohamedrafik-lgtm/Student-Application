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
    // Resolve react-native-vision-camera from pre-built lib instead of src
    resolveRequest: (context, moduleName, platform) => {
      if (
        moduleName === 'react-native-vision-camera' ||
        moduleName.startsWith('react-native-vision-camera/')
      ) {
        const newContext = {
          ...context,
          resolveRequest: undefined,
          mainFields: ['main', 'module'],
        };
        return context.resolveRequest(newContext, moduleName, platform);
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
