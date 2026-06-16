// Global map to keep track of applied job IDs and their submission dates
let appliedJobs = new Map();
let observer = null;

// Helper to get today's date in DD/MM/YYYY format
function getFormattedDate() {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = today.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Function to handle clicking on the CV submission button
function handleCvClick(event) {
  const cvButton = event.target.closest(".quick-cv-button");

  if (cvButton) {
    const jobId = cvButton.getAttribute("id");

    if (jobId && !appliedJobs.has(jobId)) {
      const todayDate = getFormattedDate();
      appliedJobs.set(jobId, todayDate);

      const saveData = Array.from(appliedJobs.entries());
      chrome.storage.local.set({ appliedJobsList: saveData }, function () {
        const jobCard = cvButton.closest(".job-item");
        if (jobCard) {
          stopObserver();
          jobCard.classList.add("applied-job");
          startObserver();
        }
      });
    }
  }
}

// Function to inject the sidebar into the webpage
function createSidebar() {
  if (document.getElementById("matrix-tracker-sidebar")) return;

  const sidebar = document.createElement("div");
  sidebar.id = "matrix-tracker-sidebar";
  sidebar.className = "matrix-job-tracker-sidebar";

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
  const jobItems = document.querySelectorAll(".job-item");
  if (jobItems.length === 0) return;

  stopObserver();

  // Matches numbers followed by years/experience (e.g., "3 שנות", "4 שנים"). Number must be isolated (\b or spaces).
  const expRegexStandard =
    /(?:^|[\s,.\-+])([3-9]|\d{2,})\s*(?:שנות|שנה|שנים|ש"נ)/i;

  // Matches experience keywords followed closely by isolated numbers (e.g., "ניסיון של 3", "ניסיון מעל 4"). Max 15 chars between them.
  const expRegexReverse =
    /(?:נ[י]?סיון|שנות|שנים)[^0-9\r\n]{0,15}(?:^|[\s,.\-+])([3-9]|\d{2,})(?:$|[\s,.\-+])/i;

  // Matches explicit plus signs attached to high numbers (e.g., "3+", "+4"), strictly avoiding alphanumeric attachments like MongoDB3+
  const plusSignRegex =
    /(?:^|[\s,.\-+])(?:([3-9])\s*\+|\+\s*([3-9]))(?:$|[\s,.\-+])/i;

  // Targeted management keywords
  const leaderKeywords = [
    "leader",
    "ראש צוות",
    'ר"צ',
    "ניהול צוות",
    "tech lead",
    "מוביל טכנולוגי",
  ];

  // Allowed target regions
  const allowedLocations = ["מרכז", "השפלה", "גוש דן", "השרון"];

  console.log(
    `%c[Matrix Tracker] Scanning ${jobItems.length} jobs with isolated number extraction...`,
    "color: #00ff00; font-weight: bold;",
  );

  jobItems.forEach((job) => {
    try {
      let jobId = job.getAttribute("job-id");
      if (!jobId) {
        const idPara = job.querySelector(".add-to-my-jobs-id");
        if (idPara) jobId = idPara.textContent.trim();
      }

      // 1. Highlight applied jobs & Add/Remove the top badge
      if (jobId && appliedJobs.has(jobId)) {
        if (!job.classList.contains("applied-job"))
          job.classList.add("applied-job");

        let badge = job.querySelector(".job-applied-badge");
        if (!badge) {
          badge = document.createElement("div");
          badge.className = "job-applied-badge";
          job.insertBefore(badge, job.firstChild);
        }
        const appliedDate = appliedJobs.get(jobId);
        badge.innerHTML = `Applied 🟢 | הוגש ב-${appliedDate}`;
      } else {
        if (job.classList.contains("applied-job"))
          job.classList.remove("applied-job");
        const badge = job.querySelector(".job-applied-badge");
        if (badge) badge.remove();
      }

      let rawText = job.textContent || "";
      let targetText = rawText.toLowerCase().replace(/[\u00A0\s]+/g, " ");

      // Skip unrendered or incomplete cards safely
      if (targetText.trim().length < 10) {
        if (job.classList.contains("hidden-job"))
          job.classList.remove("hidden-job");
        job.style.removeProperty("display");
        return;
      }

      let shouldHide = false;
      let hideReason = "";

      // 2. Location Filtering Logic
      const hasAllowedLocation = allowedLocations.some((location) =>
        rawText.includes(location),
      );

      if (!hasAllowedLocation) {
        shouldHide = true;
        hideReason = "Location not allowed";
      }

      // 3. Leadership Filter
      if (!shouldHide) {
        const isLeaderRole = leaderKeywords.some((keyword) =>
          targetText.includes(keyword.toLowerCase()),
        );
        if (isLeaderRole) {
          shouldHide = true;
          hideReason = "Leadership role detected";
        }
      }

      // 4. Advanced Experience Filter (Strictly blocks >2 years while ignoring library names)
      if (!shouldHide) {
        // Check Pattern A: Explicit isolated 3+, 4+, 5+ indicators
        if (plusSignRegex.test(targetText)) {
          shouldHide = true;
          hideReason = "High experience explicit plus sign detected (+3 / 4+)";
        }

        // Check Pattern B: Standard layout "X years of experience" with isolated numbers
        if (!shouldHide) {
          const matchStandard = targetText.match(expRegexStandard);
          if (matchStandard) {
            const years = parseFloat(matchStandard[1]);
            if (years > 2) {
              shouldHide = true;
              hideReason = `Standard experience high: ${years} years`;
            }
          }
        }

        // Check Pattern C: Close proximity reverse layout
        if (!shouldHide) {
          const matchReverse = targetText.match(expRegexReverse);
          if (matchReverse) {
            const years = parseFloat(matchReverse[1]);
            if (years > 2) {
              shouldHide = true;
              hideReason = `Reverse experience layout high: ${years} years`;
            }
          }
        }

        // Check Pattern D: Text-based fallback checks for explicit numbers written out in Hebrew
        if (
          !shouldHide &&
          (targetText.includes("שלוש שנות") ||
            targetText.includes("שלוש שנים") ||
            targetText.includes("ארבע שנות") ||
            targetText.includes("ארבע שנים") ||
            targetText.includes("חמש שנות") ||
            targetText.includes("חמש שנים") ||
            targetText.includes("למעלה מחמש"))
        ) {
          shouldHide = true;
          hideReason = "Text-based high experience keyword found";
        }
      }

      // Print precise debug log for transparency
      console.log(
        `%cJob ID: ${jobId || "Unknown"} | Hide: ${shouldHide} ${shouldHide ? "❌ (" + hideReason + ")" : "✅"}`,
        shouldHide ? "color: #ff4d4d;" : "color: #4da6ff;",
      );

      // Toggle standard visibility wrapper based on final match results
      if (shouldHide) {
        if (!job.classList.contains("hidden-job")) {
          job.classList.add("hidden-job");
        }
        job.style.setProperty("display", "none", "important");
      } else {
        if (job.classList.contains("hidden-job")) {
          job.classList.remove("hidden-job");
        }
        job.style.removeProperty("display");
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
      subtree: true,
    });
  }
}

function stopObserver() {
  if (observer) {
    observer.disconnect();
  }
}

function setupEventListeners() {
  document.body.removeEventListener("click", handleCvClick);
  document.body.addEventListener("click", handleCvClick);
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

  chrome.storage.local.get(["appliedJobsList"], function (result) {
    if (result.appliedJobsList) {
      if (Array.isArray(result.appliedJobsList)) {
        if (
          result.appliedJobsList.length > 0 &&
          typeof result.appliedJobsList[0] === "string"
        ) {
          const defaultDate = getFormattedDate();
          appliedJobs = new Map(
            result.appliedJobsList.map((id) => [id, defaultDate]),
          );
        } else {
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
