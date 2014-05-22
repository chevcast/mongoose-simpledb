exports.schema = {
    _id: Number
};

exports.plugins = [ {plugim: require('mongoose-auto-increment'), options: 'WrongPlugin'} ];