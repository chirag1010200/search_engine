# MySearchEngine

A modern web search engine built with Flask (Python) backend and React frontend. This search engine can crawl websites, index content, and provide fast search results with relevance scoring.

## Features

- **Web Crawling**: Automatically crawl and index web pages
- **Search Functionality**: Fast text search with relevance scoring
- **Admin Interface**: Manage crawling and view statistics
- **Modern UI**: Clean, responsive React frontend
- **RESTful API**: Flask backend with comprehensive API endpoints

## Architecture

- **Backend**: Flask (Python) with SQLAlchemy ORM
- **Frontend**: React with Tailwind CSS
- **Database**: SQLite (development) / PostgreSQL (production)
- **Deployment**: Railway

## Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Run the Flask server:
```bash
python app.py
```

The backend will be available at `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the React development server:
```bash
npm start
```

The frontend will be available at `http://localhost:3000`

## Usage

### Basic Search
- Enter search terms in the search box
- View results with relevance scores and snippets
- Click on results to visit the original pages

### Admin Mode
- Press `Ctrl+Shift+A` to toggle admin mode
- Or add `?admin=true` to the URL
- Access crawling controls, statistics, and indexed pages

### Adding URLs to Crawl
1. Enable admin mode
2. Go to the "Crawl" tab
3. Add URLs and start crawling
4. Monitor progress in the stats section

## API Endpoints

- `GET /api/search?q=query` - Search indexed pages
- `POST /api/crawl` - Add URL to crawl queue
- `POST /api/crawl/start` - Start crawling process
- `GET /api/stats` - Get crawling statistics
- `GET /api/pages` - Get indexed pages

## Environment Variables

- `DATABASE_URL` - Database connection string (optional, defaults to SQLite)
- `PORT` - Port number (optional, defaults to 5000)

## Deployment

This project is configured for deployment on Railway:

1. Push to GitHub
2. Connect Railway to your GitHub repository
3. Deploy automatically with the included `railway.json` configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.