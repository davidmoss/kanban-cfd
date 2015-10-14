!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.CFD=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
module.exports = {
  server: '127.0.0.1', // For browser to connect to
  port: 3000,
  dataCollectTime: 17, // 5PM
  dataFileLocation: './data/',
  kanbanProvider: 'rally', // Must match the JS file name
  dateFormat: 'YYYY-MM-DD', // Date format for browser & server communication
  kanbanItemTypes: {
    'jira': {
      'Story': 'Story',
      'Task': 'Task',
      'Epic': 'Epic',
      'Bug': 'Bug'
    },
    'rally': {
      'HierarchicalRequirement': 'Story',
      'Defect': 'Defect'
    }
  }, // Key is the id used in data provider system.  Value is for display purpose
  kanbanStatusNames: {
    'jira': [
      'Done',
      'In Progress',
      'To Do'
    ],
    'rally': [
      'Accepted',
      'Completed',
      'In-Progress',
      'Defined'
    ]
  }, // sequence matters for CFD calculation.  Earlier stage is put at the end
  owners: {
    'jira': {
      42970205205: 'Dave'
    },
    'rally': {
      42970205205: 'Dave'
    }
  }, // Key is the id used in data provider system.  Value is for display
  defaultLeadTimeDuration: 5, // Default value for kanban item lead time graph filtering,
  defaultLeadTimeStartStatus: {
    'jira': 'To Do',
    'rally': 'Defined'
  }, // Start of Lead Time is based on start time of this status
  defaultLeadTimeEndStatus: {
    'jira': 'In Progress',
    'rally': 'Completed'
  }, // End of Lead Time is based on start time of this status
  defaultBlockedDuration: 1, // Default value for blocked statistics graph filtering,
  ignoreWeekend: true // Whether weekend should be used to count as valid duration.  Impacts schedule job as well.
};

},{}]},{},[1])
(1)
});