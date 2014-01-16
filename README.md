# mongoose-simpledb

[![Build Status](https://travis-ci.org/chevex/mongoose-simpledb.png)](https://travis-ci.org/chevex/mongoose-simpledb)
[![Dependencies Status](https://gemnasium.com/Chevex/mongoose-simpledb.png)](https://gemnasium.com/Chevex/mongoose-simpledb)
[![NPM version](https://badge.fury.io/js/mongoose-simpledb.png)](http://badge.fury.io/js/mongoose-simpledb)

> Simple API for defining mongoose models and loading them into a single object for easy access.

## Getting Started

> npm install mongoose-simpledb

Note: You do not need to install mongoose. Simpledb is intended to hide mongoose so you never have to install or require it.

After installing simpledb you'll want to define your mongoose models. By default simpledb looks in the root of your project for a directory called "dbmodels" and will load all model files found there. However, you can place your models wherever you wish and pass the location in simpledb's options. Let's look at an example model file.

```javascript
// dbmodels/Comment.js

var ObjectId = require('mongoose-simpledb').Types.ObjectId;

exports.schema = {
    creator: { type: ObjectId, ref: 'User' },
    blogPost: { type: Number, ref: 'BlogPost' },
    url: String,
    body: String,
    date: { type: Date, default: Date.now },
    editedDate: Date,
    editedBy: { type: ObjectId, ref: 'User' }
};
```
    
Once you have a model file you can get reference to simpledb and call its `init` function. You can pass a callback function to `init` that will receive the `db` object when all of your models have finished being loaded into it. Or you can assign the results of the `init` function to a variable which will be lazy-loaded with your models when they are done being loaded;

Callback:

```javascript
var simpledb = require('mongoose-simpledb');
simpledb.init(function (err, db) {
    if (err) return console.error(err);
    // You can safely assume that db is populated with your models.
    db.Comment.find({ blogPost: 123 }, ...):
});
```

Lazy-loaded reference:

```javascript
var simpledb = require('mongoose-simpledb');
var db = simpledb.init();
// After a time...
db.Comment.find({ blogPost: 123 }, ...);
```

If you prefer to use the lazy-loaded option then you can check `db.modelsLoaded` to see if the object is ready to be used. The only requirement of a model file is that you expose a property called `schema`. simpledb will use this property when creating your Mongoose schema. While `schema` is the only required property for you to define, you can define a few others as well if you'd like to setup instance methods, static methods, or virtual properties.

## Need instance methods?

```javascript
exports.methods = {
    dateFromNow: function () {
        return moment(this.date).fromNow();
    },
    editedDateFromNow: function () {
        return moment(this.editedDate).fromNow();
    }
};
```

## What about statics?

```javascript
exports.statics = {
    tenMostRecent: function (blogPostId, callback) {
        return this.where('date').sort('-date').limit(10).exec(callback);
    }
};
```

## Yes, you can even define virtual properties.

```javascript
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
```

You can see that when specifying virtuals you can include both "get" and/or "set" as needed for that virtual property. You can also use dot notation with your instance methods in virtuals. Just replace the method/virtual name with a string and use dots.

```javascript
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
```

## Options

An options object can be passed to the `init` function.
```javascript
simpledb.init(options, callback);
```

Available Options and their default values:

```javascript
{
    // The mongoose connection string to use.
    connectionString: 'mongodb:\\localhost',
    // The path to the directory where your models are stored.
    modelsDir: path.join(__dirname, '..', '..', 'dbmodels'),
    // Whether or not simpledb should auto-increment _id's of type Number.
    autoIncrementNumberIds: true
}
```

Any of these can be overridden as needed.

---

## Need a reference to `ObjectId` or other mongoose types?

One goal of simpledb is to hide mongoose so that you never have to install it or `require` it yourself. One problem with this is that sometimes you need access to mongoose's types. For this reason simpledb exposes `mongoose.Schema.Types` as `simpledb.Types`.
```javascript
var ObjectId = require('mongoose-simpledb').Types.ObjectId;
```

Then you can use it in your schemas.

```javascript
exports.schema = {
    creator: { type: ObjectId, ref: 'User' }
};
```

---

## Want to get rid of `ObjectId` altogether and use a simple incrementing `Number` `_id`?

Oe feature that Mongoose/MongoDB lack out of the box is the ability to automatically increment a simple integer ID with each new document added to the database. I wrote a mongoose plugin called [mongoose-auto-increment](http://github.com/Chevex/mongoose-auto-increment) that enables this functionality. If you explicitly declare the `_id` field on your schema as type `Number` then simpledb will automatically invoke the mongoose-auto-increment plugin for that model.

```javascript
exports.schema = {
    _id: Number, // Causes simpledb to auto-increment _id for new documents.
    creator: { type: Number, ref: 'User' }
};
```

---

## Tired of passing the `db` around to other areas of your application?

In node modules are cached after they are first grabbed with `require`. Simpledb utilizes this fact to make it extremely easy for you to access your `db` object from anywhere by simply calling `require` again. As long as you've called `init` and enough time has passed for your `db` object's models to be loaded then you can access it.

```javascript
var simpledb = require('mongoose-simpledb');

simpledb.init(connectionString);

// After a time...

var db = require('mongoose-simpledb').db;
```

Remember that you can always check `db.modelsLoaded` to ensure that the object is ready to use.
