var should = require('chai').should(),
    simpledb = require('..'),
    async = require('async'),
    path = require('path');

describe("simpledb", function () {

    describe("returned db object", function () {

        var _db;
        before(function (done) {
            simpledb.init({ modelsDir: path.join(__dirname, 'dbmodels') }, function (err, db) {
                if (err) return done(err);
                _db = db;
                done();
            });
        });

        after(function (done) {
            _db.connection.db.executeDbCommand({ dropDatabase: 1 }, done);
        });

        it("should load all dbmodels and attach them to a single object.", function () {

            _db.should.have.property('Book').with.property('modelName', 'Book');
            _db.should.have.property('Author').with.property('modelName', 'Author');

        });

        it("should attach any static methods to the model.", function () {

            _db.Book.should.have.property('findByAuthor').and.be.a('function');

        });

        it("should attach any instance methods to the model.", function () {

            // Arrange
            var book = new _db.Book(),
                author = new _db.Author();

            // Assert
            book.should.have.property('formatPublishDate').and.be.a('function');
            author.should.have.property('formatBirthday').and.be.a('function');
            author.should.have.property('bioHtml').and.be.a('function');

        });

        it("should attach any virtual properties to the model.", function () {

            // Arrange
            var author = new _db.Author({
                name: {
                    first: 'Alex',
                    last: 'Ford'
                },
                birthday: new Date('3/2/1987')
            });

            // Assert
            author.should.have.property('name').with.property('full', 'Alex Ford');

        });

        it("should use mongoose-auto-increment plugin if _id is set to type \"Number\"", function (done) {

            // Arrange
            var book = new _db.Book({
                title: "The Hobbit",
                author: new _db.Author({ name: { first: "J. R. R.", last: "Tolkien" } }),
                publishDate: new Date("9/21/1937")
            });

            // Act
            async.series({
                book: function (cb) {
                    book.save(cb);
                },
                nextCount: function (cb) {
                    book.nextCount(cb);
                }
            }, assert);

            // Assert
            function assert(err, results) {
                should.not.exist(err);
                results.book[0].should.have.property('_id', 0);
                results.nextCount.should.equal(1);
                done();
            }

        });

    });

});