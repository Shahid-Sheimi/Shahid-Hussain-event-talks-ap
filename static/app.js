document.addEventListener('DOMContentLoaded', () => {
    // State Variables
    let allUpdates = [];
    let activeFilter = 'all';
    let searchQuery = '';
    let selectedUpdateForTweet = null;

    // DOM Elements
    const feedContainer = document.getElementById('feed-container');
    const skeletonLoader = document.getElementById('skeleton-loader');
    const emptyState = document.getElementById('empty-state');
    const totalCountEl = document.getElementById('total-count');
    const btnRefresh = document.getElementById('btn-refresh');
    const refreshIcon = document.getElementById('refresh-icon');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const filterContainer = document.getElementById('filter-container');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    
    // Modal DOM Elements
    const twitterModal = document.getElementById('twitter-modal');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const closeModalBtn = document.getElementById('close-modal');
    const btnCopyTweet = document.getElementById('btn-copy-tweet');
    const btnPostTweet = document.getElementById('btn-post-tweet');
    const charCountEl = document.getElementById('char-count');
    const charProgress = document.getElementById('char-progress');
    const toastEl = document.getElementById('toast');

    // Progress Ring configuration
    const ringRadius = 11;
    const ringCircumference = 2 * Math.PI * ringRadius; // ~69.115
    charProgress.style.strokeDasharray = ringCircumference;
    charProgress.style.strokeDashoffset = ringCircumference;

    // ==========================================================================
    // Fetch and Load Data
    // ==========================================================================
    async function fetchReleaseNotes(forceRefresh = false) {
        setLoadingState(true);
        try {
            const url = `/api/notes${forceRefresh ? '?refresh=true' : ''}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');
            
            const data = await response.ok ? await response.json() : null;
            if (data && data.updates) {
                allUpdates = data.updates;
                renderFeed();
                showWarningIfCachedError(data);
            } else {
                showError('No updates returned from server');
            }
        } catch (error) {
            console.error('Error fetching release notes:', error);
            showError('Could not connect to the BigQuery feed. Please try again.');
        } finally {
            setLoadingState(false);
        }
    }

    function setLoadingState(isLoading) {
        if (isLoading) {
            skeletonLoader.style.display = 'grid';
            feedContainer.style.display = 'none';
            emptyState.style.display = 'none';
            refreshIcon.classList.add('spinning');
            btnRefresh.disabled = true;
        } else {
            skeletonLoader.style.display = 'none';
            refreshIcon.classList.remove('spinning');
            btnRefresh.disabled = false;
        }
    }

    function showError(message) {
        feedContainer.innerHTML = '';
        feedContainer.style.display = 'none';
        skeletonLoader.style.display = 'none';
        emptyState.style.display = 'flex';
        
        const emptyIcon = emptyState.querySelector('.empty-icon');
        const emptyHeader = emptyState.querySelector('h2');
        const emptyDesc = emptyState.querySelector('p');
        
        emptyIcon.textContent = 'error';
        emptyHeader.textContent = 'Failed to Load Feed';
        emptyDesc.textContent = message;
    }

    function showWarningIfCachedError(data) {
        if (data.warning) {
            showToast(data.warning, 'warning');
        }
    }

    // ==========================================================================
    // Render and Filter Stream
    // ==========================================================================
    function renderFeed() {
        const filtered = allUpdates.filter(update => {
            // Filter by Type
            const matchesFilter = activeFilter === 'all' || 
                update.type.toLowerCase() === activeFilter.toLowerCase();
            
            // Filter by Search Query
            const matchesSearch = !searchQuery || 
                update.text.toLowerCase().includes(searchQuery) ||
                update.type.toLowerCase().includes(searchQuery) ||
                update.date.toLowerCase().includes(searchQuery);
                
            return matchesFilter && matchesSearch;
        });

        totalCountEl.textContent = filtered.length;

        if (filtered.length === 0) {
            feedContainer.style.display = 'none';
            emptyState.style.display = 'flex';
            // Restore search_off state
            emptyState.querySelector('.empty-icon').textContent = 'search_off';
            emptyState.querySelector('h2').textContent = 'No Updates Found';
            emptyState.querySelector('p').textContent = "We couldn't find any release notes matching your search or filters. Try adjusting them.";
            return;
        }

        emptyState.style.display = 'none';
        feedContainer.style.display = 'grid';
        
        feedContainer.innerHTML = '';
        filtered.forEach((update, index) => {
            const card = createCardElement(update, index);
            feedContainer.appendChild(card);
        });
    }

    function createCardElement(update, index) {
        const card = document.createElement('article');
        card.className = 'update-card';
        card.style.animationDelay = `${(index % 8) * 0.05}s`;

        const badgeClass = `badge-${update.type.toLowerCase()}`;
        const typeBadge = document.createElement('span');
        typeBadge.className = `badge ${badgeClass || 'badge-general'}`;
        typeBadge.textContent = update.type;

        // Card header
        const header = document.createElement('div');
        header.className = 'card-header';
        
        const dateSpan = document.createElement('span');
        dateSpan.className = 'card-date';
        dateSpan.textContent = update.date;
        
        header.appendChild(typeBadge);
        header.appendChild(dateSpan);

        // Card body
        const body = document.createElement('div');
        body.className = 'card-body';
        body.innerHTML = update.html;

        // Enhance HTML links to open in a new tab
        const links = body.querySelectorAll('a');
        links.forEach(link => {
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
        });

        // Card actions
        const actions = document.createElement('div');
        actions.className = 'card-actions';

        // Copy button
        const btnCopy = document.createElement('button');
        btnCopy.className = 'btn-icon';
        btnCopy.title = 'Copy link to this release';
        btnCopy.innerHTML = '<span class="material-symbols-outlined">link</span>';
        btnCopy.addEventListener('click', () => {
            copyToClipboard(update.link, 'Link copied to clipboard!');
        });

        // Tweet button
        const btnTweet = document.createElement('button');
        btnTweet.className = 'btn-icon btn-icon-tweet';
        btnTweet.title = 'Tweet this update';
        btnTweet.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
            </svg>
        `;
        btnTweet.addEventListener('click', () => {
            openTweetModal(update);
        });

        actions.appendChild(btnCopy);
        actions.appendChild(btnTweet);

        card.appendChild(header);
        card.appendChild(body);
        card.appendChild(actions);

        return card;
    }

    // ==========================================================================
    // Clipboard helper
    // ==========================================================================
    function copyToClipboard(text, message) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(message, 'success');
        }).catch(err => {
            console.error('Could not copy text: ', err);
            // Fallback for older browsers
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed"; 
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                showToast(message, 'success');
            } catch (err) {
                showToast('Failed to copy link', 'error');
            }
            document.body.removeChild(textArea);
        });
    }

    function showToast(message, type = 'success') {
        toastEl.querySelector('.toast-message').textContent = message;
        const iconEl = toastEl.querySelector('.toast-icon');
        
        if (type === 'success') {
            iconEl.textContent = 'check_circle';
            iconEl.style.color = '#10b981';
            toastEl.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        } else if (type === 'warning') {
            iconEl.textContent = 'warning';
            iconEl.style.color = '#f59e0b';
            toastEl.style.borderColor = 'rgba(245, 158, 11, 0.4)';
        } else {
            iconEl.textContent = 'error';
            iconEl.style.color = '#ef4444';
            toastEl.style.borderColor = 'rgba(239, 68, 68, 0.4)';
        }

        toastEl.classList.add('show');
        setTimeout(() => {
            toastEl.classList.remove('show');
        }, 3500);
    }

    // ==========================================================================
    // Twitter Composer Modal Logic
    // ==========================================================================
    function openTweetModal(update) {
        selectedUpdateForTweet = update;
        
        // Construct pre-filled tweet text
        const prefix = `BigQuery Update [${update.date}]: `;
        const hashtags = ` #BigQuery #GoogleCloud`;
        const link = ` ${update.link}`;
        
        // Calculate maximum length allowed for the update text body
        // 280 total - prefix length - hashtags length - link length (X URL counts as 23 chars usually, but we calculate strictly)
        // Note: Twitter counts any URL as 23 characters regardless of actual length.
        const urlLength = 23;
        const availableBodyLength = 280 - prefix.length - hashtags.length - urlLength;
        
        let updateText = update.text;
        if (updateText.length > availableBodyLength) {
            updateText = updateText.substring(0, availableBodyLength - 3) + '...';
        }
        
        const fullTweetText = `${prefix}${updateText}${link}${hashtags}`;
        
        tweetTextarea.value = fullTweetText;
        updateCharCounter();
        
        twitterModal.style.display = 'flex';
        tweetTextarea.focus();
    }

    function closeTweetModal() {
        twitterModal.style.display = 'none';
        selectedUpdateForTweet = null;
    }

    function updateCharCounter() {
        const text = tweetTextarea.value;
        const textLen = text.length;
        
        // For accurate Twitter length estimation, replace URLs with 23-char placeholder
        const urlRegex = /https?:\/\/[^\s]+/g;
        let tweetLength = textLen;
        const urls = text.match(urlRegex);
        if (urls) {
            urls.forEach(url => {
                tweetLength = tweetLength - url.length + 23;
            });
        }
        
        const charsRemaining = 280 - tweetLength;
        charCountEl.textContent = charsRemaining;
        
        // Circular progress ring calculation
        const percent = Math.min(100, (tweetLength / 280) * 100);
        const offset = ringCircumference - (percent / 100) * ringCircumference;
        charProgress.style.strokeDashoffset = offset;
        
        // Stylings based on length thresholds
        if (charsRemaining < 0) {
            charCountEl.style.color = '#f43f5e';
            charProgress.style.stroke = '#f43f5e';
            btnPostTweet.disabled = true;
        } else if (charsRemaining <= 20) {
            charCountEl.style.color = '#f59e0b';
            charProgress.style.stroke = '#f59e0b';
            btnPostTweet.disabled = false;
        } else {
            charCountEl.style.color = 'var(--text-secondary)';
            charProgress.style.stroke = 'var(--accent-indigo)';
            btnPostTweet.disabled = false;
        }
    }

    function performPostTweet() {
        const text = tweetTextarea.value;
        const encodedText = encodeURIComponent(text);
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
        window.open(twitterUrl, '_blank', 'noopener,noreferrer');
        closeTweetModal();
    }

    // ==========================================================================
    // Event Listeners
    // ==========================================================================
    btnRefresh.addEventListener('click', () => {
        fetchReleaseNotes(true);
    });

    // Search events
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
        renderFeed();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        searchInput.focus();
        renderFeed();
    });

    // Filter events
    filterContainer.addEventListener('click', (e) => {
        const pill = e.target.closest('.filter-pill');
        if (!pill) return;
        
        // Deactivate previous
        filterContainer.querySelector('.filter-pill.active').classList.remove('active');
        // Activate current
        pill.classList.add('active');
        
        activeFilter = pill.dataset.filter;
        renderFeed();
    });

    resetFiltersBtn.addEventListener('click', () => {
        // Clear search
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        
        // Reset category pill
        filterContainer.querySelector('.filter-pill.active').classList.remove('active');
        filterContainer.querySelector('[data-filter="all"]').classList.add('active');
        activeFilter = 'all';
        
        renderFeed();
    });

    // Modal Events
    closeModalBtn.addEventListener('click', closeTweetModal);
    twitterModal.addEventListener('click', (e) => {
        if (e.target === twitterModal) closeTweetModal();
    });

    tweetTextarea.addEventListener('input', updateCharCounter);
    
    btnCopyTweet.addEventListener('click', () => {
        copyToClipboard(tweetTextarea.value, 'Tweet copied to clipboard!');
    });

    btnPostTweet.addEventListener('click', performPostTweet);

    // Initial Fetch
    fetchReleaseNotes(false);
});
