/**
 * New Relic agent configuration.
 *
 * See lib/config.defaults.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */

var config = require('./config/env/all');

exports.config = {
  /**
   * Array of application names.
   */
  app_name : ['Wello Fridge'],
  /**
   * Your New Relic license key.
   */
  license_key : config.newRelic,
  logging : {
    /**
     * Level at which to log. 'trace' is most useful to New Relic when diagnosing
     * issues with the agent, 'info' and higher will impose the least overhead on
     * production applications.
     */
    level : 'info'
  }
};
