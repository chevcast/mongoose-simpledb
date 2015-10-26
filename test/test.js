var should = require('chai').should();
var simpledb = require('..');
var async = require('async');
var extend = require('extend');
var path = require('path');
var options = {
  connectionString: 'mongodb://localhost/mongoose-simpledb-test',
  modelsDir: path.join(__dirname, 'dbmodels')
};

after(function (done) {
  simpledb.init(options, function (err, db) {
    if (err) return done(err);
    setTimeout(function () {
      db.connection.db.dropDatabase(function (err) {
        if (err) return done(err);
        db.connection.close(done);
      });
    }, 1000);
  });
});

describe("simpledb", function () {

  describe("init", function () {

    it("should invoke our callback and pass in a db object with our models loaded.", function (done) {
      simpledb.init(options, function (err, db) {
        should.not.exist(err);
        should.exist(db);
        db.should.have.property('modelsLoaded', true);
        done();
      });
    });

    it("should return a db object that is lazy-loaded with our models.", function (done) {
      var db = simpledb.init(options, function (err) {
        should.not.exist(err);
        db.should.have.property('modelsLoaded', true);
        done();
      });
      should.exist(db);
      db.should.have.property('modelsLoaded', false);
    });

    it("should allow us to pass in just a connection", function (done) {
      simpledb.init(options.connectionString, function (err) {
        // We aren't specifying a models directory and the default models directory doesn't exist so this
        // should fail with a "readdir" error.
        should.exist(err);
        ['ENOENT, readdir', 'ENOENT, scandir', 'ENOENT: no such'].should.include(err.message.substr(0, 15));
        done();
      });
    });

    it("should still invoke our callback if it is passed as the first and only argument.", function (done) {
      simpledb.init(function (err) {
        // We aren't specifying a models directory and the default models directory doesn't exist so this
        // should fail with a "readdir" error.
        should.exist(err);
        ['ENOENT, readdir', 'ENOENT, scandir', 'ENOENT: no such'].should.include(err.message.substr(0, 15));
        done();
      });
    });

    it("should not use autoincrement plugin.", function (done) {
      var localOptions = extend({}, options, { autoIncrementNumberIds: false });
      simpledb.init(localOptions, function (err, db) {
        should.not.exist(err);
        should.exist(db);
        should.not.exist(db.Book.nextCount);
        done();
      });
    });


    it("should load plugins.", function (done) {
      var localOptions = extend({}, options, { modelsDir: path.join(__dirname, 'pluginsmodels'), autoIncrementNumberIds: false});
      simpledb.init(localOptions, function (err, db) {
        should.not.exist(err);
        should.exist(db);
        should.exist(db.Plugged.nextCount);
        done();
      });
    });


    it("should throw error with model error.", function (done) {
      var localOptions = extend({}, options, {modelsDir: path.join(__dirname, 'errormodels')});
      simpledb.init(localOptions, function (err, db) {
        should.exist(err);
        should.not.exist(db);
        done();
      });
    });


    it("should throw error with plugin error.", function (done) {
      var localOptions = extend({}, options, {modelsDir: path.join(__dirname, 'errormodels2')});
      simpledb.init(localOptions, function (err, db) {
        should.exist(err);
        should.not.exist(db);
        done();
      });
    });


  });

  describe("db object", function () {

    var _db;

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
      var book = new _db.Book();
      var author = new _db.Author();

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

      _db.connection.db.dropDatabase(function (err) {

        if (err) return done(err);

        simpledb.init(options, function (err, db) {

          if (err) return done(err);

          // Arrange
          var book = new db.Book({
            title: "The Hobbit",
            author: new db.Author({ name: { first: "J. R. R.", last: "Tolkien" } }),
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

    it("should correct work with pre and post hooks", function (done) {

      simpledb.init(options, function (err, db) {

        var author = new db.Author({
          name: {
            first: 'Alex',
            last: 'Ford'
          },
          birthday: new Date('3/2/1987')
        });
        author.updateCounter.should.equal(0);
        author.save();

        db.Author.findOne(function (err, record) {
          record.updateCounter.should.equal(1);
          done();
        });

      });


    });

    it("should correct set settings of mongoose-auto-increment plugin", function (done) {

      var localOptions = extend({}, options, { modelsDir: path.join(__dirname, 'pluginsmodels'), autoIncrementSettings: { startAt: 5, field: 'id' } });

      _db.connection.db.dropDatabase(function (err) {

        if (err) return done(err);

        simpledb.init(localOptions, function (err, db) {

          if (err) return done(err);

          var ulrs = new db.Plugged({
            url: "https://github.com"
          });

          // Act
          async.series({
            ulrs: function (cb) {
              ulrs.save(cb);
            },
            nextCount: function (cb) {
              ulrs.nextCount(cb);
            }
          }, assert);

          // Assert
          function assert(err, results) {
            should.not.exist(err);
            results.ulrs[0].should.have.property('id', 5);
            results.nextCount.should.equal(6);
            done();
          }

        });

      });

    });

  });

});
