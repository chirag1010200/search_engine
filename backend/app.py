from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import requests
from bs4 import BeautifulSoup
import re
from urllib.parse import urljoin, urlparse
import time
import threading
from queue import Queue
import os
from sqlalchemy import text

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Database configuration
DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL and DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL or 'sqlite:///search_engine.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize SQLAlchemy
db = SQLAlchemy(app)

# Database Models
class WebPage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    url = db.Column(db.String(500), unique=True, nullable=False)
    title = db.Column(db.String(200), nullable=True)
    content = db.Column(db.Text, nullable=True)
    description = db.Column(db.Text, nullable=True)
    keywords = db.Column(db.Text, nullable=True)
    crawled_at = db.Column(db.DateTime, default=datetime.utcnow)
    page_rank = db.Column(db.Float, default=0.0)

class CrawlQueue(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    url = db.Column(db.String(500), nullable=False)
    status = db.Column(db.String(20), default='pending')
    added_at = db.Column(db.DateTime, default=datetime.utcnow)

# Web Crawler Class
class WebCrawler:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'EduSearchBot/1.0 (Educational Project)'
        })
        self.crawled_urls = set()
        self.max_pages = 100
        
    def is_valid_url(self, url):
        try:
            parsed = urlparse(url)
            return parsed.scheme in ['http', 'https'] and parsed.netloc
        except:
            return False
    
    def extract_text_content(self, soup):
        for script in soup(["script", "style"]):
            script.decompose()
        
        text = soup.get_text()
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = ' '.join(chunk for chunk in chunks if chunk)
        
        return text[:5000]
    
    def extract_page_info(self, url, html_content):
        soup = BeautifulSoup(html_content, 'html.parser')
        
        title = soup.find('title')
        title = title.get_text().strip() if title else url
        
        description = soup.find('meta', attrs={'name': 'description'})
        description = description.get('content', '')[:300] if description else ''
        
        keywords = soup.find('meta', attrs={'name': 'keywords'})
        keywords = keywords.get('content', '') if keywords else ''
        
        content = self.extract_text_content(soup)
        
        return {
            'title': title[:200],
            'description': description,
            'keywords': keywords,
            'content': content
        }
    
    def crawl_page(self, url):
        try:
            if url in self.crawled_urls:
                return False
                
            response = self.session.get(url, timeout=10)
            if response.status_code != 200:
                return False
                
            self.crawled_urls.add(url)
            
            page_info = self.extract_page_info(url, response.text)
            
            existing_page = WebPage.query.filter_by(url=url).first()
            if existing_page:
                existing_page.title = page_info['title']
                existing_page.content = page_info['content']
                existing_page.description = page_info['description']
                existing_page.keywords = page_info['keywords']
                existing_page.crawled_at = datetime.utcnow()
            else:
                new_page = WebPage(
                    url=url,
                    title=page_info['title'],
                    content=page_info['content'],
                    description=page_info['description'],
                    keywords=page_info['keywords']
                )
                db.session.add(new_page)
            
            db.session.commit()
            return True
            
        except Exception as e:
            print(f"Error crawling {url}: {str(e)}")
            return False

