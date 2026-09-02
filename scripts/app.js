document.addEventListener('DOMContentLoaded', () => {
    loadComponents();
    initCounters();
    initChatWidget();
});

// Load Navbar and Footer Dynamically using basic JS
async function loadComponents() {
    try {
        const navContainer = document.getElementById('navbar-container');
        if (navContainer) {
            const navResponse = await fetch('components/navbar.html');
            if (navResponse.ok) {
                navContainer.innerHTML = await navResponse.text();
                initMobileMenu();
            }
        }

        const footContainer = document.getElementById('footer-container');
        if (footContainer) {
            const footResponse = await fetch('components/footer.html');
            if (footResponse.ok) {
                footContainer.innerHTML = await footResponse.text();
                initChatWidget(); // Re-init chat widget since it's injected via footer
            }
        }
    } catch (e) {
        console.log("Component loading skipped or failed.");
    }
}

// Mobile Menu
function initMobileMenu() {
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.getElementById('nav-links');

    if (mobileBtn && navLinks) {
        mobileBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Scroll effect
    window.addEventListener('scroll', () => {
        const navbar = document.getElementById('navbar');
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
    });
}

// Stats Counter Animation
function initCounters() {
    const counters = document.querySelectorAll('.counter');
    const speed = 200;

    const animateCounters = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = +counter.getAttribute('data-target');
                let count = 0;

                const updateCount = () => {
                    const inc = target / speed;
                    if (count < target) {
                        count += Math.ceil(inc);
                        counter.innerText = count;
                        setTimeout(updateCount, 20);
                    } else {
                        counter.innerText = target;
                    }
                };
                updateCount();
                observer.unobserve(counter);
            }
        });
    };

    const counterObserver = new IntersectionObserver(animateCounters, { threshold: 0.5 });
    counters.forEach(counter => {
        counterObserver.observe(counter);
    });
}

// Chat Widget Logic
function initChatWidget() {
    const chatBtn = document.getElementById('chat-btn');
    const chatWindow = document.getElementById('chat-window');
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');
    const chatBody = document.getElementById('chat-body');
    const chatClose = document.getElementById('chat-close-btn');

    if (!chatBtn || !chatWindow) return;

    // Open / close via main button
    chatBtn.addEventListener('click', () => {
        chatWindow.classList.toggle('active');
        if (chatWindow.classList.contains('active') && chatInput) {
            chatInput.focus();
        }
    });

    // Close via X button
    if (chatClose) {
        chatClose.addEventListener('click', (e) => {
            e.stopPropagation();
            chatWindow.classList.remove('active');
        });
    }

    // Helper: add a message bubble
    const addMessage = (html, sender) => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${sender} fade-in`;
        msgDiv.innerHTML = html;
        chatBody.appendChild(msgDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    };

    // Helper: typing indicator
    const showTyping = () => {
        const el = document.createElement('div');
        el.className = 'chat-msg bot fade-in';
        el.id = 'chat-typing';
        el.innerHTML = '<span style="opacity:0.6">● ● ●</span>';
        chatBody.appendChild(el);
        chatBody.scrollTop = chatBody.scrollHeight;
    };
    const hideTyping = () => {
        const el = document.getElementById('chat-typing');
        if (el) el.remove();
    };

    // Detect AC-XXXXXXXX tracking number pattern
    const extractTracking = (text) => {
        const match = text.toUpperCase().match(/AC-\d{5,10}/);
        return match ? match[0] : null;
    };

    // Format a shipment response
    const formatShipmentReply = (s) => {
        const delivery = s.estimated_delivery_date
            ? new Date(s.estimated_delivery_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
            : 'Not set';
        const desc = s.package_details ? `<br>📦 <em>${s.package_details}</em>` : '';
        return `📍 <strong>${s.tracking_number}</strong><br>
Status: <strong>${s.status}</strong><br>
Route: ${s.origin_country || '–'} → ${s.destination_country || '–'}<br>
Est. Delivery: ${delivery}<br>
Progress: ${s.progress_percentage || 0}%${desc}`;
    };

    // Main send handler
    const handleSend = async () => {
        if (!chatInput) return;
        const text = chatInput.value.trim();
        if (!text) return;

        addMessage(text, 'user');
        chatInput.value = '';
        showTyping();

        const lowerText = text.toLowerCase();
        const trackingNum = extractTracking(text);

        // Short delay to simulate thinking
        await new Promise(r => setTimeout(r, 700));
        hideTyping();

        // --- Tracking number lookup ---
        if (trackingNum) {
            try {
                if (window.db && window.db.getShipment) {
                    const shipment = await window.db.getShipment(trackingNum);
                    if (shipment) {
                        addMessage(formatShipmentReply(shipment), 'bot');
                    } else {
                        addMessage(`❌ No shipment found for <strong>${trackingNum}</strong>. Please double-check the number and try again.`, 'bot');
                    }
                } else {
                    addMessage(`🔍 Tracking number <strong>${trackingNum}</strong> detected! Please visit the <a href="track.html?number=${trackingNum}" style="color:var(--primary-color)">Track page</a> to view full details.`, 'bot');
                }
            } catch (err) {
                addMessage(`⚠️ Couldn't fetch tracking info right now. Please try the <a href="track.html?number=${trackingNum}" style="color:var(--primary-color)">Track page</a>.`, 'bot');
            }
            return;
        }

        // --- Keyword responses ---
        let response = "I'm not sure about that. You can ask me about a shipment (type your tracking number like <strong>AC-XXXXXXXX</strong>), our services, or contact.";

        if (lowerText.includes('hello') || lowerText.includes('hi') || lowerText.includes('hey')) {
            response = "👋 Hello! How can I help you today? You can ask about a shipment, our services, or support.";
        } else if (lowerText.includes('track') || lowerText.includes('where') || lowerText.includes('shipment') || lowerText.includes('package')) {
            response = "To track a shipment, just type your tracking number (e.g. <strong>AC-12345678</strong>) right here, or visit our <a href='track.html' style='color:var(--primary-color)'>Track page</a>.";
        } else if (lowerText.includes('service') || lowerText.includes('offer') || lowerText.includes('what do')) {
            response = "We offer three core services:<br>✈️ <strong>Air Freight</strong> — express global shipping<br>🚢 <strong>Ocean Freight</strong> — cost-effective bulk cargo<br>🏭 <strong>Warehousing</strong> — secure storage with tracking";
        } else if (lowerText.includes('contact') || lowerText.includes('support') || lowerText.includes('email') || lowerText.includes('help')) {
            response = "📧 Reach our support team at <strong>support@aquacargo.com</strong> and we'll get back to you shortly.";
        } else if (lowerText.includes('price') || lowerText.includes('cost') || lowerText.includes('rate') || lowerText.includes('quote')) {
            response = "Shipping costs depend on weight, dimensions, and destination. Please email <strong>support@aquacargo.com</strong> for a custom quote.";
        } else if (lowerText.includes('deliver') || lowerText.includes('how long') || lowerText.includes('time')) {
            response = "Delivery times vary by service:<br>✈️ Air Freight: 1–5 business days<br>🚢 Ocean Freight: 10–40 days<br>For exact dates, check your tracking number.";
        }

        addMessage(response, 'bot');
    };

    if (chatSend) chatSend.addEventListener('click', handleSend);
    if (chatInput) chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });
}
