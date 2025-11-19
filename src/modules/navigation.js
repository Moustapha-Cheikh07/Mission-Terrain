// ===========================================
const NavigationModule = {
    init: function() {
        this.setupNavigation();
        this.setupQuickActions();
    },

    setupNavigation: function() {
        const navItems = document.querySelectorAll('.nav-item');
        const sections = document.querySelectorAll('.content-section');

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const targetSection = item.getAttribute('data-section');
                this.showSection(targetSection);
            });
        });
    },

    setupQuickActions: function() {
        const actionButtons = document.querySelectorAll('.action-btn');
        actionButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetSection = button.getAttribute('data-section');
                this.showSection(targetSection);
            });
        });
    },

    showSection: function(sectionId) {
        const navItems = document.querySelectorAll('.nav-item');
        const sections = document.querySelectorAll('.content-section');

        navItems.forEach(nav => nav.classList.remove('active'));
        sections.forEach(section => section.classList.remove('active'));

        const targetNav = document.querySelector(`[data-section="${sectionId}"]`);
        if (targetNav) targetNav.classList.add('active');

        const targetSection = document.getElementById(sectionId);
        if (targetSection) targetSection.classList.add('active');

        // Refresh chart when navigating to results
        if (sectionId === 'results') {
            setTimeout(() => ChartModule.init(), 100);
        }
    }
};
