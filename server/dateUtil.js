var moment = require('moment-range'),
    config = require('./config');

module.exports.DateUtil = {
  getDate: function(dateValue) {
    if (moment.isMoment(dateValue)) {
      return dateValue;
    }

    var date = dateValue || new Date();

    if (typeof date === 'string') {
      date = moment.utc(dateValue, config.dateFormat, true);
      if (!date.isValid()) {
        date = moment.utc(dateValue, 'YYYY-MM-DDTHH:mm:ss.SSSSZ', true);
      }
      if (!date.isValid()) {
        date = moment.utc();
      }
    } else if (date instanceof Date) {
      date = moment.utc(date);
    }

    date.set('h', 0).set('m', 0).set('s', 0).set('ms', 0);
    return date;
  },
  utc: function(utcString) {
    return moment.utc(utcString, 'YYYY-MM-DDTHH:mm:ss.SSSSZ', true);
  },
  diff: function(src, tgt) {
    return this.utc(src).diff(this.utc(tgt), 'miliseconds');
  },
  nowInUTCString: function() {
    return moment.utc().format('YYYY-MM-DDTHH:mm:ss.0000Z');
  }
};
