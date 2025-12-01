import React, { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { addCommentThunk, loadProductWithSimilar } from '../store/productsSlice';
import { RootState, AppDispatch } from '../store';

const ProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const { current: product, similar, loadingCurrent, savingComment } = useSelector(
    (state: RootState) => state.products
  );
  const [commentTitle, setCommentTitle] = useState('');
  const [commentEmail, setCommentEmail] = useState('');
  const [commentBody, setCommentBody] = useState('');
  useEffect(() => {
    if (!id) return;
    dispatch(loadProductWithSimilar(id));
  }, [dispatch, id]);

  const onSubmitComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await dispatch(
        addCommentThunk({
          name: commentTitle,
          email: commentEmail,
          body: commentBody,
          productId: id
        })
      );
      setCommentTitle('');
      setCommentEmail('');
      setCommentBody('');
    } catch (err) {
      console.error(err);
    }
  };

  if (loadingCurrent) {
    return <p>Загрузка...</p>;
  }

  if (!product) {
    return <p>Товар не найден</p>;
  }

  const mainImage =
    product.thumbnail ||
    product.images?.find(i => i.main === 1)?.url ||
    product.images?.[0]?.url;

  const otherImages = product.images?.filter(i => i.url !== mainImage);

  return (
    <div>
      <h2>{product.title}</h2>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ height: '200px', marginBottom: '8px' }}>
          <img
            src={
              mainImage ||
              'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="300" height="200" fill="%23ddd"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23777" font-size="18">Нет изображения</text></svg>'
            }
            alt={product.title}
            style={{ maxWidth: '100%', maxHeight: '100%' }}
          />
        </div>
        {otherImages && otherImages.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {otherImages.map(img => (
              <div key={img.id} style={{ width: '80px', height: '80px' }}>
                <img
                  src={
                    img.url ||
                    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="%23ddd"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23777" font-size="10">Нет изображения</text></svg>'
                  }
                  alt={product.title}
                  style={{ maxWidth: '100%', maxHeight: '100%' }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      <p>{product.description}</p>
      <p>Цена: {product.price}</p>

      {similar.length > 0 && (
        <section style={{ marginTop: '24px' }}>
          <h3>Похожие товары</h3>
          <ul>
            {similar.map(sp => (
              <li key={sp.id}>
                <Link to={`/${sp.id}`}>{sp.title}</Link> — {sp.price}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section style={{ marginTop: '24px' }}>
        <h3>Комментарии</h3>
        {product.comments && product.comments.length > 0 ? (
          <ul>
            {product.comments.map(c => (
              <li key={c.id} style={{ marginBottom: '8px' }}>
                <strong>{c.name}</strong> ({c.email})<br />
                {c.body}
              </li>
            ))}
          </ul>
        ) : (
          <p>Комментариев пока нет</p>
        )}
      </section>

      <section style={{ marginTop: '24px' }}>
        <h3>Добавить комментарий</h3>
        <form onSubmit={onSubmitComment}>
          <div>
            <input
              placeholder="Заголовок"
              value={commentTitle}
              onChange={e => setCommentTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <input
              placeholder="E-mail"
              type="email"
              value={commentEmail}
              onChange={e => setCommentEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <textarea
              placeholder="Текст комментария"
              value={commentBody}
              onChange={e => setCommentBody(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={savingComment}>
            {savingComment ? 'Сохранение...' : 'Сохранить'}
          </button>
        </form>
      </section>
    </div>
  );
};

export default ProductPage;
