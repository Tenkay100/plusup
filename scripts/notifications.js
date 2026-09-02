/**
 * Live Activity and Review Notifications
 */
const liveUpdates = [
    { type: 'update', icon: '📦', title: 'Live Update', text: 'Shipment departed Germany' },
    { type: 'update', icon: '📦', title: 'Live Update', text: 'Package arrived in Canada' },
    { type: 'update', icon: '📦', title: 'Live Update', text: 'Customs cleared in Japan' },
    { type: 'review', icon: '⭐', title: 'New Review', text: '"Excellent tracking accuracy!" - Michael T.' },
    { type: 'review', icon: '⭐', title: 'New Review', text: '"Very fast ocean freight times." - Sarah L.' },
    { type: 'review', icon: '⭐', title: 'New Review', text: '"Great live support team!" - David W.' }
];

function showNotification() {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const randomUpdate = liveUpdates[Math.floor(Math.random() * liveUpdates.length)];
    
    const toast = document.createElement('div');
    toast.className = 'toast toast-enter';
    toast.innerHTML = `
        <div style="font-size: 1.2rem;">${randomUpdate.icon}</div>
        <div>
            <strong>${randomUpdate.title}</strong>
            <p style="margin: 0; color: var(--text-muted); font-size: 0.8rem;">${randomUpdate.text}</p>
        </div>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.className = 'toast toast-exit';
        setTimeout(() => {
            if (toastContainer.contains(toast)) {
                toastContainer.removeChild(toast);
            }
        }, 400);
    }, 5000);
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if(document.getElementById('toast-container')){
            setTimeout(showNotification, 3000);
            setInterval(showNotification, 10000); // Popup every 10 seconds
        }
    }, 1000);
});
