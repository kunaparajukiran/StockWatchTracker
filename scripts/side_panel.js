// State Management
let currentViewMode = 'compact';
let currentList = 'all';
let contextMenuTarget = null;
let currentWatchlistId = 'watchlist1';

document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadWatchlists();
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

    // New List Button
    document.getElementById('addListBtn').addEventListener('click', createNewWatchlist);

    // Context Menu
    document.addEventListener('click', hideContextMenu);
    setupContextMenu();

    // Add watchlist rename context menu
    document.getElementById('watchlistTabs').addEventListener('contextmenu', showWatchlistContextMenu);
    document.addEventListener('click', hideWatchlistContextMenu);
}

async function loadWatchlists() {
    console.log('Loading watchlists...');
    const result = await chrome.storage.sync.get(null);
    const watchlists = Object.keys(result)
        .filter(key => key.startsWith('watchlist'))
        .map(id => ({
            id,
            name: result[id].name || `Watchlist ${id.replace('watchlist', '')}`,
            stocks: Array.isArray(result[id]) ? { stocks: result[id], name: `Watchlist ${id.replace('watchlist', '')}` } : result[id]
        }));
    console.log('Found watchlists:', watchlists);

    if (watchlists.length === 0) {
        console.log('No watchlists found, creating default watchlist');
        const defaultWatchlist = {
            name: 'My First Watchlist',
            stocks: []
        };
        await chrome.storage.sync.set({ 'watchlist1': defaultWatchlist });
        watchlists.push({ id: 'watchlist1', ...defaultWatchlist });
    }

    currentWatchlistId = watchlists[0].id;
    console.log('Current watchlist set to:', currentWatchlistId);

    // Update watchlist tabs
    updateWatchlistTabs(watchlists);
}

function updateWatchlistTabs(watchlists) {
    const tabsContainer = document.getElementById('watchlistTabs');
    tabsContainer.innerHTML = '';

    watchlists.forEach(watchlist => {
        const tab = document.createElement('button');
        tab.className = `nav-link ${watchlist.id === currentWatchlistId ? 'active' : ''}`;
        tab.setAttribute('data-watchlist-id', watchlist.id);
        tab.textContent = watchlist.name;
        tab.onclick = () => switchWatchlist(watchlist.id);
        tab.oncontextmenu = (e) => showWatchlistContextMenu(e, watchlist);

        tabsContainer.appendChild(tab);
    });
}

function switchWatchlist(watchlistId) {
    currentWatchlistId = watchlistId;
    document.querySelectorAll('#watchlistTabs .nav-link').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-watchlist-id') === watchlistId);
    });
    loadStocks();
}

async function createNewWatchlist() {
    console.log('Creating new watchlist...');
    const result = await chrome.storage.sync.get(null);
    const watchlists = Object.keys(result).filter(key => key.startsWith('watchlist'));
    console.log('Existing watchlists:', watchlists);

    const name = prompt('Enter watchlist name:', `Watchlist ${watchlists.length + 1}`);
    if (!name) return;

    // Generate new watchlist ID
    const newId = `watchlist${watchlists.length + 1}`;
    console.log('New watchlist ID:', newId);

    try {
        // Initialize new watchlist with name
        const newWatchlist = {
            name: name,
            stocks: []
        };
        await chrome.storage.sync.set({ [newId]: newWatchlist });
        console.log('New watchlist created successfully');

        // Update current watchlist
        currentWatchlistId = newId;
        console.log('Current watchlist updated to:', currentWatchlistId);

        // Refresh the display
        await loadWatchlists();
        loadStocks();

        // Show success toast
        const toast = new bootstrap.Toast(document.getElementById('watchlistToast'));
        toast.show();
    } catch (error) {
        console.error('Error creating new watchlist:', error);
        alert('Error creating new watchlist. Please try again.');
    }
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

    chrome.storage.sync.get([currentWatchlistId], function(result) {
        const watchlistData = result[currentWatchlistId];
        const stocks = watchlistData?.stocks || [];
        if (!stocks.find(s => s.symbol === symbol)) {
            stocks.push({
                symbol,
                favorite: false,
                color: null,
                addedAt: Date.now()
            });

            chrome.storage.sync.set({ [currentWatchlistId]: stocks }, function() {
                symbolInput.value = '';
                loadStocks();
            });
        }
    });
}

