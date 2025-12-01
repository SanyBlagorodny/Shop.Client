import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IProduct, IProductSearchPayload } from '../types';
import {
  CreateCommentPayload,
  createComment,
  fetchProduct,
  fetchProducts,
  fetchSimilarProducts,
  searchProducts
} from '../api';

interface ProductsState {
  items: IProduct[];
  totalPrice: number;
  loadingList: boolean;
  current: IProduct | null;
  loadingCurrent: boolean;
  similar: IProduct[];
  loadingSimilar: boolean;
  savingComment: boolean;
}

const initialState: ProductsState = {
  items: [],
  totalPrice: 0,
  loadingList: false,
  current: null,
  loadingCurrent: false,
  similar: [],
  loadingSimilar: false,
  savingComment: false
};

export const loadAllProducts = createAsyncThunk('products/loadAll', async () => {
  const products = await fetchProducts();
  return products;
});

export const searchProductsThunk = createAsyncThunk(
  'products/search',
  async (filter: IProductSearchPayload) => {
    const products = await searchProducts(filter);
    return products;
  }
);

export const loadProductWithSimilar = createAsyncThunk(
  'products/loadProductWithSimilar',
  async (id: string) => {
    const [product, similar] = await Promise.all([
      fetchProduct(id),
      fetchSimilarProducts(id)
    ]);
    return { product, similar };
  }
);

export const addCommentThunk = createAsyncThunk(
  'products/addComment',
  async (payload: CreateCommentPayload, { dispatch }) => {
    await createComment(payload);
    await dispatch(loadProductWithSimilar(payload.productId));
  }
);

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(loadAllProducts.pending, state => {
        state.loadingList = true;
      })
      .addCase(loadAllProducts.fulfilled, (state, action: PayloadAction<IProduct[]>) => {
        state.loadingList = false;
        state.items = action.payload;
        state.totalPrice = action.payload.reduce((sum, p) => sum + (p.price || 0), 0);
      })
      .addCase(loadAllProducts.rejected, state => {
        state.loadingList = false;
      });

    builder
      .addCase(searchProductsThunk.pending, state => {
        state.loadingList = true;
      })
      .addCase(searchProductsThunk.fulfilled, (state, action: PayloadAction<IProduct[]>) => {
        state.loadingList = false;
        state.items = action.payload;
        state.totalPrice = action.payload.reduce((sum, p) => sum + (p.price || 0), 0);
      })
      .addCase(searchProductsThunk.rejected, state => {
        state.loadingList = false;
      });

    builder
      .addCase(loadProductWithSimilar.pending, state => {
        state.loadingCurrent = true;
        state.loadingSimilar = true;
      })
      .addCase(
        loadProductWithSimilar.fulfilled,
        (state, action: PayloadAction<{ product: IProduct; similar: IProduct[] }>) => {
          state.loadingCurrent = false;
          state.loadingSimilar = false;
          state.current = action.payload.product;
          state.similar = action.payload.similar;
        }
      )
      .addCase(loadProductWithSimilar.rejected, state => {
        state.loadingCurrent = false;
        state.loadingSimilar = false;
        state.current = null;
        state.similar = [];
      });

    builder
      .addCase(addCommentThunk.pending, state => {
        state.savingComment = true;
      })
      .addCase(addCommentThunk.fulfilled, state => {
        state.savingComment = false;
      })
      .addCase(addCommentThunk.rejected, state => {
        state.savingComment = false;
      });
  }
});

export default productsSlice.reducer;



