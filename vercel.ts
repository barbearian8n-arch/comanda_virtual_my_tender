import type { VercelConfig } from "@vercel/config";

const config: VercelConfig = {
    functions: {
        "api/**/*.js": {
            "maxDuration": 60
        }
    }
}

const env = process.env.ENVIRONMENT;
const isVercel = env === "production";

console.log(env);

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
