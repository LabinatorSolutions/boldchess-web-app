const path = require('path');

module.exports = {
 "mode": "none",
 "entry": "./scripts.js",
 "output": {
   "path": __dirname + '/dist',
   "filename": "bundle.js"
 },
 devtool: 'cheap-module-eval-source-map',
 devServer: {
   contentBase: path.join(__dirname, 'dist')
 },
 "module": {
   "rules": [
     {
       "test": /\.js$/,
       "exclude": /node_modules/,
       "use": {
         "loader": "babel-loader",
         "options": {
           "presets": [
             "@babel/preset-env",
           ]
         }
       }
     },
   ]
 }
};