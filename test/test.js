var should = require('chai').should(),
    simpledb = require('..'),
    async = require('async'),
    path = require('path'),
    options = {
        modelsDir: path.join(__dirname, 'dbmodels')
    },
    _db;

after(function (done) {
    _db.connection.db.executeDbCommand({ dropDatabase: 1 }, done);
});

describe("simpledb", function () {

    describe("init", function () {

        afterEach(function () {

        });

        it("should invoke our callback and pass in a db object with our models loaded.", function (done) {
            simpledb.init(options, function (err, db) {
                should.not.exist(err);
                should.exist(db);
                db.should.have.property('modelsLoaded', true);
                done();
            });
        });

        it ("should return a db object that is lazy-loaded with our models.", function (done) {
            var db = simpledb.init(options, function (err) {
                should.not.exist(err);
                db.should.have.property('modelsLoaded', true);
                done();
            });
            should.exist(db);
            db.should.have.property('modelsLoaded', false);
        });

        it("should allow us to pass in just a connection", function (done) {
            simpledb.init('mongodb://localhost/mongoose-simpledb-test', function (err) {
                // We aren't specifying a models directory and the default models directory doesn't exist so this
                // should fail with a "readdir" error.
                should.exist(err);
                err.message.substr(0, 15).should.equal('ENOENT, readdir');
                done();
            });
        });

        it("should still invoke our callback if it is passed as the first and only argument.", function (done) {
            simpledb.init(function (err) {
                // We aren't specifying a models directory and the default models directory doesn't exist so this
                // should fail with a "readdir" error.
                should.exist(err);
                err.message.substr(0, 15).should.equal('ENOENT, readdir');
                done();
            });
        });

    });

    describe("db object", function () {

        before(function (done) {
            simpledb.init(options, function (err, db) {
                if (err) return done(err);
                _db = db;
                done();
            });
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