# Search Engine Class
class SearchEngine:
    def __init__(self):
        pass
    
    def calculate_relevance_score(self, query, page):
        query_terms = query.lower().split()
        score = 0
        
        # Title matching (highest weight)
        if page.title:
            title_lower = page.title.lower()
            for term in query_terms:
                if term in title_lower:
                    score += 15
                    # Bonus for exact phrase match
                    if query.lower() in title_lower:
                        score += 10
        
        # Description matching (high weight)
        if page.description:
            desc_lower = page.description.lower()
            for term in query_terms:
                if term in desc_lower:
                    score += 8
        
        # Content matching (medium weight)
        if page.content:
            content_lower = page.content.lower()
            for term in query_terms:
                count = content_lower.count(term)
                score += count * 2
                # Bonus for term frequency
                if count > 3:
                    score += 5
        
        # Keywords matching (high weight)
        if page.keywords:
            keywords_lower = page.keywords.lower()
            for term in query_terms:
                if term in keywords_lower:
                    score += 12
        
        # URL matching (medium weight)
        url_lower = page.url.lower()
        for term in query_terms:
            if term in url_lower:
                score += 5
        
        return score
    
    def search(self, query, limit=10):
        if not query.strip():
            return []
        
        pages = WebPage.query.all()
        results = []
        
        for page in pages:
            score = self.calculate_relevance_score(query, page)
            if score > 0:
                # Create snippet from content
                snippet = self.create_snippet(page.content, query)
                
                results.append({
                    'url': page.url,
                    'title': page.title,
                    'description': page.description if page.description else snippet,
                    'snippet': snippet,
                    'score': score,
                    'crawled_at': page.crawled_at.isoformat() if page.crawled_at else None
                })
        
        results.sort(key=lambda x: x['score'], reverse=True)
        return results[:limit]
    
    def create_snippet(self, content, query):
        if not content:
            return ""
        
        query_terms = query.lower().split()
        content_lower = content.lower()
        
        # Find the best position to start the snippet
        best_pos = 0
        max_matches = 0
        
        for i in range(0, len(content) - 200, 50):
            chunk = content_lower[i:i+200]
            matches = sum(1 for term in query_terms if term in chunk)
            if matches > max_matches:
                max_matches = matches
                best_pos = i
        
        snippet = content[best_pos:best_pos+200]
        return snippet.strip() + "..."

# Initialize instances
crawler = WebCrawler()
search_engine = SearchEngine()

