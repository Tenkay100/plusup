// Aqua Cargo - Firebase Integration

const firebaseConfig = {
    apiKey: "AIzaSyByElWzz0pAO7fupmBJOb87yLDiQ00mquw",
    authDomain: "aquacargo-bf04a.firebaseapp.com",
    projectId: "aquacargo-bf04a",
    storageBucket: "aquacargo-bf04a.firebasestorage.app",
    messagingSenderId: "508443071219",
    appId: "1:508443071219:web:8f1c903dc31be214ae5d86"
};

// Initialize Firebase if not already initialized
if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
} else {
    console.error("Firebase SDK not loaded. Please ensure Firebase CDNs are included in the HTML.");
}

const firestoreDb = typeof firebase !== 'undefined' ? firebase.firestore() : null;

// ----------------------
// Local Storage Fallback
// ----------------------
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function getLocalShipments() {
    try {
        const s = localStorage.getItem('aqua_shipments');
        if (!s) {
            const defaultShipments = [
                {
                    id: "sample-shipment-1",
                    tracking_number: "AC-12345678",
                    status: "In Transit",
                    status_description: "Package departed container sorting terminal.",
                    origin_country: "China",
                    destination_country: "Ghana",
                    sender_details: "Guangzhou Logistics Hub, China",
                    receiver_details: "Accra Ocean Freight Depot, Ghana",
                    weight_kg: 450,
                    dimensions: "120 x 80 x 100 cm",
                    estimated_delivery_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                    package_details: "General Goods & Spare Parts",
                    customer_name: "John Mensah",
                    receiver_name: "Kwame Boateng",
                    receiver_email: "kwame@example.com",
                    container_number: "CONT-984210",
                    seal_number: "SEAL-44812",
                    vessel_name: "MSC VALERIA",
                    freight_charges: 1200,
                    payment_terms: "PREPAID",
                    progress_percentage: 65,
                    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
                }
            ];
            localStorage.setItem('aqua_shipments', JSON.stringify(defaultShipments));
            return defaultShipments;
        }
        const parsed = JSON.parse(s);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function setLocalShipments(data) {
    localStorage.setItem('aqua_shipments', JSON.stringify(data));
}

function getLocalHistory() {
    try {
        const h = localStorage.getItem('aqua_history');
        const parsed = h ? JSON.parse(h) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function setLocalHistory(data) {
    localStorage.setItem('aqua_history', JSON.stringify(data));
}

function getLocalUsers() {
    try {
        const u = localStorage.getItem('aqua_users');
        const parsed = u ? JSON.parse(u) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function setLocalUsers(data) {
    localStorage.setItem('aqua_users', JSON.stringify(data));
}

// User & Auth DB helpers
async function registerUser(username, password, name = '', email = '') {
    const cleanUsername = username.toLowerCase().trim();
    const newUser = {
        id: uuidv4(),
        username: cleanUsername,
        password: password,
        name: name || username,
        email: email || '',
        role: 'sub_admin',
        shipment_quota: 0,
        created_at: new Date().toISOString()
    };

    const localFallback = () => {
        let users = getLocalUsers();
        if (users.find(u => u.username === cleanUsername)) {
            throw new Error('Username already exists. Please choose another.');
        }
        users.push(newUser);
        setLocalUsers(users);
        return newUser;
    };

    if (!firestoreDb) return localFallback();

    try {
        const userRef = firestoreDb.collection('users');
        const existing = await userRef.where('username', '==', cleanUsername).get();
        if (!existing.empty) {
            throw new Error('Username already exists.');
        }
        const docRef = await userRef.add(newUser);

        // Also sync to local storage to guarantee seamless offline & instant login fallback
        let users = getLocalUsers();
        if (!users.find(u => u.username === cleanUsername)) {
            users.push({ id: docRef.id, ...newUser });
            setLocalUsers(users);
        }

        return { id: docRef.id, ...newUser };
    } catch (err) {
        if (err.message.includes('already exists')) throw err;
        console.error("Firestore user creation fallback to localStorage", err);
        return localFallback();
    }
}

async function authenticateUser(username, password) {
    const cleanUser = username.toLowerCase().trim();

    // Default main admin credentials check
    if (cleanUser === 'admin' && password === 'AquaCargo2026!') {
        return {
            id: 'main-admin-id',
            username: 'admin',
            name: 'Main Administrator',
            role: 'main_admin',
            shipment_quota: 999999
        };
    }

    const check7DayExpiry = (user) => {
        if (user.role === 'main_admin') return user;
        const shipmentsCreated = user.shipments_created_count || 0;
        const quota = user.shipment_quota || 0;
        const createdAt = new Date(user.created_at || Date.now());
        const now = new Date();
        const diffDays = (now - createdAt) / (1000 * 60 * 60 * 24);

        if (diffDays >= 7 && shipmentsCreated === 0 && quota === 0) {
            throw new Error('Account Expired: This sub-admin account was created over 7 days ago without any active paid shipments or quota. Please create a new account.');
        }
        return user;
    };

    const localFallback = () => {
        const users = getLocalUsers();
        const user = users.find(u => u.username.toLowerCase().trim() === cleanUser && u.password === password);
        if (user) {
            const { password, ...userWithoutPass } = user;
            return check7DayExpiry(userWithoutPass);
        }
        return null;
    };

    if (!firestoreDb) return localFallback();

    try {
        const userRef = firestoreDb.collection('users');
        const snapshot = await userRef.where('username', '==', cleanUser).where('password', '==', password).get();
        if (snapshot.empty) {
            return localFallback();
        }
        const doc = snapshot.docs[0];
        const data = doc.data();
        delete data.password;
        return check7DayExpiry({ id: doc.id, ...data });
    } catch (err) {
        if (err.message.includes('Account Expired')) throw err;
        console.error("Firestore auth error, attempting local fallback", err);
        return localFallback();
    }
}

async function getAllUsers() {
    const localFallback = () => getLocalUsers().map(u => {
        const { password, ...rest } = u;
        return rest;
    });

    if (!firestoreDb) return localFallback();

    try {
        const userRef = firestoreDb.collection('users');
        const snapshot = await userRef.get();
        return snapshot.docs.map(doc => {
            const data = doc.data();
            delete data.password;
            return { id: doc.id, ...data };
        });
    } catch (err) {
        return localFallback();
    }
}

async function updateUserQuota(userId, newQuota) {
    const localFallback = () => {
        let users = getLocalUsers();
        let u = users.find(x => x.id === userId);
        if (u) {
            u.shipment_quota = newQuota;
            setLocalUsers(users);
            return u;
        }
        return null;
    };

    if (!firestoreDb || userId === 'main-admin-id') return localFallback();

    try {
        await firestoreDb.collection('users').doc(userId).update({ shipment_quota: newQuota });
        return true;
    } catch (err) {
        return localFallback();
    }
}

// ----------------------
// Tracker API Methods (Firestore)
// ----------------------

async function processAutomatedRouting(shipmentData) {
    if (!shipmentData.automated_routes || shipmentData.automated_routes.length === 0) return shipmentData;
    if (shipmentData.is_routing_paused) return shipmentData;
    if (!shipmentData.next_automated_update) return shipmentData;
    
    let nextUpdate = new Date(shipmentData.next_automated_update);
    let now = new Date();
    
    if (now >= nextUpdate) {
        let diffMs = now - nextUpdate;
        let intervalsPassed = Math.floor(diffMs / (48 * 60 * 60 * 1000)) + 1; 
        
        let newIndex = shipmentData.current_route_index || 0;
        let historyUpdates = [];
        let routes = shipmentData.automated_routes;
        let finalStatus = shipmentData.status;
        
        for (let i = 0; i < intervalsPassed; i++) {
            if (newIndex < routes.length - 1) {
                newIndex++;
                let status = "Arrived at Facility";
                
                if (newIndex === routes.length - 1) {
                    status = "Delivered";
                }
                
                finalStatus = status;
                
                historyUpdates.push({
                    shipment_id: shipmentData.id,
                    location: routes[newIndex],
                    status: status,
                    description: "Routing update",
                    update_date: new Date(nextUpdate.getTime() + (i * 48 * 60 * 60 * 1000)).toISOString()
                });
                
                if (newIndex === routes.length - 1) break; 
            } else {
                break;
            }
        }
        
        if (newIndex !== shipmentData.current_route_index) {
            const newNextUpdate = new Date(nextUpdate.getTime() + (intervalsPassed * 48 * 60 * 60 * 1000)).toISOString();
            
            const updatePayload = {
                current_route_index: newIndex,
                next_automated_update: newNextUpdate,
                status: finalStatus,
                progress_percentage: newIndex === routes.length - 1 ? 100 : Math.min(90, (newIndex / routes.length) * 100)
            };
            
            if (typeof firestoreDb !== 'undefined' && firestoreDb) {
                try {
                    await firestoreDb.collection('shipments').doc(shipmentData.id).update(updatePayload);
                    
                    const batch = firestoreDb.batch();
                    const historyRef = firestoreDb.collection('shipment_history');
                    historyUpdates.forEach(hu => {
                        const newDoc = historyRef.doc();
                        batch.set(newDoc, hu);
                        if(!shipmentData.shipment_history) shipmentData.shipment_history = [];
                        shipmentData.shipment_history.push({ id: newDoc.id, ...hu });
                    });
                    await batch.commit();
                    
                    Object.assign(shipmentData, updatePayload);
                } catch(e) {
                    console.error("Failed automated route update", e);
                }
            } else {
                 Object.assign(shipmentData, updatePayload);
                 let localShipments = getLocalShipments();
                 let idx = localShipments.findIndex(x => x.id === shipmentData.id);
                 if(idx !== -1) {
                     localShipments[idx] = shipmentData;
                     setLocalShipments(localShipments);
                 }
                 let localHistory = getLocalHistory();
                 historyUpdates.forEach(hu => {
                     hu.id = uuidv4();
                     localHistory.push(hu);
                     if(!shipmentData.shipment_history) shipmentData.shipment_history = [];
                     shipmentData.shipment_history.push(hu);
                 });
                 setLocalHistory(localHistory);
            }
        }
    }
    
    return shipmentData;
}

async function getShipment(trackingNumber) {
    if (!trackingNumber) return null;
    const cleanTracking = trackingNumber.trim().toUpperCase();

    // 1. Check local storage first for instantaneous, reliable lookup
    let localShipment = getLocalShipments().find(x => (x.tracking_number || '').trim().toUpperCase() === cleanTracking);
    if (localShipment) {
        const cleanHistoryDesc = (h) => {
            if (!h) return h;
            if (h.description) {
                if (h.description.toLowerCase().includes('automated routing update')) {
                    h.description = 'Routing update';
                } else if (h.description.toLowerCase().includes('status updated to') || h.description.toLowerCase().includes('via admin dashboard quick control')) {
                    const st = (h.status || '').toLowerCase();
                    h.description = `Routing update via ${st}`;
                }
            }
            return h;
        };
        localShipment.shipment_history = (getLocalHistory().filter(h => h.shipment_id === localShipment.id)).map(cleanHistoryDesc);
        return await processAutomatedRouting(localShipment);
    }

    // 2. If not found in local storage, query Firestore
    if (!firestoreDb) return null;

    try {
        const shipmentsRef = firestoreDb.collection('shipments');
        let querySnapshot = await shipmentsRef.where('tracking_number', '==', cleanTracking).get();
        
        if (querySnapshot.empty) {
            querySnapshot = await shipmentsRef.where('tracking_number', '==', trackingNumber.trim()).get();
        }

        if (querySnapshot.empty) {
            // Also attempt searching all documents in case of tracking number capitalization difference in DB
            const allSnap = await shipmentsRef.get();
            const foundDoc = allSnap.docs.find(d => {
                const tn = (d.data().tracking_number || '').trim().toUpperCase();
                return tn === cleanTracking;
            });
            if (foundDoc) {
                const shipmentData = { id: foundDoc.id, ...foundDoc.data() };
                const historyRef = firestoreDb.collection('shipment_history');
                const historySnapshot = await historyRef.where('shipment_id', '==', shipmentData.id).get();
                shipmentData.shipment_history = historySnapshot.docs.map(hDoc => ({ id: hDoc.id, ...hDoc.data() }));
                
                // Save locally to cache
                const localList = getLocalShipments();
                if (!localList.find(x => x.tracking_number === shipmentData.tracking_number)) {
                    localList.push(shipmentData);
                    setLocalShipments(localList);
                }
                return await processAutomatedRouting(shipmentData);
            }
            return null;
        }
        
        const doc = querySnapshot.docs[0];
        const shipmentData = { id: doc.id, ...doc.data() };

        // Clean & format history descriptions to match new standards
        const cleanHistoryDesc = (h) => {
            if (!h) return h;
            if (h.description) {
                if (h.description.toLowerCase().includes('automated routing update')) {
                    h.description = 'Routing update';
                } else if (h.description.toLowerCase().includes('status updated to') || h.description.toLowerCase().includes('via admin dashboard quick control')) {
                    const st = (h.status || '').toLowerCase();
                    h.description = `Routing update via ${st}`;
                }
            }
            return h;
        };

        // Fetch history
        const historyRef = firestoreDb.collection('shipment_history');
        const historySnapshot = await historyRef.where('shipment_id', '==', shipmentData.id).get();

        const rawHistory = historySnapshot.docs.map(hDoc => ({ id: hDoc.id, ...hDoc.data() }));
        const localHist = getLocalHistory().filter(h => h.shipment_id === shipmentData.id || h.shipment_id === doc.id);
        
        // Merge history by ID
        const hMap = new Map();
        localHist.forEach(h => hMap.set(h.id, cleanHistoryDesc(h)));
        rawHistory.forEach(h => hMap.set(h.id, cleanHistoryDesc(h)));
        
        shipmentData.shipment_history = Array.from(hMap.values());

        // Cache into local storage
        const localList = getLocalShipments();
        if (!localList.find(x => x.tracking_number === shipmentData.tracking_number)) {
            localList.push(shipmentData);
            setLocalShipments(localList);
        }
        
        return await processAutomatedRouting(shipmentData);
    } catch (err) {
        console.error("Error fetching shipment from Firebase:", err);
        return null;
    }
}

async function getAllShipments() {
    const localFallback = async () => {
        let shipments = getLocalShipments().sort((a, b) => new Date(b.created_at || Date.now()) - new Date(a.created_at || Date.now()));
        for (let i=0; i<shipments.length; i++) {
            shipments[i] = await processAutomatedRouting(shipments[i]);
        }
        return shipments;
    };

    if (!firestoreDb) return localFallback();
    
    try {
        const shipmentsRef = firestoreDb.collection('shipments');
        const querySnapshot = await shipmentsRef.get();
        
        let remoteDocs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        let localDocs = getLocalShipments();
        
        // Merge remote and local shipments by ID or tracking number to guarantee old local shipments are always present
        const mergedMap = new Map();
        localDocs.forEach(s => {
            if (s && (s.id || s.tracking_number)) {
                mergedMap.set(s.tracking_number || s.id, s);
            }
        });
        remoteDocs.forEach(s => {
            if (s && (s.id || s.tracking_number)) {
                mergedMap.set(s.tracking_number || s.id, s);
            }
        });

        let docs = Array.from(mergedMap.values()).sort((a, b) => new Date(b.created_at || Date.now()) - new Date(a.created_at || Date.now()));

        for (let i=0; i<docs.length; i++) {
            docs[i] = await processAutomatedRouting(docs[i]);
        }
        return docs;
    } catch (err) {
        console.error("Error fetching all shipments from Firebase, using local fallback", err);
        return localFallback();
    }
}

async function createShipment(shipmentData) {
    const fallbackId = uuidv4();
    shipmentData.created_at = shipmentData.created_at || new Date().toISOString();

    const localSave = (id) => {
        shipmentData.id = id || fallbackId;
        const shipments = getLocalShipments();
        const existingIdx = shipments.findIndex(x => x.tracking_number === shipmentData.tracking_number);
        if (existingIdx !== -1) {
            shipments[existingIdx] = shipmentData;
        } else {
            shipments.push(shipmentData);
        }
        setLocalShipments(shipments);
        return shipmentData;
    };

    if (!firestoreDb) return localSave();
    
    try {
        const shipmentsRef = firestoreDb.collection('shipments');
        const docRef = await shipmentsRef.add(shipmentData);
        const saved = { id: docRef.id, ...shipmentData };
        localSave(docRef.id);
        return saved;
    } catch (err) {
        console.error("Error creating shipment in Firebase, using local fallback", err);
        return localSave();
    }
}

async function updateShipment(shipmentId, updateData) {
    const localFallback = () => {
        const shipments = getLocalShipments();
        const idx = shipments.findIndex(x => x.id === shipmentId);
        if (idx !== -1) {
            shipments[idx] = { ...shipments[idx], ...updateData };
            setLocalShipments(shipments);
            return shipments[idx];
        }
        return null;
    };

    if (!firestoreDb) return localFallback();
    
    try {
        const docRef = firestoreDb.collection('shipments').doc(shipmentId);
        await docRef.update(updateData);
        
        // Fetch the updated document to return it
        const docSnap = await docRef.get();
        return { id: docSnap.id, ...docSnap.data() };
    } catch (err) {
        console.error("Error updating shipment in Firebase, using local fallback", err);
        return localFallback();
    }
}

async function deleteShipment(shipmentId) {
    const localFallback = () => {
        let shipments = getLocalShipments();
        shipments = shipments.filter(x => x.id !== shipmentId);
        setLocalShipments(shipments);
        return true;
    };

    if (!firestoreDb) return localFallback();
    
    try {
        await firestoreDb.collection('shipments').doc(shipmentId).delete();
        
        // Also delete associated history
        const historyRef = firestoreDb.collection('shipment_history');
        const historySnapshot = await historyRef.where('shipment_id', '==', shipmentId).get();
        
        const batch = firestoreDb.batch();
        historySnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        
        return true;
    } catch (err) {
        console.error("Error deleting shipment in Firebase, using local fallback", err);
        return localFallback();
    }
}

async function addShipmentHistory(historyData) {
    historyData.update_date = historyData.update_date || new Date().toISOString();

    const localFallback = () => {
        historyData.id = uuidv4();
        const history = getLocalHistory();
        history.push(historyData);
        setLocalHistory(history);
        return historyData;
    };

    if (!firestoreDb) return localFallback();
    
    try {
        const historyRef = firestoreDb.collection('shipment_history');
        const docRef = await historyRef.add(historyData);
        return { id: docRef.id, ...historyData };
    } catch (err) {
        console.error("Error adding history in Firebase, using local fallback", err);
        return localFallback();
    }
}

async function updateShipmentHistory(historyId, updateData) {
    const localFallback = () => {
        let history = getLocalHistory();
        const idx = history.findIndex(x => x.id === historyId);
        if (idx !== -1) {
            history[idx] = { ...history[idx], ...updateData };
            setLocalHistory(history);
            return history[idx];
        }
        return null;
    };

    if (!firestoreDb) return localFallback();

    try {
        const docRef = firestoreDb.collection('shipment_history').doc(historyId);
        await docRef.update(updateData);
        const docSnap = await docRef.get();
        return { id: docSnap.id, ...docSnap.data() };
    } catch (err) {
        console.error("Error updating history in Firebase, using local fallback", err);
        return localFallback();
    }
}

async function deleteUser(userId) {
    const localFallback = () => {
        let users = getLocalUsers();
        users = users.filter(x => x.id !== userId);
        setLocalUsers(users);
        return true;
    };

    if (!firestoreDb || userId === 'main-admin-id') return localFallback();

    try {
        await firestoreDb.collection('users').doc(userId).delete();
        localFallback();
        return true;
    } catch (err) {
        console.error("Error deleting user in Firebase, using local fallback", err);
        return localFallback();
    }
}

// Export for module usage (if enabled), otherwise accessible in window
window.db = window.db || {
    getShipment,
    getAllShipments,
    createShipment,
    updateShipment,
    deleteShipment,
    addShipmentHistory,
    updateShipmentHistory,
    registerUser,
    authenticateUser,
    getAllUsers,
    updateUserQuota,
    deleteUser
};
