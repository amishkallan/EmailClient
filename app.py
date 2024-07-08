from flask import Flask, jsonify
from elasticsearch import Elasticsearch

app = Flask(__name__)

# Connect to Elasticsearch
es = Elasticsearch(hosts=["http://elasticsearch:9200"])

@app.route('/')
def index():
    return jsonify({'message': 'Hello, World!'})

@app.route('/search/<index>')
def search(index):
    result = es.search(index=index, body={"query": {"match_all": {}}})
    return jsonify(result)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
