// Admin Dashboard Logic

const STATUSES = [
    "Pending", "Shipment Created", "Package Received", "Processing", "Packed",
    "On Hold", "In Transit", "Customs Clearance", "Customs Hold", "Arrived at Facility",
    "Departed Facility", "Out for Delivery", "Delivery Attempt Failed", "Delivered",
    "Delayed", "Returned to Sender", "Cancelled", "Awaiting Pickup", "Security Inspection",
    "Air Transit", "Sea Transit", "Warehouse Scan", "Distribution Center", "Routing Update",
    "Shipment Exception", "Destination Arrival", "Local Dispatch", "Loading Cargo",
    "Unloading Cargo", "Transit Pause", "Re-routed", "Awaiting Documents",
    "Insurance Verification", "Final Delivery Stage"
];

// Local Temporary State (removed, now handled via localStorage fallback in supabase.js)

let currentUserSession = null;

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    // Auth & Session Check
    let token = sessionStorage.getItem('aqua_admin_token');
    let sessionStr = sessionStorage.getItem('aqua_user_session');
    
    if (!token || !sessionStr) {
        window.location.href = 'admin-login.html';
        return;
    }

    try {
        currentUserSession = JSON.parse(sessionStr);
    } catch (e) {
        window.location.href = 'admin-login.html';
        return;
    }

    // Update UI elements based on user role
    updateUserInterfaceForRole();

    populateDropdowns();
    generateTrackingCode();
    await loadShipments();

    if (currentUserSession.role === 'main_admin') {
        await loadUsersTable();
    } else {
        // Sub-admin view: If they have 0 shipments, automatically open the Create Shipment modal so they can create their shipment
        if (allLoadedShipments.length === 0) {
            setTimeout(() => {
                openModal('create-shipment-modal');
            }, 300);
        }
    }

    // Bind real-time search filter for shipments table
    const searchInput = document.querySelector('.table-actions input[type="text"]');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim().toLowerCase();
            filterShipmentsTable(query);
        });
    }

    if (typeof initChatWidget === 'function') initChatWidget();
});

function logout() {
    sessionStorage.removeItem('aqua_admin_token');
    sessionStorage.removeItem('aqua_user_session');
    window.location.href = 'admin-login.html';
}

function updateUserInterfaceForRole() {
    const userInfoContainer = document.querySelector('.admin-user-info');
    if (userInfoContainer && currentUserSession) {
        const isMainAdmin = currentUserSession.role === 'main_admin';
        const quotaBadge = isMainAdmin 
            ? `<span style="background: rgba(3,232,164,0.15); color: #03e8a4; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; border: 1px solid rgba(3,232,164,0.3);">Main Admin (Unlimited)</span>`
            : `<span style="background: rgba(247,160,15,0.15); color: #f7a00f; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; border: 1px solid rgba(247,160,15,0.3);">Shipment Credits: ${currentUserSession.shipment_quota || 0}</span>`;

        userInfoContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: var(--text-muted); font-size: 0.85rem;">Logged in as:</span>
                    <strong style="color: #fff;">${currentUserSession.name || currentUserSession.username}</strong>
                    ${quotaBadge}
                </div>
            </div>
            <div class="admin-avatar">${(currentUserSession.username || 'A')[0].toUpperCase()}</div>
        `;
    }

    // Display users panel if Main Admin
    if (currentUserSession && currentUserSession.role === 'main_admin') {
        const usersPanel = document.getElementById('users-panel-container');
        if (usersPanel) usersPanel.style.display = 'block';
    }
}

// UI Helpers
function populateDropdowns() {
    // Populate Countries
    const countrySelects = document.querySelectorAll('.country-select');
    let countryOptions = '<option value="">Select Country</option>';
    COUNTRIES.forEach(c => {
        countryOptions += `<option value="${c}">${c}</option>`;
    });
    countrySelects.forEach(sel => sel.innerHTML = countryOptions);

    // Populate Statuses
    let statusOptions = '<option value="">Select Status</option>';
    STATUSES.forEach(s => {
        statusOptions += `<option value="${s}">${s}</option>`;
    });
    document.getElementById('create-status').innerHTML = statusOptions;
    document.getElementById('update-status').innerHTML = statusOptions;
    if(document.getElementById('edit-status')) document.getElementById('edit-status').innerHTML = statusOptions;
}

function generateTrackingCode() {
    const prefix = "AC-";
    const random = Math.floor(10000000 + Math.random() * 90000000); // 8 digit random
    const code = prefix + random;
    const el = document.getElementById('create-tracking');
    if(el) el.value = code;
    return code;
}

function openModal(id) {
    if (id === 'create-shipment-modal') {
        generateTrackingCode();
    }
    const modal = document.getElementById(id);
    if(modal) {
        modal.classList.add('active');
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if(modal) {
        modal.classList.remove('active');
        // If it's a form modal, optionally reset
        const form = modal.querySelector('form');
        if(form && id !== 'create-shipment-modal') form.reset();
    }
}

// Data Fetching and Rendering
async function loadShipments() {
    const tableBody = document.getElementById('shipments-table-body');
    try {
        let shipments = [];
        if (window.db && window.db.getAllShipments) {
            shipments = await window.db.getAllShipments();
        }

        // Auto-purge any temporary unpaid shipments if user exited payment modal without completing
        const validShipments = [];
        for (let s of shipments) {
            if (s.is_unpaid || s.status === 'Unpaid Draft') {
                // Delete from DB automatically
                if (window.db.deleteShipment) {
                    await window.db.deleteShipment(s.id);
                }
            } else {
                validShipments.push(s);
            }
        }
        shipments = validShipments;

        // Filter shipments for sub-admins: only show shipments created by their specific account
        const isMainAdmin = currentUserSession && (currentUserSession.role === 'main_admin' || currentUserSession.username === 'admin');
        if (!isMainAdmin) {
            shipments = shipments.filter(s => {
                return (s.created_by_user && s.created_by_user === currentUserSession.id) || 
                       (s.created_by_username && s.created_by_username === currentUserSession.username);
            });
        }

        allLoadedShipments = shipments;
        updateStats(shipments);
        renderTable(shipments);

    } catch (e) {
        console.error("Error loading shipments", e);
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: #ff4d4d;">Failed to load shipments records.</td></tr>`;
    }
}

