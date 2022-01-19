# JSON Validation Service

- Validates multiple JSON files against a single JSONSchema.

## Usage

Expects a `POST` request with the following body structure.

```JSON
{
  "schema": {},
  "work": [],
}
```

- `schema` should contain a proper JSON Schema. Use [schema](http://json-schema.org/draft-07/schema) draft 7 or above.
- `work` is an array of JSON objects to validate.

### Considerations

- The total body payload for each request shall not exceed 6MB (Amazon Lambda limit).

## Code deployment target

- https://us-west-1.console.aws.amazon.com/lambda/?#/functions/jsonValidator
