import {Response} from "express";

export const throwServerError =(res: Response, err: Error) => {
    console.debug(err.message);
    res.status(500);
    res.send('Something went wrong');
}