# Basic HTML template for testing
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Search Engine</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 800px; margin: 0 auto; }
        .search-box { width: 100%; padding: 12px; font-size: 16px; margin-bottom: 20px; }
        .search-btn { padding: 12px 24px; font-size: 16px; background: #4285f4; color: white; border: none; cursor: pointer; }
        .result { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .result-title { font-size: 18px; font-weight: bold; color: #1a0dab; margin-bottom: 5px; }
        .result-url { color: #006621; font-size: 14px; margin-bottom: 5px; }
        .result-snippet { color: #545454; line-height: 1.4; }
        .stats { margin-bottom: 20px; padding: 10px; background: #f8f9fa; border-radius: 5px; }
        .crawl-section { margin-top: 40px; padding: 20px; background: #f0f0f0; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Search Engine</h1>
        
        <div class="search-section">
            <input type="text" id="searchInput" class="search-box" placeholder="Enter search query...">
            <button class="search-btn" onclick="search()">Search</button>
        </div>
        
        <div id="results"></div>
        
        <div class="crawl-section">
            <h3>Add URL to Crawl</h3>
            <input type="text" id="urlInput" placeholder="https://example.com" style="width: 60%; padding: 8px;">
            <button onclick="addUrl()" style="padding: 8px 16px; margin-left: 10px;">Add URL</button>
            <button onclick="startCrawl()" style="padding: 8px 16px; margin-left: 10px; background: #34a853; color: white; border: none;">Start Crawling</button>
        </div>
        
        <div id="stats" class="stats"></div>
    </div>

    <script>
        async function search() {
            const query = document.getElementById('searchInput').value;
            if (!query.trim()) return;
            
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            const resultsDiv = document.getElementById('results');
            if (data.results.length === 0) {
                resultsDiv.innerHTML = '<p>No results found.</p>';
                return;
            }
            
            resultsDiv.innerHTML = data.results.map(result => `
                <div class="result">
                    <div class="result-title">${result.title}</div>
                    <div class="result-url">${result.url}</div>
                    <div class="result-snippet">${result.snippet || result.description}</div>
                </div>
            `).join('');
        }
        
        async function addUrl() {
            const url = document.getElementById('urlInput').value;
            if (!url.trim()) return;
            
            const response = await fetch('/api/crawl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            
            const data = await response.json();
            alert(data.message || data.error);
            loadStats();
        }
        
        async function startCrawl() {
            const response = await fetch('/api/crawl/start', { method: 'POST' });
            const data = await response.json();
            alert(data.message);
            loadStats();
        }
        
        async function loadStats() {
            const response = await fetch('/api/stats');
            const data = await response.json();
            document.getElementById('stats').innerHTML = `
                <strong>Stats:</strong> ${data.total_indexed_pages} pages indexed, ${data.pending_crawls} pending crawls
            `;
        }
        
        // Load stats on page load
        loadStats();
        
        // Allow Enter key to search
        document.getElementById('searchInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') search();
        });
    </script>
</body>
</html>
"""

# Database initialization function
def create_tables():
    """Create database tables if they don't exist"""
    try:
        with app.app_context():
            # Check if tables exist
            inspector = db.inspect(db.engine)
            existing_tables = inspector.get_table_names()
            
            if 'web_page' not in existing_tables or 'crawl_queue' not in existing_tables:
                print("Creating database tables...")
                db.create_all()
                print("Database tables created successfully!")
            else:
                print("Database tables already exist")
                
    except Exception as e:
        print(f"Error creating tables: {e}")

# API Routes
@app.route('/')
def index():
    return render_template_string(HTML_TEMPLATE)

@app.route('/api/search', methods=['GET'])
def search():
    query = request.args.get('q', '')
    limit = int(request.args.get('limit', 10))
    
    results = search_engine.search(query, limit)
    
    return jsonify({
        'query': query,
        'results': results,
        'total': len(results)
    })

@app.route('/api/crawl', methods=['POST'])
def add_url_to_crawl():
    data = request.get_json()
    url = data.get('url', '')
    
    if not crawler.is_valid_url(url):
        return jsonify({'error': 'Invalid URL'}), 400
    
    try:
        existing = CrawlQueue.query.filter_by(url=url).first()
        if not existing:
            new_crawl = CrawlQueue(url=url)
            db.session.add(new_crawl)
            db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    
    return jsonify({'message': 'URL added to crawl queue', 'url': url})

@app.route('/api/crawl/start', methods=['POST'])
def start_crawling():
    try:
        pending_urls = CrawlQueue.query.filter_by(status='pending').limit(10).all()
        
        crawled_count = 0
        for crawl_item in pending_urls:
            crawl_item.status = 'processing'
            db.session.commit()
            
            success = crawler.crawl_page(crawl_item.url)
            
            if success:
                crawl_item.status = 'completed'
                crawled_count += 1
            else:
                crawl_item.status = 'failed'
            
            db.session.commit()
            time.sleep(1)  # Be respectful to servers
        
        return jsonify({
            'message': f'Crawled {crawled_count} pages',
            'crawled_count': crawled_count
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Crawling error: {str(e)}'}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    try:
        total_pages = WebPage.query.count()
        pending_crawls = CrawlQueue.query.filter_by(status='pending').count()
        completed_crawls = CrawlQueue.query.filter_by(status='completed').count()
        failed_crawls = CrawlQueue.query.filter_by(status='failed').count()
        
        return jsonify({
            'total_indexed_pages': total_pages,
            'pending_crawls': pending_crawls,
            'completed_crawls': completed_crawls,
            'failed_crawls': failed_crawls
        })
    except Exception as e:
        return jsonify({'error': f'Stats error: {str(e)}'}), 500

@app.route('/api/pages', methods=['GET'])
def get_pages():
    """Get all indexed pages"""
    try:
        pages = WebPage.query.order_by(WebPage.crawled_at.desc()).limit(50).all()
        return jsonify([{
            'url': page.url,
            'title': page.title,
            'crawled_at': page.crawled_at.isoformat() if page.crawled_at else None
        } for page in pages])
    except Exception as e:
        return jsonify({'error': f'Pages error: {str(e)}'}), 500

@app.route('/api/init', methods=['POST'])
def initialize_database():
    """Manual database initialization endpoint"""
    try:
        create_tables()
        
        # Add some initial URLs for demo
        initial_urls = [
            'https://example.com',
            'https://httpbin.org/html',
            'https://quotes.toscrape.com/',
            'https://books.toscrape.com/',
            'https://scrapethissite.com/pages/simple/'
        ]
        
        for url in initial_urls:
            existing = CrawlQueue.query.filter_by(url=url).first()
            if not existing:
                new_crawl = CrawlQueue(url=url)
                db.session.add(new_crawl)
        
        db.session.commit()
        return jsonify({'message': 'Database initialized successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Initialization error: {str(e)}'}), 500

# Application startup
@app.before_request
def before_first_request():
    """Ensure database is initialized before any request"""
    if not hasattr(app, 'db_initialized'):
        try:
            create_tables()
            app.db_initialized = True
        except Exception as e:
            print(f"Warning: Could not initialize database: {e}")

if __name__ == '__main__':
    # Initialize database on startup
    create_tables()
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))