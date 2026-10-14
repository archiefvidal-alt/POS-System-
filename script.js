/* ChurGraham POS - Beginner-friendly JavaScript
   Data is saved in localStorage so the POS can work offline. */

const KEYS = {
  products: "churgraham_products",
  sales: "churgraham_sales",
  expenses: "churgraham_expenses",
};

const defaultProducts = [
  {id:"p1", name:"Classic Churros", category:"Churros", price:30, stock:50, cost:15, image:""},
  {id:"p2", name:"Churros with Chocolate Syrup", category:"Churros", price:35, stock:50, cost:18, image:""},
  {id:"p3", name:"Mango Graham Bar", category:"Graham Bar", price:35, stock:50, cost:18, image:""},
  {id:"p4", name:"Cookies and Cream Graham Bar", category:"Graham Bar", price:35, stock:50, cost:18, image:""}
];

let products = load(KEYS.products, defaultProducts);
let sales = load(KEYS.sales, []);
let expenses = load(KEYS.expenses, []);
let cart = [];
let selectedCategory = "All";
let currentImage = "";

function load(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(fallback));
  } catch (e) { return JSON.parse(JSON.stringify(fallback)); }
}
function save(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
function money(n) { return "₱" + Number(n || 0).toLocaleString("en-PH",{minimumFractionDigits:2,maximumFractionDigits:2}); }
function today() { return new Date().toISOString().slice(0,10); }
function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function getProduct(id){ return products.find(p=>p.id===id); }
function getOrderNumber(){ return sales.length ? Math.max(...sales.map(s=>Number(s.orderNumber)||0))+1 : 1; }
function showToast(message) {
  const el=document.getElementById("toast"); el.textContent=message; el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"),2200);
}
function dateTimeNow(){
  const d=new Date();
  return {date:d.toISOString().slice(0,10),time:d.toLocaleTimeString("en-PH",{hour:"2-digit",minute:"2-digit"})};
}

/* Navigation */
const pageTitles = {dashboard:"Dashboard",pos:"POS / New Sale",products:"Products",inventory:"Inventory",sales:"Sales",reports:"Reports",income:"Income Statement",settings:"Settings"};
function goPage(page){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.getElementById("page-"+page).classList.add("active");
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  document.getElementById("pageTitle").textContent=pageTitles[page]||page;
  document.getElementById("sidebar").classList.remove("open");
  renderAll();
}
document.querySelectorAll(".nav-btn").forEach(btn=>btn.addEventListener("click",()=>goPage(btn.dataset.page)));
document.querySelectorAll("[data-go]").forEach(btn=>btn.addEventListener("click",()=>goPage(btn.dataset.go)));
document.getElementById("headerSaleBtn").onclick=()=>goPage("pos");
document.getElementById("menuBtn").onclick=()=>document.getElementById("sidebar").classList.toggle("open");
document.getElementById("currentDate").textContent=new Date().toLocaleDateString("en-PH",{weekday:"long",year:"numeric",month:"long",day:"numeric"});

/* POS product display */
function renderPOSProducts(){
  const q=document.getElementById("productSearch").value.toLowerCase();
  const list=products.filter(p=>(selectedCategory==="All"||p.category===selectedCategory)&&p.name.toLowerCase().includes(q));
  const box=document.getElementById("posProducts");
  box.innerHTML=list.length ? list.map(p=>`
    <button class="product-card ${p.stock<=0?"out":""}" onclick="addToCart('${p.id}')">
      <div class="product-img">${p.image?`<img src="${p.image}" alt="">`:p.category==="Churros"?"🍩":"🍰"}</div>
      <div class="product-info">
        <h4>${escapeHTML(p.name)}</h4><p>${escapeHTML(p.category)} • ${p.stock} stock</p>
        <span class="price">${money(p.price)}</span>
      </div>
    </button>`).join("") : `<div class="empty">No products found.</div>`;
}
document.getElementById("productSearch").addEventListener("input",renderPOSProducts);
document.querySelectorAll(".category").forEach(btn=>btn.addEventListener("click",()=>{
  selectedCategory=btn.dataset.category;
  document.querySelectorAll(".category").forEach(b=>b.classList.toggle("active",b===btn));
  renderPOSProducts();
}));

/* Cart */
function addToCart(id){
  const p=getProduct(id);
  if(!p||p.stock<=0){showToast("Product is out of stock.");return;}
  const item=cart.find(x=>x.id===id);
  if(item){
    if(item.qty>=p.stock){showToast("Not enough stock.");return;}
    item.qty++;
  } else cart.push({id,qty:1});
  renderCart();
}
function changeQty(id,delta){
  const item=cart.find(x=>x.id===id), p=getProduct(id);
  if(!item||!p)return;
  const newQty=item.qty+delta;
  if(newQty<=0) cart=cart.filter(x=>x.id!==id);
  else if(newQty<=p.stock)item.qty=newQty;
  else showToast("Not enough stock.");
  renderCart();
}
function removeCart(id){cart=cart.filter(x=>x.id!==id);renderCart();}
function clearCart(){if(cart.length&&!confirm("Clear the current order?"))return;cart=[];document.getElementById("discountInput").value=0;document.getElementById("cashInput").value="";renderCart();}
document.getElementById("clearCart").onclick=clearCart;

function getSubtotal(){return cart.reduce((sum,i)=>sum+(getProduct(i.id)?.price||0)*i.qty,0);}
function getDiscount(){return Math.min(Math.max(Number(document.getElementById("discountInput").value)||0,0),getSubtotal());}
function getTotal(){return Math.max(0,getSubtotal()-getDiscount());}
function renderCart(){
  const box=document.getElementById("cartItems");
  document.getElementById("orderNumberLabel").textContent="Order #"+getOrderNumber();
  if(!cart.length) box.innerHTML=`<div class="empty">🛒<br><br>Your cart is empty.<br>Add products to start a sale.</div>`;
  else box.innerHTML=cart.map(i=>{
    const p=getProduct(i.id), sub=p.price*i.qty;
    return `<div class="cart-item"><div><h4>${escapeHTML(p.name)}</h4><span class="unit">${money(p.price)} each</span>
      <div class="cart-actions"><button class="qty-btn" onclick="changeQty('${p.id}',-1)">−</button><strong>${i.qty}</strong><button class="qty-btn" onclick="changeQty('${p.id}',1)">+</button><button class="remove" onclick="removeCart('${p.id}')">Remove</button></div></div><strong>${money(sub)}</strong></div>`;
  }).join("");
  document.getElementById("cartSubtotal").textContent=money(getSubtotal());
  document.getElementById("cartTotal").textContent=money(getTotal());
  updateChange();
}
function updateChange(){
  const cash=Number(document.getElementById("cashInput").value)||0, total=getTotal();
  document.getElementById("changeAmount").textContent=money(Math.max(0,cash-total));
}
document.getElementById("discountInput").addEventListener("input",renderCart);
document.getElementById("cashInput").addEventListener("input",updateChange);

/* Checkout and receipt */
document.getElementById("completeSale").onclick=()=>{
  if(!cart.length){showToast("Add a product first.");return;}
  const total=getTotal(), cash=Number(document.getElementById("cashInput").value)||0;
  if(cash<total){showToast("Cash received is less than the total.");return;}
  for(const i of cart){const p=getProduct(i.id);if(!p||p.stock<i.qty){showToast("Stock changed. Please review the cart.");return;}}
  const dt=dateTimeNow();
  const sale={id:"s"+Date.now(),orderNumber:getOrderNumber(),date:dt.date,time:dt.time,
    items:cart.map(i=>{const p=getProduct(i.id);return {id:p.id,name:p.name,qty:i.qty,price:p.price,cost:Number(p.cost)||0};}),
    subtotal:getSubtotal(),discount:getDiscount(),total,cash,change:cash-total,payment:document.getElementById("paymentMethod").value};
  sale.items.forEach(i=>{const p=getProduct(i.id);p.stock-=i.qty;});
  sales.unshift(sale);save(KEYS.sales,sales);save(KEYS.products,products);
  showReceipt(sale);cart=[];document.getElementById("cashInput").value="";document.getElementById("discountInput").value=0;renderAll();
};

function showReceipt(sale){
  document.getElementById("receiptContent").innerHTML=`<div class="receipt">
    <h2>ChurGraham</h2><div class="center">Churros & Graham Bar</div>
    <hr><div class="receipt-line"><span>Order #</span><span>${sale.orderNumber}</span></div>
    <div class="receipt-line"><span>Date</span><span>${sale.date}</span></div>
    <div class="receipt-line"><span>Time</span><span>${sale.time}</span></div><hr>
    ${sale.items.map(i=>`<div class="receipt-line"><span>${escapeHTML(i.name)} x${i.qty}</span><span>${money(i.price*i.qty)}</span></div>`).join("")}
    <hr><div class="receipt-line"><span>Subtotal</span><span>${money(sale.subtotal)}</span></div>
    <div class="receipt-line"><span>Discount</span><span>- ${money(sale.discount)}</span></div>
    <div class="receipt-line"><strong>Total</strong><strong>${money(sale.total)}</strong></div>
    <div class="receipt-line"><span>Cash</span><span>${money(sale.cash)}</span></div>
    <div class="receipt-line"><span>Change</span><span>${money(sale.change)}</span></div>
    <div class="center" style="margin-top:18px">Payment: ${escapeHTML(sale.payment)}<br><br>Thank you for ordering!</div>
  </div>`;
  document.getElementById("receiptModal").classList.add("show");
}
document.getElementById("printReceipt").onclick=()=>window.print();
document.getElementById("newSaleBtn").onclick=()=>{document.getElementById("receiptModal").classList.remove("show");goPage("pos");};
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>document.getElementById(b.dataset.close).classList.remove("show"));

