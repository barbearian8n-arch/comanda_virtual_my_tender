import type { VercelConfig } from "@vercel/config";

const config: VercelConfig = {}

const env = process.env.ENVIRONMENT;
const isVercel = env === "production";

if (isVercel) {
    config.rewrites = [
        {
            "source": "/api/(.*)",
            "destination": "/api/$1"
        },
        {
            "source": "/(.*)",
            "destination": "/"
        }
    ]
}

export default config;
