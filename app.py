import os
import joblib
from flask import Flask, render_template, request, jsonify

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__)  # Flask auto-detects the templates/ and static/ folders

# Load the trained objects once at startup (not on every request)
model = joblib.load(os.path.join(BASE_DIR, "model", "model.pkl"))
vectorizer = joblib.load(os.path.join(BASE_DIR, "model", "vectorizer.pkl"))


@app.route("/")
def home():
    # Serves the frontend, so the page and API share one origin (no CORS issues)
    return render_template("index.html")


@app.route("/predict", methods=["POST"])
def predict():
    # Read JSON sent by script.js: {"email": "..."}
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip()
    if not email:
        return jsonify({"error": "Please enter some email text."}), 400

    # Apply the SAME TF-IDF vocabulary used in training
    features = vectorizer.transform([email])

    # predict_proba returns [P(ham), P(spam)] because model.classes_ is [0, 1]
    spam_prob = float(model.predict_proba(features)[0][1])
    is_spam = spam_prob >= 0.5

    # Confidence = probability of whichever class was predicted
    confidence = spam_prob if is_spam else 1 - spam_prob

    # These keys ("label", "confidence") are read in script.js
    return jsonify({
        "label": "Spam" if is_spam else "Legitimate",
        "confidence": round(confidence * 100, 2),
    })


if __name__ == "__main__":
    app.run(debug=True)