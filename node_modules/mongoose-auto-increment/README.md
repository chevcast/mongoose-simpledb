# mongoose-auto-increment

[![Build Status](https://travis-ci.org/Chevex/mongoose-auto-increment.png)](https://travis-ci.org/Chevex/mongoose-auto-increment)
[![Dependencies Status](https://gemnasium.com/Chevex/mongoose-auto-increment.png)](https://gemnasium.com/Chevex/mongoose-auto-increment)
[![NPM version](https://badge.fury.io/js/mongoose-auto-increment.png)](http://badge.fury.io/js/mongoose-auto-increment)

> Mongoose plugin that auto-increments any ID field on your schema every time a document is saved.

## Getting Started

> npm install mongoose-auto-increment

Once you have the plugin installed it is very simple to use. Just get reference to it, initialize it by passing in your
mongoose connection and pass `autoIncrement.plugin` to the `plugin()` function on your schema.

> Note: You only need to initialize MAI once.

    var mongoose = require('mongoose'),
        autoIncrement = require('mongoose-auto-increment');

    var connection = mongoose.createConnection("mongodb://localhost/myDatabase");

    autoIncrement.initialize(connection);

    var bookSchema = new mongoose.Schema({
        author: { type: Schema.Types.ObjectId, ref: 'Author' },
        title: String,
        genre: String,
        publishDate: Date
    });

    bookSchema.plugin(autoIncrement.plugin, 'Book');
    var Book = connection.model('Book', bookSchema);

That's it. Now you can create book entities at will and the `_id` field will automatically increment with each new document.

### Want a field other than `_id`?

    bookSchema.plugin(autoIncrement.plugin, { model: 'Book', field: 'bookId' });

### Want that field to start at a different number than zero or increment by more than one?

    bookSchema.plugin(autoIncrement.plugin, {
        model: 'Book',
        field: 'bookId',
        startAt: 100,
        incrementBy: 100
    });

Your first book document would have a `bookId` equal to `100`. Your second book document would have a `bookId` equal to `200`, and so on.

### Want your field to increment every time you update it too?

    bookSchema.plugin(autoIncrement.plugin, {
        model: 'Book',
        field: 'bookId',
        startAt: 100,
        incrementBy: 100
    });

### Want to know the next number coming up?

    var Book = connection.model('Book', bookSchema);
    Book.nextCount(function(err, count) {

        // count === 0 -> true

        var book = new Book();
        book.save(function(err) {

            // book._id === 0 -> true

            book.nextCount(function(err, count) {

                // count === 1 -> true

            });
        });
    });
    
nextCount is both a static method on the model (`Book.nextCount(...)`) and an instance method on the document (`book.nextCount(...)`).
