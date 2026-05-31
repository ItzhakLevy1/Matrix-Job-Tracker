// Global set to keep track of applied job IDs
let appliedJobs = new Set();

// Initialize the script
function init() {
    // Load already applied jobs from Chrome storage
    chrome.storage.local.get(['appliedJobsList'], function(result) {
        if (result.appliedJobsList) {
            appliedJobs = new Set(result.appliedJobsList);
        }
        
        // Create the sidebar menu on the screen
        createSidebar();
        
        // Scan the page for jobs and mark them
        markAppliedJobs();
        
        // Setup event listener for clicking on CV submission buttons
        setupEventListeners();
    });
}

// Function to inject the sidebar into the webpage
function createSidebar() {
    // Check if sidebar already exists to prevent duplicates
    if (document.getElementById('matrix-tracker-sidebar')) return;

    const sidebar = document.createElement('div');
    sidebar.id = 'matrix-tracker-sidebar';
    sidebar.className = 'matrix-job-tracker-sidebar';
    
    sidebar.innerHTML = `
        <div class="matrix-sidebar-status">תוסף המשרות פעיל 🟢</div>
        <div class="matrix-sidebar-stats">
            משרות שסומנו: <span id="applied-count">${appliedJobs.size}</span>
        </div>
    `;
    
    document.body.appendChild(sidebar);
}

// Function to update the statistics inside the sidebar
function updateSidebarCount() {
    const countElement = document.getElementById('applied-count');
    if (countElement) {
        countElement.textContent = appliedJobs.size;
    }
}

// Function to scan DOM and highlight jobs that were already applied to
function markAppliedJobs() {
    const jobItems = document.querySelectorAll('.job-item:not(.applied-job)');
    
    jobItems.forEach(job => {
        const jobId = job.getAttribute('job-id');
        if (jobId && appliedJobs.has(jobId)) {
            job.classList.add('applied-job');
        }
    });
}

// Function to handle clicking on the CV submission button
function setupEventListeners() {
    document.body.addEventListener('click', function(event) {
        // Find if the clicked element (or its parent) is the quick CV button
        const cvButton = event.target.closest('.quick-cv-button');
        
        if (cvButton) {
            const jobId = cvButton.getAttribute('id');
            
            if (jobId && !appliedJobs.has(jobId)) {
                // Add to our runtime set
                appliedJobs.add(jobId);
                
                // Save updated list to Chrome storage
                chrome.storage.local.set({ 'appliedJobsList': Array.from(appliedJobs) }, function() {
                    // Instantly visually mark the job item
                    const jobCard = cvButton.closest('.job-item');
                    if (jobCard) {
                        jobCard.classList.add('applied-job');
                    }
                    // Update the counter in the sidebar
                    updateSidebarCount();
                });
            }
        }
    });
}

// Run initial setup
init();

// Since Matrix site uses dynamic loading / AJAX when filtering jobs or moving pages, 
// we observe the DOM for changes to automatically mark new jobs that appear
const observer = new MutationObserver(() => {
    markAppliedJobs();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});