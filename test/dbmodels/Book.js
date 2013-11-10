var ObjectId = require('mongoose').Schema.Types.ObjectId,
    async = require('async'),
    moment = require('moment');

exports.schema = {
    _id: Number,
    title: String,
    publishDate: { type: Date, default: Date.now() },
    author: { type: ObjectId, ref: 'Author' }
};

exports.methods = {
    formatPublishDate: function (formatString) {
        return moment(this.publishDate).format(formatString);
    }
};

exports.statics = {
    findByAuthor: function (firstName, lastName, cb) {
        var query = { "name.first": firstName },
            self = this;
        if (lastName) query["name.last"] = lastName;
        self.model('Author').find(query, function (err, authors) {
            if (err) return cb(err);
            var queries = [];
            authors.forEach(function (author) {
                queries.push(function (cb) {
                    self.model('Book').find({ author: author._id }, cb);
                });
            });
            async.parallel(queries, function (err, results) {
                if (err) return cb(err);
                var allBooks = [];
                results.forEach(function (books) {
                    allBooks.concat(books);
                });
                cb(null, allBooks);
            })
        });
    }
};