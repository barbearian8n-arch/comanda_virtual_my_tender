import type { VercelConfig } from "@vercel/config";

const config: VercelConfig = {
    // builds: [
    //     {
    //         src: "api/**/*.ts",
    //         use: "@vercel/node",
    //         config: {
    //             includeFiles: [
    //                 "infra/**/*",
    //                 "models/**/*"
    //             ],
    //         }
    //     }
    // ]
    "functions": {
        "api/**/*.js": {
            "includeFiles": "{infra/**/*,models/**/*}"
        }
    }
}

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
