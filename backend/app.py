import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# Initialize App
app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing

# Database Configuration (SQLite)
basedir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(basedir, 'english_reader.db')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + db_path
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# --- Models ---

class Article(db.Model):
    id = db.Column(db.String(50), primary_key=True)
    title = db.Column(db.String(200))
    # Store the full frontend JSON object directly
    data = db.Column(db.Text, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    def to_dict(self):
        return json.loads(self.data)

class SavedItem(db.Model):
    id = db.Column(db.String(50), primary_key=True)
    type = db.Column(db.String(20))  # 'word' or 'sentence'
    original = db.Column(db.String(200))
    # Store the full frontend JSON object directly (includes cardData)
    data = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)

    def to_dict(self):
        return json.loads(self.data)

# --- Routes ---

# 1. Initialize Database
with app.app_context():
    db.create_all()

# 2. Articles API
@app.route('/api/articles', methods=['GET'])
def get_articles():
    try:
        articles = Article.query.order_by(Article.updated_at.desc()).all()
        return jsonify([a.to_dict() for a in articles])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/articles', methods=['POST'])
def save_article():
    try:
        data = request.json
        article_id = data.get('id')
        
        if not article_id:
            return jsonify({"error": "Missing ID"}), 400

        existing = Article.query.get(article_id)
        if existing:
            existing.title = data.get('title', 'Untitled')
            existing.data = json.dumps(data)
        else:
            new_article = Article(
                id=article_id,
                title=data.get('title', 'Untitled'),
                data=json.dumps(data)
            )
            db.session.add(new_article)
        
        db.session.commit()
        return jsonify({"status": "success", "id": article_id})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/articles/<id>', methods=['DELETE'])
def delete_article(id):
    try:
        article = Article.query.get(id)
        if article:
            db.session.delete(article)
            db.session.commit()
        return jsonify({"status": "deleted"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 3. Saved Items API (Words/Sentences)
@app.route('/api/saved_items', methods=['GET'])
def get_saved_items():
    try:
        items = SavedItem.query.order_by(SavedItem.created_at.desc()).all()
        return jsonify([i.to_dict() for i in items])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/saved_items', methods=['POST'])
def save_item():
    try:
        data = request.json
        item_id = data.get('id')
        
        if not item_id:
             return jsonify({"error": "Missing ID"}), 400

        existing = SavedItem.query.get(item_id)
        if existing:
            existing.data = json.dumps(data)
        else:
            new_item = SavedItem(
                id=item_id,
                type=data.get('type'),
                original=data.get('original'),
                data=json.dumps(data)
            )
            db.session.add(new_item)
        
        db.session.commit()
        return jsonify({"status": "success", "id": item_id})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/saved_items/<id>', methods=['DELETE'])
def delete_item(id):
    try:
        item = SavedItem.query.get(id)
        if item:
            db.session.delete(item)
            db.session.commit()
        return jsonify({"status": "deleted"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 4. System Status
@app.route('/api/status', methods=['GET'])
def status():
    return jsonify({
        "status": "running", 
        "database": db_path,
        "time": datetime.now().isoformat()
    })

if __name__ == '__main__':
    print(f"Server running on http://localhost:5000")
    print(f"Database file: {db_path}")
    app.run(debug=True, port=5000)
