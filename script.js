document.addEventListener('DOMContentLoaded', () => {
  // ตรวจสอบว่ากำลังอยู่หน้าไหน
  if (document.getElementById('product-list')) {
    initProductPage();
  }

  if (document.getElementById('orderForm')) {
    initOrderPage();
  }

  if (document.getElementById('ordersTable')) {
    initAdminPage();
  }
});

/* ==========================================================================
   1. PRODUCT PAGE (product.html)
   ========================================================================== */
function initProductPage() {
  const productContainer = document.getElementById('product-list');
  const filterBar = document.getElementById('filter-bar');
  let allProducts = [];

  // ดึงค่า URL Parameter ?mood=xxx
  const urlParams = new URLSearchParams(window.location.search);
  const moodParam = urlParams.get('mood')?.toLowerCase() || 'all';

  // โหลดข้อมูลจาก products.json
  fetch('products.json')
    .then((response) => response.json())
    .then((products) => {
      allProducts = products;
      setActiveFilterButton(moodParam);
      renderProducts(filterProducts(allProducts, moodParam));
    })
    .catch((error) => {
      console.error('Error loading products:', error);
      productContainer.innerHTML =
        '<p style="color: var(--text-muted); text-align: center; grid-column: 1/-1;">ไม่สามารถโหลดข้อมูลสินค้าได้</p>';
    });

  // ผูก Event Listener ให้ปุ่มกรอง (ถ้ามีปุ่มกรองในหน้า HTML)
  if (filterBar) {
    filterBar.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.dataset.mood) {
        const selectedMood = e.target.dataset.mood.toLowerCase();

        // อัปเดต URL parameter โดยไม่ต้อง reload หน้า
        const newUrl = new URL(window.location);
        if (selectedMood === 'all') {
          newUrl.searchParams.delete('mood');
        } else {
          newUrl.searchParams.set('mood', selectedMood);
        }
        window.history.pushState({}, '', newUrl);

        setActiveFilterButton(selectedMood);
        renderProducts(filterProducts(allProducts, selectedMood));
      }
    });
  }

  function filterProducts(products, mood) {
    if (!mood || mood === 'all') return products;
    return products.filter(
      (item) => item.mood && item.mood.toLowerCase() === mood
    );
  }

  function setActiveFilterButton(currentMood) {
    if (!filterBar) return;
    const buttons = filterBar.querySelectorAll('[data-mood]');
    buttons.forEach((btn) => {
      if (btn.dataset.mood.toLowerCase() === currentMood) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function renderProducts(products) {
    if (products.length === 0) {
      productContainer.innerHTML =
        '<p style="color: var(--text-muted); text-align: center; grid-column: 1/-1;">ไม่พบสินค้าในหมวดหมู่นี้</p>';
      return;
    }

    productContainer.innerHTML = products
      .map((item) => {
        const itemFullName = `${item.name} ไซส์ ${item.size}`;
        const orderUrl = `order.html?item=${encodeURIComponent(
          itemFullName
        )}&price=${encodeURIComponent(item.price)}`;

        return `
        <article class="product-card">
          <div class="product-image-wrapper">
            <img src="${item.image}" alt="${
          item.name
        }" class="product-image" loading="lazy">
            <span class="product-tag">${item.mood}</span>
          </div>
          <div class="product-info">
            <h3 class="product-title">${item.name}</h3>
            <div class="product-meta">
              <span class="product-size">SIZE: ${item.size}</span>
              <span class="product-price">฿${item.price}</span>
            </div>
            <p class="product-description">${item.description}</p>
            <a href="${orderUrl}" class="btn btn-primary">สั่งซื้อ</a>
          </div>
        </article>
      `;
      })
      .join('');
  }
}

/* ==========================================================================
   2. ORDER PAGE (order.html)
   ========================================================================== */
function initOrderPage() {
  const orderForm = document.getElementById('orderForm');
  const itemsInput = document.getElementById('items');
  const totalInput = document.getElementById('total');

  // อ่านค่าจาก URL Parameters
  const urlParams = new URLSearchParams(window.location.search);
  const itemParam = urlParams.get('item');
  const priceParam = urlParams.get('price');

  // เติมค่าลง input อัตโนมัติถ้ามีข้อมูลจาก URL
  if (itemParam && itemsInput) {
    itemsInput.value = itemParam;
  }
  if (priceParam && totalInput) {
    totalInput.value = priceParam;
  }

  // จัดการการกดส่งฟอร์มสั่งซื้อ
  orderForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const payload = {
      customerName: document.getElementById('customerName').value,
      contact: document.getElementById('contact').value,
      items: itemsInput.value,
      total: totalInput.value,
      note: document.getElementById('note').value,
    };

    // ส่งข้อมูลแบบ POST ไปยัง Google Apps Script (ตามรูปแบบที่กำหนดเป๊ะๆ)
    fetch(
      'https://script.google.com/macros/s/AKfycbw_JU2HLWp8_omXqr7ATVPYeA89xwrYscy2uPwcvJQ7AfwG8NCSRxxJoFyTn4Dqxsmejw/exec',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    )
      .then(() => {
        window.location.href = 'thankyou.html';
      })
      .catch((error) => {
        console.error(error);
        alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      });
  });
}

