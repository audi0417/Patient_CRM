const SimpleTest = () => {
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>🎯 簡易測試頁面</h1>

      <div style={{ backgroundColor: '#f0f0f0', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '10px' }}>環境資訊</h2>
        <p><strong>當前 URL:</strong> {window.location.href}</p>
        <p><strong>Demo 模式:</strong> {String(window.__isDemoMode)}</p>
        <p><strong>端口:</strong> {window.location.port}</p>
      </div>

      <div style={{ backgroundColor: '#d4edda', padding: '20px', borderRadius: '8px', border: '2px solid #28a745' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '10px', color: '#155724' }}>✅ 成功！</h2>
        <p style={{ color: '#155724', fontSize: '18px' }}>
          如果您能看到這個頁面，表示：
        </p>
        <ul style={{ color: '#155724', fontSize: '16px' }}>
          <li>✅ Vite 開發伺服器正在運行</li>
          <li>✅ React 應用已載入</li>
          <li>✅ 路由系統正常工作</li>
          <li>✅ <strong>不需要登入！</strong></li>
        </ul>
      </div>

      <div style={{ marginTop: '20px' }}>
        <a href="/" style={{
          display: 'inline-block',
          padding: '12px 24px',
          backgroundColor: '#007bff',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '4px',
          marginRight: '10px'
        }}>
          前往 Demo 首頁
        </a>

        <a href="/test" style={{
          display: 'inline-block',
          padding: '12px 24px',
          backgroundColor: '#28a745',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '4px'
        }}>
          前往完整測試頁
        </a>
      </div>
    </div>
  );
};

export default SimpleTest;