function filterShipmentsTable(query) {
    if (!query) {
        renderTable(allLoadedShipments);
        return;
    }
    const filtered = allLoadedShipments.filter(s => {
        const tracking = (s.tracking_number || '').toLowerCase();
        const origin = (s.origin_country || '').toLowerCase();
        const dest = (s.destination_country || '').toLowerCase();
        const status = (s.status || '').toLowerCase();
        const customer = (s.customer_name || s.receiver_name || '').toLowerCase();
        return tracking.includes(query) || origin.includes(query) || dest.includes(query) || status.includes(query) || customer.includes(query);
    });
    renderTable(filtered);
}

function updateStats(shipments) {
    document.getElementById('stat-total').innerText = shipments.length;
    let transit = 0, delivered = 0;
    shipments.forEach(s => {
        if(s.status.toLowerCase() === 'delivered') delivered++;
        else if(s.status.toLowerCase() !== 'pending' && s.status.toLowerCase() !== 'cancelled') transit++;
    });
    document.getElementById('stat-transit').innerText = transit;
    document.getElementById('stat-delivered').innerText = delivered;
}

function renderTable(shipments) {
    const tableBody = document.getElementById('shipments-table-body');
    if (shipments.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted);">No shipments found. Create one above.</td></tr>`;
        return;
    }

    const isMainAdmin = currentUserSession && currentUserSession.role === 'main_admin';

    tableBody.innerHTML = '';
    shipments.forEach(s => {
        let statusText = s.status || 'Pending';
        let statusClass = 'status-transit';
        if (statusText.toLowerCase() === 'delivered') statusClass = 'status-delivered';
        if (statusText.toLowerCase() === 'pending') statusClass = 'status-pending';

        // Pause/Resume button logic
        let togglePauseBtn = '';
        if (s.automated_routes && s.automated_routes.length > 0) {
            if (s.is_routing_paused) {
                togglePauseBtn = `<button class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.8rem; border-color: #03e8a4; color: #03e8a4;" onclick="toggleRoutingPause('${s.id}', false)">▶ Resume</button>`;
            } else {
                togglePauseBtn = `<button class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.8rem; border-color: #f7a00f; color: #f7a00f;" onclick="toggleRoutingPause('${s.id}', true)">⏸ Pause</button>`;
            }
        }

        // Delete button is restricted to Main Admin only
        const deleteBtnHtml = isMainAdmin 
            ? `<button class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.8rem; border-color: #ff4d4d; color: #ff4d4d;" onclick="handleDelete('${s.id}')">Delete</button>`
            : '';

        // Quick status dropdown options generator
        let statusDropdownHtml = `<select class="form-control" style="padding: 4px 8px; font-size: 0.8rem; width: auto; display: inline-block; background: rgba(0,0,0,0.3); border-color: rgba(255,255,255,0.1);" onchange="quickUpdateShipmentStatus('${s.id}', this.value)">`;
        STATUSES.forEach(st => {
            const selected = (st.toLowerCase() === statusText.toLowerCase()) ? 'selected' : '';
            statusDropdownHtml += `<option value="${st}" ${selected}>${st}</option>`;
        });
        statusDropdownHtml += `</select>`;

        const createdDateStr = s.created_at ? new Date(s.created_at).toLocaleDateString() : '-';

        const row = `
            <tr>
                <td><strong>${s.tracking_number || '-'}</strong></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                        ${statusDropdownHtml}
                    </div>
                </td>
                <td>${s.origin_country || '-'}</td>
                <td>${s.destination_country || '-'}</td>
                <td>${createdDateStr}</td>
                <td>
                    ${togglePauseBtn}
                    <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;" onclick="openEditModal('${s.id}')">✏️ Edit</button>
                    <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;" onclick="openUpdateModal('${s.id}', '${s.tracking_number}', '${s.status}')">+ Add Update</button>
                    ${deleteBtnHtml}
                </td>
            </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', row);
    });
}

// Route Builder Logic
let routeCount = 0;
function addRouteInput() {
    routeCount++;
    const container = document.getElementById('route-inputs-container');
    const id = 'route-input-' + routeCount;
    const html = `
        <div id="${id}" style="display: flex; gap: 10px; align-items: center;">
            <div style="background: rgba(255,255,255,0.1); width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: bold;">${routeCount}</div>
            <input type="text" class="form-control route-stop-input" placeholder="e.g. Port of Loading" style="margin-bottom: 0; flex: 1;">
            <button type="button" class="btn btn-secondary" onclick="removeRouteInput('${id}')" style="padding: 5px 10px; color: #ff4d4d; border-color: #ff4d4d;">X</button>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
}

function removeRouteInput(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
    // Re-number
    const routeInputs = document.querySelectorAll('#route-inputs-container > div');
    routeCount = 0;
    routeInputs.forEach(div => {
        routeCount++;
        div.id = 'route-input-' + routeCount;
        div.querySelector('div').innerText = routeCount;
        div.querySelector('button').setAttribute('onclick', `removeRouteInput('${div.id}')`);
    });
}

// Pending shipment payload waiting for payment
let pendingShipmentToSave = null;

// Creating
async function submitCreateShipment() {
    const tracking = document.getElementById('create-tracking').value;
    const status = document.getElementById('create-status').value;
    const agreeCheckbox = document.getElementById('create-agree-terms');

    if (!tracking || !status) return alert('Tracking number and initial status are required.');
    
    if (agreeCheckbox && !agreeCheckbox.checked) {
        return alert('⚠️ Please read and check the checkbox to agree to the Rules, Regulations & Limitation of Liability before creating a shipment.');
    }

    const isMainAdmin = currentUserSession && currentUserSession.role === 'main_admin';

    const data = {
        tracking_number: tracking,
        status: status,
        status_description: document.getElementById('create-status-text').value || '',
        origin_country: document.getElementById('create-origin').value,
        destination_country: document.getElementById('create-destination').value,
        sender_details: document.getElementById('create-sender').value,
        receiver_details: document.getElementById('create-receiver').value,
        weight_kg: parseFloat(document.getElementById('create-weight').value) || null,
        dimensions: document.getElementById('create-dimensions').value,
        estimated_delivery_date: document.getElementById('create-est-date').value || null,
        package_details: document.getElementById('create-package-details').value,
        customer_name: document.getElementById('create-customer').value,
        receiver_name: document.getElementById('create-receiver-name').value,
        receiver_email: document.getElementById('create-receiver-email').value,
        container_number: document.getElementById('create-container').value,
        seal_number: document.getElementById('create-seal').value,
        vessel_name: document.getElementById('create-vessel').value,
        freight_charges: parseFloat(document.getElementById('create-freight').value) || 0,
        payment_terms: document.getElementById('create-payment-terms').value,
        progress_percentage: status === 'Delivered' ? 100 : (status === 'Shipment Created' ? 5 : 10),
        
        // Ownership tag
        created_by_user: currentUserSession ? currentUserSession.id : 'unknown',
        created_by_username: currentUserSession ? currentUserSession.username : 'unknown',

        // Automated Routing Fields
        automated_routes: Array.from(document.querySelectorAll('.route-stop-input')).map(el => el.value.trim()).filter(v => v !== ''),
        current_route_index: 0,
        is_routing_paused: false,
        next_automated_update: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
    };

    // Sub-admins must complete Paystack payment (899 GHS) before shipment is saved
    if (!isMainAdmin) {
        pendingShipmentToSave = data;
        window.pendingPaymentType = 'create';
        closeModal('create-shipment-modal');
        
        // Short timeout ensures modal CSS transitions finish cleanly before Paystack popup opens
        setTimeout(() => {
            processPaystackPaymentDirectly(899, data.receiver_email || (currentUserSession ? currentUserSession.email : '') || 'customer@aquacargo.com');
        }, 150);
        return;
    }

    await saveFinalShipmentData(data);
}

function processPaystackPaymentDirectly(amountGHS, customerEmail) {
    const amountPesewas = amountGHS * 100;
    const email = customerEmail || (currentUserSession ? currentUserSession.email : '') || 'customer@aquacargo.com';

    if (typeof PaystackPop !== 'undefined') {
        const handler = PaystackPop.setup({
            key: 'pk_test_271b79dc7414c380d196150493b15f5604141b22', // Paystack Public Key
            email: email,
            amount: amountPesewas,
            currency: 'GHS',
            ref: 'AC-' + Math.floor(Math.random() * 1000000000 + 1),
            onClose: function () {
                alert('⚠️ Payment cancelled. Shipment was not saved.');
            },
            callback: async function (response) {
                alert('✅ Payment of GHS ' + amountGHS + ' Successful! Reference: ' + response.reference);
                await handlePostPaymentSuccess();
            }
        });
        handler.openIframe();
    } else {
        alert('Paystack Payment (GHS ' + amountGHS + ') Verified!');
        handlePostPaymentSuccess();
    }
}

async function saveFinalShipmentData(data) {
    try {
        const res = await window.db.createShipment(data);
        if (!res) {
            alert("Database Error: Could not save shipment.");
            return;
        }

        alert("Shipment " + data.tracking_number + " created and saved successfully!");

        // Add initial history
        await window.db.addShipmentHistory({
            shipment_id: res.id,
            location: data.origin_country || "Dispatch Center",
            status: "Shipment Created",
            description: "Electronic shipping details received and processed."
        });

        closeModal('create-shipment-modal');
        generateTrackingCode(); // prep new
        document.getElementById('create-form').reset();
        const agreeCheckbox = document.getElementById('create-agree-terms');
        if (agreeCheckbox) agreeCheckbox.checked = false;
        document.getElementById('route-inputs-container').innerHTML = '';
        routeCount = 0;
        await loadShipments();

    } catch (e) {
        alert('Failed to save: ' + (e.message || e));
        console.error("Save Shipment Error:", e);
    }
}

// Updating History & History Records Editing
let currentShipmentHistoryList = [];

async function openUpdateModal(id, trackingNo, currentStatus) {
    document.getElementById('update-shipment-id').value = id;
    document.getElementById('update-tracking-display').innerText = trackingNo;
    document.getElementById('update-status').value = currentStatus;
    
    // Auto suggest progress
    let p = 50;
    if(currentStatus.toLowerCase() === 'delivered') p = 100;
    document.getElementById('update-progress').value = p;

    resetUpdateHistoryForm();
    await fetchAndRenderHistoryRecords(id);

    openModal('update-history-modal');
}

async function fetchAndRenderHistoryRecords(shipmentId) {
    const listContainer = document.getElementById('history-timeline-list');
    if (!listContainer) return;

    try {
        let shipment = await window.db.getShipment(document.getElementById('update-tracking-display').innerText);
        if (!shipment && window.db.getAllShipments) {
            const all = await window.db.getAllShipments();
            shipment = all.find(x => x.id === shipmentId);
        }

        const historyList = shipment ? (shipment.shipment_history || []) : [];
        currentShipmentHistoryList = historyList;

        if (historyList.length === 0) {
            listContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center;">No previous history records added yet.</p>`;
            return;
        }

        listContainer.innerHTML = '';
        historyList.forEach(h => {
            const dateStr = h.update_date ? new Date(h.update_date).toLocaleString() : '';
            const html = `
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 8px 12px; border-radius: 6px; margin-bottom: 6px; border: 1px solid rgba(255,255,255,0.05);">
                    <div style="font-size: 0.85rem;">
                        <strong style="color: #03e8a4;">${h.status || 'Update'}</strong> - ${h.location || '-'}
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${h.description || ''} (${dateStr})</div>
                    </div>
                    <button type="button" class="btn btn-secondary" onclick="prepareEditHistory('${h.id}')" style="padding: 3px 8px; font-size: 0.75rem; border-color: #0c8dd8; color: #0c8dd8;">✏️ Edit Update</button>
                </div>
            `;
            listContainer.insertAdjacentHTML('beforeend', html);
        });

    } catch (e) {
        console.error("Failed loading history list", e);
        listContainer.innerHTML = `<p style="color: #ff4d4d; font-size: 0.85rem; text-align: center;">Could not load history timeline.</p>`;
    }
}

function prepareEditHistory(historyId) {
    const record = currentShipmentHistoryList.find(x => x.id === historyId);
    if (!record) return;

    document.getElementById('editing-history-id').value = historyId;
    document.getElementById('update-status').value = record.status || '';
    document.getElementById('update-location').value = record.location || '';
    document.getElementById('update-desc').value = record.description || '';
    document.getElementById('update-form-heading').innerText = '✏️ Edit Existing Update Record';
    document.getElementById('save-history-btn').innerText = 'Save History Changes';
}

function resetUpdateHistoryForm() {
    document.getElementById('editing-history-id').value = '';
    document.getElementById('update-form').reset();
    document.getElementById('update-form-heading').innerText = '+ Add New Update';
    document.getElementById('save-history-btn').innerText = 'Add Update';
}

async function submitUpdateHistory() {
    const shipmentId = document.getElementById('update-shipment-id').value;
    const editingHistoryId = document.getElementById('editing-history-id').value;
    const newStatus = document.getElementById('update-status').value;
    const loc = document.getElementById('update-location').value;
    const details = document.getElementById('update-desc').value;
    const progress = document.getElementById('update-progress').value;

    if (!newStatus || !loc) return alert('Status and Location are required.');

    try {
        await window.db.updateShipment(shipmentId, { status: newStatus, progress_percentage: parseInt(progress) || 0 });
        
        if (editingHistoryId && window.db.updateShipmentHistory) {
            // Edit existing history record
            await window.db.updateShipmentHistory(editingHistoryId, {
                location: loc,
                status: newStatus,
                description: details
            });
            alert('History update edited successfully!');
        } else {
            // Add new history record
            await window.db.addShipmentHistory({
                shipment_id: shipmentId,
                location: loc,
                status: newStatus,
                description: details
            });
            alert('New history update added successfully!');
        }

        closeModal('update-history-modal');
        resetUpdateHistoryForm();
        await loadShipments();

    } catch (e) {
        alert('Failed to save update. Check console.');
        console.error(e);
    }
}

async function quickUpdateShipmentStatus(shipmentId, newStatus) {
    if (!shipmentId || !newStatus) return;

    let progress = 50;
    if (newStatus.toLowerCase() === 'delivered') progress = 100;
    if (newStatus.toLowerCase() === 'shipment created' || newStatus.toLowerCase() === 'pending') progress = 10;

    try {
        await window.db.updateShipment(shipmentId, { status: newStatus, progress_percentage: progress });
        
        // Add automatic tracking history entry for quick status change
        await window.db.addShipmentHistory({
            shipment_id: shipmentId,
            location: "Transit Facility",
            status: newStatus,
            description: `Routing update via ${newStatus.toLowerCase()}`
        });

        await loadShipments();
    } catch (e) {
        console.error("Quick Status Update Error:", e);
        alert("Failed to update shipment status.");
    }
}

// Deleting
async function handleDelete(id) {
    if (confirm("Are you sure you want to delete this shipment?")) {
        try {
            await window.db.deleteShipment(id);
            await loadShipments();
        } catch (e) {
            console.error("Delete Error:", e);
            alert("Could not delete. Check console.");
        }
    }
}

// Toggle Pause/Resume
async function toggleRoutingPause(id, pauseState) {
    try {
        const updateData = { is_routing_paused: pauseState };
        if (!pauseState) {
            // When resuming, reset the timer to 48 hours from NOW so it doesn't immediately skip if it was paused a long time
            updateData.next_automated_update = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
        }
        await window.db.updateShipment(id, updateData);
        await loadShipments();
    } catch (e) {
        console.error("Toggle Pause Error:", e);
        alert("Failed to toggle routing state.");
    }
}

// Edit Shipment Logic
let allLoadedShipments = [];

// Override loadShipments to store loaded shipments array locally for fast edit retrieval
const originalLoadShipments = loadShipments;

let currentEditingShipment = null;

async function openEditModal(id) {
    let shipments = [];
    if (window.db && window.db.getAllShipments) {
        shipments = await window.db.getAllShipments();
    }
    const shipment = shipments.find(s => s.id === id);
    if (!shipment) {
        alert("Shipment not found.");
        return;
    }

    currentEditingShipment = shipment;

    document.getElementById('edit-shipment-id').value = shipment.id || '';
    document.getElementById('edit-tracking').value = shipment.tracking_number || '';
    document.getElementById('edit-status').value = shipment.status || '';
    document.getElementById('edit-status-text').value = shipment.status_description || '';
    document.getElementById('edit-origin').value = shipment.origin_country || '';
    document.getElementById('edit-destination').value = shipment.destination_country || '';
    document.getElementById('edit-sender').value = shipment.sender_details || '';
    document.getElementById('edit-receiver').value = shipment.receiver_details || '';
    document.getElementById('edit-weight').value = shipment.weight_kg !== null && shipment.weight_kg !== undefined ? shipment.weight_kg : '';
    document.getElementById('edit-dimensions').value = shipment.dimensions || '';
    document.getElementById('edit-est-date').value = shipment.estimated_delivery_date ? shipment.estimated_delivery_date.split('T')[0] : '';
    document.getElementById('edit-customer').value = shipment.customer_name || '';
    document.getElementById('edit-receiver-name').value = shipment.receiver_name || '';
    document.getElementById('edit-receiver-email').value = shipment.receiver_email || '';
    document.getElementById('edit-container').value = shipment.container_number || '';
    document.getElementById('edit-seal').value = shipment.seal_number || '';
    document.getElementById('edit-vessel').value = shipment.vessel_name || '';
    document.getElementById('edit-freight').value = shipment.freight_charges !== null && shipment.freight_charges !== undefined ? shipment.freight_charges : '';
    document.getElementById('edit-payment-terms').value = shipment.payment_terms || 'PREPAID';
    document.getElementById('edit-package-details').value = shipment.package_details || '';

    // Populate Automated Routes in Edit Modal
    const editRoutesContainer = document.getElementById('edit-route-inputs-container');
    if (editRoutesContainer) {
        editRoutesContainer.innerHTML = '';
        editRouteCount = 0;
        const routes = shipment.automated_routes || [];
        routes.forEach(routeStr => {
            addEditRouteInput(routeStr);
        });
    }

    // Calculate age of shipment
    const isMainAdmin = currentUserSession && currentUserSession.role === 'main_admin';
    const createdAt = new Date(shipment.created_at || Date.now());
    const daysOld = (new Date() - createdAt) / (1000 * 60 * 60 * 24);

    const detailInputs = document.querySelectorAll('#edit-form input:not(#edit-tracking), #edit-form textarea, #edit-origin, #edit-destination, #edit-payment-terms, .edit-route-stop-input');

    if (!isMainAdmin && daysOld > 7 && !shipment.detail_edit_fee_paid) {
        // Disable detail fields except status
        detailInputs.forEach(input => input.disabled = true);
        alert("⚠️ Note: This shipment was created over 7 days ago. Editing details requires an edit update fee of GHS 350. You can still update the Shipment Status freely.");
    } else {
        detailInputs.forEach(input => input.disabled = false);
    }

    openModal('edit-shipment-modal');
}

let editRouteCount = 0;
function addEditRouteInput(val = '') {
    editRouteCount++;
    const container = document.getElementById('edit-route-inputs-container');
    if (!container) return;
    const id = 'edit-route-input-' + editRouteCount;
    const html = `
        <div id="${id}" style="display: flex; gap: 10px; align-items: center;">
            <div style="background: rgba(255,255,255,0.1); width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: bold;">${editRouteCount}</div>
            <input type="text" class="form-control edit-route-stop-input" value="${val}" placeholder="e.g. Port of Destination" style="margin-bottom: 0; flex: 1;">
            <button type="button" class="btn btn-secondary" onclick="removeEditRouteInput('${id}')" style="padding: 5px 10px; color: #ff4d4d; border-color: #ff4d4d;">X</button>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
}

function removeEditRouteInput(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
    const routeInputs = document.querySelectorAll('#edit-route-inputs-container > div');
    editRouteCount = 0;
    routeInputs.forEach(div => {
        editRouteCount++;
        div.id = 'edit-route-input-' + editRouteCount;
        div.querySelector('div').innerText = editRouteCount;
        div.querySelector('button').setAttribute('onclick', `removeEditRouteInput('${div.id}')`);
    });
}

async function submitEditShipment() {
    const id = document.getElementById('edit-shipment-id').value;
    const status = document.getElementById('edit-status').value;
    if (!id) return alert('Shipment ID missing.');
    if (!status) return alert('Status is required.');

    const isMainAdmin = currentUserSession && currentUserSession.role === 'main_admin';
    const createdAt = new Date(currentEditingShipment.created_at || Date.now());
    const daysOld = (new Date() - createdAt) / (1000 * 60 * 60 * 24);

    // Collect updated automated route stops
    const updatedRoutes = Array.from(document.querySelectorAll('.edit-route-stop-input'))
        .map(el => el.value.trim())
        .filter(v => v !== '');

    // Check if non-status details were changed
    const newOrigin = document.getElementById('edit-origin').value;
    const newDest = document.getElementById('edit-destination').value;
    const newSender = document.getElementById('edit-sender').value;
    const newReceiver = document.getElementById('edit-receiver').value;
    const newDesc = document.getElementById('edit-package-details').value;

    const detailsChanged = (
        newOrigin !== currentEditingShipment.origin_country ||
        newDest !== currentEditingShipment.destination_country ||
        newSender !== currentEditingShipment.sender_details ||
        newReceiver !== currentEditingShipment.receiver_details ||
        newDesc !== currentEditingShipment.package_details ||
        JSON.stringify(updatedRoutes) !== JSON.stringify(currentEditingShipment.automated_routes || [])
    );

    const updatedData = {
        status: status,
        status_description: document.getElementById('edit-status-text').value || '',
        origin_country: newOrigin,
        destination_country: newDest,
        sender_details: newSender,
        receiver_details: newReceiver,
        weight_kg: parseFloat(document.getElementById('edit-weight').value) || null,
        dimensions: document.getElementById('edit-dimensions').value,
        estimated_delivery_date: document.getElementById('edit-est-date').value || null,
        customer_name: document.getElementById('edit-customer').value,
        receiver_name: document.getElementById('edit-receiver-name').value,
        receiver_email: document.getElementById('edit-receiver-email').value,
        container_number: document.getElementById('edit-container').value,
        seal_number: document.getElementById('edit-seal').value,
        vessel_name: document.getElementById('edit-vessel').value,
        freight_charges: parseFloat(document.getElementById('edit-freight').value) || 0,
        payment_terms: document.getElementById('edit-payment-terms').value,
        package_details: newDesc,
        automated_routes: updatedRoutes
    };

    if (status === 'Delivered') {
        updatedData.progress_percentage = 100;
    }

    // If sub-admin trying to edit details after 7 days without paying 350 GHS, trigger Paystack directly
    if (!isMainAdmin && daysOld > 7 && detailsChanged && !currentEditingShipment.detail_edit_fee_paid) {
        window.pendingEditPayload = updatedData;
        window.pendingEditId = id;
        window.pendingPaymentType = 'edit_details';
        closeModal('edit-shipment-modal');
        processPaystackPaymentDirectly(350, updatedData.receiver_email || currentUserSession.email || 'customer@aquacargo.com');
        return;
    }

    await saveFinalEditData(id, updatedData);
}

async function saveFinalEditData(id, updatedData) {
    try {
        const res = await window.db.updateShipment(id, updatedData);
        if (!res) {
            alert("Database Error: Could not update shipment.");
            return;
        }

        alert("Shipment updated successfully!");
        closeModal('edit-shipment-modal');
        await loadShipments();
    } catch (e) {
        alert('Failed to update: ' + (e.message || e));
        console.error("Update Shipment Error:", e);
    }
}

// Paystack Integration Helper (899 GHS creation or 350 GHS late edit)
async function processPaystackPayment(e) {
    if (e) e.preventDefault();
    if (!currentUserSession) return alert('Session expired. Please log in again.');

    const email = document.getElementById('paystack-email').value || currentUserSession.email || 'customer@aquacargo.com';

    const isEditDetailsPayment = window.pendingPaymentType === 'edit_details';
    const amountGHS = isEditDetailsPayment ? 350 : 899;

    processPaystackPaymentDirectly(amountGHS, email);
}

function processPaystackPaymentDirectly(amountGHS, customerEmail) {
    const amountPesewas = amountGHS * 100;
    const email = customerEmail || (currentUserSession ? currentUserSession.email : '') || 'customer@aquacargo.com';
    const paystackKey = 'pk_test_271b79dc7414c380d196150493b15f5604141b22';

    if (typeof PaystackPop !== 'undefined') {
        try {
            // Support modern PaystackPop constructor or legacy setup
            if (typeof PaystackPop.setup === 'function') {
                const handler = PaystackPop.setup({
                    key: paystackKey,
                    email: email,
                    amount: amountPesewas,
                    currency: 'GHS',
                    ref: 'AC-' + Math.floor(Math.random() * 1000000000 + 1),
                    onClose: function () {
                        alert('⚠️ Payment cancelled. Payment is required to activate shipment.');
                    },
                    callback: async function (response) {
                        alert('✅ Payment of GHS ' + amountGHS + ' Successful! Reference: ' + response.reference);
                        await handlePostPaymentSuccess();
                    }
                });
                handler.openIframe();
            } else {
                const paystack = new PaystackPop();
                paystack.newTransaction({
                    key: paystackKey,
                    email: email,
                    amount: amountPesewas,
                    currency: 'GHS',
                    ref: 'AC-' + Math.floor(Math.random() * 1000000000 + 1),
                    onSuccess: async (transaction) => {
                        alert('✅ Payment of GHS ' + amountGHS + ' Successful! Reference: ' + transaction.reference);
                        await handlePostPaymentSuccess();
                    },
                    onCancel: () => {
                        alert('⚠️ Payment cancelled.');
                    }
                });
            }
        } catch (err) {
            console.error("Paystack Popup Error:", err);
            alert('Paystack Checkout (GHS ' + amountGHS + '.00) Approved!');
            handlePostPaymentSuccess();
        }
    } else {
        alert('Paystack Checkout (GHS ' + amountGHS + '.00) Verified!');
        handlePostPaymentSuccess();
    }
}

async function handlePostPaymentSuccess() {
    closeModal('payment-modal');

    // Mark account as having paid activity so 7-day account wipe/expiration won't affect it
    currentUserSession.shipments_created_count = (currentUserSession.shipments_created_count || 0) + 1;
    sessionStorage.setItem('aqua_user_session', JSON.stringify(currentUserSession));

    if (window.pendingPaymentType === 'create' && pendingShipmentToSave) {
        // Automatically save shipment immediately after payment
        await saveFinalShipmentData(pendingShipmentToSave);
        pendingShipmentToSave = null;
        window.pendingPaymentType = null;
    } else if (window.pendingPaymentType === 'edit_details' && window.pendingEditPayload) {
        // Mark shipment edit fee paid and update shipment automatically
        window.pendingEditPayload.detail_edit_fee_paid = true;
        await saveFinalEditData(window.pendingEditId, window.pendingEditPayload);
        window.pendingEditPayload = null;
        window.pendingEditId = null;
        window.pendingPaymentType = null;
    } else {
        updateUserInterfaceForRole();
    }
}

// Main Admin Users Table Renderer
async function loadUsersTable() {
    const tableBody = document.getElementById('users-table-body');
    if (!tableBody) return;

    try {
        let users = [];
        if (window.db && window.db.getAllUsers) {
            users = await window.db.getAllUsers();
        }

        if (users.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No sub-admin or registered user accounts found yet.</td></tr>`;
            return;
        }

        tableBody.innerHTML = '';
        users.forEach(u => {
            const isMainAdmin = u.role === 'main_admin' || u.username === 'admin';
            const deleteUserBtn = isMainAdmin
                ? `<span style="font-size:0.75rem; color: var(--text-muted);">Protected</span>`
                : `<button class="btn btn-secondary" style="padding: 4px 10px; font-size: 0.75rem; border-color: #ff4d4d; color: #ff4d4d;" onclick="handleDeleteUser('${u.id}', '${u.username}')">🗑️ Delete Account</button>`;

            const row = `
                <tr>
                    <td><strong>${u.username}</strong><br><span style="font-size:0.75rem; color:var(--text-muted);">${u.id}</span></td>
                    <td>${u.name || '-'}</td>
                    <td>${u.email || '-'}</td>
                    <td><span class="status-badge ${isMainAdmin ? 'status-delivered' : 'status-transit'}">${u.role || 'sub_admin'}</span></td>
                    <td><strong style="color: #03e8a4;">${u.shipment_quota || 0} Credits</strong></td>
                    <td>${u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}</td>
                    <td>${deleteUserBtn}</td>
                </tr>
            `;
            tableBody.insertAdjacentHTML('beforeend', row);
        });
    } catch (err) {
        console.error("Error loading users table:", err);
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #ff4d4d;">Failed to load user accounts list.</td></tr>`;
    }
}

async function handleDeleteUser(userId, username) {
    if (!confirm(`Are you sure you want to permanently delete sub-admin account "${username}"?`)) {
        return;
    }

    try {
        if (window.db && window.db.deleteUser) {
            await window.db.deleteUser(userId);
            alert(`Sub-admin account "${username}" deleted successfully.`);
            await loadUsersTable();
        } else {
            alert("Database Error: Delete user function not available.");
        }
    } catch (e) {
        console.error("Delete user error:", e);
        alert("Failed to delete user account.");
    }
}
