var express = require('express'),
    app = express(),
    _ = require('lodash'),
    http = require('http'),
    server = http.createServer(app),
    OAuth = require('oauth'),
    fs = require('fs'),
    io = require('socket.io').listen(server),
    EventEmitter = require('events').EventEmitter,
    config = require('./server/config'),
    querystring = require('querystring'),
    schedule = require('node-schedule'),
    DateUtil = require('./server/dateUtil').DateUtil,
    KanbanItemDataMassager = require('./server/kanbanItemDataMassager').KanbanItemDataMassager,
    KanbanStorage = require('./server/kanbanStorage'),
    KanbanProvider = require('./server/dataprovider/' + config.kanbanProvider);

function responseConstructor(res, isSuccess, result) {
  var responseData = {
    status: isSuccess,
    errMsg: isSuccess ? '' : result.message,
    result: result
  };

  if (isSuccess) {
    res.json(200, responseData);
  } else {
    res.json(500, responseData);
  }
}

var kanbanStorage = new KanbanStorage();

var privateKeyData = fs.readFileSync(config["consumerPrivateKeyFile"], "utf8");

var consumer = new OAuth.OAuth(
  "https://digitalrig.atlassian.net/plugins/servlet/oauth/request-token",
  "https://digitalrig.atlassian.net/plugins/servlet/oauth/access-token",
  config["consumerKey"],
  "",
  "1.0",
  "http://localhost:3000/session/callback",
  "RSA-SHA1",
  null,
  privateKeyData
);

function require_login(req, res, next) {
  if (req.xhr || req.headers.accept.indexOf('json') > -1) {
    if(!req.session.oauthAccessToken) {
      res.status(403).send({ error: 'Authorisation required' });
      return;
    }
  }
  else if (config.kanbanProvider == 'jira') {
    if(!req.session.oauthAccessToken) {
      res.redirect("/session/connect?action="+querystring.escape(req.originalUrl));
      return;
    }
  }
  next();
};

app.configure(function() {
  app.use(express.urlencoded());
  app.use(express.json());
  app.use(express.methodOverride());
  app.use(express.static(__dirname + '/client/'));
  app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.session({secret: "ssshhhh!"}));
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  app.use(app.router);
});

server.listen(config.port);

app.get('/', require_login, function(req, res) {
  res.sendfile(__dirname + '/client/cfd/cfd.html');
});

app.post('/initHistoricalData', require_login, function(req, res) {
  var startDate = DateUtil.getDate(req.param('startDate')),
      kanbanProvider = new KanbanProvider(consumer, req.session);

  kanbanProvider.getHistoricalKanbanStatus(startDate)
    .then(function(kanbanItems) {
      return kanbanStorage.initHistoricalData(kanbanItems, startDate);
    })
    .then(function(result) {
      responseConstructor(res, true, result);
    })
    .catch(responseConstructor.bind(this, res, false));
});

app.get('/snapshot', require_login, function(req, res) {
  var startDate = DateUtil.getDate(req.param('startDate')),
      endDate = DateUtil.getDate(req.param('endDate'));

  kanbanStorage.getSnapshot({
      startDate: startDate,
      endDate: endDate
    })
    .then(responseConstructor.bind(this, res, true))
    .catch(responseConstructor.bind(this, res, false));
});

app.get('/itemDetail', require_login, function(req, res) {
  var startDate = DateUtil.getDate(req.param('startDate')),
      endDate = DateUtil.getDate(req.param('endDate'));

  kanbanStorage.getItems({
      startDate: startDate,
      endDate: endDate
    })
    .then(function(items) {
      return _.map(items, function(item) {
        item.blockLog = KanbanItemDataMassager.massageBlockLog(item);
        return item;
      });
    })
    .then(responseConstructor.bind(this, res, true))
    .catch(responseConstructor.bind(this, res, false));
});

app.get('/session/connect', function(req, res){
  consumer._authorize_callback = consumer._authorize_callback + (req.param('action') && req.param('action') != "" ? "?action="+querystring.escape(req.param('action')) : "");

  consumer.getOAuthRequestToken(
    function(error, oauthToken, oauthTokenSecret, results) {
      if (error) {
        console.log(error.data);
        response.send('Error getting OAuth access token');
      }
      else {
        req.session.oauthRequestToken = oauthToken;
        req.session.oauthRequestTokenSecret = oauthTokenSecret;
        res.redirect("https://digitalrig.atlassian.net/plugins/servlet/oauth/authorize?oauth_token="+req.session.oauthRequestToken);
      }
    }
  )
});

app.get('/session/callback', function(req, res){
  consumer.getOAuthAccessToken (
      req.session.oauthRequestToken, 
      req.session.oauthRequestTokenSecret, 
      req.query.oauth_verifier,
      function(error, oauthAccessToken, oauthAccessTokenSecret, results){         
        if (error) { 
          console.log(error.data);
          res.send("error getting access token");        
        }
        else {
          // store access token in the session
          req.session.oauthAccessToken = oauthAccessToken;
          req.session.oauthAccessTokenSecret = oauthAccessTokenSecret;
          res.redirect((req.param('action') && req.param('action') != "") ? req.param('action') : "/");
        }
      }
    )
});

// var statusEmitter = new EventEmitter();
// statusEmitter.on('error', function(err) {
//   console.error('Something wrong happened.');
//   console.error(err);
// });

// Run on scheduled time to collect today's kanban item status
// var rule = new schedule.RecurrenceRule();
// if (config.ignoreWeekend) {
//   rule.dayOfWeek = [new schedule.Range(1, 5)]; // Just week day
// }
// rule.hour = [config.dataCollectTime];
// rule.minute = 0;

// schedule.scheduleJob(rule, function() {
//   // Only need to capture the change happen today as it is supposed that
//   // previous item detail has described the Kanban status correctly.
//   kanbanProvider.getHistoricalKanbanStatus()
//     .then(function(kanbanItems) {
//       return kanbanStorage.initHistoricalData(kanbanItems, DateUtil.getDate());
//     })
//     .then(function(result) {
//       statusEmitter.emit('dailyUpdate', result);
//       return result;
//     })
//     .catch(function(e) {
//       console.log('Daily capture failed.');
//       console.log(e);
//     });
// });

// io.sockets.on('connection', function(socket) {
//   statusEmitter.on('dailyUpdate', function(snapshots) {
//     socket.emit('dailyUpdate', snapshots);
//   });
// });
