function log(req, res) {
    console.log(req.method, req.url);
}

export function createHandler() {
    const methods = {
        get: null,
        post: null,
        put: null,
        delete: null,
    }

    async function handler(req, res) {
        try {
            const _handler = methods[req.method.toLowerCase()];
            if (!_handler) {
                return res.status(405).json({ message: "Method not allowed" });
            }

            log(req, res);
            return await _handler(req, res);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Internal server error" });
        }
    }

    handler.get = (get) => {
        methods.get = get;
        return handler;
    }

    handler.post = (post) => {
        methods.post = post;
        return handler;
    }

    handler.put = (put) => {
        methods.put = put;
        return handler;
    }

    handler.delete = (del) => {
        methods.delete = del;
        return handler;
    }

    return handler;
}