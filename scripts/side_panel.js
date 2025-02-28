// State Management
let currentViewMode = 'compact';
let currentList = 'all';
let contextMenuTarget = null;
let currentWatchlistId = 'watchlist1';

function cleanupModal(modalEl) {
    document.body.classList.remove('modal-open');
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
        backdrop.remove();
    }
}

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

    // Quick Add functionality
    const quickAddBtn = document.getElementById('quickAddBtn');
    const symbolInput = document.getElementById('stockSymbol');

    if (quickAddBtn) {
        quickAddBtn.addEventListener('click', quickAddStock);
    }

    if (symbolInput) {
        symbolInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent form submission
                quickAddStock();
            }
        });
    }

    // New List Button
    document.getElementById('addListBtn').addEventListener('click', () => {
        const modal = new bootstrap.Modal(document.getElementById('newWatchlistModal'));
        modal.show();
    });

    // Context Menu
    document.addEventListener('click', hideContextMenu);
    setupContextMenu();

    // Add watchlist rename context menu
    document.getElementById('watchlistTabs').addEventListener('contextmenu', showWatchlistContextMenu);
    document.addEventListener('click', hideWatchlistContextMenu);

    // Add new watchlist modal handlers
    document.getElementById('createWatchlistBtn').addEventListener('click', createNewWatchlist);
    document.getElementById('newWatchlistName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createNewWatchlist();
    });

    // Add confirm delete button handler
    document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
        const watchlistId = document.getElementById('confirmDeleteBtn').dataset.watchlistId;
        if (watchlistId) deleteWatchlist(watchlistId);
    });

    // Add modal cleanup handlers
    ['newWatchlistModal', 'deleteWatchlistModal', 'moveStockModal'].forEach(modalId => {
        const modalEl = document.getElementById(modalId);
        modalEl.addEventListener('hidden.bs.modal', () => cleanupModal(modalEl));
        modalEl.addEventListener('hide.bs.modal', () => cleanupModal(modalEl));
    });
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
    const nameInput = document.getElementById('newWatchlistName');
    const name = nameInput.value.trim();
    if (!name) return;

    const result = await chrome.storage.sync.get(null);
    const watchlists = Object.keys(result).filter(key => key.startsWith('watchlist'));

    // Generate new watchlist ID
    const newId = `watchlist${watchlists.length + 1}`;

    try {
        // Initialize new watchlist with name
        const newWatchlist = {
            name: name,
            stocks: []
        };
        await chrome.storage.sync.set({ [newId]: newWatchlist });

        // Update current watchlist
        currentWatchlistId = newId;

        // Refresh the display
        await loadWatchlists();
        loadStocks();

        // Show success toast
        showToast('New watchlist created successfully!');

        // Close modal and reset input
        const modalEl = document.getElementById('newWatchlistModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
        nameInput.value = '';
    } catch (error) {
        console.error('Error creating new watchlist:', error);
        showToast('Error creating watchlist', 'danger');
    }
}

