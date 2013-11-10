# mongoose-simpledb

[![Build Status](https://travis-ci.org/chevex/mongoose-simpledb.png)](https://travis-ci.org/chevex/mongoose-simpledb)
[![Dependencies Status](https://gemnasium.com/Chevex/mongoose-simpledb.png)](https://gemnasium.com/Chevex/mongoose-simpledb)
[![NPM version](https://badge.fury.io/js/mongoose-simpledb.png)](http://badge.fury.io/js/simpledb)

> Simple API for defining mongoose models and loading them into a single object for easy access.

## Getting Started

> npm install mongoose-simpledb

After installing simpledb you'll want to define your mongoose models. By default simpledb looks in the root of your project for a directory called "dbmodels" and will load all model files found there. However, you can place your models wherever you wish and pass the location in simpledb's options. Let's look at an example model file.

    // dbmodels/Comment.js

    var ObjectId = require('mongoose').Schema.Types.ObjectId;

    exports.schema = {
        creator: { type: ObjectId, ref: 'User' },
        blogPost: { type: Number, ref: 'BlogPost' },
        url: String,
        body: String,
        date: { type: Date, default: Date.now },
        editedDate: Date,
        editedBy: { type: ObjectId, ref: 'User' }
    };

The only requirement of a model file is that you expose a property called `schema`. simpledb will use this property when creating your Mongoose schema. While `schema` is the only required property for you to define, you can define a few others as well if you'd like to setup instance methods, static methods, or virtual properties.

Instance methods:

    exports.methods = {
        dateFromNow: function () {
            return moment(this.date).fromNow();
        },
        editedDateFromNow: function () {
            return moment(this.editedDate).fromNow();
        }
    };

Static methods:

    exports.statics = {
        tenMostRecent: function (blogPostId, callback) {
            return this.where('date').sort('-date').limit(10).exec(callback);
        }
    };

Virtuals:

    exports.virtuals = {
        bodyHtml: {
            get: function () {
                return marked(this.body);
            }
        },
        website: {
            get: function () {
                return this.url;
            },
            set: function (url) {
                if (!/^http:\/\//i.test(url))
                    url = "http://" + url;
                this.url = url;
            }
        }
    };

You can see that when specifying virtuals you can include both "get" and/or "set" as needed for that virtual property. You can also use dot notation with your instance methods in virtuals. Just replace the method/virtual name with a string and use dots.

    // dbmodels/Person.js

    exports.schema = {
        name: {
            first: String,
            last: String
        }
    };

    exports.virtuals = {
        "name.full": {
            get: function () {
                return this.name.first + ' ' + this.name.last;
            },
            set: function (fullName) {
                if (fullName.indexOf(' ') !== -1) {
                    var segments = fullName.split(' ');
                    this.name.first = segments[0];
                    this.name.last = segments[1];
                } else {
                    this.name.first = fullName;
                }
            }
        }
    };

Once you have a model file you can get reference to simpledb and call its `init` function. You can pass a callback function to `init` that will receive the `db` object when all of your models have finished being loaded into it. Or you can assign the results of the `init` function to a variable which will be lazy-loaded with your models when they are done being loaded;

Callback:

    var simpledb = require('mongoose-simpledb');
    simpledb.init(function (err, db) {
        if (err) return console.error(err);
        // You can safely assume that db is populated with your models.
        db.Comment.find({ blogPost: 123 }, ...):
    });

Lazy-loaded reference:

    var simpledb = require('mongoose-simpledb');
    var db = simpledb.init();
    // After a time...
    db.Comment.find({ blogPost: 123 }, ...);

If you prefer to use the lazy-loaded option then you can check `db.modelsLoaded` to see if the object is ready to be used.

---

## Options

An options object can be passed to the `init` function.

    simpledb.init(options, callback);

Available Options and their default values:

    {
        // The mongoose connection string to use.
        connectionString: 'mongodb:\\localhost',
        // The path to the directory where your models are stored.
        modelsDir: path.join(__dirname, '..', '..', 'dbmodels'),
        // Whether or not simpledb should auto-increment _id's of type Number.
        autoIncrementNumberIds: true
    }

Any of these can be overridden as needed.

---

## Auto-incrementing IDs.

One feature that Mongoose/MongoDB lack out of the box is the ability to automatically increment a simple integer ID with each new document added to the database. I wrote a mongoose plugin called [mongoose-auto-increment](http://github.com/Chevex/mongoose-auto-increment) that enables this functionality. If you explicitly declare the `_id` field on your schema as type `Number` then simpledb will automatically invoke the mongoose-auto-increment plugin for that model.

    exports.schema = {
        _id: Number, // Causes simpledb to auto-increment _id for new documents.
        creator: { type: Schema.Types.ObjectId, ref: 'User' },
        blogPost: { type: Number, ref: 'BlogPost' },
        url: String,
        body: String,
        date: { type: Date, default: Date.now },
        editedDate: Date,
        editedBy: { type: Schema.Types.ObjectId, ref: 'User' }
    };
