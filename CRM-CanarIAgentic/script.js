/**
 * CRM-CanarIAgentic - Main JavaScript Logic
 */

// --- Estado Global ---
let clients = [];
let isAuth = false;
let sessionActive = false;
const PASS_KEY = 'crm_password';
const CLIENTS_KEY = 'crm_clients';
const SESSION_KEY = 'crm_session';

// --- Elementos DOM ---
const authView = document.getElementById('auth-view');
const crmView = document.getElementById('crm-view');
const authForm = document.getElementById('auth-form');
const authPass = document.getElementById('auth-pass');
const authPassConfirm = document.getElementById('auth-pass-confirm');
const authSetupGroup = document.getElementById('auth-setup-group');
const authBtn = document.getElementById('auth-btn');
const authTitle = document.getElementById('auth-title');
const authDesc = document.getElementById('auth-desc');
const authError = document.getElementById('auth-error');

const clientModal = document.getElementById('client-modal');
const clientForm = document.getElementById('client-form');
const clientsList = document.getElementById('clients-list');
const searchInput = document.getElementById('search-input');
const filterStatus = document.getElementById('filter-status');

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    loadClients();
    renderClients();
    updateStats();
    setupDragAndDrop();
});

// --- Autenticación ---

function checkAuthStatus() {
    const savedPass = localStorage.getItem(PASS_KEY);
    const session = sessionStorage.getItem(SESSION_KEY);

    if (!savedPass) {
        // Primera vez: Configurar contraseña
        authTitle.textContent = "Bienvenido";
        authDesc.textContent = "Crea una contraseña maestra para tu CRM.";
        authSetupGroup.classList.remove('hidden');
        authPassConfirm.required = true;
        authBtn.textContent = "Guardar y Entrar";
        showView('auth');
    } else if (session === 'active') {
        showView('crm');
    } else {
        showView('auth');
    }
}

function showView(view) {
    authView.classList.add('hidden');
    crmView.classList.add('hidden');
    if (view === 'auth') authView.classList.remove('hidden');
    if (view === 'crm') crmView.classList.remove('hidden');
}

authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pass = authPass.value;
    const savedPass = localStorage.getItem(PASS_KEY);

    if (!savedPass) {
        // Guardar nueva contraseña
        const confirmPass = authPassConfirm.value;
        if (pass !== confirmPass) {
            authError.textContent = "Las contraseñas no coinciden.";
            return;
        }
        localStorage.setItem(PASS_KEY, btoa(pass)); // Simple base64 encoding
        startSession();
    } else {
        // Verificar contraseña
        if (btoa(pass) === savedPass) {
            startSession();
        } else {
            authError.textContent = "Contraseña incorrecta.";
            authPass.value = '';
        }
    }
});

function startSession() {
    sessionStorage.setItem(SESSION_KEY, 'active');
    authError.textContent = "";
    authPass.value = "";
    authPassConfirm.value = "";
    showView('crm');
}

document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
});

// --- Gestión de Clientes ---

function loadClients() {
    const stored = localStorage.getItem(CLIENTS_KEY);
    clients = stored ? JSON.parse(stored) : [];
}

function saveClients() {
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
    updateStats();
}

function renderClients() {
    const searchTerm = searchInput.value.toLowerCase();
    const statusFilter = filterStatus.value;

    const filtered = clients.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm) || 
                              (c.company && c.company.toLowerCase().includes(searchTerm));
        const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    clientsList.innerHTML = '';
    
    if (filtered.length === 0) {
        clientsList.innerHTML = '<div class="no-results">No se encontraron clientes.</div>';
    }

    filtered.forEach(client => {
        const card = document.createElement('div');
        card.className = 'client-card';
        card.draggable = true;
        card.dataset.id = client.id;
        card.innerHTML = `
            <div class="client-actions">
                <button onclick="editClient('${client.id}')" class="icon-btn">✎</button>
                <button onclick="deleteClient('${client.id}')" class="icon-btn delete-btn">✖</button>
            </div>
            <h3>${client.name}</h3>
            ${client.company ? `<div class="client-company">${client.company}</div>` : ''}
            <div class="client-info">📧 ${client.email || '-'}</div>
            <div class="client-info">📱 ${client.whatsapp || '-'}</div>
            <div class="client-status-tag status-${client.status.toLowerCase()}">${client.status}</div>
        `;
        
        card.addEventListener('dragstart', handleDragStart);
        clientsList.appendChild(card);
    });
}

// Stats Update
function updateStats() {
    document.getElementById('count-total').textContent = clients.length;
    ['Nuevo', 'Contactado', 'Propuesta', 'Cerrado'].forEach(status => {
        const count = clients.filter(c => c.status === status).length;
        document.getElementById(`count-${status.toLowerCase()}`).textContent = count;
    });
}