function loadStocks() {
    chrome.storage.sync.get([currentWatchlistId], function(result) {
        const watchlistData = result[currentWatchlistId];
        let stocks = watchlistData?.stocks || [];

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
    div.draggable = true;
    div.setAttribute('data-symbol', stock.symbol);
    if (stock.color) div.style.borderLeftColor = stock.color;

    // Add drag event listeners
    div.addEventListener('dragstart', handleDragStart);
    div.addEventListener('dragend', handleDragEnd);
    div.addEventListener('dragover', handleDragOver);
    div.addEventListener('drop', handleDrop);

    const mainContent = `
        <div class="stock-main">
            <i class="fas fa-grip-vertical handle me-2"></i>
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
    div.addEventListener('dblclick', () => toggleFavorite(stock));

    return div;
}

// Add drag and drop functionality
let draggedItem = null;

function handleDragStart(e) {
    draggedItem = this;
    this.style.opacity = '0.4';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.getAttribute('data-symbol'));
}

function handleDragEnd(e) {
    this.style.opacity = '1';
    document.querySelectorAll('.stock-item').forEach(item => {
        item.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    this.classList.add('drag-over');
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDrop(e) {
    e.stopPropagation();
    e.preventDefault();

    this.classList.remove('drag-over');

    if (draggedItem !== this) {
        // Get the dragged symbol and the drop target symbol
        const draggedSymbol = draggedItem.getAttribute('data-symbol');
        const dropSymbol = this.getAttribute('data-symbol');

        // Reorder in storage
        reorderStocks(draggedSymbol, dropSymbol);
    }

    return false;
}

async function reorderStocks(draggedSymbol, dropSymbol) {
    try {
        const result = await chrome.storage.sync.get([currentWatchlistId]);
        let stocks = result[currentWatchlistId]?.stocks || [];

        // Find indices
        const draggedIndex = stocks.findIndex(s => s.symbol === draggedSymbol);
        const dropIndex = stocks.findIndex(s => s.symbol === dropSymbol);

        if (draggedIndex !== -1 && dropIndex !== -1) {
            // Remove dragged item
            const [draggedStock] = stocks.splice(draggedIndex, 1);
            // Insert at new position
            stocks.splice(dropIndex, 0, draggedStock);

            // Save new order
            await chrome.storage.sync.set({ [currentWatchlistId]: stocks });
            loadStocks(); // Refresh the display
        }
    } catch (error) {
        console.error('Error reordering stocks:', error);
    }
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
    chrome.storage.sync.get([currentWatchlistId], function(result) {
        const watchlistData = result[currentWatchlistId];
        const stocks = watchlistData?.stocks || [];
        const index = stocks.findIndex(s => s.symbol === stock.symbol);

        if (index !== -1) {
            stocks[index].favorite = !stocks[index].favorite;
            chrome.storage.sync.set({ [currentWatchlistId]: stocks }, loadStocks);
        }
    });
}

function setStockColor(stock) {
    const color = prompt('Enter color (hex code or name):', stock.color || '#000000');
    if (color) {
        chrome.storage.sync.get([currentWatchlistId], function(result) {
            const watchlistData = result[currentWatchlistId];
            const stocks = watchlistData?.stocks || [];
            const index = stocks.findIndex(s => s.symbol === stock.symbol);

            if (index !== -1) {
                stocks[index].color = color;
                chrome.storage.sync.set({ [currentWatchlistId]: stocks }, loadStocks);
            }
        });
    }
}

function editStock(stock) {
    const newSymbol = prompt('Edit stock symbol:', stock.symbol);
    if (newSymbol) {
        chrome.storage.sync.get([currentWatchlistId], function(result) {
            const watchlistData = result[currentWatchlistId];
            const stocks = watchlistData?.stocks || [];
            const index = stocks.findIndex(s => s.symbol === stock.symbol);

            if (index !== -1) {
                stocks[index].symbol = newSymbol.toUpperCase();
                chrome.storage.sync.set({ [currentWatchlistId]: stocks }, loadStocks);
            }
        });
    }
}

function deleteStock(stock) {
    if (confirm(`Delete ${stock.symbol} from watchlist?`)) {
        chrome.storage.sync.get([currentWatchlistId], function(result) {
            const watchlistData = result[currentWatchlistId];
            const stocks = watchlistData?.stocks || [];
            const newStocks = stocks.filter(s => s.symbol !== stock.symbol);
            chrome.storage.sync.set({ [currentWatchlistId]: newStocks }, loadStocks);
        });
    }
}


function showWatchlistContextMenu(e, watchlist) {
    e.preventDefault();
    const menu = document.createElement('div');
    menu.id = 'watchlistContextMenu';
    menu.className = 'context-menu';
    menu.innerHTML = `
        <div class="context-menu-item" data-action="rename">
            <i class="fas fa-edit"></i> Rename
        </div>
        ${watchlist.id !== 'watchlist1' ? `
        <div class="context-menu-item text-danger" data-action="delete">
            <i class="fas fa-trash"></i> Delete
        </div>
        ` : ''}
    `;

    menu.style.position = 'fixed';
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;

    // Remove existing menu if any
    const existingMenu = document.getElementById('watchlistContextMenu');
    if (existingMenu) existingMenu.remove();

    document.body.appendChild(menu);

    // Handle menu item clicks
    menu.addEventListener('click', async (event) => {
        const action = event.target.closest('.context-menu-item')?.dataset.action;
        if (!action) return;

        if (action === 'rename') {
            const newName = prompt('Enter new name:', watchlist.name);
            if (newName) {
                const result = await chrome.storage.sync.get(watchlist.id);
                const watchlistData = result[watchlist.id];
                watchlistData.name = newName;
                await chrome.storage.sync.set({ [watchlist.id]: watchlistData });
                loadWatchlists();
            }
        } else if (action === 'delete' && confirm(`Delete watchlist "${watchlist.name}"?`)) {
            await chrome.storage.sync.remove(watchlist.id);
            if (currentWatchlistId === watchlist.id) {
                currentWatchlistId = 'watchlist1';
            }
            loadWatchlists();
            loadStocks();
        }

        hideWatchlistContextMenu();
    });
}

function hideWatchlistContextMenu() {
    const menu = document.getElementById('watchlistContextMenu');
    if (menu) menu.remove();
}