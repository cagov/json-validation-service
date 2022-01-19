// @ts-check
const SlackConnector = require("@cagov/slack-connector");

/**
 *
 * @param {string} key
 * @returns
 */
const getConfigItem = (key) => {
  const data = process.env[key];

  if (!data) {
    console.error(`local.settings.json needs the key "${key}".`);
    return;
  }

  return data;
};

const slackBotGetToken = () => getConfigItem("SLACKBOT_TOKEN");
const slackBotGetChannel = () => getConfigItem("SLACKBOT_CHANNEL");

const threadCount = 6;
const { Schema } = require("jsonschema"); //https://www.npmjs.com/package/jsonschema
const { threadWork } = require("./async_custom");
const async_validator = require("./async_thread");
/**
 *
 * @param {*} err
 */
const validateJSON_getMessage = (err) =>
  `${err.stack} (${err.name}).\nValue = ${JSON.stringify(
    err.instance
  ).substring(0, 50)}`;

/**
 * @typedef {object} ValidationServiceWorkRow
 * @property {string} name
 * @property {*} content
 */

/**
 * @typedef {object} ValidationServiceBody
 * @property {Schema} schema
 * @property {ValidationServiceWorkRow[]} work
 */

/**
 * @typedef {object} ValidationServiceResponse
 * @property {*} [body]
 * @property {number} [statusCode]
 */

/**
 * Returns and reports
 * @param {SlackConnector} slack
 * @param {*} [body]
 * @param {number} [statusCode]
 */
const returnCompatible = (slack, body, statusCode) => {
  /** @type {ValidationServiceResponse} */
  let response = {};

  if (statusCode) {
    response.statusCode = statusCode;
  }

  if (body) {
    response.body = body;
  }

  slack.Reply(`\`\`\`${JSON.stringify(response, null, 2)}\`\`\``);

  return response;
};

/**
 * @param {*} postBody
 */
module.exports = async function (postBody) {
  const slack = new SlackConnector(slackBotGetToken(), slackBotGetChannel(), {
    username: "json Validator",
  });

  try {
    await slack.Chat("JSON Validation Started...");

    if (!postBody) {
      return returnCompatible(slack, `POST body missing.`, 422);
    }

    /** @type {ValidationServiceBody} */
    let input = null;

    if (typeof postBody === "string") {
      try {
        //JSON
        input = JSON.parse(postBody);
      } catch (e) {
        try {
          //base64
          input = JSON.parse(Buffer.from(postBody, "base64").toString("utf-8"));
        } catch (e) {
          return returnCompatible(slack, `Invalid JSON or base64 body.`, 422);
        }
      }
    } else {
      input = postBody;
    }

    if (!input.schema) {
      return returnCompatible(slack, `POST schema missing.`, 422);
    }

    if (!input.work?.length) {
      return returnCompatible(slack, `POST work missing.`, 422);
    }

    /** @type {threadWork[]} */
    const workForValidation = [];

    input.work.forEach((mywork) => {
      /** @type {threadWork} */
      let newWork = {
        name: mywork.name,
        schemaJSON: input.schema,
        targetJSON: mywork.content,
      };

      workForValidation.push(newWork);
    });

    console.log(`Validating ${input.work.length} rows...`);
    await slack.Reply(`Validating ${input.work.length} rows...`);

    let timestamp = new Date().getTime();
    const results = await async_validator(workForValidation, threadCount).catch(
      (reason) => {
        throw new Error(reason);
      }
    );
    console.log(`Validating input...done`);

    const errors = results
      .filter((r) => r.result.errors.length)
      .map((e) => ({
        file: e.name,
        error: validateJSON_getMessage(e.result.errors[0]),
      }));

    await slack.Top.ReactionAdd("white_check_mark");

    if (errors.length) {
      return returnCompatible(slack, JSON.stringify(errors), 200);
    } else {
      //Validation passed, nothing to report
      return returnCompatible(slack, null, 204); //OK - No content
    }
  } catch (e) {
    await slack.Error(e);
    return returnCompatible(slack, `Error - ${e.message}`, 500);
  }
};
