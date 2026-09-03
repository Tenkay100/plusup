let currentShipment = null;

document.addEventListener('DOMContentLoaded', () => {
    // Check URL parameters for tracking number
    const urlParams = new URLSearchParams(window.location.search);
    const trackNum = urlParams.get('number');
    
    if (trackNum) {
        document.getElementById('tracking-input').value = trackNum;
        executeSearch(trackNum);
    }
});

function handleSearch() {
    const input = document.getElementById('tracking-input').value.trim().toUpperCase();
    if (input) {
        // Update URL without reloading
        const url = new URL(window.location);
        url.searchParams.set('number', input);
        window.history.pushState({}, '', url);
        
        executeSearch(input);
    }
}

async function executeSearch(trackingNumber) {
    trackingNumber = trackingNumber.trim().toUpperCase();
    // UI State Management
    document.getElementById('loading-state').style.display = 'block';
    document.getElementById('error-state').style.display = 'none';
    document.getElementById('result-state').style.display = 'none';

    try {
        const data = await window.db.getShipment(trackingNumber);
        if (data) {
            currentShipment = data;
            renderResults(data);
        } else {
            currentShipment = null;
            showError("Tracking number not found. Please verify the code and try again.");
        }
    } catch (error) {
        console.error("Search Error:", error);
        showError("An error occurred while tracking. System: " + (error.message || 'Check console.'));
    }
}

function renderResults(data) {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('error-state').style.display = 'none';
    document.getElementById('result-state').style.display = 'block';

    // Populate overview
    document.getElementById('tracking-display').innerText = data.tracking_number;
    document.getElementById('origin-display').innerText = data.origin_country || 'N/A';
    document.getElementById('destination-display').innerText = data.destination_country || 'N/A';
    
    const progress = data.progress_percentage || 0;
    document.getElementById('progress-percentage-display').innerText = progress + '%';
    document.getElementById('progress-bar-fill').style.width = '0%'; // Reset for animation
    
    // Animate progress bar slightly after load
    setTimeout(() => {
        document.getElementById('progress-bar-fill').style.width = progress + '%';
    }, 100);

    // Status Badge & Description Subtext
    const badge = document.getElementById('current-status-badge');
    badge.innerText = '● ' + data.status;
    badge.className = 'status-badge-lg';
    
    if (data.status.toLowerCase().includes('delivered')) {
        badge.classList.add('delivered');
    } else {
        badge.classList.add('transit');
    }

    const descEl = document.getElementById('current-status-desc');
    if (descEl) {
        if (data.status_description) {
            descEl.innerText = data.status_description;
            descEl.style.display = 'block';
        } else {
            descEl.style.display = 'none';
        }
    }

    // Populate Sidebar
    document.getElementById('est-delivery-display').innerText = data.estimated_delivery_date ? formatDate(data.estimated_delivery_date) : '-';
    document.getElementById('sender-display').innerText = data.sender_details || '-';
    document.getElementById('receiver-display').innerText = data.receiver_details || '-';
    document.getElementById('weight-display').innerText = data.weight_kg ? data.weight_kg + ' KG' : '-';
    document.getElementById('dimensions-display').innerText = data.dimensions || '-';
    document.getElementById('package-display').innerText = data.package_details || '-';

    // Populate Timeline
    const historyContainer = document.getElementById('timeline-container');
    historyContainer.innerHTML = ''; // Clear existing

    let historyList = data.shipment_history || [];

    // Fallback: If history list is empty (e.g. from a separate device), synthesize the initial checkpoint from shipment metadata
    if (historyList.length === 0) {
        historyList = [
            {
                status: data.status || 'Shipment Created',
                location: data.origin_country || 'Origin Facility',
                description: data.status_description || 'Electronic shipping details received and processed.',
                update_date: data.created_at || new Date().toISOString()
            }
        ];
    }

    // Sort history by date descending (newest first)
    const sortedHistory = [...historyList].sort((a, b) => new Date(b.update_date || 0) - new Date(a.update_date || 0));
    
    sortedHistory.forEach((item, index) => {
        const isFirst = index === 0; // The most recent update
        const formattedDate = item.update_date ? formatDateTime(item.update_date) : formatDateTime(data.created_at || new Date().toISOString());
        const loc = item.location || data.origin_country || 'Transit Facility';
        const st = item.status || data.status || 'In Transit';
        const desc = item.description || (data.status_description || 'Routing update');

        const html = `
            <div class="timeline-item fade-in-up delay-${(index % 5) * 100} ${isFirst ? 'active' : 'completed'}">
                <div class="timeline-date">${formattedDate}</div>
                <div class="timeline-content">
                    <h4>${st}</h4>
                    <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 5px;">📍 ${loc}</p>
                    <p style="font-size: 0.9rem;">${desc}</p>
                </div>
            </div>
        `;
        historyContainer.insertAdjacentHTML('beforeend', html);
    });
}

function showError(message) {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('result-state').style.display = 'none';
    const errorState = document.getElementById('error-state');
    errorState.style.display = 'block';
    if(message) document.getElementById('error-msg').innerText = message;
}

function copyTracking() {
    const text = document.getElementById('tracking-display').innerText;
    navigator.clipboard.writeText(text).then(() => {
        alert("Tracking number copied: " + text);
    });
}

// Helpers
function simulateNetworkDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function formatDate(dateStr) {
    if(!dateStr) return '-';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString(undefined, options);
}

function formatDateTime(dateStr) {
    if(!dateStr) return '-';
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateStr).toLocaleDateString(undefined, options);
}

async function downloadManifest() {
    if (!currentShipment) return;
    const statusEl = document.getElementById('download-status');
    statusEl.style.display = 'block';
    try {
        await window.DocumentTemplates.downloadPDF('manifest', currentShipment);
    } catch (e) {
        console.error(e);
        alert("Failed to generate PDF.");
    }
    statusEl.style.display = 'none';
}

async function downloadBOL() {
    if (!currentShipment) return;
    const statusEl = document.getElementById('download-status');
    statusEl.style.display = 'block';
    try {
        await window.DocumentTemplates.downloadPDF('bol', currentShipment);
    } catch (e) {
        console.error(e);
        alert("Failed to generate PDF.");
    }
    statusEl.style.display = 'none';
}
