export class ApiError extends Error {
    constructor(message, { name, code, statusCode, cause = null }) {
        super(message);
        this.name = name;
        this.code = code;
        this.statusCode = statusCode;
        this.cause = cause;
    }

    toJSON() {
        return {
            success: false,
            message: this.message,
            error: this.code
        };
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

    toJSON() {
        return {
            success: false,
            message: this.message,
            error: this.code
        };
    }
}

/**
 * O pedido é válido, mas o estado atual não permite atendê-lo — diferente do
 * 400, que é "você mandou errado". Ex.: remover a conexão principal, ou o
 * webhook não ter ficado gravado como pedido.
 */
export class ConflictError extends ApiError {
    constructor(message, cause) {
        super(message, {
            name: "ConflictError",
            code: "conflict",
            statusCode: 409,
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