// Modal handling
document.getElementById('add-client-btn').addEventListener('click', () => {
    document.getElementById('modal-title').textContent = "Añadir Nuevo Cliente";
    clientForm.reset();
    document.getElementById('client-id').value = '';
    clientModal.classList.remove('hidden');
});

document.getElementById('cancel-modal').addEventListener('click', () => {
    clientModal.classList.add('hidden');
});

clientForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('client-id').value;
    const clientData = {
        id: id || Date.now().toString(),
        name: document.getElementById('client-name').value,
        email: document.getElementById('client-email').value,
        whatsapp: document.getElementById('client-whatsapp').value,
        company: document.getElementById('client-company').value,
        status: document.getElementById('client-status').value,
        notes: document.getElementById('client-notes').value
    };

    if (id) {
        const index = clients.findIndex(c => c.id === id);
        clients[index] = clientData;
    } else {
        clients.push(clientData);
    }

    saveClients();
    renderClients();
    clientModal.classList.add('hidden');
});

function editClient(id) {
    const client = clients.find(c => c.id === id);
    if (!client) return;

    document.getElementById('modal-title').textContent = "Editar Cliente";
    document.getElementById('client-id').value = client.id;
    document.getElementById('client-name').value = client.name;
    document.getElementById('client-email').value = client.email;
    document.getElementById('client-whatsapp').value = client.whatsapp;
    document.getElementById('client-company').value = client.company;
    document.getElementById('client-status').value = client.status;
    document.getElementById('client-notes').value = client.notes;

    clientModal.classList.remove('hidden');
}

function deleteClient(id) {
    if (confirm('¿Estás seguro de que deseas eliminar este cliente?')) {
        clients = clients.filter(c => c.id !== id);
        saveClients();
        renderClients();
    }
}

// --- Búsqueda y Filtros ---
searchInput.addEventListener('input', renderClients);
filterStatus.addEventListener('change', renderClients);

// --- Cambio de Contraseña ---
document.getElementById('change-pass-btn').addEventListener('click', () => {
    document.getElementById('password-modal').classList.remove('hidden');
});

document.getElementById('cancel-pass-modal').addEventListener('click', () => {
    document.getElementById('password-modal').classList.add('hidden');
});

document.getElementById('password-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const oldPass = document.getElementById('old-pass').value;
    const newPass = document.getElementById('new-pass').value;
    const savedPass = localStorage.getItem(PASS_KEY);

    if (btoa(oldPass) === savedPass) {
        localStorage.setItem(PASS_KEY, btoa(newPass));
        alert("Contraseña actualizada correctamente.");
        document.getElementById('password-modal').classList.add('hidden');
        document.getElementById('password-form').reset();
    } else {
        document.getElementById('pass-error').textContent = "Contraseña actual incorrecta.";
    }
});

// --- Import / Export ---
document.getElementById('export-btn').addEventListener('click', () => {
    const dataStr = JSON.stringify(clients, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `crm_export_${new Date().toISOString().slice(0,10)}.json`;
    link.click();
});

document.getElementById('import-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const imported = JSON.parse(event.target.result);
            if (Array.isArray(imported)) {
                if (confirm('¿Deseas sobreescribir los clientes actuales con los importados?')) {
                    clients = imported;
                    saveClients();
                    renderClients();
                    alert("Importación exitosa.");
                }
            } else {
                alert("Formato de archivo inválido.");
            }
        } catch (err) {
            alert("Error al leer el archivo.");
        }
    };
    reader.readAsText(file);
});

// --- Drag and Drop ---
let draggedId = null;

function handleDragStart(e) {
    draggedId = e.target.dataset.id;
    e.dataTransfer.setData('text/plain', draggedId);
    e.target.style.opacity = '0.5';
}

function setupDragAndDrop() {
    const statCards = document.querySelectorAll('.stat-card');
    
    statCards.forEach(card => {
        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            card.style.transform = 'scale(1.05)';
        });

        card.addEventListener('dragleave', () => {
            card.style.transform = 'scale(1)';
        });

        card.addEventListener('drop', (e) => {
            e.preventDefault();
            card.style.transform = 'scale(1)';
            const newStatus = card.dataset.status;
            
            if (newStatus && newStatus !== 'total') {
                const clientIndex = clients.findIndex(c => c.id === draggedId);
                if (clientIndex !== -1) {
                    clients[clientIndex].status = newStatus;
                    saveClients();
                    renderClients();
                }
            }
        });
    });

    // Restaurar opacidad al terminar
    document.addEventListener('dragend', (e) => {
        if (e.target.classList.contains('client-card')) {
            e.target.style.opacity = '1';
        }
    });
}