/* Product Management */
document.getElementById("addProductBtn").onclick=()=>openProductModal();
function openProductModal(id=null){
  currentImage="";
  document.getElementById("productForm").reset();
  document.getElementById("productId").value="";
  document.getElementById("imagePreview").innerHTML="";
  document.getElementById("productModalTitle").textContent=id?"Edit Product":"Add Product";
  if(id){const p=getProduct(id);document.getElementById("productId").value=p.id;document.getElementById("productName").value=p.name;document.getElementById("productCategory").value=p.category;document.getElementById("productPrice").value=p.price;document.getElementById("productCost").value=Number(p.cost)||0;document.getElementById("productStock").value=p.stock;currentImage=p.image||"";if(currentImage)document.getElementById("imagePreview").innerHTML=`<img src="${currentImage}">`;}
  document.getElementById("productModal").classList.add("show");
}
document.getElementById("productImage").addEventListener("change",e=>{
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();reader.onload=()=>{currentImage=reader.result;document.getElementById("imagePreview").innerHTML=`<img src="${currentImage}">`;};reader.readAsDataURL(file);
});
document.getElementById("productForm").onsubmit=e=>{
  e.preventDefault();
  const id=document.getElementById("productId").value||"p"+Date.now();
  const old=getProduct(id);
  const product={id,name:document.getElementById("productName").value.trim(),category:document.getElementById("productCategory").value,
    price:Number(document.getElementById("productPrice").value),cost:Number(document.getElementById("productCost").value),stock:Number(document.getElementById("productStock").value),image:currentImage};
  if(!product.name||!Number.isFinite(product.price)||product.price<0||!Number.isFinite(product.cost)||product.cost<0||!Number.isFinite(product.stock)||product.stock<0){showToast("Please enter valid product details.");return;}
  const index=products.findIndex(p=>p.id===id);if(index>=0)products[index]=product;else products.push(product);
  save(KEYS.products,products);document.getElementById("productModal").classList.remove("show");showToast("Product saved.");renderAll();
};
function editProduct(id){openProductModal(id);}
function deleteProduct(id){if(!confirm("Delete this product?"))return;products=products.filter(p=>p.id!==id);save(KEYS.products,products);renderAll();showToast("Product deleted.");}

