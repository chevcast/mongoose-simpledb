var mongoose = require('mongoose'),
    fs = require('fs'),
    path = require('path'),
    autoIncrement = require('mongoose-auto-increment'),
    extend = require('extend');

module.exports = exports = {
    init: function () {
        var options, callback;
        switch (arguments.length) {
            case 1:
                callback = arguments[0];
                break;
            case 2:
                options = arguments[0];
                callback = arguments[1];
                break;
        }

        var db = { modelsLoaded: false },
            settings = {
                // The mongoose connection string to use.
                connectionString: 'mongodb://localhost/mongoose-simpledb-test',
                // The path to the directory where your dbmodels are stored.
                modelsDir: path.join(__dirname, '..', '..', 'dbmodels'),
                // Whether or not simpledb should auto-increment _id's of type Number.
                autoIncrementNumberIds: true
            };
        if (options)
            extend(settings, options);
        db.connection = mongoose.createConnection(settings.connectionString, { server: { socketOptions: { keepAlive: 1 } } });
        db.connection.on('error', callback);
        db.connection.once('open', function () {
            // If mongoose-auto-increment plugin is installedInitialize mongoose-auto-increment plugin.
            if (settings.autoIncrementNumberIds)
                autoIncrement.initialize(db.connection);

            // Find and load all Mongoose dbmodels from the dbmodels directory.
            fs.readdir(settings.modelsDir, function (err, files) {
                if (err) return callback(err);
                files.forEach(function (file) {
                    if (path.extname(file) === '.js') {
                        var modelName = path.basename(file.replace(path.extname(file), '')),
                            modelData = require(path.join(settings.modelsDir, file));

                        if (!modelData.hasOwnProperty('schema'))
                            return settings.error('Model file ' + file + ' is invalid.')

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
                        if (settings.autoIncrementNumberIds)
                            if (schema.paths.hasOwnProperty('_id') && schema.paths._id.instance === 'Number')
                                schema.plugin(autoIncrement.plugin, modelName);

                        // Store model in db API.
                        db[modelName] = db.connection.model(modelName, schema);
                    }
                });

                // Set modelsLoaded to true.
                db.modelsLoaded = true;

                // Invoke callback with resulting db object.
                if (callback) callback(null, db);
            });
        });

        // Return db object immediately in case the app would like a lazy-loaded reference.
        return db;
    }
};