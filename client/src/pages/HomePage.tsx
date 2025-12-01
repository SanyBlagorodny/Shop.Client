import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loadAllProducts } from '../store/productsSlice';
import { RootState, AppDispatch } from '../store';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { items, totalPrice, loadingList } = useSelector((state: RootState) => state.products);

  useEffect(() => {
    dispatch(loadAllProducts());
  }, [dispatch]);

  const n = items.length;
  const m = totalPrice;

  return (
    <div style={{ padding: '8px 0' }}>
      <h2 style={{ marginTop: 0 }}>Главная</h2>
      {loadingList ? (
        <p>Загрузка...</p>
      ) : (
        <p>В базе данных находится {n} товаров общей стоимостью {m}</p>
      )}
      <button onClick={() => navigate('/products-list')} style={{ marginRight: '8px' }}>
        Перейти к списку товаров
      </button>
      <button onClick={() => window.open('/admin', '_blank')}>
        Перейти в систему администрирования
      </button>
    </div>
  );
};

export default HomePage;


