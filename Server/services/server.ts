import express, { Express } from "express";
import path from "path";

const host = process.env.LOCAL_HOST || "127.0.0.1";
const port = Number(process.env.LOCAL_PORT) || 3000;

export function initServer(): Express {
    const app = express();

    const jsonMiddleware = express.json();
    app.use(jsonMiddleware);

    const clientBuildPath = path.join(__dirname, "..", "..", "client", "dist");
    app.use(express.static(clientBuildPath));

    app.listen(port, host!, () => {
        console.log(`Server running on port ${port} and host ${host}`);
    });

    return app;
}