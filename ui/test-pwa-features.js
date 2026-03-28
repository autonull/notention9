// Test PWA functionality
console.log('Testing PWA capabilities...');

// Check if service worker is supported
if ('serviceWorker' in navigator) {
    console.log('✅ Service Worker is supported');
    
    // Check registration status
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        console.log('Service Worker registrations:', registrations.length);
        for(let registration of registrations) {
            console.log('Scope:', registration.scope);
            console.log('Active:', registration.active ? registration.active.state : 'none');
        }
    });
} else {
    console.log('❌ Service Worker is not supported');
}

// Check if PWA features are available
console.log('PWA related properties:');
console.log('- isStandalone:', window.matchMedia('(display-mode: standalone)').matches);
console.log('- supports PWA:', 'BeforeInstallPromptEvent' in window);

// Check if we can access local storage (offline capability)
try {
    localStorage.setItem('test', 'value');
    localStorage.removeItem('test');
    console.log('✅ Local storage is accessible (offline capability)');
} catch(e) {
    console.log('❌ Local storage is not accessible:', e);
}

// Check connectivity
console.log('- Online status:', navigator.onLine);

console.log('PWA capability test completed.');