/* Inventory */
function stockStatus(stock){if(stock<=0)return ["Out of Stock","red"];if(stock<=10)return ["Low Stock","yellow"];return ["In Stock","green"];}
function updateStock(id){
  const input=document.getElementById("stock-"+id), value=Math.floor(Number(input.value));
  if(!Number.isFinite(value)||value<0){showToast("Invalid stock.");return;}
  getProduct(id).stock=value;save(KEYS.products,products);renderAll();showToast("Stock updated.");
}

/* Sales */
function filteredSales(){
  const q=document.getElementById("salesSearch").value.toLowerCase(), d=document.getElementById("salesDate").value;
  return sales.filter(s=>(!d||s.date===d)&&(!q||String(s.orderNumber).includes(q)||s.items.some(i=>i.name.toLowerCase().includes(q))));
}
document.getElementById("salesSearch").addEventListener("input",renderSales);
document.getElementById("salesDate").addEventListener("change",renderSales);
function renderSales(){
  const list=filteredSales(), box=document.getElementById("salesTable");
  box.innerHTML=list.length?list.map(s=>`<tr><td><strong>#${s.orderNumber}</strong></td><td>${s.date}</td><td>${s.time}</td><td>${s.items.map(i=>escapeHTML(i.name)+" ×"+i.qty).join(", ")}</td><td>${money(s.total)}</td><td>${money(s.cash)}</td><td>${money(s.change)}</td><td>${escapeHTML(s.payment)}</td><td><button class="table-action" onclick="viewSale('${s.id}')">View</button> <button class="table-action delete" onclick="deleteSale('${s.id}')">Delete</button></td></tr>`).join(""):`<tr><td colspan="9" class="empty">No sales records found.</td></tr>`;
}
function viewSale(id){const s=sales.find(x=>x.id===id);if(s)showReceipt(s);}
function deleteSale(id){
  if(!confirm("Delete this sale record? Inventory will NOT be restored automatically."))return;
  sales=sales.filter(s=>s.id!==id);save(KEYS.sales,sales);renderAll();showToast("Sale deleted.");
}

