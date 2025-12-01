import express, { Express } from "express";
import {adminProductsRouter} from "./controllers/products.controllers";
import layout from "express-ejs-layouts";
import bodyParser from "body-parser";
import {authRouter, validateSession} from "./controllers/auth.controllers";
import session from "express-session";

export default function (): Express {
    const app = express();

    app.use(session({
        secret: `${process.env.SECRET}`,
        saveUninitialized: false,
        resave: false
    }));

    app.set('view engine', 'ejs');
    app.set('views', 'Shop_admin/views')

    app.use(express.json());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(layout);
    app.use(express.static(__dirname + "/public"));

    app.use(validateSession);

    app.use("/auth", authRouter);
    app.use("/", adminProductsRouter);

    return app;
}