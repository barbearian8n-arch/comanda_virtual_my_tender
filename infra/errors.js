export class ApiError extends Error {
    constructor(message, { name, code, statusCode }) {
        super(message);
        this.name = name;
        this.code = code;
        this.statusCode = statusCode;
    }
}

export class NotFoundError extends ApiError {
    constructor(message) {
        super(message, {
            name: "NotFoundError",
            code: "not-found",
            statusCode: 404
        });
    }
}

export class ValidationError extends ApiError {
    constructor(message) {
        super(message, {
            name: "ValidationError",
            code: "validation-error",
            statusCode: 400
        });
    }
}

export class MethodNotAllowedError extends ApiError {
    constructor(message) {
        super(message, {
            name: "MethodNotAllowedError",
            code: "method-not-allowed",
            statusCode: 405
        });
    }
}