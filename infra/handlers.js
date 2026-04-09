// import { VercelRequest, VercelResponse } from "@vercel/node";

// export type MethodHandlerRecord = {
//     get?: (req: VercelRequest, res: VercelResponse) => void;
//     post?: (req: VercelRequest, res: VercelResponse) => void;
//     put?: (req: VercelRequest, res: VercelResponse) => void;
//     delete?: (req: VercelRequest, res: VercelResponse) => void;
// }
// export type MethodKey = keyof MethodHandlerRecord;
// export type MethodHandler = MethodHandlerRecord[MethodKey];

import { ApiError, MethodNotAllowedError } from "./errors.js";

function createHandler() {
    const middlewares = {
        all: [],
        get: [],
        post: [],
        put: [],
        delete: []
    };
    const methods = {}

    const handler = async (req, res) => {
        try {
            const method = req.method?.toLowerCase();

            if (!method) {
                throw new MethodNotAllowedError("Method Not Allowed");
            }

            if (methods[method]) {
                await runMiddlewares(middlewares.all, req, res);
                await runMiddlewares(middlewares[method], req, res);

                await methods[method](req, res);
            } else {
                throw new MethodNotAllowedError("Method Not Allowed");
            }
        } catch (error) {
            if (error instanceof ApiError) {
                res.status(error.statusCode).json(error.toJSON());

                return;
            }

            console.error(error);
            res.status(500).json({
                success: false,
                message: "Internal Server Error",
                error: "internal-error"
            });
        }
    };

    async function runMiddlewares(handlers, req, res) {
        for (const handler of handlers) {
            if (typeof handler === "function") {
                await handler(req, res);
            } else {
                await handler.handle(req, res);
            }
        }
    }

    handler.middleware = {
        all: (...handlers) => {
            middlewares.all.push(...handlers);
        },
        get: (...handlers) => {
            middlewares.get.push(...handlers);
        },
        post: (...handlers) => {
            middlewares.post.push(...handlers);
        },
        put: (...handlers) => {
            middlewares.put.push(...handlers);
        },
        delete: (...handlers) => {
            middlewares.delete.push(...handlers);
        }
    }

    handler.get = (fn) => {
        methods.get = fn;
    };

    handler.post = (fn) => {
        methods.post = fn;
    };

    handler.put = (fn) => {
        methods.put = fn;
    };

    handler.delete = (fn) => {
        methods.delete = fn;
    };

    return handler;
}

export { createHandler };