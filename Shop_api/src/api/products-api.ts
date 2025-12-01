import { Request, Response, Router } from "express";
import { mapCommentsEntity, mapImagesEntity, mapProductsEntity } from "../services/mapping";
import { connection } from "../../index";
import {
  IProductEntity,
  ICommentEntity,
  IProductSearchFilter,
  ProductCreatePayload,
  IImageEntity,
  ImageCreatePayload,
  ProductAddImagesPayload,
  ImagesRemovePayload,
  IProductImageEntity
} from "../../types";
import { IImages, IProduct } from "@Shared/types";
import {enhanceProductsCommentsAndImages, getProductsFilterQuery} from "../helpers";
import {ResultSetHeader} from "mysql2";
import {
    DELETE_IMAGES_QUERY,
    INSERT_IMAGE_QUERY, INSERT_PRODUCT_IMAGES_QUERY,
    INSERT_PRODUCT_QUERY,
    REPLACE_PRODUCT_THUMBNAIL, UPDATE_PRODUCT_FIELDS,
    INSERT_SIMILAR_PRODUCTS,
    DELETE_SIMILAR_BY_PRODUCT_IDS
} from "../services/queries";
import { v4 as uuidv4 } from 'uuid';
import {body, param, validationResult} from "express-validator";

export const productsRouter = Router();

const throwServerError = (res: Response, e: Error) => {
    console.debug(e.message);
    res.status(500);
    res.send("Something went wrong");
}

productsRouter.get('/', async (req: Request, res: Response) => {
    try {
        const [productRows] = await connection!.query < IProductEntity[] > (
            "SELECT * FROM products"
        );

        const [commentRows] = await connection!.query < ICommentEntity[] > (
            "SELECT * FROM Comments"
        );

        const [imagesRows] = await connection!.query < IImageEntity[] > (
            "SELECT * FROM images"
        );

        const products = mapProductsEntity(productRows);
        const result = enhanceProductsCommentsAndImages(products, commentRows, imagesRows);

        res.send(result);
    } catch (err: any) {
        throwServerError(res, err);
    }
});

productsRouter.get('/search', async (req: Request<{}, {}, {}, IProductSearchFilter>, res: Response) => {
    try {
        const [query, values] = getProductsFilterQuery(req.query);
        const [productRows] = await connection!.query<IProductEntity[]>(query, values);

        if (!productRows?.length) {
            res.status(404);
            res.send(`Products are not found`);
            return;
        }

        const [commentRows] = await connection!.query < ICommentEntity[] > (
            "SELECT * FROM Comments"
        );

        const [imagesRows] = await connection!.query < IImageEntity[] > (
            "SELECT * FROM images"
        );

        const products = mapProductsEntity(productRows);
        const result = enhanceProductsCommentsAndImages(products, commentRows, imagesRows);

        res.send(result);
    } catch (err: any) {
        throwServerError(res, err);
    }
});

productsRouter.get('/:id', async (req: Request<{id: string}>, res: Response) => {
    try {
        const [products] = await connection!.query<IProductEntity[]>(
            'SELECT * FROM products c WHERE product_id = ?',
            [req.params.id]
        );

        if (!products[0]) {
            res.status(404);
            res.send(`Comment with id ${req.params.id} is not found`);
            return;
        }

        const [comments] = await connection!.query<ICommentEntity[]>(
            'SELECT * FROM Comments c WHERE product_id = ?',
            [req.params.id]
        );

        const [images] = await connection!.query<IImageEntity[]>(
            'SELECT * FROM images i WHERE product_id = ?',
            [req.params.id]
        );

        const product = mapProductsEntity(products)[0];

        if (comments.length) {
            product.comments = mapCommentsEntity(comments);
        }

        if (images.length) {
            product.images = mapImagesEntity(images);
        }

        res.send(product);

    } catch (err: any) {
        throwServerError(res, err);
    }
});

