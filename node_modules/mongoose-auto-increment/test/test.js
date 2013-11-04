var should = require('should'),
    mongoose = require('mongoose'),
    autoIncrement = require('../index'),
    db;

before(function (done) {
    db = mongoose.createConnection('mongodb://127.0.0.1/mongoose-auto-increment-test');
    db.on('error', console.error.bind(console));
    db.once('open', function () {
        autoIncrement.initialize(db);
        done();
    });
});

after(function (done) {
    db.db.executeDbCommand({dropDatabase: 1}, function () {
        db.close(done);
    });
});

afterEach(function (done) {
    db.model('User').collection.drop(function (err) {
        if (err) return done(err);
        delete db.models.User;
        db.model('Mongoose-Auto-Increment').collection.drop(done);
    });
});

describe('mongoose-auto-increment', function () {

    it('should increment the _id field on save', function (done) {

        var userSchema = new mongoose.Schema({
            name: String,
            dept: String
        });
        userSchema.plugin(autoIncrement.plugin, 'User');
        var User = db.model('User', userSchema);

        var user = new User({ name: 'Charlie', dept: 'Support' });
        user.save(function (err) {
            should.not.exists(err);
            user._id.should.eql(0);

            var user2 = new User({ name: 'Charlene', dept: 'Marketing' });
            user2.save(function (err) {
                should.not.exists(err);
                user2._id.should.eql(1);
                done();
            });
        });

    });

    it('should increment the specified field instead (Test 2)', function(done) {

        var userSchema = new mongoose.Schema({
            name: String,
            dept: String
        });
        userSchema.plugin(autoIncrement.plugin, { model: 'User', field: 'userId' });
        var User = db.model('User', userSchema);

        var user = new User({ name: 'Charlie', dept: 'Support' });
        user.save(function(err) {
            should.not.exists(err);
            user.userId.should.eql(0);

            var user2 = new User({ name: 'Charlene', dept: 'Marketing' });
            user2.save(function (err) {
                should.not.exists(err);
                user2.userId.should.eql(1);
                done();
            });
        });

    });


    it('should start counting at specified number (Test 3)', function (done) {

        var userSchema = new mongoose.Schema({
            name: String,
            dept: String
        });
        userSchema.plugin(autoIncrement.plugin, { model: 'User', startAt: 3 });
        var User = db.model('User', userSchema);

        var user = new User({ name: 'Charlie', dept: 'Support' });
        user.save(function (err) {
            should.not.exists(err);
            user._id.should.eql(3);

            var user2 = new User({ name: 'Charlene', dept: 'Marketing' });
            user2.save(function (err) {
                should.not.exists(err);
                user2._id.should.eql(4);
                done();
            });
        });

    });

    it('should increment by the specified amount (Test 4)', function (done) {

        var userSchema = new mongoose.Schema({
            name: String,
            dept: String
        });
        userSchema.plugin(autoIncrement.plugin, { model: 'User', incrementBy: 5 });
        var User = db.model('User', userSchema);

        var user = new User({ name: 'Charlie', dept: 'Support' });
        user.save(function (err) {
            should.not.exists(err);
            user._id.should.eql(0);

            var user2 = new User({ name: 'Charlene', dept: 'Marketing' });
            user2.save(function (err) {
                should.not.exists(err);
                user2._id.should.eql(5);
                done();
            });
        });

    });

    describe('nextCount function', function () {

        it('should return the next count for the model and field (Test 5)', function (done) {

            var userSchema = new mongoose.Schema({
                name: String,
                dept: String
            });
            userSchema.plugin(autoIncrement.plugin, 'User');
            var User = db.model('User', userSchema);

            // Create user and call nextCount.
            var user = new User({name: 'Charlie', dept: 'Support'});
            user.nextCount(function (err, count) {
                should.not.exists(err);
                count.should.eql(0);

                // Now save user and check if its _id is what nextCount said.
                user.save(function (err) {
                    should.not.exists(err);
                    user._id.should.eql(0);

                    // Call nextCount again to ensure it reflects the next number correctly.
                    user.nextCount(function (err, count) {
                        should.not.exists(err);
                        count.should.eql(1);

                        // Call nextCount one more time to ensure the value is the same when a save is not performed.
                        user.nextCount(function (err, count) {
                            should.not.exists(err);
                            count.should.eql(1);

                            // Create a second user and ensure its _id is the value of the last call to nextCount.
                            var user2 = new User({name: 'Charlene', dept: 'Marketing'});
                            user2.save(function () {
                                user2._id.should.eql(1);
                                User.nextCount(function (err, count) {
                                    should.not.exists(err);
                                    count.should.eql(2);
                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });

    });
});
