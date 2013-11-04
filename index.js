var mongoose = require('mongoose'),
    fs = require('fs'),
    path = require('path'),
    autoIncrement = require('mongoose-auto-increment'),
    extend = require('extend');

module.exports = exports = {
    init: function (callback, options) {
        var db = {},
            settings = {
                connectionString: process.env.CONNECTION_STRING.toString() || 'mongodb:\\localhost',
                modelsDir: path.join(__dirname, '..', 'models'),
                autoIncrementIds: true
            };
        extend(settings, options);
        var conn = mongoose.createConnection(connectionString, { server: { socketOptions: { keepAlive: 1 } } });
        conn.on('error', console.error);
        conn.once('open', function () {
            // If mongoose-auto-increment plugin is installedInitialize mongoose-auto-increment plugin.
            if (autoIncrement)
                autoIncrement.initialize(conn);

            // Find and load all Mongoose models from the models directory.
            fs.readdir(settings.modelsDir, function (files) {
                files.forEach(function (file) {
                    if (path.extname(file) === '.js') {
                        var modelName = path.basename(file.replace(path.extname(file), '')),
                            modelData = require(path.join(settings.modelsDir, file));

                        // Create schema based on template in model file.
                        var schema = new mongoose.Schema(modelData.schema);

                        // Add any instance methods defined in model file.
                        extend(schema.methods, modelData.methods);

                        // Add any static methods defined in model file.
                        extend(schema.statics, modelData.statics);

                        // Add any virtual properties defined in model file.
                        for (var key in modelData.virtuals) {
                            if (modelData.virtuals.hasOwnProperty(key)) {
                                var virtualData = modelData.virtuals[key];
                                if (virtualData.hasOwnProperty('get'))
                                    schema.virtual(key).get(virtualData.get);
                                if (virtualData.hasOwnProperty('set'))
                                    schema.virtual(key).set(virtualData.set);
                            }
                        }

                        // If autoIncrementIds:true then utilize mongoose-auto-increment plugin for this model.
                        if(settings.autoIncrementIds)
                            if (schema.paths.hasOwnProperty('_id') && schema.paths._id.instance === 'Number')
                                schema.plugin(autoIncrement.plugin, modelName);

                        // Store model in db API.
                        db[modelName] = conn.model(modelName, schema);
                    }
                });

                // Invoke callback with resulting db object.
                callback(db);
            });
        });

        // Return db object immediately in case the app would like a lazy-loaded reference.
        return db;
    }
};