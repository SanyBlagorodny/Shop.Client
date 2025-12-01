import {ICommentEntity, IProductSearchFilter, IImageEntity} from "../types";
import { IComment, IImages, IProduct} from "@Shared/types";
import {mapCommentEntity, mapImageEntity} from "./services/mapping";

export const enhanceProductsCommentsAndImages = (
    products: IProduct[],
    commentRows: ICommentEntity[],
    imagesRows: IImageEntity[]
): IProduct[] => {
    const commentsByProductId = new Map < string, IComment[]> ();
    const imagesByProductId = new Map < string, IImages[]> ();

    for (let commentEntity of commentRows) {
        const comment = mapCommentEntity(commentEntity);
        if (!commentsByProductId.has(comment.productId)) {
            commentsByProductId.set(comment.productId, []);
        }

        const list = commentsByProductId.get(comment.productId);
        commentsByProductId.set(comment.productId, [...list!, comment]);
    }

    for (let imageEntity of imagesRows) {
        const image = mapImageEntity(imageEntity);
        if (!imagesByProductId.has(image.productId)) {
            imagesByProductId.set(image.productId, []);
        }

        const list = imagesByProductId.get(image.productId);
        imagesByProductId.set(image.productId, [...list!, image]);
    }

    for (let product of products) {
        for (let image of imagesRows) {
            if (commentsByProductId.has(product.id)) {
                product.comments = commentsByProductId.get(product.id);
            }

            if (imagesByProductId.has(product.id)) {
                product.images = imagesByProductId.get(product.id);
            }

            if (image.product_id === product.id && image.main === 1) {
                product.thumbnail = image.url;
            }
        }

        // если не нашли main-картинку, но есть хотя бы одно изображение,
        // используем первую картинку как thumbnail по умолчанию
        if (!product.thumbnail && product.images?.length) {
            product.thumbnail = product.images[0].url;
        }
    }

    return products;
}

export const getProductsFilterQuery = (
    filter: IProductSearchFilter
): [string , (string | number)[]] => {
    const { title, description, priceFrom, priceTo } = filter;

    let query: string | number = "SELECT * FROM products WHERE ";
    const values: (string | number)[] = []

    if (title) {
        query += "title LIKE ? ";
        values.push(`%${title}%`);
    }

    if (description) {
        if (values.length) {
            query += " OR ";
        }

        query += "description LIKE ? ";
        values.push(`%${description}%`);
    }

    if (priceFrom || priceTo) {
        if (values.length) {
            query += " OR ";
        }

        query += `(price > ? AND price < ?)`;
        values.push(priceFrom || 0);
        values.push(priceTo || 999999);
    }

    return [query, values];
}