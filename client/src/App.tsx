import React from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ProductsListPage from './pages/ProductsListPage';
import ProductPage from './pages/ProductPage';
import GradientText from './components/GradientText';

const App: React.FC = () => {
  return (
    <div className="app-shell">
      <div className="app-card">
        <header className="app-header">
          <GradientText>
            Shop.Client
          </GradientText>
          <nav className="app-nav">
            <Link to="/">Главная</Link>
            <Link to="/products-list">Товары</Link>
          </nav>
        </header>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products-list" element={<ProductsListPage />} />
          <Route path="/:id" element={<ProductPage />} />
        </Routes>
      </div>
    </div>
  );
};

export default App;



