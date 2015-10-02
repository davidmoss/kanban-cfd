module.exports = {
  server: 'localhost', // For browser to connect to
  port: 3000,
  dataCollectTime: 17, // 5PM
  dataFileLocation: './data/',
  kanbanProvider: 'jira', // Must match the JS file name
  dateFormat: 'YYYY-MM-DD', // Date format for browser & server communication
  ignoreWeekend: true, // Whether weekend should be used to count as valid duration.  Impacts schedule job as well.
  consumerPrivateKeyFile: 'jira.pem',
  consumerKey: 'cfd-consumer'
};