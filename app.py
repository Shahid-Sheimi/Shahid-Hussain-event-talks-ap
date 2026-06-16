import os
import re
import time
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Simple in-memory cache
FEED_CACHE = {
    'data': None,
    'last_updated': 0
}
CACHE_DURATION_SEC = 300  # 5 minutes
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
NAMESPACE = {'atom': 'http://www.w3.org/2005/Atom'}

def fetch_and_parse_feed():
    req = urllib.request.Request(
        FEED_URL, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
    )
    with urllib.request.urlopen(req) as response:
        xml_data = response.read()
    
    root = ET.fromstring(xml_data)
    
    all_updates = []
    # Find all entry elements
    for entry in root.findall('atom:entry', NAMESPACE):
        date_str = entry.find('atom:title', NAMESPACE).text
        updated = entry.find('atom:updated', NAMESPACE).text
        
        # Extract link
        link = ""
        for l in entry.findall('atom:link', NAMESPACE):
            if l.attrib.get('rel') == 'alternate' or not l.attrib.get('rel'):
                link = l.attrib.get('href', '')
                break
        
        content_elem = entry.find('atom:content', NAMESPACE)
        content_html = content_elem.text if content_elem is not None else ""
        
        # Split HTML content by <h3> headers
        # Matches: <h3>Feature</h3>\n<p>...</p>
        # Pattern matches <h3>...</h3> and captures everything up to the next <h3> or end of string.
        matches = re.finditer(r'<h3>(.*?)</h3>\s*(.*?)(?=\s*<h3>|$)', content_html, re.DOTALL)
        
        entry_updates = []
        for m in matches:
            heading = m.group(1).strip()
            body = m.group(2).strip()
            entry_updates.append({
                'type': heading,
                'body': body
            })
            
        # Fallback if no <h3> tags were matched but content exists
        if not entry_updates and content_html.strip():
            entry_updates.append({
                'type': 'General',
                'body': content_html.strip()
            })
            
        for idx, update in enumerate(entry_updates):
            # Clean HTML to plain text for search and tweet composer previews
            # Remove HTML tags
            plain_text = re.sub(r'<[^<]+?>', '', update['body'])
            # Normalize whitespace
            plain_text = ' '.join(plain_text.split())
            
            all_updates.append({
                'date': date_str,
                'updated': updated,
                'link': link,
                'type': update['type'],
                'html': update['body'],
                'text': plain_text,
                'index': idx
            })
            
    return all_updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes')
def get_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    now = time.time()
    
    if force_refresh or not FEED_CACHE['data'] or (now - FEED_CACHE['last_updated'] > CACHE_DURATION_SEC):
        try:
            updates = fetch_and_parse_feed()
            FEED_CACHE['data'] = updates
            FEED_CACHE['last_updated'] = now
            status = "fresh"
        except Exception as e:
            # If fetch fails and we have cached data, return cache with warning
            if FEED_CACHE['data']:
                return jsonify({
                    'updates': FEED_CACHE['data'],
                    'last_updated': FEED_CACHE['last_updated'],
                    'warning': f"Failed to fetch live feed: {str(e)}. Displaying cached content.",
                    'status': "cached_error"
                })
            else:
                return jsonify({'error': f"Failed to fetch release notes: {str(e)}"}), 500
    else:
        status = "cached"
        
    return jsonify({
        'updates': FEED_CACHE['data'],
        'last_updated': FEED_CACHE['last_updated'],
        'status': status
    })

if __name__ == '__main__':
    # Bind to all interfaces to allow easy access in local network
    app.run(host='0.0.0.0', port=5000, debug=True)
