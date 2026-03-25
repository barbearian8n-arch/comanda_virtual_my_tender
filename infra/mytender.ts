import axios from "axios";

const mytenderClient = axios.create({
    baseURL: process.env.MYTENDER_URL,
    headers: {
        "Content-Type": "application/json",
        "apikey": process.env.MYTENDER_APIKEY,
    },
});

export default mytenderClient;