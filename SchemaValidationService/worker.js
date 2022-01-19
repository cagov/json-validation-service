// @ts-check
const SlackConnector = require("@cagov/slack-connector");
const debugChannel = "C01H6RB99E2"; //#carter-dev

const slackBotGetToken = () => {
  const token = process.env["SLACKBOT_TOKEN"];

  if (!token) {
    //developers that don't set the creds can still use the rest of the code
    console.error(
      'You need local.settings.json to contain "SLACKBOT_TOKEN" to use slackbot features.'
    );
    return;
  }

  return token;
};

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
 * compatible function return for Microsoft Azure or Amazon Lambda
 * @param {*} [body]
 * @param {number} [statusCode]
 */
const returnCompatible = (body, statusCode) => {
  //Amazon Lambda
  /** @type {ValidationServiceResponse} */
  let response = {};

  if (statusCode) {
    response.statusCode = statusCode;
  }

  if (body) {
    response.body = body;
  }

  return response;
};

/**
 * @param {*} postBody
 */
module.exports = async function (postBody) {
  try {
    if (!postBody) {
      return returnCompatible(`POST body missing.`, 422);
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
          return returnCompatible(`Invalid JSON or base64 body.`, 422);
        }
      }
    } else {
      input = postBody;
    }

    if (!input.schema) {
      return returnCompatible(`POST schema missing.`, 422);
    }

    if (!input.work?.length) {
      return returnCompatible(`POST work missing.`, 422);
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

    if (errors.length) {
      return returnCompatible(JSON.stringify(errors), 200);
      //return returnCompatible(context, "some error", 200)
    } else {
      //Validation passed, nothing to report
      return returnCompatible(null, 204); //OK - No content
    }
  } catch (e) {
    const slack = new SlackConnector(slackBotGetToken(), debugChannel, {
      username: "json Validator",
    });
    await slack.Error(e);
    return returnCompatible(`Error - ${e.message}`, 500);
  }
};
