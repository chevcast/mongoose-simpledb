var mongoose = require('mongoose'),
    fs = require('fs'),
    path = require('path'),
    autoIncrement = require('mongoose-auto-increment'),
    extend = require('extend'),
    async = require('async');

module.exports = exports = {
    
    // Declare a hash for storing active connections.
    dbs: {},

    // 
    init: function () {
        var _this = this,
            settings = {
                // The callback to invoke when models are loaded.
                // Default function is empty and does nothing. It's only here to provide a method signature.
                callback: function (err, db) {},
                // The mongoose connection string to use.
                connectionString: 'mongodb://localhost/mongoose-simpledb-test',
                // The path to the directory where your dbmodels are stored.
                modelsDir: path.join(__dirname, '..', '..', 'dbmodels'),
                // Whether or not simpledb should auto-increment _id's of type Number.
                autoIncrementNumberIds: true,
                // Simpledb will store multiple connections. A name is optional and defaults to "db" and whatever number of connection it is.
                name: 'db' + (Object.keys(_this.dbs).length + 1)
            };

        switch (arguments.length) {
            case 1:
                switch (typeof arguments[0]) {
                    // If the only argument is a function, set callback setting.
                    case 'function':
                        settings.callback = arguments[0];
                        break;
                    // If the only argument is a string, set the connectionString setting.
                    case 'string':
                        settings.connectionString = arguments[0];
                        break;
                    // If the only argument is an object, extend settings with the object.
                    case 'object':
                        extend(settings, options);
                }
                break;
            case 2:
                // If both arguments are strings then set the name and connectionString settings.
                if (typeof arguments[0] === 'string' && typeof arguments[1] === 'string') {
                    settings.name = arguments[0];
                    settings.connectionString = arguments[2];
                }
                // If the first arg is a string and the second is a function then set the connectionString and callback settings.
                else if (typeof arguments[0] === 'string' && typeof arguments[1] === 'function') {
                    settings.connectionString = arguments[0];
                    settings.callback = arguments[1];
                }
                // If the first arg is an object and the second is a function then extend settings with the object and set the callback setting.
                else if (typeof arguments[0] === 'object' && typeof arguments[1] === 'function') {
                    extend(settings, arguments[0]);
                    settings.callback = arguments[1];
                }
                break;
            case 3:
                // If the first two args are strings and the last is a function then set the name, connectionString, and callback settings.
                if (typeof arguments[0] === 'string' && typeof arguments[1] === 'string' && typeof arguments[2] === 'function') {
                    settings.name = arguments[0];
                    settings.connectionString = arguments[1];
                    settings.callback = arguments[2];
                }
                break;
        }

        // Create db object.
        var db = {
            name: settings.name,
            modelsLoaded: false
        };

        // Create mongoose connection and attach it to db object.
        db.connection = mongoose.createConnection(settings.connectionString, { server: { socketOptions: { keepAlive: 1 } } });

        // If a mongoose error occurs then invoke the callback with the error.
        db.connection.on('error', settings.callback);

        // Whenever a connection closes remove the db object from the collection.
        db.connection.on('close', function () {
            delete _this.dbs[db.name];
        });

        // Once the connection is open begin to load models from the database.
        db.connection.once('open', function () {
            // If mongoose-auto-increment plugin is installedInitialize mongoose-auto-increment plugin.
            if (settings.autoIncrementNumberIds)
                autoIncrement.initialize(db.connection);

            // Find and load all Mongoose dbmodels from the dbmodels directory.
            fs.readdir(settings.modelsDir, function (err, files) {
                if (err) return settings.callback(err);
                files.forEach(function (file) {
                    if (path.extname(file) === '.js') {
                        var modelName = path.basename(file.replace(path.extname(file), '')),
                            modelData = require(path.join(settings.modelsDir, file));

                        if (!modelData.hasOwnProperty('schema'))
                            return settings.callback(new Error('Model file ' + file + ' is invalid: No schema.'));

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
                if (settings.callback) settings.callback(null, db);
            });
        });

        // Store the db object for later retrieval.
        _this.dbs[db.name] = db;

        // Return db object immediately in case the app would like a lazy-loaded reference.
        return db;
    },
    
    // Closes all connections and clears all stored dbs.
    reset: function (callback) {
        var _this = this,
            toClose = [];
        for (var key in _this.dbs) {
            var connection = _this.dbs[key].connection;
            toClose.push(connection.close.bind(connection));
        }
        async.parallel(toClose, function (err) {
            if (callback) callback(err);
        });
    },

    // Expose mongoose types for easy access.
    Types: mongoose.Schema.Types
};
