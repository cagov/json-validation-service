//Loading environment variables
const { Values } = require("../local.settings.json");
Object.keys(Values).forEach((x) => (process.env[x] = Values[x])); //Load local settings file for testing

process.env.debug = true; //set to false or remove to run like the real instance
const repeatCount = parseInt(process.argv.slice(2));

const { ValidationServiceBody } = require("../SchemaValidationService/worker");

const indexCode = require("../SchemaValidationService/worker");

const testSchema = require("./testSchema.json");
const testData = JSON.stringify(require("./testData.json"));

/** @type {ValidationServiceBody} */
let body = {
  schema: testSchema,
  work: [],
};

for (i = 0; i < 200; i++) {
  body.work.push({
    name: `Test-${i}`,
    content: JSON.parse(testData),
  });
}

//body.work[13].content.data.time_series.TEST_POSITIVITY_RATE_7_DAYS.VALUES[10].DATE="foo";
//body.work[10].content.data.time_series.TEST_POSITIVITY_RATE_7_DAYS.VALUES[10].DATE="foo";

//const bodyBase64 = Buffer.from(JSON.stringify(body),'utf-8').toString('base64');

(async () => {
  for (let step = 0; step < repeatCount; step++) {
    console.log(`****** Iteration ${step + 1} ******`);
    const result = await indexCode(body);
    console.log(result || context.res);
  }
})();
