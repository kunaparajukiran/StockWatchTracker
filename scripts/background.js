chrome.runtime.onInstalled.addListener(function() {
    // Initialize storage with empty watchlist
    chrome.storage.sync.set({
        'watchlist1': []
    });

    // Set up the side panel
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Listen for messages
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "getWatchlist") {
        chrome.storage.sync.get(['watchlist1'], function(result) {
            sendResponse(result);
        });
        return true;
    }
});