# Matrix Job Tracker - Chrome Extension 🟢

A lightweight and efficient Chrome Extension (Manifest V3) designed for the Matrix jobs website. This extension helps job seekers keep track of jobs they have already applied to by visually marking them directly on the webpage.

## 🚀 Features
* **Automated Tracking:** Clicking the "Upload CV" (`קובץ קורות חיים`) button on any job card automatically grabs its unique Job ID and saves it.
* **Real-Time Visual Indicators:** Applied jobs are styled with a subtle grey background, a green border, and a prominent badge stating "✓ הגשת מועמדות למשרה זו" (Applied to this job).
* **Persistent Storage:** Data is stored using `chrome.storage.local`. Your applied jobs list persists even after closing the browser or refreshing the page.
* **Interactive Sidebar:** A clean, modern floating sidebar on the left side of the screen confirms that the extension is active (תוסף המשרות פעיל 🟢) and tracks the total number of jobs you've applied to.
* **Dynamic Content Support:** Uses a `MutationObserver` to automatically scan and mark new jobs as they load dynamically via infinite scroll or search filters.

---

## 📂 Project Structure

The project consists of three main files:
* `manifest.json` - Configuration, metadata, and required permissions (`storage`) for Manifest V3.
* `content.js` - The core logic handling DOM injection, event listening, and Chrome storage operations.
* `styles.css` - Custom styles for highlighting applied jobs and rendering the interactive sidebar.

---

## 🛠️ Installation Instructions (Developer Mode)

To install this extension locally in your Chrome browser, follow these steps:

1. **Download the Files:** Save the three source files (`manifest.json`, `content.js`, `styles.css`) inside a single folder on your computer (e.g., `Matrix-Job-Tracker`).
2. **Open Extensions Page:** Open Google Chrome and navigate to the following URL:
   ```text
   chrome://extensions/