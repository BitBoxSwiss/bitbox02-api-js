const path = require('path');

module.exports = {
  entry: [
    'regenerator-runtime/runtime.js',
    './src/index.js',
  ],
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  devtool: 'source-map',
};
