import axios from 'axios';
import { IProduct, IProductSearchPayload, IComment } from './types';

const api = axios.create({
  baseURL: '/api'
});

export async function fetchProducts(): Promise<IProduct[]> {
  const { data } = await api.get<IProduct[]>('/products');
  return data || [];
}

export async function searchProducts(filter: IProductSearchPayload): Promise<IProduct[]> {
  const { data } = await api.get<IProduct[]>('/products/search', { params: filter });
  return data || [];
}

export async function fetchProduct(id: string): Promise<IProduct> {
  const { data } = await api.get<IProduct>(`/products/${id}`);
  return data;
}

export async function fetchSimilarProducts(id: string): Promise<IProduct[]> {
  const { data } = await api.get<IProduct[]>(`/products/similar/${id}`);
  return data || [];
}

export interface CreateCommentPayload {
  name: string;
  email: string;
  body: string;
  productId: string;
}

export async function createComment(payload: CreateCommentPayload): Promise<void> {
  const withId: IComment = {
    id: String(Date.now()),
    ...payload
  };

  await api.post('/comments', withId);
}


