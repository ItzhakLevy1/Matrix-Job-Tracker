// Global map to keep track of applied job IDs and their submission dates
let appliedJobs = new Map();
let observer = null;

// Helper to get today's date in DD/MM/YYYY format
function getFormattedDate() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

// Function to handle clicking on the CV submission button
function handleCvClick(event) {
    const cvButton = event.target.closest('.quick-cv-button');
    
    if (cvButton) {
        const jobId = cvButton.getAttribute('id');
        
        if (jobId && !appliedJobs.has(jobId)) {
            const todayDate = getFormattedDate();
            appliedJobs.set(jobId, todayDate);
            
            // Save as array of object pairs for extension storage
            const saveData = Array.from(appliedJobs.entries());
            chrome.storage.local.set({ 'appliedJobsList': saveData }, function() {
                const jobCard = cvButton.closest('.job-item');
                if (jobCard) {
                    stopObserver();
                    jobCard.classList.add('applied-job');
                    startObserver();
                }
            });
        }
    }
}

// Function to inject the sidebar into the webpage
function createSidebar() {
    if (document.getElementById('matrix-tracker-sidebar')) return;

    const sidebar = document.createElement('div');
    sidebar.id = 'matrix-tracker-sidebar';
    sidebar.className = 'matrix-job-tracker-sidebar';
    
    sidebar.innerHTML = `
        <div class="matrix-sidebar-status">תוסף המשרות פעיל 🟢</div>
        <hr class="matrix-sidebar-divider">
        <div class="matrix-sidebar-info">משרות עם דרישה של מעל ל 2 שנות ניסיון לא יוצגו</div>
        <hr class="matrix-sidebar-divider">
        <div class="matrix-sidebar-info">משרות שהוגשה אליהן מועמדות יסומנו</div>
    `;
    
    document.body.appendChild(sidebar);
}

// Function to scan DOM, highlight applied jobs, and filter out jobs by requirements
function markAndFilterJobs() {
    const jobItems = document.querySelectorAll('.job-item');
    if (jobItems.length === 0) return;

    stopObserver();

    const expRegex = /(\d+)\s*(שנות|שנה|שנים)\s*([^0-9\r\n]{0,30})\s*נ[י]?סיון/i;
    const degreeKeywords = ["תואר", "b.sc", "bsc", "b.a", "ba"];
    const leaderKeywords = ["leader", "ראש צוות", 'ר"צ', "ניהול צוות", "מוביל"];

    jobItems.forEach(job => {
        try {
            // Safe extraction of job ID
            let jobId = job.getAttribute('job-id');
            if (!jobId) {
                const idPara = job.querySelector('.add-to-my-jobs-id');
                if (idPara) jobId = idPara.textContent.trim();
            }
            
            // 1. Highlight applied jobs & Add/Remove the top badge
            if (jobId && appliedJobs.has(jobId)) {
                if (!job.classList.contains('applied-job')) job.classList.add('applied-job');
                
                let badge = job.querySelector('.job-applied-badge');
                if (!badge) {
                    badge = document.createElement('div');
                    badge.className = 'job-applied-badge';
                    job.insertBefore(badge, job.firstChild);
                }
                const appliedDate = appliedJobs.get(jobId);
                badge.innerHTML = `Applied 🟢 | הוגש ב-${appliedDate}`;
            } else {
                if (job.classList.contains('applied-job')) job.classList.remove('applied-job');
                const badge = job.querySelector('.job-applied-badge');
                if (badge) badge.remove();
            }

            let rawText = job.textContent || '';
            let targetText = rawText.toLowerCase().replace(/[\u00A0\s]+/g, ' ');
            
            if (targetText.trim().length < 10) return;

            let shouldHide = false;

            const isLeaderRole = leaderKeywords.some(keyword => 
                targetText.includes(keyword.toLowerCase())
            );
            if (isLeaderRole) {
                shouldHide = true;
            }

            if (!shouldHide) {
                const hasDegreeRequirement = degreeKeywords.some(keyword => 
                    targetText.includes(keyword)
                );
                if (hasDegreeRequirement) {
                    shouldHide = true;
                }
            }

            if (!shouldHide) {
                const match = targetText.match(expRegex);
                if (match) {
                    const years = parseInt(match[1], 10);
                    if (years >= 3) {
                        shouldHide = true;
                    }
                }
                
                if (!shouldHide && (targetText.includes("חמש שנות") || targetText.includes("חמש שנים") || targetText.includes("למעלה מחמש") || targetText.includes("שלוש שנות") || targetText.includes("שלוש שנים"))) {
                    shouldHide = true;
                }
            }

            if (shouldHide) {
                if (!job.classList.contains('hidden-job')) job.classList.add('hidden-job');
            } else {
                if (job.classList.contains('hidden-job')) job.classList.remove('hidden-job');
            }
            
        } catch (error) {
            console.error("Error processing job item:", error);
        }
    });

    startObserver();
}

function startObserver() {
    if (observer) {
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}

function stopObserver() {
    if (observer) {
        observer.disconnect();
    }
}

function setupEventListeners() {
    document.body.removeEventListener('click', handleCvClick);
    document.body.addEventListener('click', handleCvClick);
}

function init() {
    createSidebar();

    let timeout = null;
    observer = new MutationObserver(() => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
            markAndFilterJobs();
        }, 250);
    });

    chrome.storage.local.get(['appliedJobsList'], function(result) {
        if (result.appliedJobsList) {
            // Robust parsing fallback to support both old array layout and new key-value pair matrix layout
            if (Array.isArray(result.appliedJobsList)) {
                if (result.appliedJobsList.length > 0 && typeof result.appliedJobsList[0] === 'string') {
                    // Fallback for older legacy format
                    const defaultDate = getFormattedDate();
                    appliedJobs = new Map(result.appliedJobsList.map(id => [id, defaultDate]));
                } else {
                    // Standard key-value format
                    appliedJobs = new Map(result.appliedJobsList);
                }
            }
        }
        
        setupEventListeners();
        markAndFilterJobs();
        setTimeout(markAndFilterJobs, 300);
        setTimeout(markAndFilterJobs, 800);
    });
}

init();