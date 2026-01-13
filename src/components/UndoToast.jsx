import { useEffect, useState } from 'react';

/**
 * UndoToast - 刪除後的復原提示組件
 * 顯示刪除提示，提供復原按鈕，自動消失
 */
function UndoToast({ message, onUndo, duration = 5000 }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleUndo = () => {
    setIsExiting(true);
    setTimeout(() => {
      onUndo();
    }, 300); // 等待動畫完成
  };

  const handleClose = () => {
    setIsExiting(true);
  };

  if (isExiting) {
    return null;
  }

  return (
    <div className={`undo-toast ${isExiting ? 'toast-exit' : ''}`}>
      <div className="undo-toast-message">{message}</div>
      <div className="undo-toast-actions">
        <button className="undo-btn" onClick={handleUndo}>
          ↩ 復原
        </button>
        <button className="undo-close" onClick={handleClose}>
          ✕
        </button>
      </div>
    </div>
  );
}

export default UndoToast;
