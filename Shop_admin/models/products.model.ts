import axios from "axios";
import {IProduct, IProductSearchPayload} from "@Shared/types";
import {IProductEditData} from "../types";
import {API_HOST} from "./const";

export async function getProducts() {
    const {data} = await axios.get<IProduct[]>(`${API_HOST}/products`);
    console.log(data.length)
    return data || [];
}

export async function searchProducts(
    filter: IProductSearchPayload
): Promise<IProduct[]> {
    const { data } = await axios.get < IProduct[] > (
        `${API_HOST}/products/search`,
        { params: filter }
    );
    return data || [];
}

export async function getProduct(
    id: string
): Promise<IProduct | null> {
    try {
        const { data } = await axios.get < IProduct > (
            `${API_HOST}/products/${id}`
        );
        return data;
    } catch (e) {
        return null;
    }
}

export async function removeProduct(id: string): Promise<void> {
    await axios.delete(`${API_HOST}/products/${id}`);
}

export async function removeComment(id: string): Promise<void> {
    await axios.delete(`${API_HOST}/comments/${id}`);
}

function compileIdsToRemove(data: string | string[]): string[] {
    if (typeof data === "string") return [data];
    return data;
}

function splitNewImages(str = ""): string[] {
    return str
        .split(/\r\n|,/g)
        .map(url => url.trim())
        .filter(url => url);
}

export async function updateProduct(
    productId: string,
    formData: IProductEditData
): Promise<void> {
    try {
        // запрашиваем у Products API товар до всех изменений
        const {
            data: currentProduct
        } = await axios.get < IProduct > (`${API_HOST}/products/${productId}`);

        if (formData.commentsToRemove) {
            const commentsIdsToRemove = compileIdsToRemove(formData.commentsToRemove);
            const getDeleteCommentActions = () => commentsIdsToRemove.map(commentId => {
                return axios.delete(`${API_HOST}/comments/${commentId}`);
            });
            await Promise.all(getDeleteCommentActions());
        }

        if (formData.imagesToRemove) {
            const imagesIdsToRemove = compileIdsToRemove(formData.imagesToRemove);
            await axios.post(`${API_HOST}/products/remove-images`, imagesIdsToRemove);
        }

        if (formData.newImages) {
            const urls = splitNewImages(formData.newImages);
            const images = urls.map(url => ({ url, main: 0 }));
            if (!currentProduct.thumbnail) {
                images[0].main = 1;
            }
            await axios.post(`${API_HOST}/products/add-images`, { productId, images });
        }

        if (formData.mainImage && formData.mainImage !== currentProduct?.thumbnail) {
            await axios.post(`${API_HOST}/products/update-thumbnail/${productId}`, {
                newThumbnailId: formData.mainImage
            });
        }

        // удаление связей похожих товаров
        if (formData.similarToRemove) {
            const idsToRemove = compileIdsToRemove(formData.similarToRemove);
            await axios.delete(`${API_HOST}/products/similar`, {
                data: idsToRemove
            });
        }

        // добавление новых связей похожих товаров
        if (formData.similarToAdd) {
            const idsToAdd = compileIdsToRemove(formData.similarToAdd);
            const pairs = idsToAdd.map(similarProductId => ({
                productId,
                similarProductId
            }));
            await axios.post(`${API_HOST}/products/similar`, pairs);
        }

        await axios.patch(`${API_HOST}/products/${productId}`, {
            title: formData.title,
            description: formData.description,
            price: Number(formData.price)
        });
    } catch (e) {
        console.log(e); // фиксируем ошибки, которые могли возникнуть в процессе
    }
}

export async function getSimilarProducts(
    productId: string
): Promise<IProduct[]> {
    const { data } = await axios.get<IProduct[]>(
        `${API_HOST}/products/similar/${productId}`
    );
    return data || [];
}

interface IProductCreatePayload {
    title: string;
    description: string;
    price: string;
}

export async function createProduct(
    formData: IProductCreatePayload
): Promise<IProduct> {
    const payload = {
        title: formData.title,
        description: formData.description,
        price: Number(formData.price)
    };

    const { data } = await axios.post<IProduct>(
        `${API_HOST}/products`,
        payload
    );

    return data;
}