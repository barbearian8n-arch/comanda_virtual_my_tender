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
    const methods = {}

    const handler = async (req, res) => {
        try {
            const method = req.method?.toLowerCase();

            if (!method) {
                throw new MethodNotAllowedError("Method Not Allowed");
            }

            if (methods[method]) {
                await methods[method](req, res);
            } else {
                throw new MethodNotAllowedError("Method Not Allowed");
            }
        } catch (error) {
            if (error instanceof ApiError) {
                res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                    error: error.code
                });

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