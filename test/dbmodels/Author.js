var moment = require('moment'),
    marked = require('marked');

exports.schema = {
    name: {
        first: String,
        last: String
    },
    birthday: Date,
    gender: String,
    bio: String
};

exports.methods = {
    formatBirthday: function (formatString) {
        return moment(this.birthday).format(formatString);
    },
    bioHtml: function () {
        return marked(this.bio);
    }
};

exports.virtuals = {
    age: {
        get: function () {
            var today = new Date();
            var age = today.getFullYear() - this.birthday.getFullYear();
            var m = today.getMonth() - this.birthday.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < this.birthday.getDate())) {
                age--;
            }
            return age;
        }
    },
    "name.full": {
        get: function () {
            return this.name.first + ' ' + this.name.last;
        },
        set: function (fullName) {
            if (fullName.indexOf(' ') !== -1) {
                var splitName = fullName.split(' ');
                this.name.first = splitName[0];
                this.name.last = splitName[0];
            }
            else
                this.name.first = fullName;
        }
    }
}