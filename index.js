//Amazon Lambda run target

/**
 * @typedef {object} LambdaEvent
 * @property {string} httpMethod
 * @property {{"User-Agent":string}} headers
 * @property {*} [queryStringParameters]
 * @property {*} [body] Base64
 */

/**
 * @typedef {object} LambdaResponse
 * @property {*} [body]
 * @property {number} [statusCode]
 */

const worker = require("./SchemaValidationService/worker");

/**
 *
 * @param {LambdaEvent} event
 */
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    /** @type {LambdaResponse} */
    const response = {
      statusCode: 422,
      body: `Service is running, but is expecting a POST.`,
    };

    return response;
  }

  return /** @type {LambdaResponse} */ worker(event.body);
};
