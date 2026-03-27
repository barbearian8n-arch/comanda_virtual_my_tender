export class ApiError extends Error {
    constructor(message, { name, code, statusCode, cause = null }) {
        super(message);
        this.name = name;
        this.code = code;
        this.statusCode = statusCode;
        this.cause = cause;
    }
}

export class NotFoundError extends ApiError {
    constructor(message, cause) {
        super(message, {
            name: "NotFoundError",
            code: "not-found",
            statusCode: 404,
            cause
        });
    }
}

export class ValidationError extends ApiError {
    constructor(message, cause) {
        super(message, {
            name: "ValidationError",
            code: "validation-error",
            statusCode: 400,
            cause
        });
    }
}

export class MethodNotAllowedError extends ApiError {
    constructor(message, cause) {
        super(message, {
            name: "MethodNotAllowedError",
            code: "method-not-allowed",
            statusCode: 405,
            cause
        });
    }
}