function showToast(message, type = 'success') {
    const toastEl = document.getElementById('watchlistToast');
    toastEl.querySelector('.toast-body').textContent = message;
    toastEl.className = `toast align-items-center text-white bg-${type} border-0`;
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
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
        let watchlistData = result[currentWatchlistId];
        console.log('Current watchlist data:', watchlistData);

        // Initialize watchlist data if it doesn't exist
        if (!watchlistData) {
            watchlistData = {
                name: `Watchlist ${currentWatchlistId.replace('watchlist', '')}`,
                stocks: []
            };
        }

        // Initialize stocks array if it doesn't exist
        if (!watchlistData.stocks) {
            watchlistData.stocks = [];
        }

        // Check if stock already exists
        if (!watchlistData.stocks.find(s => s.symbol === symbol)) {
            const newStock = {
                symbol,
                favorite: false,
                color: null,
                addedAt: Date.now()
            };

            // Add new stock to the stocks array
            watchlistData.stocks.push(newStock);

            // Save the updated watchlist
            chrome.storage.sync.set({ [currentWatchlistId]: watchlistData }, function() {
                if (chrome.runtime.lastError) {
                    console.error('Error saving stock:', chrome.runtime.lastError);
                    showToast('Error adding stock', 'danger');
                    return;
                }
                symbolInput.value = '';
                showToast(`Added ${symbol} to watchlist`);
                loadStocks(); // Refresh the display
            });
        } else {
            showToast(`${symbol} is already in the watchlist`, 'warning');
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
        item.addEventListener('click', async (e) => {
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
                case 'move':
                    showMoveStockModal(contextMenuTarget);
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

    // Add move stock confirmation handler
    document.getElementById('confirmMoveBtn').addEventListener('click', moveStock);
}

async function showMoveStockModal(stock) {
    const modal = new bootstrap.Modal(document.getElementById('moveStockModal'));
    const symbolEl = document.getElementById('moveStockSymbol');
    const selectEl = document.getElementById('targetWatchlist');

    // Set the stock symbol
    symbolEl.textContent = stock.symbol;

    // Store the stock data for the move operation
    document.getElementById('confirmMoveBtn').dataset.stockSymbol = stock.symbol;

    // Get all watchlists
    const result = await chrome.storage.sync.get(null);
    const watchlists = Object.keys(result)
        .filter(key => key.startsWith('watchlist'))
        .filter(id => id !== currentWatchlistId) // Exclude current watchlist
        .map(id => ({
            id,
            name: result[id].name || `Watchlist ${id.replace('watchlist', '')}`
        }));

    // Populate select options
    selectEl.innerHTML = watchlists.map(list => 
        `<option value="${list.id}">${list.name}</option>`
    ).join('');

    // Show modal if there are watchlists to move to
    if (watchlists.length > 0) {
        modal.show();
    } else {
        showToast('No other watchlists available to move to', 'warning');
    }
}

async function moveStock() {
    const stockSymbol = document.getElementById('confirmMoveBtn').dataset.stockSymbol;
    const targetWatchlistId = document.getElementById('targetWatchlist').value;

    try {
        // Get source and target watchlist data
        const result = await chrome.storage.sync.get([currentWatchlistId, targetWatchlistId]);
        const sourceWatchlist = result[currentWatchlistId];
        const targetWatchlist = result[targetWatchlistId];

        // Find the stock to move
        const stockIndex = sourceWatchlist.stocks.findIndex(s => s.symbol === stockSymbol);
        if (stockIndex === -1) {
            throw new Error('Stock not found in source watchlist');
        }

        // Get the stock data and remove it from source
        const [stockToMove] = sourceWatchlist.stocks.splice(stockIndex, 1);

        // Add to target watchlist
        targetWatchlist.stocks.push(stockToMove);

        // Save both watchlists
        await chrome.storage.sync.set({
            [currentWatchlistId]: sourceWatchlist,
            [targetWatchlistId]: targetWatchlist
        });

        // Close modal
        const modalEl = document.getElementById('moveStockModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();

        // Show success message and refresh display
        showToast('Stock moved successfully!');
        loadStocks();
    } catch (error) {
        console.error('Error moving stock:', error);
        showToast('Error moving stock', 'danger');
    }
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
    if (watchlist.id === 'watchlist1') return; // Don't show context menu for default watchlist

    const menu = document.createElement('div');
    menu.id = 'watchlistContextMenu';
    menu.className = 'context-menu';
    menu.innerHTML = `
        <div class="context-menu-item" data-action="rename">
            <i class="fas fa-edit"></i> Rename
        </div>
        <div class="context-menu-item text-danger" data-action="delete">
            <i class="fas fa-trash"></i> Delete
        </div>
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
            startInlineEdit(watchlist);
        } else if (action === 'delete') {
            showDeleteConfirmation(watchlist);
        }

        hideWatchlistContextMenu();
    });
}

function startInlineEdit(watchlist) {
    const tab = document.querySelector(`[data-watchlist-id="${watchlist.id}"]`);
    const currentName = tab.textContent;

    // Create inline edit input
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'form-control form-control-sm watchlist-rename-input';

    // Replace tab text with input
    tab.textContent = '';
    tab.appendChild(input);
    input.focus();
    input.select();

    // Handle input events
    input.addEventListener('blur', () => finishInlineEdit(watchlist, input));
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            input.blur();
        }
    });
}

async function finishInlineEdit(watchlist, input) {
    const newName = input.value.trim();
    if (newName && newName !== watchlist.name) {
        try {
            const result = await chrome.storage.sync.get(watchlist.id);
            const watchlistData = result[watchlist.id];
            watchlistData.name = newName;
            await chrome.storage.sync.set({ [watchlist.id]: watchlistData });
            showToast('Watchlist renamed successfully!');
        } catch (error) {
            console.error('Error renaming watchlist:', error);
            showToast('Error renaming watchlist', 'danger');
        }
    }
    loadWatchlists(); // Refresh display
}

function showDeleteConfirmation(watchlist) {
    const modal = new bootstrap.Modal(document.getElementById('deleteWatchlistModal'));
    document.getElementById('deleteWatchlistName').textContent = watchlist.name;
    document.getElementById('confirmDeleteBtn').dataset.watchlistId = watchlist.id;
    modal.show();
}

async function deleteWatchlist(watchlistId) {
    try {
        await chrome.storage.sync.remove(watchlistId);
        if (currentWatchlistId === watchlistId) {
            currentWatchlistId = 'watchlist1';
        }
        showToast('Watchlist deleted successfully!');

        // Close modal
        const modalEl = document.getElementById('deleteWatchlistModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();

        // Refresh display
        loadWatchlists();
        loadStocks();
    } catch (error) {
        console.error('Error deleting watchlist:', error);
        showToast('Error deleting watchlist', 'danger');
    }
}

function hideWatchlistContextMenu() {
    const menu = document.getElementById('watchlistContextMenu');
    if (menu) menu.remove();
}