productsRouter.post('/', async (req: Request<{}, {}, ProductCreatePayload>, res: Response) => {
    try {
        const {title, description, price, images} = req.body;
        const id = uuidv4();

        await connection!.query<ResultSetHeader>(
            INSERT_PRODUCT_QUERY,
            [id, title || null, description || null, price || null]
        );

        let createdImages: IImages[] | undefined;
        let thumbnail: string | undefined;

        if (images && images.length) {
            const mainFlag = images[0].main ?? 1;
            const imageId = uuidv4();

            await connection!.query<ResultSetHeader>(
                INSERT_IMAGE_QUERY,
                [imageId, id, images[0].url || null, mainFlag]
            );

            createdImages = [{
                id: imageId,
                productId: id,
                url: images[0].url,
                main: mainFlag
            }];

            if (mainFlag === 1) {
                thumbnail = images[0].url;
            }
        }

        const createdProduct: IProduct = {
            id,
            title: title || "",
            description: description || "",
            price: Number(price) || 0,
            comments: [],
            images: createdImages,
            thumbnail
        };

        res.status(201);
        res.send(createdProduct);
    } catch (err: any) {
        throwServerError(res, err);
    }
});

productsRouter.delete('/:id', async (
    req: Request<{ id: string }>,
    res: Response
) => {
    try {
        // удаляем связи похожих товаров, чтобы не нарушать ограничения внешнего ключа
        await connection!.query<ResultSetHeader>(
            DELETE_SIMILAR_BY_PRODUCT_IDS,
            [[req.params.id], [req.params.id]]
        );

        const [deletedImage] = await connection!.query < ResultSetHeader > (
            "DELETE FROM images WHERE product_id = ?",
            [req.params.id]
        );

        const [deletedComment] = await connection!.query < ResultSetHeader > (
            "DELETE FROM Comments WHERE product_id = ?",
            [req.params.id]
        );

        const [info] = await connection!.query < ResultSetHeader > (
            "DELETE FROM products WHERE product_id = ?",
            [req.params.id]
        );

        if (info.affectedRows === 0) {
            res.status(404);
            res.send(`Product with id ${req.params.id} is not found`);
            return;
        }

        res.status(200);
        res.end();
    } catch (err: any) {
        throwServerError(res, err);
    }
});

interface ISimilarPair {
    productId: string;
    similarProductId: string;
}

productsRouter.get('/similar/:id',
    [
        param('id').isUUID().withMessage('Product id is not UUID')
    ],
    async (req: Request<{ id: string }>, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400);
                res.json({ errors: errors.array() });
                return;
            }

            const productId = req.params.id;

            const [rows] = await connection!.query<any[]>(
                `
                SELECT p.*
                FROM similar_products sp
                JOIN products p ON p.product_id = CASE
                    WHEN sp.product_id = ? THEN sp.similar_product_id
                    ELSE sp.product_id
                END
                WHERE sp.product_id = ? OR sp.similar_product_id = ?
                `,
                [productId, productId, productId]
            );

            if (!rows?.length) {
                res.send([]);
                return;
            }

            const similarProducts = mapProductsEntity(rows);
            res.send(similarProducts);
        } catch (e: any) {
            throwServerError(res, e);
        }
    }
);

productsRouter.post(
    '/similar',
    [
        body().isArray({ min: 1 }).withMessage('Body must be a non-empty array'),
        body('*.productId').isUUID().withMessage('productId must be UUID'),
        body('*.similarProductId').isUUID().withMessage('similarProductId must be UUID'),
    ],
    async (req: Request<{}, {}, ISimilarPair[]>, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400);
                res.json({ errors: errors.array() });
                return;
            }

            const pairs = req.body;

            const values = pairs.map(pair => [pair.productId, pair.similarProductId]);

            await connection!.query<ResultSetHeader>(
                INSERT_SIMILAR_PRODUCTS,
                [values]
            );

            res.status(201);
            res.send('Similar products relations have been added');
        } catch (e: any) {
            throwServerError(res, e);
        }
    }
);

productsRouter.delete(
    '/similar',
    [
        body().isArray({ min: 1 }).withMessage('Body must be a non-empty array'),
        body('*').isUUID().withMessage('Each id must be UUID'),
    ],
    async (req: Request<{}, {}, string[]>, res: Response) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400);
                res.json({ errors: errors.array() });
                return;
            }

            const productIds = req.body;

            const [info] = await connection!.query<ResultSetHeader>(
                DELETE_SIMILAR_BY_PRODUCT_IDS,
                [productIds, productIds]
            );

            if (info.affectedRows === 0) {
                res.status(404);
                res.send('No similar relations have been removed');
                return;
            }

            res.status(200);
            res.send('Similar relations have been removed');
        } catch (e: any) {
            throwServerError(res, e);
        }
    }
);

