import { useNavigate } from 'react-router-dom';

function ErrorPage({ message = '發生錯誤，請稍後再試。' }) {
  const navigate = useNavigate();

  return (
    <div className="container">
      <div className="error-message">
        <h2>❌ {message}</h2>
        <button
          onClick={() => navigate('/')}
          className="btn-action btn-excel-in"
          style={{ marginTop: '15px' }}
        >
          返回首頁
        </button>
      </div>
    </div>
  );
}

export default ErrorPage;
