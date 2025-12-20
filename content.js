(function() {
  const DEFAULT_AFFILIATE_TAG = 'antipop-22';
  let affiliateTag = DEFAULT_AFFILIATE_TAG;

  // chrome.storageからタグを読み込む
  chrome.storage.sync.get({ affiliateTag: DEFAULT_AFFILIATE_TAG }, (result) => {
    affiliateTag = result.affiliateTag;
  });

  // 設定変更を監視
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.affiliateTag) {
      affiliateTag = changes.affiliateTag.newValue;
    }
  });

  function extractProductInfo(container) {
    const links = container.querySelectorAll('a[href*="/dp/"], a[href*="/gp/product/"]');
    let titleLink = null;
    let asin = null;

    for (const link of links) {
      const text = link.textContent.trim();
      const asinMatch = link.href.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/);
      if (asinMatch) {
        asin = asinMatch[1];
        if (text) {
          titleLink = link;
          break;
        }
      }
    }

    if (!asin) return null;

    const title = titleLink ? titleLink.textContent.trim() : '';

    // Extract author from secondary text
    let author = '';
    const secondaryTexts = container.querySelectorAll('.a-color-secondary, .a-size-small');
    for (const el of secondaryTexts) {
      const text = el.textContent.trim();
      if (text && !text.includes('版') && !text.includes('形式') && text.length > 1) {
        author = text;
        break;
      }
    }

    return {
      title: title,
      author: author,
      asin: asin,
      url: `https://www.amazon.co.jp/dp/${asin}?tag=${affiliateTag}`
    };
  }

  function generateMarkdown(product) {
    if (product.author) {
      return `${product.author}『[${product.title}](${product.url})』`;
    }
    return `『[${product.title}](${product.url})』`;
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Failed to copy:', err);
      return false;
    }
  }

  function showToast(message, isSuccess = true) {
    const existing = document.querySelector('.amazon-link-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'amazon-link-toast';
    toast.textContent = message;
    toast.style.backgroundColor = isSuccess ? '#4CAF50' : '#f44336';
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  function addButtons() {
    const buttonLists = document.querySelectorAll('ul.yohtmlc-shipment-level-connections');

    buttonLists.forEach(ul => {
      if (ul.querySelector('.amazon-affiliate-copy-btn')) return;

      const itemContainer = ul.closest('.a-box') || ul.closest('[class*="shipment"]');
      if (!itemContainer) return;

      const product = extractProductInfo(itemContainer);
      if (!product) return;

      const li = document.createElement('li');
      li.className = 'a-spacing-mini';

      const btn = document.createElement('span');
      btn.className = 'a-button a-button-normal a-button-base amazon-affiliate-copy-btn';
      btn.innerHTML = `
        <span class="a-button-inner">
          <span class="a-button-text">リンクをコピー</span>
        </span>
      `;
      btn.style.cursor = 'pointer';

      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const markdown = generateMarkdown(product);
        const success = await copyToClipboard(markdown);

        if (success) {
          showToast('コピーしました');
        } else {
          showToast('コピーに失敗しました', false);
        }
      });

      li.appendChild(btn);
      ul.appendChild(li);
    });
  }

  function init() {
    addButtons();

    const observer = new MutationObserver(() => {
      addButtons();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
