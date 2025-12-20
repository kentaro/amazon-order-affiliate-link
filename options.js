const DEFAULT_TAG = 'antipop-22';

document.addEventListener('DOMContentLoaded', () => {
  const tagInput = document.getElementById('affiliateTag');
  const saveBtn = document.getElementById('save');
  const status = document.getElementById('status');

  // 保存されているタグを読み込む
  chrome.storage.sync.get({ affiliateTag: DEFAULT_TAG }, (result) => {
    tagInput.value = result.affiliateTag;
  });

  // 保存ボタンのクリック
  saveBtn.addEventListener('click', () => {
    const tag = tagInput.value.trim();
    if (!tag) {
      status.textContent = 'タグを入力してください';
      status.className = 'status success';
      status.style.backgroundColor = '#f8d7da';
      status.style.color = '#721c24';
      return;
    }

    chrome.storage.sync.set({ affiliateTag: tag }, () => {
      status.textContent = '保存しました';
      status.className = 'status success';
      status.style.backgroundColor = '#d4edda';
      status.style.color = '#155724';
      setTimeout(() => {
        status.className = 'status';
      }, 2000);
    });
  });
});
