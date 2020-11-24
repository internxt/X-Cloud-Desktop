const Analytics = require('analytics-node');

const client = new Analytics(process.env.APP_SEGMENT_KEY);

export default { client };
