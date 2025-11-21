// API Base URL
const API_URL = '';

// Navigation
function showView(viewName) {
    // Hide all views
    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.remove('active');
    });

    // Show selected view
    const targetView = document.getElementById(`${viewName}-view`);
    if (targetView) {
        targetView.classList.add('active');
    }

    // Update active nav link styling
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // Add active class to current nav link
    const activeNavLink = document.getElementById(`nav-${viewName}`);
    if (activeNavLink) {
        activeNavLink.classList.add('active');
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Mobile menu toggle
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    mobileMenu.classList.toggle('hidden');
}

// Mobile menu button event
document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    }

    // Load initial data
    loadConfig();
    checkStatus();
    loadQR();

    // Auto-refresh status and QR
    setInterval(checkStatus, 5000);
    setInterval(loadQR, 3000);
});

// ==================== CONFIG FUNCTIONS ====================

// Load configuration
async function loadConfig() {
    try {
        const response = await fetch(`${API_URL}/config`);
        const config = await response.json();

        const numeroInput = document.getElementById('numero');
        const mensajeInput = document.getElementById('mensaje');

        if (numeroInput) numeroInput.value = config.numero_destino || '';
        if (mensajeInput) mensajeInput.value = config.mensaje || '';
    } catch (error) {
        console.error('Error cargando configuración:', error);
    }
}

// Save configuration
async function saveConfig() {
    const numero = document.getElementById('numero').value.trim();
    const mensaje = document.getElementById('mensaje').value.trim();
    const statusDiv = document.getElementById('config-status');

    if (!numero || !mensaje) {
        showStatusMessage(statusDiv, 'Por favor complete todos los campos', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                numero_destino: numero,
                mensaje: mensaje
            })
        });

        const result = await response.json();

        if (result.success) {
            showStatusMessage(statusDiv, '✅ Configuración guardada correctamente', 'success');
        } else {
            showStatusMessage(statusDiv, `❌ Error: ${result.error}`, 'error');
        }
    } catch (error) {
        showStatusMessage(statusDiv, `❌ Error de conexión: ${error.message}`, 'error');
    }
}

// ==================== STATUS FUNCTIONS ====================

// Check WhatsApp connection status
async function checkStatus() {
    try {
        const response = await fetch(`${API_URL}/status`);
        const data = await response.json();

        const statusBadge = document.getElementById('status-badge');
        const statusDot = document.getElementById('status-dot');
        const statusText = document.getElementById('status-text');

        if (data.connected) {
            if (statusBadge) statusBadge.className = 'px-6 py-3 rounded-full font-bold text-white flex items-center space-x-2 shadow-lg bg-green-600';
            if (statusDot) statusDot.className = 'w-3 h-3 rounded-full animate-pulse bg-white';
            if (statusText) statusText.textContent = 'Conectado ✅';
        } else {
            if (statusBadge) statusBadge.className = 'px-6 py-3 rounded-full font-bold text-white flex items-center space-x-2 shadow-lg bg-red-600';
            if (statusDot) statusDot.className = 'w-3 h-3 rounded-full animate-pulse bg-white';
            if (statusText) statusText.textContent = 'Desconectado ❌';
        }
    } catch (error) {
        console.error('Error verificando estado:', error);
        const statusBadge = document.getElementById('status-badge');
        const statusText = document.getElementById('status-text');
        if (statusBadge) statusBadge.className = 'px-6 py-3 rounded-full font-bold text-white flex items-center space-x-2 shadow-lg bg-gray-600';
        if (statusText) statusText.textContent = 'Error de conexión';
    }
}

// ==================== QR FUNCTIONS ====================

// Load QR code
async function loadQR() {
    try {
        const response = await fetch(`${API_URL}/qr`);
        const data = await response.json();

        const qrContainer = document.getElementById('qr-container');
        if (!qrContainer) return;

        if (data.connected) {
            qrContainer.innerHTML = `
                <div class="text-center">
                    <div class="text-8xl mb-4">✅</div>
                    <p class="text-2xl font-bold text-green-600 mb-2">WhatsApp Conectado</p>
                    <p class="text-gray-600">La sesión está activa y lista para enviar mensajes</p>
                </div>
            `;
        } else if (data.qr) {
            qrContainer.innerHTML = `
                <img src="${data.qr}" alt="Código QR de WhatsApp" class="max-w-full h-auto rounded-lg shadow-lg">
            `;
        } else {
            qrContainer.innerHTML = `
                <div class="text-center">
                    <div class="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-whatsapp-light mb-4"></div>
                    <p class="text-gray-600 font-semibold">Generando código QR...</p>
                    <p class="text-gray-500 text-sm mt-2">Esto puede tomar unos segundos</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error cargando QR:', error);
        const qrContainer = document.getElementById('qr-container');
        if (qrContainer) {
            qrContainer.innerHTML = `
                <div class="text-center">
                    <div class="text-6xl mb-4">❌</div>
                    <p class="text-xl font-bold text-red-600 mb-2">Error de Conexión</p>
                    <p class="text-gray-600">No se pudo conectar con el servidor</p>
                    <p class="text-gray-500 text-sm mt-2">Asegúrate de que el servidor esté corriendo</p>
                </div>
            `;
        }
    }
}

// ==================== TEST FUNCTIONS ====================

// Test microcontroller trigger
async function testMicrocontroller() {
    const statusDiv = document.getElementById('test-status');

    try {
        showStatusMessage(statusDiv, '⏳ Enviando mensaje de prueba...', 'info');

        const response = await fetch(`${API_URL}/event`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                trigger: true
            })
        });

        const result = await response.json();

        if (result.success) {
            showStatusMessage(statusDiv, `✅ ${result.message} (${result.numero})`, 'success');
        } else {
            showStatusMessage(statusDiv, `❌ Error: ${result.error}`, 'error');
        }
    } catch (error) {
        showStatusMessage(statusDiv, `❌ Error de conexión: ${error.message}`, 'error');
    }
}

// ==================== UTILITY FUNCTIONS ====================

// Show status message with Tailwind styling
function showStatusMessage(element, message, type) {
    if (!element) return;

    element.textContent = message;
    element.classList.remove('hidden');

    // Remove all type classes
    element.classList.remove('bg-green-100', 'text-green-800', 'border-green-300');
    element.classList.remove('bg-red-100', 'text-red-800', 'border-red-300');
    element.classList.remove('bg-blue-100', 'text-blue-800', 'border-blue-300');

    // Add base classes
    element.className = 'px-4 py-3 rounded-lg border-2 font-semibold';

    // Add type-specific classes
    if (type === 'success') {
        element.classList.add('bg-green-100', 'text-green-800', 'border-green-300');
    } else if (type === 'error') {
        element.classList.add('bg-red-100', 'text-red-800', 'border-red-300');
    } else if (type === 'info') {
        element.classList.add('bg-blue-100', 'text-blue-800', 'border-blue-300');
    }

    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            element.classList.add('hidden');
        }, 5000);
    }
}
