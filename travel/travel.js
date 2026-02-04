// Set background image from data attribute
document.addEventListener('DOMContentLoaded', function() {
    const bgImageElement = document.getElementById('bg-image');
    const imageUrl = bgImageElement.getAttribute('data-image-url');
    
    // Set background image
    if (imageUrl) {
        bgImageElement.style.backgroundImage = `url('${imageUrl}')`;
    }
    
    // Highlight current page in navigation
    const currentPage = window.location.pathname.split('/').pop();
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        const itemHref = item.getAttribute('href');
        if (itemHref === currentPage || (currentPage === '' && itemHref === 'index.html')) {
            item.style.color = '#fff';
            item.style.fontWeight = '500';
        }
    });
    
    // Fallback background if image doesn't load
    setTimeout(() => {
        const bgImage = document.getElementById('bg-image');
        const hasBackground = getComputedStyle(bgImage).backgroundImage !== 'none';
        
        if (!hasBackground || bgImage.style.backgroundImage.includes('undefined')) {
            // Apply fallback gradient background
            bgImage.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)';
            bgImage.style.backgroundImage = 'none';
        }
    }, 1000);
});