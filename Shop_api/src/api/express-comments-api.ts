import express, { Request, Response, Router } from 'express';
import {readFile, writeFile} from "fs/promises";
import { v4 as uuidv4 } from 'uuid';
import {CommentCreatePayload, ICommentEntity} from "../../types";
import {IComment} from "@Shared/types";
import {connection} from "../../index";
import {mapCommentsEntity} from '../services/mapping';
import {ResultSetHeader} from "mysql2";
import {FIND_DUPLICATE_QUERY, INSERT_COMMENT_QUERY} from "../services/queries";
import {param, validationResult} from "express-validator";

export const commentsRouter = Router();
const app = express();
const jsonMiddleware = express.json();
app.use(jsonMiddleware);

const PATH = '/api/comments';

const loadComments = async (): Promise<IComment[]> => {
    const rawData = await readFile("mock-comment.json", "binary");
    return JSON.parse(rawData);
}

const saveComments = async (data: CommentCreatePayload[]): Promise<boolean> => {
    try {
        await writeFile("mock-comment.json", JSON.stringify(data));
        return true;
    }
    catch(err) {
        return false;
    }

}

const compareValues = (target: string, compare: string) => {
    if (target) {
        return target.toLowerCase() === compare.toLowerCase();
    }
    return null
}

export const checkCommentUniq = (payload: CommentCreatePayload, comments: IComment[]) => {
    if (payload) {
        const checkByEmail = comments.find(({ email }) => compareValues(payload.email, email));

        if (!checkByEmail) {
            return true;
        }

        const { body, name, productId } = checkByEmail;
        return !(
            compareValues(payload.body, body) &&
            compareValues(payload.name, name) &&
            compareValues(payload.productId.toString(), productId.toString())
        );
    }
}

commentsRouter.get(`/`, async (req: Request, res: Response) => {
    try {
        const [comments]: any = await connection?.query<ICommentEntity[]>("SELECT * FROM Comments");
        res.setHeader('Content-Type', 'application/json');
        res.send(mapCommentsEntity(comments));
    } catch (error: any) {
        console.debug(error.message);
        res.status(500);
        res.send('Something went wrong');
    }
});

// GET function to get a comment by id
commentsRouter.get(
    `/:id`,
    [
        param('id').isUUID().withMessage('Comment id is not UUID')
    ],
    async (req: Request<{id: string}>, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400);
            res.json({errors: errors.array()});
            return;
        }


        const [rows] = await connection!.query<ICommentEntity[]>(
            'SELECT * FROM Comments c WHERE comment_id = ?',
            [req.params.id]
        );

        if (!rows[0]) {
            res.status(404);
            res.send(`Comment with id ${req.params.id} is not found`);
            return;
        }
        res.setHeader('Content-Type', 'application/json');
        res.send(mapCommentsEntity(rows)[0]);
    } catch(err: any) {
        console.debug(err.message);
        res.status(500);
        res.send("Something went wrong");
    }
});

type CommentValidator = (comment: CommentCreatePayload) => string | null;

const validateComment: CommentValidator = (body: CommentCreatePayload) => {
    const FIELDS = ['name', 'body', 'id', 'email'];

    if (!body || !Object.keys(body).length) {
        return 'Comment is absent or empty';
    }

    let checkAllKeys = FIELDS.every((key) => body.hasOwnProperty(key));
    const keyIndex = FIELDS.findIndex(index => !body.hasOwnProperty(index));

    if (!checkAllKeys) {
        return `This field <${FIELDS[keyIndex]}> is missing`
    }

    return null;
}

commentsRouter.post('/', async (req: Request<{}, {}, CommentCreatePayload>, res: Response) => {

    const validationResult = validateComment(req.body);

    if (validationResult) {
        res.status(400);
        res.send(validationResult);
        return;
    }

    try {
        const { name, email, body, productId } = req.body;
        const [sameResult] = await connection!.query<ICommentEntity[]>(
            FIND_DUPLICATE_QUERY,
            [email.toLowerCase(), name.toLowerCase(), body.toLowerCase(), productId]
        );

        console.log(sameResult[0]?.comment_id);

        if (sameResult.length) {
            res.status(422);
            res.send("Comment with the same fields already exists");
            return;
        }

        const id = uuidv4();

        await connection!.query<ResultSetHeader>(
            INSERT_COMMENT_QUERY,
            [id, email, name, body, productId]
        )

        res.status(201);
        res.send(`Comment id:${id} has been added!`);
    } catch(error: any) {
           console.debug(error.message);
           res.status(500);
           res.send("Server error. Comment has not been created");
       }
});

commentsRouter.patch('/', async (req: Request<{}, {}, Partial<IComment>>, res: Response) => {
    try {
        let updateQuery = "UPDATE Comments SET ";
        const valuesToUpdate = [];

        ["name", "body", "email"].forEach(fieldName => {
            if (req.body.hasOwnProperty(fieldName)) {
                if (valuesToUpdate.length) {
                    updateQuery += ", ";
                }

                updateQuery += `${fieldName} = ?`;
                // @ts-ignore
                valuesToUpdate.push(req.body[fieldName]);
            }
        });

        updateQuery += " WHERE comment_id = ?";
        valuesToUpdate.push(req.body.id);

        const [info] = await connection!.query < ResultSetHeader > (updateQuery, valuesToUpdate);

        if (info.affectedRows === 1) {
            res.status(200);
            res.end();
            return;
        }

        const newComment = req.body as CommentCreatePayload;
        const validationResult = validateComment(newComment);

        if (validationResult) {
            res.status(400);
            res.send(validationResult);
            return;
        }

        const id = uuidv4();
        await connection!.query < ResultSetHeader > (
            INSERT_COMMENT_QUERY,
            [id, newComment.email, newComment.name, newComment.body, newComment.productId]
        );

        res.status(201);
        res.send({ ...newComment, id })
    } catch (error: any) {
        console.log(error.message);
        res.status(500);
        res.send("Server error");
    }
})

commentsRouter.delete(`/:id`, async (req: Request<{ id: string }>, res: Response) => {
    try {
        const comments = await connection?.query<ICommentEntity[]>('SELECT * FROM Comments');
        const { productId } = req.body;
        const [sameResult] = await connection!.query<ResultSetHeader>(
            'DELETE FROM Comments c WHERE c.comment_id = ?',
            [req.params.id]
        )

        if (sameResult.affectedRows === 0) {
           res.status(400);
           res.send(`No comment with id ${req.params.id} is found`);
        }
        res.status(200);
        res.send(`The comment with id${req.params.id} has been deleted`);
        res.end();
    } catch (error: any) {
        console.debug(error.message);
        res.status(500);
        res.send("Something went wrong");
    }
});
