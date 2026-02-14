const types = require('./types');
const drivers = require('./drivers');

module.exports = {
    ...types,
    ...drivers,
    // Ensure we export the same instance of PluginManager if it was stateful, 
    // but types.js exports a new instance.
    // If PluginManager needs to be a singleton across the app, we should be careful.
    // Given the previous code, it exported `new PluginManager()`.
    // types.js also exports `new PluginManager()`.
    // So `require('index.js').PluginManager` is DIFFERENT from `require('types.js').PluginManager`.
    // This might be confusing if not careful, but for now `index.js` is the main entry point.
    PluginManager: types.PluginManager 
};
