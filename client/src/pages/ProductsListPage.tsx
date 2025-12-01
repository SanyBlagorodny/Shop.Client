import React, { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loadAllProducts, searchProductsThunk } from '../store/productsSlice';
import { RootState, AppDispatch } from '../store';

const ProductsListPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { items, loadingList } = useSelector((state: RootState) => state.products);
  const [title, setTitle] = useState('');
  const [priceFrom, setPriceFrom] = useState('');
  const [priceTo, setPriceTo] = useState('');
  useEffect(() => {
    dispatch(loadAllProducts());
  }, [dispatch]);

  const onSearch = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await dispatch(
        searchProductsThunk({
        title: title || undefined,
        priceFrom: priceFrom ? Number(priceFrom) : undefined,
        priceTo: priceTo ? Number(priceTo) : undefined
        })
      );
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <h2>Список товаров ({items.length})</h2>
      <form onSubmit={onSearch} style={{ marginBottom: '16px' }}>
        <input
          placeholder="Название"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{ marginRight: '8px' }}
        />
        <input
          placeholder="Цена от"
          value={priceFrom}
          onChange={e => setPriceFrom(e.target.value)}
          style={{ marginRight: '8px' }}
        />
        <input
          placeholder="Цена до"
          value={priceTo}
          onChange={e => setPriceTo(e.target.value)}
          style={{ marginRight: '8px' }}
        />
        <button type="submit">Фильтр</button>
      </form>
      {loadingList ? (
        <p>Загрузка...</p>
      ) : (
        <div className="product-grid">
          {items.map(p => (
            <div key={p.id} className="product-card">
              <Link to={`/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <h3>{p.title}</h3>
                <div style={{ height: '140px', marginBottom: '8px' }}>
                  <img
                    src={
                      p.thumbnail ||
                      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150"><rect width="200" height="150" fill="%23ddd"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23777" font-size="14">Нет изображения</text></svg>'
                    }
                    alt={p.title}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }}
                  />
                </div>
              </Link>
              <p>Цена: {p.price}</p>
              <p>Комментариев: {p.comments?.length ?? 0}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductsListPage;


