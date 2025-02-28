let currentTab = 'watchlist1';
let activeColorFilter = null;
let currentViewMode = 'row';
let currentSort = { column: null, ascending: true };
let visibleColumns = {
    logo: false,
    symbol: true,
    description: true,
    color: true
};

document.addEventListener('DOMContentLoaded', function() {
    loadWatchlist();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('addStockForm').addEventListener('submit', addStock);
    document.getElementById('clearFilter').addEventListener('click', clearColorFilter);
    document.getElementById('addTabBtn').addEventListener('click', addNewTab);

    // View mode toggle
    document.getElementById('rowView').addEventListener('click', () => setViewMode('row'));
    document.getElementById('tableView').addEventListener('click', () => setViewMode('table'));

    // Column management
    document.querySelectorAll('#columnManager .btn').forEach(btn => {
        btn.addEventListener('click', () => toggleColumn(btn.dataset.column));
    });

    // Tab switching
    document.getElementById('watchlistTabs').addEventListener('shown.bs.tab', function(event) {
        currentTab = event.target.getAttribute('data-bs-target').substring(1);
        loadWatchlist();
    });
}

function setViewMode(mode) {
    currentViewMode = mode;
    document.getElementById('rowView').classList.toggle('active', mode === 'row');
    document.getElementById('tableView').classList.toggle('active', mode === 'table');
    document.getElementById('columnManager').classList.toggle('d-none', mode === 'row');
    loadWatchlist();
}

function toggleColumn(column) {
    const btn = document.querySelector(`#columnManager [data-column="${column}"]`);
    visibleColumns[column] = !visibleColumns[column];
    btn.classList.toggle('active', visibleColumns[column]);
    loadWatchlist();
}

function addStock(event) {
    event.preventDefault();
    const symbolInput = document.getElementById('stockSymbol');
    const colorInput = document.getElementById('colorPicker');
    const descriptionInput = document.getElementById('stockDescription');

    const symbol = symbolInput.value.toUpperCase();
    const color = colorInput.value;
    const description = descriptionInput.value;

    chrome.storage.sync.get([currentTab], function(result) {
        const stocks = result[currentTab] || [];
        stocks.push({
            symbol,
            color,
            description,
            timestamp: Date.now()
        });

        const updateObj = {};
        updateObj[currentTab] = stocks;

        chrome.storage.sync.set(updateObj, function() {
            symbolInput.value = '';
            descriptionInput.value = '';
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

        // Apply sorting if active
        if (currentSort.column) {
            stocks.sort((a, b) => {
                const aVal = a[currentSort.column] || '';
                const bVal = b[currentSort.column] || '';
                return currentSort.ascending ? 
                    aVal.localeCompare(bVal) : 
                    bVal.localeCompare(aVal);
            });
        }

        if (currentViewMode === 'table') {
            renderTableView(stocks, stockList);
        } else {
            renderRowView(stocks, stockList);
        }

        updateColorFilters();
        setupStockActions();
    });
}

function renderTableView(stocks, container) {
    const table = document.createElement('table');
    table.className = 'table stock-table';

    // Header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    if (visibleColumns.logo) {
        headerRow.appendChild(createHeader('Logo'));
    }
    if (visibleColumns.symbol) {
        headerRow.appendChild(createHeader('Symbol', 'symbol'));
    }
    if (visibleColumns.description) {
        headerRow.appendChild(createHeader('Description', 'description'));
    }
    if (visibleColumns.color) {
        headerRow.appendChild(createHeader('Color'));
    }
    headerRow.appendChild(createHeader('Actions'));

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement('tbody');
    stocks.forEach((stock, index) => {
        if (activeColorFilter && stock.color !== activeColorFilter) return;

        const row = document.createElement('tr');

        if (visibleColumns.logo) {
            const logoCell = document.createElement('td');
            logoCell.innerHTML = `<img src="https://logo.clearbit.com/${stock.symbol.toLowerCase()}.com" class="stock-logo" onerror="this.src='icons/default-logo.png'">`;
            row.appendChild(logoCell);
        }

        if (visibleColumns.symbol) {
            const symbolCell = document.createElement('td');
            symbolCell.textContent = stock.symbol;
            row.appendChild(symbolCell);
        }

        if (visibleColumns.description) {
            const descCell = document.createElement('td');
            descCell.textContent = stock.description || '';
            row.appendChild(descCell);
        }

        if (visibleColumns.color) {
            const colorCell = document.createElement('td');
            colorCell.innerHTML = `<div style="width: 20px; height: 20px; background-color: ${stock.color}; border: 1px solid #ddd;"></div>`;
            row.appendChild(colorCell);
        }

        const actionsCell = document.createElement('td');
        actionsCell.innerHTML = `
            <div class="stock-actions">
                <button class="btn btn-sm btn-outline-secondary edit-btn" data-index="${index}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger delete-btn" data-index="${index}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        row.appendChild(actionsCell);

        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);
}

function renderRowView(stocks, container) {
    const list = document.createElement('div');
    list.className = 'stock-list';

    stocks.forEach((stock, index) => {
        if (activeColorFilter && stock.color !== activeColorFilter) return;

        const row = document.createElement('div');
        row.className = 'stock-row';
        row.style.backgroundColor = stock.color;

        row.innerHTML = `
            <img src="https://logo.clearbit.com/${stock.symbol.toLowerCase()}.com" class="stock-logo" onerror="this.src='icons/default-logo.png'">
            <span class="stock-symbol">${stock.symbol}</span>
            <span class="stock-description">${stock.description || ''}</span>
            <div class="stock-actions">
                <button class="btn btn-sm btn-outline-secondary edit-btn" data-index="${index}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger delete-btn" data-index="${index}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        list.appendChild(row);
    });

    container.appendChild(list);
}

function createHeader(text, sortColumn = null) {
    const th = document.createElement('th');
    th.textContent = text;

    if (sortColumn) {
        th.classList.add('sortable');
        if (currentSort.column === sortColumn) {
            th.classList.add('sort-indicator');
            if (currentSort.ascending) {
                th.classList.add('asc');
            }
        }

        th.addEventListener('click', () => {
            if (currentSort.column === sortColumn) {
                currentSort.ascending = !currentSort.ascending;
            } else {
                currentSort.column = sortColumn;
                currentSort.ascending = true;
            }
            loadWatchlist();
        });
    }

    return th;
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
        const newDescription = prompt('Edit stock description:', stock.description);
        if (newSymbol || newDescription) {
            stocks[index].symbol = newSymbol ? newSymbol.toUpperCase() : stocks[index].symbol;
            stocks[index].description = newDescription || stocks[index].description;

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