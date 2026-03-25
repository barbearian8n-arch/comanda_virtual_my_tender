import axios from "axios";

export const api = axios.create({
    baseURL: process.env.MYTENDER_HOST,
    headers: {
        "Content-Type": "application/json",
        "apikey": process.env.MYTENDER_APIKEY,
    }
});