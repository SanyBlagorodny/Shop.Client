import express, { Router, Request, Response } from "express";
import {createProduct, getProduct, getProducts, getSimilarProducts, removeProduct, searchProducts, updateProduct} from "../models/products.model";
import {IProductSearchPayload} from "@Shared/types";
import {IProductEditData} from "../types";
import {throwServerError} from "./helpers";

export const adminProductsRouter = Router();

adminProductsRouter.get('/', async (req: Request, res: Response) => {
    try {
        console.log(req.session.username);
        const products = await getProducts();
        res.render("./products", {
            items: products,
            queryParams: {}
        });
    } catch (err: any) {
        throwServerError(res, err);
    }
});

adminProductsRouter.get('/new-product', async (
    req: Request,
    res: Response
) => {
    try {
        const emptyProduct = {
            id: "",
            title: "",
            description: "",
            price: 0
        };

        res.render("product/product", {
            item: emptyProduct,
            isNew: true,
            similarProducts: [],
            otherProducts: []
        });
    } catch (err: any) {
        throwServerError(res, err);
    }
});

adminProductsRouter.get('/search', async (
    req: Request<{}, {}, {}, IProductSearchPayload>,
    res: Response
) => {
    try {
        const products = await searchProducts(req.query);
        res.render("products", {
            items: products,
            queryParams: req.query
        });
    } catch (err: any) {
        throwServerError(res, err);
    }
});

adminProductsRouter.get('/:id', async (
    req: Request<{ id: string }>,
    res: Response
) => {
    try {
        const product = await getProduct(req.params.id);

        if (product) {
            const allProducts = await getProducts();
            const similarProducts = await getSimilarProducts(req.params.id);

            const similarIds = new Set<string>(
                allProducts
                    .map((productItem: any): string => productItem.id)
                    .filter((id: string) =>
                        similarProducts.some((similarItem: any) => similarItem.id === id)
                    )
            );

            const otherProducts = allProducts.filter((productItem: any) =>
                productItem.id !== product.id && !similarIds.has(productItem.id)
            );

            res.render("product/product", {
                item: product,
                similarProducts,
                otherProducts
            });
        } else {
            res.render("product/empty-product", {
                id: req.params.id
            });
        }
    } catch (err: any) {
        throwServerError(res, err);
    }
});

adminProductsRouter.get('/remove-product/:id', async (
    req: Request<{ id: string }>,
    res: Response
) => {
    try {
        if (req.session.username === 'admin') {
            await removeProduct(req.params.id);
            res.redirect(`/${process.env.ADMIN_PATH}`);
        } else {
            res.status(403);
            res.send('Forbidden!');
            return;
        }
    } catch (e: any) {
        throwServerError(res, e);
    }
});

adminProductsRouter.post('/save/:id', async (
    req: Request<{ id: string }, {}, IProductEditData>,
    res: Response
) => {
    try {
       await updateProduct(req.params.id, req.body);
        res.redirect(`/${process.env.ADMIN_PATH}/${req.params.id}`);
    } catch (err: any) {
        throwServerError(res, err);
    }
});

adminProductsRouter.post('/new-product', async (
    req: Request<{}, {}, IProductEditData>,
    res: Response
) => {
    try {
        const created = await createProduct({
            title: req.body.title,
            description: req.body.description,
            price: req.body.price
        });

        res.redirect(`/${process.env.ADMIN_PATH}/${created.id}`);
    } catch (err: any) {
        throwServerError(res, err);
    }
});
