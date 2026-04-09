import { ValidationError } from "../errors.js";

export class ValidationMiddleware {
    constructor(validator, scope = "body") {
        this.scope = scope;
        this.validator = validator;
    }

    async handle(req, res) {
        const result = this.validator.name(this.scope).validate(req[this.scope]);

        if (!result.isValid) {
            throw new ValidationError(result.getMessage(), null);
        }

        req[this.scope] = result.value;
    }
}

class ValidationResult {
    constructor(isValid, value, errors) {
        this.isValid = isValid;
        this.value = value;
        this.errors = errors;
    }

    getMessage() {
        return this.errors.map((error) => {
            return `${error.message} at ${error.path.join(".")}`;
        }).join(", ");
    }
}

class Validator {
    constructor() { }

    validate(value) {
        throw new Error("Method 'validate' must be implemented.");
    }

    optional() {
        return new OptionalValidator(this);
    }

    array() {
        return new ArrayValidator(this);
    }

    name(name) {
        return new NamedObjectValidator(name, this);
    }
}

class OptionalValidator extends Validator {
    constructor(validator) {
        super();
        this.validator = validator;
    }

    validate(value, path = []) {
        if (value == null) {
            return r.ok(value);
        }

        return this.validator.validate(value, path);
    }
}

class NamedObjectValidator extends Validator {
    constructor(name, schema) {
        super();
        this.name = name;
        this.schema = schema;
    }

    validate(value, path = [this.name]) {
        return this.schema.validate(value, path);
    }
}

class ObjectValidator extends Validator {
    constructor(schema) {
        super();
        this.schema = schema;
    }

    validate(value, path = ["object"]) {
        const errors = [];
        const out = {};

        if (typeof value !== "object" || value === null) {
            return r.err("Value must be an object", path);
        }

        for (const key of keyUnion(this.schema, value)) {
            const validator = this.schema[key];
            const innerValue = value[key];

            if (validator == null) {
                const result = r.err("Unexpected field", [...path, key]);

                errors.push(...result.errors);
                continue;
            }

            const result = validator.validate(innerValue, [...path, key]);

            if (!result.isValid) {
                errors.push(...result.errors);
            }

            out[key] = result.value;
        }

        if (errors.length > 0) {
            return r.errs(errors);
        }

        return r.ok(out);
    }
}

class NumberValidator extends Validator {
    constructor({ cast = false }) {
        super();
        this.cast = cast;
    }

    validate(value, path = []) {
        if (this.cast) {
            value = Number(value);

            if (Number.isNaN(value)) {
                return r.err("Invalid value for number", path);
            }
        }

        if (typeof value !== "number") {
            return r.err("Invalid value for number", path);
        }

        return r.ok(value);
    }
}

class IntegerValidator extends Validator {
    constructor({ cast = false }) {
        super();
        this.cast = cast;
    }

    validate(value, path = []) {
        if (this.cast) {
            value = Number(value);
        }

        if (!Number.isInteger(value)) {
            return r.err("Invalid value for integer", path);
        }

        return r.ok(value);
    }
}

class StringValidator extends Validator {
    constructor({ cast = false }) {
        super();
        this.cast = cast;
    }

    validate(value, path = []) {
        if (this.cast) {
            value = String(value);
        }

        if (typeof value !== "string") {
            return r.err("Invalid value for string", path);
        }

        return r.ok(value);
    }
}

class ArrayValidator extends Validator {
    constructor(schema) {
        super();
        this.schema = schema;
    }

    validate(value, path = []) {
        const errors = [];
        const out = [];

        if (!Array.isArray(value)) {
            return r.err("Invalid value for array", path);
        }

        for (const [index, item] of value.entries()) {
            const result = this.schema.validate(item, [...path, `${index}`]);

            if (!result.isValid) {
                errors.push(...result.errors);
            }

            out.push(result.value);
        }

        if (errors.length > 0) {
            return r.errs(errors);
        }

        return r.ok(out);
    }
}

export const v = {
    object: (schema) => new ObjectValidator(schema),
    number: (options = {}) => new NumberValidator(options),
    integer: (options = {}) => new IntegerValidator(options),
    string: (options = {}) => new StringValidator(options),
    array: (schema) => new ArrayValidator(schema),

    middleware: {
        body: (validator) => new ValidationMiddleware(validator, "body"),
        query: (validator) => new ValidationMiddleware(validator, "query"),
        params: (validator) => new ValidationMiddleware(validator, "params")
    }
}

const r = {
    ok: (value) => new ValidationResult(true, value, []),
    err: (message, path) => {
        path = validPath(path);

        return new ValidationResult(false, null, [{ message, path }]);
    },
    errs: (errors) => {
        return new ValidationResult(false, null, errors);
    }
}

function validPath(path) {
    if (path == null) {
        const error = new Error("path is null");
        Error.captureStackTrace(error);

        console.warn(error);
        path = [];
    }

    return path;
}

function keyUnion(a = {}, b = {}) {
    const keys = [];

    for (const key in a) {
        keys.push(key);
    }

    for (const key in b) {
        keys.push(key);
    }

    return [...new Set(keys)];
}