/* Reports */
function inLastDays(dateStr,days){
  const d=new Date(dateStr+"T00:00:00"), now=new Date();now.setHours(0,0,0,0);
  const diff=(now-d)/86400000;return diff>=0&&diff<days;
}
function sumSales(list){return list.reduce((a,s)=>a+s.total,0);}
function renderReports(){
  const daily=sales.filter(s=>s.date===today()), weekly=sales.filter(s=>inLastDays(s.date,7)), monthly=sales.filter(s=>inLastDays(s.date,30));
  document.getElementById("reportDaily").textContent=money(sumSales(daily));document.getElementById("reportWeekly").textContent=money(sumSales(weekly));document.getElementById("reportMonthly").textContent=money(sumSales(monthly));document.getElementById("reportRevenue").textContent=money(sumSales(sales));
  const map={};sales.forEach(s=>s.items.forEach(i=>map[i.name]=(map[i.name]||0)+i.qty));
  const best=Object.entries(map).sort((a,b)=>b[1]-a[1]);
  document.getElementById("bestProducts").innerHTML=best.length?best.slice(0,8).map((x,i)=>`<div class="rank-row"><span class="rank">#${i+1}</span><span>${escapeHTML(x[0])}</span><strong>${x[1]} sold</strong></div>`).join(""):`<div class="empty">No sales yet.</div>`;
  const days=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const ds=d.toISOString().slice(0,10);days.push({label:d.toLocaleDateString("en-PH",{weekday:"short"}),value:sumSales(sales.filter(s=>s.date===ds))});}
  const max=Math.max(...days.map(d=>d.value),1);
  document.getElementById("salesChart").innerHTML=days.map(d=>`<div class="bar-wrap"><span class="bar-value">${money(d.value)}</span><div class="bar" style="height:${Math.max(3,d.value/max*190)}px"></div><span class="bar-label">${d.label}</span></div>`).join("");
}

/* Income Statement: COGS is each sold item's saved unit cost multiplied by quantity. */
function cogsForSales(list){
  return list.reduce((total,sale)=>total+(sale.items||[]).reduce((sum,item)=>{
    const product=products.find(p=>p.id===item.id)||products.find(p=>p.name===item.name);
    const unitCost=item.cost!==undefined&&Number.isFinite(Number(item.cost))?Number(item.cost):(product?Number(product.cost)||0:0);
    return sum+unitCost*(Number(item.qty)||0);
  },0),0);
}
function renderIncome(){
  const revenue=sumSales(sales), cogs=cogsForSales(sales), gross=revenue-cogs, op=expenses.reduce((a,e)=>a+e.amount,0), net=gross-op;
  ["incomeRevenue","stmtRevenue"].forEach(id=>document.getElementById(id).textContent=money(revenue));
  ["incomeCOGS","stmtCOGS"].forEach(id=>document.getElementById(id).textContent=money(cogs));
  ["incomeGross","stmtGross"].forEach(id=>document.getElementById(id).textContent=money(gross));
  ["incomeExpenses","stmtExpenses"].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=money(op);});
  ["incomeNet","stmtNet"].forEach(id=>document.getElementById(id).textContent=money(net));
  document.getElementById("expenseList").innerHTML=expenses.length?expenses.map(e=>`<div class="expense-row"><div><strong>${escapeHTML(e.name)}</strong><div class="muted">${e.date}</div></div><div><strong>${money(e.amount)}</strong> <button onclick="deleteExpense('${e.id}')">Delete</button></div></div>`).join(""):`<div class="empty">No operating expenses added.</div>`;
}
document.getElementById("addExpenseBtn").onclick=()=>{
  const name=prompt("Expense name (e.g. Ingredients):");if(!name)return;
  const amount=Number(prompt("Amount (₱):"));if(!Number.isFinite(amount)||amount<0){showToast("Invalid amount.");return;}
  expenses.unshift({id:"e"+Date.now(),name:name.trim(),amount,date:today()});save(KEYS.expenses,expenses);renderIncome();showToast("Expense added.");
};
function deleteExpense(id){if(!confirm("Delete this expense?"))return;expenses=expenses.filter(e=>e.id!==id);save(KEYS.expenses,expenses);renderIncome();}

