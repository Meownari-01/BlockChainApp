module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            'react-native-reanimated/plugin',
            [
                'module-resolver',
                {
                    root: ['./'],
                    extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
                    alias: {
                        '@': './',
                        '@components': './src/components',
                        '@services': './src/services',
                        '@constants': './src/constants',
                        '@hooks': './src/services/hooks',
                        '@types': './src/types',
                    },
                },
            ],
        ],
    };
};