productsRouter.post('/add-images', async (
    req: Request<{}, {}, ProductAddImagesPayload>,
    res: Response
) => {
    try {
        const { productId, images } = req.body;

        if (!images?.length) {
            res.status(400);
            res.send("Images array is empty");
            return;
        }

        const values = images.map((image) => [uuidv4(), image.url, productId, image.main]);
        await connection.query<ResultSetHeader>(INSERT_PRODUCT_IMAGES_QUERY, [values]);

        res.status(201);
        res.send(`Images for a product id:${productId} have been added!`);
    } catch (e: any) {
        throwServerError(res, e);
    }
});

productsRouter.post('/remove-images', async (
    req: Request<{}, {}, ImagesRemovePayload>,
    res: Response
) => {
    try {
        const imagesToRemove = req.body;

        if (!imagesToRemove?.length) {
            res.status(400);
            res.send("Images array is empty");
            return;
        }

        const [info] = await connection.query<ResultSetHeader>(DELETE_IMAGES_QUERY, [[imagesToRemove]]);

        if (info.affectedRows === 0) {
            res.status(404);
            res.send("No one image has been removed");
            return;
        }

        res.status(200);
        res.send(`Images have been removed!`);
    } catch (e: any) {
        throwServerError(res, e);
    }
});

productsRouter.post(
    '/update-thumbnail/:id',
    [
        param('id').isUUID().withMessage('Product id is not UUID'),
        body('newThumbnailId').isUUID().withMessage('New thumbnail id is empty or not UUID')
    ],
    async (
    req: Request<{ id: string }, {}, { newThumbnailId: string }>,
    res: Response
) => {
    try {
        const errors = validationResult(req);
        if(!errors.isEmpty()) {
            res.status(400);
            res.json({errors: errors.array()});
            return;
        }
        const [currentThumbnailRows] = await connection.query<IProductImageEntity[]>(
            "SELECT * FROM images WHERE product_id=? AND main=?",
            [req.params.id, 1]
        );

        if (!currentThumbnailRows?.length || currentThumbnailRows.length > 1) {
            res.status(400);
            res.send("Incorrect product id");
            return;
        }

        const [newThumbnailRows] = await connection.query<IProductImageEntity[]>(
            "SELECT * FROM images WHERE product_id=? AND image_id=?",
            [req.params.id, req.body.newThumbnailId]
        );

        if (newThumbnailRows?.length !== 1) {
            res.status(400);
            res.send("Incorrect new thumbnail id");
            return;
        }

        const currentThumbnailId = currentThumbnailRows[0].image_id;
        const [info] = await connection.query<ResultSetHeader>(
            REPLACE_PRODUCT_THUMBNAIL,
            [currentThumbnailId, req.body.newThumbnailId, currentThumbnailId, req.body.newThumbnailId]
        );

        if (info.affectedRows === 0) {
            res.status(404);
            res.send("No one image has been updated");
            return;
        }

        res.status(200);
        res.send("New product thumbnail has been set!");
    } catch (e: any) {
        throwServerError(res, e);
    }
});

productsRouter.patch('/:id', async (
    req: Request<{ id: string }, {}, ProductCreatePayload>,
    res: Response
) => {
    try {
        const { id } = req.params;

        const [rows] = await connection.query<IProductEntity[]>(
            "SELECT * FROM products WHERE product_id = ?",
            [id]
        );

        if (!rows?.[0]) {
            res.status(404);
            res.send(`Product with id ${id} is not found`);
            return;
        }

        const currentProduct = rows[0];

        await connection.query<ResultSetHeader>(
            UPDATE_PRODUCT_FIELDS,
            [
                req.body.hasOwnProperty("title") ? req.body.title : currentProduct.title,
                req.body.hasOwnProperty("description") ? req.body.description : currentProduct.description,
                req.body.hasOwnProperty("price") ? req.body.price : currentProduct.price,
                id
            ]
        );

        res.status(200);
        res.send(`Product id:${id} has been added!`);
    } catch (e: any) {
        throwServerError(res, e);
    }
});