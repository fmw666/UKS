const Conf = require('conf');
const schema = {
    storagePath: {
        type: 'string',
        default: process.env.UKS_STORAGE_PATH || './knowledge/uks_graph'
    }
};

const config = new Conf({ 
    projectName: 'uks-cli', 
    schema 
});

module.exports = config;
