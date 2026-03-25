import { VercelRequest, VercelResponse } from "@vercel/node";

export type MethodHandlerRecord = {
    get?: (req: VercelRequest, res: VercelResponse) => void;
    post?: (req: VercelRequest, res: VercelResponse) => void;
    put?: (req: VercelRequest, res: VercelResponse) => void;
    delete?: (req: VercelRequest, res: VercelResponse) => void;
}
export type MethodKey = keyof MethodHandlerRecord;
export type MethodHandler = MethodHandlerRecord[MethodKey];

export function createHandler() {
    const methods: MethodHandlerRecord = {}

    const handler = (req: VercelRequest, res: VercelResponse) => {
        try {
            const method = req.method?.toLowerCase() as MethodKey;

            if (!method) {
                res.status(405).end("Method Not Allowed");
                return;
            }

            if (methods[method]) {
                methods[method](req, res);
            } else {
                res.status(405).end("Method Not Allowed");
            }
        } catch (error) {
            console.error(error);
            res.status(500).end("Internal Server Error");
        }
    };

    handler.get = (fn: MethodHandler) => {
        methods.get = fn;
    };

    handler.post = (fn: MethodHandler) => {
        methods.post = fn;
    };

    handler.put = (fn: MethodHandler) => {
        methods.put = fn;
    };

    handler.delete = (fn: MethodHandler) => {
        methods.delete = fn;
    };

    return handler;
}