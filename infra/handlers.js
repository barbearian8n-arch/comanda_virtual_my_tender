export function createHandler() {
    const methods = {}

    const handler = (req, res) => {
        try {
            const method = req.method.toLowerCase();
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