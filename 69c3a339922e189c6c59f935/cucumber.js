module.exports = {
  default: {
    require: ['steps/**/*.js'],
    format: ['json:test-results.json'],
    formatOptions: { snippetInterface: 'async-await' },
    worldParameters: {
      appUrl: process.env.APP_URL || 'http://localhost:5173'
    },
    parallel: 1,
    dryRun: false,
    failFast: false,
    strict: false
  }
};
