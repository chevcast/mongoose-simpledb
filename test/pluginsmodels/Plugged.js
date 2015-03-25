exports.schema = {
    id: Number,
    url: String
};

exports.plugins = [
    {
        plugin: require('mongoose-auto-increment').plugin,
        options: {model:'Plugged', startAt:5, field: 'id'}
    }
];
