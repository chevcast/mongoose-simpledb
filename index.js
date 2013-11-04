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
                connectionString: 'mongodb:\\localhost',
                // The path to the directory where your models are stored.
                modelsDir: path.join(__dirname, '..', '..', 'dbmodels'),
                // Whether or not dbwrapper should auto-increment _id's of type Number.
                autoIncrementNumberIds: true,
                // By default print errors to the console.
                error: console.error.bind(console)
            };
        if (options)
            extend(settings, options);
        var conn = mongoose.createConnection(settings.connectionString, { server: { socketOptions: { keepAlive: 1 } } });
        conn.on('error', console.error);
        conn.once('open', function () {
            // If mongoose-auto-increment plugin is installedInitialize mongoose-auto-increment plugin.
            if (settings.autoIncrementNumberIds)
                autoIncrement.initialize(conn);

            // Find and load all Mongoose models from the models directory.
            fs.readdir(settings.modelsDir, function (err, files) {
                if (err) return settings.error(err);
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
                        if(settings.autoIncrementNumberIds)
                            if (schema.paths.hasOwnProperty('_id') && schema.paths._id.instance === 'Number')
                                schema.plugin(autoIncrement.plugin, modelName);

                        // Store model in db API.
                        db[modelName] = conn.model(modelName, schema);
                    }
                });

                // Set modelsLoaded to true.
                db.modelsLoaded = true;

                // Invoke callback with resulting db object.
                if (callback)
                    callback(db);
            });
        });

        // Return db object immediately in case the app would like a lazy-loaded reference.
        return db;
    }
};