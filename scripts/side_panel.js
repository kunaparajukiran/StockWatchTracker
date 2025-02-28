// File renamed from popup.js to side_panel.js for consistency
let currentTab = 'watchlist1';
let activeColorFilter = null;

document.addEventListener('DOMContentLoaded', function() {
    loadWatchlist();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('addStockForm').addEventListener('submit', addStock);
    document.getElementById('clearFilter').addEventListener('click', clearColorFilter);
    document.getElementById('addTabBtn').addEventListener('click', addNewTab);
    
    // Setup tab switching listeners
    document.getElementById('watchlistTabs').addEventListener('shown.bs.tab', function(event) {
        currentTab = event.target.getAttribute('data-bs-target').substring(1);
        loadWatchlist();
    });
}

function addStock(event) {
    event.preventDefault();
    const symbolInput = document.getElementById('stockSymbol');
    const colorInput = document.getElementById('colorPicker');
    
    const symbol = symbolInput.value.toUpperCase();
    const color = colorInput.value;

    chrome.storage.sync.get([currentTab], function(result) {
        const stocks = result[currentTab] || [];
        stocks.push({ symbol, color, timestamp: Date.now() });
        
        const updateObj = {};
        updateObj[currentTab] = stocks;
        
        chrome.storage.sync.set(updateObj, function() {
            symbolInput.value = '';
            loadWatchlist();
            updateColorFilters();
        });
    });
}

function loadWatchlist() {
    chrome.storage.sync.get([currentTab], function(result) {
        const stocks = result[currentTab] || [];
        const stockList = document.getElementById('stockList');
        stockList.innerHTML = '';

        stocks.forEach((stock, index) => {
            if (activeColorFilter && stock.color !== activeColorFilter) return;

            const li = document.createElement('li');
            li.className = 'list-group-item stock-item';
            li.style.backgroundColor = stock.color;
            
            li.innerHTML = `
                <span>${stock.symbol}</span>
                <div class="stock-actions">
                    <button class="btn btn-sm btn-outline-secondary edit-btn" data-index="${index}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-btn" data-index="${index}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            stockList.appendChild(li);
        });

        updateColorFilters();
        setupStockActions();
    });
}

function updateColorFilters() {
    chrome.storage.sync.get([currentTab], function(result) {
        const stocks = result[currentTab] || [];
        const colorFilters = document.getElementById('colorFilters');
        colorFilters.innerHTML = '';

        // Get unique colors
        const uniqueColors = [...new Set(stocks.map(stock => stock.color))];

        uniqueColors.forEach(color => {
            const filterBtn = document.createElement('div');
            filterBtn.className = `color-filter ${color === activeColorFilter ? 'active' : ''}`;
            filterBtn.style.backgroundColor = color;
            filterBtn.addEventListener('click', () => filterByColor(color));
            colorFilters.appendChild(filterBtn);
        });
    });
}

function filterByColor(color) {
    activeColorFilter = activeColorFilter === color ? null : color;
    loadWatchlist();
}

function clearColorFilter() {
    activeColorFilter = null;
    loadWatchlist();
}

function setupStockActions() {
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = this.getAttribute('data-index');
            editStock(index);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = this.getAttribute('data-index');
            deleteStock(index);
        });
    });
}

function editStock(index) {
    chrome.storage.sync.get([currentTab], function(result) {
        const stocks = result[currentTab] || [];
        const stock = stocks[index];
        
        const newSymbol = prompt('Edit stock symbol:', stock.symbol);
        if (newSymbol) {
            stocks[index].symbol = newSymbol.toUpperCase();
            
            const updateObj = {};
            updateObj[currentTab] = stocks;
            
            chrome.storage.sync.set(updateObj, function() {
                loadWatchlist();
            });
        }
    });
}

function deleteStock(index) {
    if (confirm('Are you sure you want to delete this stock?')) {
        chrome.storage.sync.get([currentTab], function(result) {
            const stocks = result[currentTab] || [];
            stocks.splice(index, 1);
            
            const updateObj = {};
            updateObj[currentTab] = stocks;
            
            chrome.storage.sync.set(updateObj, function() {
                loadWatchlist();
            });
        });
    }
}

function addNewTab() {
    const tabsContainer = document.getElementById('watchlistTabs');
    const tabCount = tabsContainer.querySelectorAll('.nav-link').length;
    
    // Create new tab button
    const newTabId = `watchlist${tabCount}`;
    const newTab = document.createElement('li');
    newTab.className = 'nav-item';
    newTab.innerHTML = `
        <button class="nav-link" id="tab${tabCount}" data-bs-toggle="tab" data-bs-target="#${newTabId}">
            List ${tabCount}
        </button>
    `;
    
    // Insert before the "+" button
    tabsContainer.insertBefore(newTab, document.getElementById('addTabBtn').parentElement);
    
    // Create new tab content
    const tabContent = document.getElementById('watchlistContent');
    const newTabContent = document.createElement('div');
    newTabContent.className = 'tab-pane fade';
    newTabContent.id = newTabId;
    newTabContent.innerHTML = '<ul class="list-group"></ul>';
    tabContent.appendChild(newTabContent);
}
