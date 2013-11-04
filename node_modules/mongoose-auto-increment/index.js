// Module Scope
var mongoose = require('mongoose'),
    extend = require('extend'),
    counterSchema,
    Counter;

// Initialize plugin by creating counter collection in database.
exports.initialize = function (connection) {

    try {
        Counter = connection.model('mongoose-auto-increment');
    } catch (ex) {
        if (ex.name === 'MissingSchemaError') {
            // Create new counter schema.
            counterSchema = new mongoose.Schema({
                model: {
                    type: String,
                    require: true
                },
                field: {
                    type: String,
                    require: true
                },
                count: {
                    type: Number,
                    default: 0
                }
            });

            // Create a unique index using the "field" and "model" fields.
            counterSchema.index({ field: 1, model: 1 }, { unique: true, required: true, index: -1 });

            // Create model using new schema.
            Counter = connection.model('Mongoose-Auto-Increment', counterSchema);
        }
        else
            throw ex;
    }

};

// The function to use when invoking the plugin on a custom schema.
exports.plugin = function (schema, options) {

    // If we don't have reference to the counterSchema or the Counter model then the plugin was most likely not
    // initialized properly so throw an error.
    if (!counterSchema || !Counter) throw new Error("mongoose-auto-increment has not been initialized");

    // Default settings and plugin scope variables.
    var settings = {
            model: null, // The model to configure the plugin for.
            field: '_id', // The field the plugin should track.
            startAt: 0, // The number the count should start at.
            incrementBy: 1 // The number by which to increment the count each time.
        },
        fields = {}, // A hash of fields to add properties to in Mongoose.
        ready = false; // True if the counter collection has been updated and the document is ready to be saved.

    switch (typeof(options)) {
        // If string, the user chose to pass in just the model name.
        case 'string':
            settings.model = options;
            break;
        // If object, the user passed in a hash of options.
        case 'object':
            extend(settings, options);
            break;
    }

    // Add properties for field in schema.
    fields[settings.field] = {
        type: Number,
        unique: true,
        require: true
    };
    schema.add(fields);

    // Find the counter for this model and the relevant field.
    Counter.findOne(
        { model: settings.model, field: settings.field },
        function (err, counter) {
            if (!counter) {
                // If no counter exists then create one and save it.
                counter = new Counter({ model: settings.model, field: settings.field, count: settings.startAt - settings.incrementBy });
                counter.save(function () {
                    ready = true;
                });
            }
            else
                ready = true;
        }
    );

    // Declare a function to get the next counter for the model/schema.
    var nextCount = function (callback) {
        Counter.findOne({
            model: settings.model,
            field: settings.field
        }, function (err, counter) {
            if (err) return callback(err);
            callback(null, counter === null ? settings.startAt : counter.count + settings.incrementBy);
        });
    };
    // Add nextCount as both a method on documents and a static on the schema for convenience.
    schema.method('nextCount', nextCount);
    schema.static('nextCount', nextCount);

    // Every time documents in this schema are saved, run this logic.
    schema.pre('save', function (next) {
        // Get reference to the document being saved.
        var doc = this;

        // If the document already has the field we're interested in and that field is a number OR the user specified
        // that we should increment even on document updates, then run this logic.
        if (typeof(doc[settings.field]) !== 'number') {
            (function save() {
                // If read, run increment logic.
                if (ready) {
                    // Find the counter collection for this model and field and update it.
                    Counter.findOneAndUpdate(
                        { model: settings.model, field: settings.field },
                        { $inc: { count: settings.incrementBy } },
                        { new: true }, // new: true specifies that the callback should get the updated counter.
                        function (err, updatedCounter) {
                            if (err) return next(err);
                            doc[settings.field] = updatedCounter.count;
                            next();
                        }
                    );
                }
                // If not ready then set a 5 millisecond timer and try to save again. It will keep doing this until
                // the counter collection is ready.
                else
                    setTimeout(save, 5);
            })();
        }
        // If the document does not have the field we're interested in or that field isn't a number AND the user did
        // not specify that we should increment on updates, then just continue the save without any increment logic.
        else
            next();
    });
};