/* Dashboard and inventory */
function renderDashboard(){
  const d=sales.filter(s=>s.date===today()), revenue=sumSales(d), items=d.reduce((a,s)=>a+s.items.reduce((x,i)=>x+i.qty,0),0), profit=sumSales(sales)-cogsForSales(sales)-expenses.reduce((a,e)=>a+e.amount,0);
  document.getElementById("dashSales").textContent=money(revenue);document.getElementById("dashOrders").textContent=d.length;document.getElementById("dashItems").textContent=items;document.getElementById("dashProfit").textContent=money(profit);
  document.getElementById("recentSales").innerHTML=d.slice(0,5).length?d.slice(0,5).map(s=>`<div class="sale-row"><div><strong>Order #${s.orderNumber}</strong><div class="muted">${s.time} • ${s.items.reduce((a,i)=>a+i.qty,0)} items</div></div><span class="amount">${money(s.total)}</span></div>`).join(""):`<div class="empty">No sales today.</div>`;
  const alerts=products.filter(p=>p.stock<=10);
  document.getElementById("inventoryAlerts").innerHTML=alerts.length?alerts.map(p=>{const [st,cl]=stockStatus(p.stock);return `<div class="alert-row"><span>${escapeHTML(p.name)}</span><span class="badge ${cl}">${st} (${p.stock})</span></div>`}).join(""):`<div class="empty">All products have healthy stock.</div>`;
}
function renderProducts(){
  document.getElementById("productsTable").innerHTML=products.map(p=>`<tr><td><strong>${escapeHTML(p.name)}</strong></td><td>${escapeHTML(p.category)}</td><td>${money(p.price)}</td><td>${money(p.cost||0)}</td><td>${p.stock}</td><td><button class="table-action" onclick="editProduct('${p.id}')">Edit</button> <button class="table-action delete" onclick="deleteProduct('${p.id}')">Delete</button></td></tr>`).join("");
}
function renderInventory(){
  const low=products.filter(p=>p.stock>0&&p.stock<=10).length,out=products.filter(p=>p.stock<=0).length;
  document.getElementById("invProducts").textContent=products.length;document.getElementById("invStock").textContent=products.reduce((a,p)=>a+p.stock,0);document.getElementById("invLow").textContent=low;document.getElementById("invOut").textContent=out;
  document.getElementById("inventoryTable").innerHTML=products.map(p=>{const [st,cl]=stockStatus(p.stock);return `<tr><td><strong>${escapeHTML(p.name)}</strong></td><td>${escapeHTML(p.category)}</td><td>${money(p.price)}</td><td><input id="stock-${p.id}" type="number" min="0" value="${p.stock}" style="width:90px;margin:0"></td><td><span class="badge ${cl}">${st}</span></td><td><button class="table-action" onclick="updateStock('${p.id}')">Save Stock</button></td></tr>`}).join("");
}

/* Backup */
document.getElementById("exportData").onclick=()=>{
  const data={products,sales,expenses,exportedAt:new Date().toISOString()};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="churgraham-pos-backup.json";a.click();URL.revokeObjectURL(url);showToast("Backup exported.");
};
document.getElementById("importData").onchange=e=>{
  const file=e.target.files[0];if(!file)return;const reader=new FileReader();
  reader.onload=()=>{try{const d=JSON.parse(reader.result);if(!Array.isArray(d.products)||!Array.isArray(d.sales)||!Array.isArray(d.expenses))throw Error();
    products=d.products.map(p=>({...p,cost:Number(p.cost)||0}));sales=d.sales;expenses=d.expenses;save(KEYS.products,products);save(KEYS.sales,sales);save(KEYS.expenses,expenses);renderAll();showToast("Backup imported.");}catch(err){showToast("Invalid backup file.");}};reader.readAsText(file);
};
document.getElementById("resetData").onclick=()=>{
  if(!confirm("Reset ALL ChurGraham data? This cannot be undone unless you have a backup."))return;
  localStorage.removeItem(KEYS.products);localStorage.removeItem(KEYS.sales);localStorage.removeItem(KEYS.expenses);
  products=JSON.parse(JSON.stringify(defaultProducts));sales=[];expenses=[];cart=[];save(KEYS.products,products);renderAll();showToast("Data reset.");
};

function renderAll(){renderPOSProducts();renderCart();renderProducts();renderInventory();renderSales();renderReports();renderIncome();renderDashboard();}
renderAll();
