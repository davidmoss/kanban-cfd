var Promise = require('bluebird'),
    rest = require('restler'),
    _ = require('lodash'),
    config = require('../config'),
    DateUtil = require('../dateUtil').DateUtil;

// config
var workspace = 'digitalrig';
var project = 'PDT';
var lookbackPageSize = 50;
var entryStatus = 'To Do';


function resolveRestResult(resolver, result, response) {
  var isSuccess = true,
      errMsg = '';

  if (result instanceof Error) {
    errMsg = result.valueOf();
    isSuccess = false;
  } else {
    if (result.error) {
      isSuccess = false;
      errMsg = result.error.valueOf();
    } else if (response.statusCode >= 400) {
      var msg = result.toString();
      if (typeof result === 'object') {
        msg = JSON.stringify(result);
      }

      isSuccess = false;
      errMsg = 'HTTP status: ' + response.statusCode +
        ' Msg: ' + msg;
    }
  }

  if (isSuccess) {
    resolver.resolve(JSON.parse(result));
  } else {
    resolver.reject(errMsg);
  }
}

function restPromise(url, options) {
  var resolver = Promise.defer();

  rest.request(url, options || {})
    .on('complete', resolveRestResult.bind(this, resolver));

  return resolver.promise;
}

function KanbanProvider(consumer, session){
  var oauth = consumer,
      oauthAccessToken = session.oauthAccessToken,
      oauthAccessTokenSecret = session.oauthAccessTokenSecret;

  this.resolveOauthResult = function(resolver, error, result, response) {
    if (error) {
      resolver.reject(result.valueOf());
    } else {
      resolver.resolve(JSON.parse(result));
    }
  };

  this.oauthPromise = function(url) {
    var resolver = Promise.defer();

    this.oauth.get(url, 
        this.oauthAccessToken, 
        this.oauthAccessTokenSecret, 
        "application/json",
        resolveOauthResult.bind(this, resolver)
    );

    return resolver.promise;
  };

  this.getHistoricalKanbanStatus = function(startDate) {
    return this.getSnapshot(startDate)
      .then(function(snapshots) {
        var itemStatus = {
          // objectID: {
          //   objectID: ,
          //   type: ,
          //   name: ,
          //   owner: ,
          //   statusChangeLog: [{
          //     from: ,
          //     to: ,
          //     status:
          //   }],
          //   blockLog: [{
          //      blocked: ,
          //      stage: ,
          //      time: ,
          //      reason:
          //   }],
          //   kanbanizedOn: // earliest time put to Kanban
          // }
        };

        snapshots.forEach(function(snapshot) {
        //   {
        //     changelog: {
        //        histories: [
        //          {
        //          created: "2015-09-23T04:05:45.910-0600",
        //          items: [
        //            {
        //            field: "status",
        //            fromString: "To Do",
        //            toString: "In Progress"
        //            }
        //          ]
        //          }
        //        ]
        //     },
        //     fields: {
        //     created: "2015-09-23T04:05:26.000-0600",
        //     issuetype: {
        //       name: "Bug",
        //     },
        //     priority: {
        //       name: "Medium",
        //     },
        //     status: {
        //       name: "In Progress",
        //     },
        //     reporter: {
        //       name: "joshua.vedder",
        //     },
        //     summary: "import list button hover state is not pink like it should be ",
        //     updated: "2015-09-23T04:34:45.000-0600"
        //     },
        //     id: "12316",
        //     key: "PDT-48",
        //   }
          
          var item = itemStatus[snapshot.id],
              lastChange = {
                created: snapshot.fields.created,
                status: entryStatus
              };

          if (!item) {
            itemStatus[snapshot.id] = {
              objectID: snapshot.id,
              type: snapshot.fields.issuetype.name,
              statusChangeLog: []
            };
            item = itemStatus[snapshot.id];
            item.blockLog = [];
          }

          item.owner = snapshot.fields.reporter.name;
          item.name = '[' + snapshot.key + '] ' + snapshot.fields.summary;
          item.estimate = 5; // need to get the correct estimate field

          snapshot.changelog.histories.forEach(function(change){
            for (var i = change.items.length - 1; i >= 0; i--) {
              var changeLog = change.items[i];
              if (changeLog.field == "status") {
                item.statusChangeLog.push({
                  from: lastChange.created,
                  to: change.created,
                  status: changeLog.fromString
                });
                lastChange = {
                  created: change.created,
                  status: changeLog.toString
                };
              }
            };
          });

          // Add the last status change log
          item.statusChangeLog.push({
            from: lastChange.created,
            to: DateUtil.getDate(),
            status: lastChange.status
          });

          if (item.blockLog.length === 0 || item.blockLog[item.blockLog.length - 1].blocked != snapshot.Blocked) {
            item.blockLog.push({
              blocked: snapshot.Blocked | false,
              stage: snapshot.fields.status.name,
              time: snapshot.fields.updated,
              reason: snapshot.BlockedReason
            });
          } else {
            item.blockLog[item.blockLog.length - 1].reason = snapshot.BlockedReason;
          }

          if (!item.kanbanizedOn || item.kanbanizedOn < snapshot.fields.created) {
            item.kanbanizedOn = DateUtil.getDate(snapshot.fields.created).toDate();
          }
        });

        return _.values(itemStatus);
      });
  };

  this.getSnapshot = function(startDate, startCount, allResult) {
    var start = DateUtil.getDate(startDate),
        idx = startCount || 0,
        result = allResult || [],
        dataUrl = 'https://'+workspace+'.atlassian.net/rest/api/latest/search/';

    var jql = 'project=' + project;

    var fields = ['issuetype', 'created', 'updated', 'status', 'key', 'summary', 'priority', 'reporter'],
        expand = ['changelog'];

    return restPromise(dataUrl + '?jql=' + jql +
      '&fields=' + fields.toString() +
      '&maxResults=' + lookbackPageSize +
      '&expand=' + expand.toString() +
      '&startAt=' + idx)
      .bind(this)
      .then(function(response) {

        result = result.concat(response.issues);

        if (result.length < response.total) {
          // Recursively call itself to get all snapshot
          return this.getSnapshot(start, result.length, result);
        } else {
          return result;
        }
      });
  };
}

module.exports = KanbanProvider;
