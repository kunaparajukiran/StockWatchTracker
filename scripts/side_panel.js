// State Management
let currentViewMode = 'compact';
let currentList = 'all';
let contextMenuTarget = null;

document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadStocks();
});

function setupEventListeners() {
    // View Controls
    document.getElementById('compactView').addEventListener('click', () => setViewMode('compact'));
    document.getElementById('detailedView').addEventListener('click', () => setViewMode('detailed'));

    // List Controls
    document.getElementById('allStocks').addEventListener('click', () => setList('all'));
    document.getElementById('favorites').addEventListener('click', () => setList('favorites'));
    document.getElementById('signals').addEventListener('click', () => setList('signals'));

    // Quick Add
    document.getElementById('quickAddBtn').addEventListener('click', quickAddStock);
    document.getElementById('stockSymbol').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') quickAddStock();
    });

    // Context Menu
    document.addEventListener('click', hideContextMenu);
    setupContextMenu();
}

function setViewMode(mode) {
    currentViewMode = mode;
    document.getElementById('compactView').classList.toggle('active', mode === 'compact');
    document.getElementById('detailedView').classList.toggle('active', mode === 'detailed');
    loadStocks();
}

function setList(list) {
    currentList = list;
    document.querySelectorAll('.list-controls .btn').forEach(btn => {
        btn.classList.toggle('active', btn.id === list);
    });
    loadStocks();
}

function quickAddStock() {
    const symbolInput = document.getElementById('stockSymbol');
    const symbol = symbolInput.value.toUpperCase().trim();

    if (!symbol) return;

    chrome.storage.sync.get(['stocks'], function(result) {
        const stocks = result.stocks || [];
        if (!stocks.find(s => s.symbol === symbol)) {
            stocks.push({
                symbol,
                favorite: false,
                color: null,
                addedAt: Date.now()
            });

            chrome.storage.sync.set({ stocks }, function() {
                symbolInput.value = '';
                loadStocks();
            });
        }
    });
}

function loadStocks() {
    chrome.storage.sync.get(['stocks'], function(result) {
        let stocks = result.stocks || [];

        // Apply filters
        if (currentList === 'favorites') {
            stocks = stocks.filter(stock => stock.favorite);
        }

        const stockList = document.getElementById('stockList');
        stockList.innerHTML = '';

        stocks.forEach(stock => {
            const stockEl = createStockElement(stock);
            stockList.appendChild(stockEl);
        });
    });
}

function createStockElement(stock) {
    const div = document.createElement('div');
    div.className = `stock-item ${currentViewMode} ${stock.favorite ? 'favorite' : ''}`;
    if (stock.color) div.style.borderLeftColor = stock.color;

    const mainContent = `
        <div class="stock-main">
            <span class="stock-symbol">${stock.symbol}</span>
            <span class="stock-price">$0.00</span>
            <span class="stock-change negative">-0.00%</span>
        </div>
    `;

    const detailContent = currentViewMode === 'detailed' ? `
        <div class="stock-info">
            <span class="stock-volume">Vol: 0</span>
            <span class="stock-market-cap">MCap: $0.00B</span>
        </div>
    ` : '';

    div.innerHTML = mainContent + detailContent;

    // Context menu
    div.addEventListener('contextmenu', (e) => showContextMenu(e, stock));

    // Double click to toggle favorite
    div.addEventListener('dblclick', () => toggleFavorite(stock));

    return div;
}

function showContextMenu(e, stock) {
    e.preventDefault();
    contextMenuTarget = stock;

    const menu = document.getElementById('contextMenu');
    menu.classList.remove('d-none');

    // Position menu
    const x = e.clientX;
    const y = e.clientY;

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
}

function hideContextMenu() {
    const menu = document.getElementById('contextMenu');
    menu.classList.add('d-none');
    contextMenuTarget = null;
}

function setupContextMenu() {
    document.querySelectorAll('.context-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = item.dataset.action;

            if (!contextMenuTarget) return;

            switch(action) {
                case 'favorite':
                    toggleFavorite(contextMenuTarget);
                    break;
                case 'color':
                    setStockColor(contextMenuTarget);
                    break;
                case 'edit':
                    editStock(contextMenuTarget);
                    break;
                case 'delete':
                    deleteStock(contextMenuTarget);
                    break;
            }

            hideContextMenu();
        });
    });
}

function toggleFavorite(stock) {
    chrome.storage.sync.get(['stocks'], function(result) {
        const stocks = result.stocks || [];
        const index = stocks.findIndex(s => s.symbol === stock.symbol);

        if (index !== -1) {
            stocks[index].favorite = !stocks[index].favorite;
            chrome.storage.sync.set({ stocks }, loadStocks);
        }
    });
}

function setStockColor(stock) {
    const color = prompt('Enter color (hex code or name):', stock.color || '#000000');
    if (color) {
        chrome.storage.sync.get(['stocks'], function(result) {
            const stocks = result.stocks || [];
            const index = stocks.findIndex(s => s.symbol === stock.symbol);

            if (index !== -1) {
                stocks[index].color = color;
                chrome.storage.sync.set({ stocks }, loadStocks);
            }
        });
    }
}

function editStock(stock) {
    const newSymbol = prompt('Edit stock symbol:', stock.symbol);
    if (newSymbol) {
        chrome.storage.sync.get(['stocks'], function(result) {
            const stocks = result.stocks || [];
            const index = stocks.findIndex(s => s.symbol === stock.symbol);

            if (index !== -1) {
                stocks[index].symbol = newSymbol.toUpperCase();
                chrome.storage.sync.set({ stocks }, loadStocks);
            }
        });
    }
}

function deleteStock(stock) {
    if (confirm(`Delete ${stock.symbol} from watchlist?`)) {
        chrome.storage.sync.get(['stocks'], function(result) {
            const stocks = result.stocks || [];
            const newStocks = stocks.filter(s => s.symbol !== stock.symbol);
            chrome.storage.sync.set({ stocks: newStocks }, loadStocks);
        });
    }
}