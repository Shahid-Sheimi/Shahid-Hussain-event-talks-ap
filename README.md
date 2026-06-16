# BigQuery Release Notes Stream

A modern, high-fidelity web application built with **Python Flask** and **plain vanilla HTML, CSS, and JavaScript**. It parses and aggregates the official Google Cloud BigQuery Release Notes XML feed, splitting multi-topic release entries into granular, readable updates.

## Features

*   **Real-time XML Parsing**: Fetches the official Google Cloud Atom feed, parses the XML, and breaks compound entries (with multiple topics) into individual update cards.
*   **Performance-Optimized Caching**: Integrates a 5-minute in-memory cache to decrease feed requests and reduce page load times to under 10ms.
*   **Interactive Search & Filters**: Search updates in real-time by keyword, date, or category, or use filter pills (Features, Changes, Issues, Deprecated).
*   **X (Twitter) Share Modal**: Share any specific update card to X with a customized preview modal, character counter, and X URL optimization (preserving character counts for links).
*   **One-Click Copy**: Easily copy specific release links or text directly to your clipboard.

## Technology Stack

*   **Backend**: Python 3.x, Flask
*   **Frontend**: Vanilla HTML5, Vanilla CSS3 (custom CSS custom properties, grid/flex layouts, animations), Vanilla JavaScript (ES6+)
*   **Assets & Fonts**: Google Fonts (Inter, Outfit, JetBrains Mono), Google Material Symbols

## Project Structure

```
.
├── app.py                # Flask Backend Web Server
├── static/
│   ├── app.js            # Frontend JavaScript Logic
│   └── style.css         # Custom Responsive Styles (Glassmorphism Dark Theme)
├── templates/
│   └── index.html        # HTML5 Core Application Layout
└── .gitignore            # Git Ignore File
```

## Running the Application

### Prerequisites

Ensure you have Python 3 and Flask installed:

```bash
pip install flask
```

### Starting the Server

Run the Flask application:

```bash
python3 app.py
```

The application will start in development mode at **[http://localhost:5000](http://localhost:5000)**.

---

*Made with love by Shahid Sheimi.*
