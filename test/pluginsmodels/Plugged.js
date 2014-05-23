exports.schema = {
    _id: Number,
    url: String
};

exports.plugins = [
    {
        plugin: require('mongoose-auto-increment').plugin,
        options: 'Plugged'
    }
];
