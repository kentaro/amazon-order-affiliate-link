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

  function normalizeAuthorName(author) {
    if (!author) return '';

    const removableRoles = [
      '共同著','著','著者',
      '訳','訳者','翻訳',
      '編','編纂','編集','編者',
      '編集','編集者',
      '監修','監訳',
      '原作',
      '写真','画','イラスト','イラストレーター',
      '構成','解説','序文','推薦文','推薦',
      '校閲','校正','前書き','あとがき','帯文','注','注釈',
      '翻案','作曲','作詞','デザイン','制作','監督','挿絵','文芸','原案'
    ];
    const removableRolePrefix = removableRoles.map((r) => r + '');

    const trimRoleSuffix = (text) => {
      let target = text.trim();
      while (true) {
        let start = -1;
        let end = -1;

        const fullOpen = target.lastIndexOf('（');
        const fullClose = target.lastIndexOf('）');
        const halfOpen = target.lastIndexOf('(');
        const halfClose = target.lastIndexOf(')');

        if (fullOpen >= 0 && fullClose > fullOpen) {
          start = fullOpen;
          end = fullClose;
        }

        if (halfOpen >= 0 && halfClose > halfOpen &&
            (start < 0 || halfOpen > start)) {
          start = halfOpen;
          end = halfClose;
        }

        if (start < 0) {
          break;
        }

        const suffix = target.slice(start + 1, end).trim();
        if (!suffix) {
          break;
        }

        let normalizedSuffix = '';
        let i = 0;
        while (i < suffix.length) {
          const ch = suffix[i];
          if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === ',' || ch === '、' || ch === '・' || ch === ':' || ch === '：' || ch === '-' || ch === 'ー' || ch === '~' || ch === '〜' || ch === '/' ) {
            i++;
            continue;
          }
          break;
        }

        if (suffix.startsWith('共同', i)) {
          normalizedSuffix = suffix.slice(i + 2);
        } else {
          normalizedSuffix = suffix.slice(i);
        }

        normalizedSuffix = normalizedSuffix.trim();
        if (!removableRolePrefix.some(role => normalizedSuffix.startsWith(role))) {
          break;
        }

        target = target.slice(0, start).trim();
      }
      return target;
    };

    const normalizeEntry = (entry) => {
      let value = trimRoleSuffix(entry);
      while (value.endsWith(',') || value.endsWith(' ') || value.endsWith('\t') || value.endsWith('\n') || value.endsWith('\r')) {
        value = value.slice(0, -1).trimEnd();
      }
      return value.trim().replace(/\s+/g, '');
    };

    return author
      .split(',')
      .map((name) => normalizeEntry(name))
      .filter(Boolean)
      .join(', ');
  }

  function generateMarkdown(product) {
    const cleanAuthor = normalizeAuthorName(product.author || '');

    if (cleanAuthor) {
      return `${cleanAuthor}『[${product.title}](${product.url})』`;
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

  function createCopyButton(product) {
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

    return btn;
  }

  // 商品ページ用: 商品情報を抽出
  function extractProductPageInfo() {
    const asinMatch = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/);
    if (!asinMatch) return null;

    const asin = asinMatch[1];
    const titleEl = document.getElementById('productTitle');
    const title = titleEl ? titleEl.textContent.trim() : '';

    // 著者情報を取得（複数著者対応）
    let author = '';
    const bylineInfo = document.getElementById('bylineInfo');
    if (bylineInfo) {
      const authorSpans = bylineInfo.querySelectorAll('.author');
      const authors = [];
      authorSpans.forEach(span => {
        const link = span.querySelector('a');
        const contribution = span.querySelector('.contribution');
        if (link) {
          let name = link.textContent.trim();
          if (contribution) {
            // カンマを除去して追加
            name += ' ' + contribution.textContent.trim().replace(/,\s*$/, '');
          }
          authors.push(name);
        }
      });
      author = authors.join(', ');
    }

    return {
      title: title,
      author: author,
      asin: asin,
      url: `https://www.amazon.co.jp/dp/${asin}?tag=${affiliateTag}`
    };
  }

  // 商品ページにボタンを追加
  function addProductPageButton() {
    if (document.querySelector('.amazon-affiliate-copy-btn')) return;

    const product = extractProductPageInfo();
    if (!product || !product.title) return;

    // タイトルの下にボタンを配置
    const titleSection = document.getElementById('titleSection') || document.getElementById('title');
    if (!titleSection) return;

    const container = document.createElement('div');
    container.style.marginTop = '10px';
    container.appendChild(createCopyButton(product));

    titleSection.parentNode.insertBefore(container, titleSection.nextSibling);
  }

  // 注文履歴ページにボタンを追加
  function addOrderHistoryButtons() {
    const buttonLists = document.querySelectorAll('ul.yohtmlc-shipment-level-connections');

    buttonLists.forEach(ul => {
      if (ul.querySelector('.amazon-affiliate-copy-btn')) return;

      const itemContainer = ul.closest('.a-box') || ul.closest('[class*="shipment"]');
      if (!itemContainer) return;

      const product = extractProductInfo(itemContainer);
      if (!product) return;

      const li = document.createElement('li');
      li.className = 'a-spacing-mini';
      li.appendChild(createCopyButton(product));
      ul.appendChild(li);
    });
  }

  function addButtons() {
    // 商品ページかどうかを判定
    if (window.location.pathname.includes('/dp/')) {
      addProductPageButton();
    } else {
      addOrderHistoryButtons();
    }
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