/* ==========================================================================
   3. ADMIN PAGE (admin.html)
   ========================================================================== */
function initAdminPage() {
  const tbody = document.querySelector('#ordersTable tbody');

  const csvUrl =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vRTG3NSVB3cOTja7NDb0SM_yc7XXBuAJVQ5K9v8-_hXbREkRR8xs2hkD5m9RRm0mNxNMW5bthgAIs9Q/pub?output=csv';

  fetch(csvUrl)
    .then((response) => response.text())
    .then((csvText) => {
      const rows = parseCSV(csvText);

      // ตรวจสอบว่ามีข้อมูลหรือไม่ (อย่างน้อยต้องมี Header 1 บรรทัด)
      if (rows.length <= 1) {
        tbody.innerHTML =
          '<tr><td colspan="6" style="text-align:center;">ยังไม่มีรายการสั่งซื้อ</td></tr>';
        return;
      }

      // ข้ามแถว Header (index 0) และนำข้อมูลที่เหลือมากลับด้านเพื่อเรียงล่าสุดขึ้นก่อน
      const dataRows = rows.slice(1).reverse();

      tbody.innerHTML = dataRows
        .map((row) => {
          // ดึงข้อมูลแต่ละคอลัมน์ (ใส่ fallback กัน Error กรณีข้อมูลไม่ครบ)
          const timestamp = row[0] || '-';
          const name = row[1] || '-';
          const contact = row[2] || '-';
          const items = row[3] || '-';
          const total = row[4] || '-';
          const note = row[5] || '-';

          return `
          <tr>
            <td>${escapeHTML(timestamp)}</td>
            <td>${escapeHTML(name)}</td>
            <td>${escapeHTML(contact)}</td>
            <td>${escapeHTML(items)}</td>
            <td>${escapeHTML(total)}</td>
            <td>${escapeHTML(note)}</td>
          </tr>
        `;
        })
        .join('');
    })
    .catch((error) => {
      console.error('Error loading CSV:', error);
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align:center; color:red;">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
    });

  // ฟังก์ชัน Custom CSV Parser (รองรับข้อความที่มีเครื่องหมายคำพูด หรือเครื่องหมายจุลภาคภายใน)
  function parseCSV(text) {
    const lines = [];
    let row = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // ข้ามเครื่องหมาย quote สองตัวติดกัน ("")
        } else {
          inQuotes = !inQuotes; // สลับสถานะ quote เปิด/ปิด
        }
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // ข้าม CRLF (\r\n)
        }
        row.push(current.trim());
        if (row.length > 1 || row[0] !== '') {
          lines.push(row);
        }
        row = [];
        current = '';
      } else {
        current += char;
      }
    }

    if (current || row.length > 0) {
      row.push(current.trim());
      lines.push(row);
    }

    return lines;
  }

  // ป้องกัน XSS Injection เมื่อนำข้อความมาวางใน HTML
  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
