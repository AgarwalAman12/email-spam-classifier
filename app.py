import os
import joblib
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__)  # Flask auto-detects the templates/ and static/ folders

# Allow the browser extension to send requests to this local Flask server
CORS(app)

# Load the trained objects once at startup (not on every request)
MODEL_PATH = os.path.join(BASE_DIR, "model", "model.pkl")
VECTORIZER_PATH = os.path.join(BASE_DIR, "model", "vectorizer.pkl")

if not os.path.exists(MODEL_PATH) or not os.path.exists(VECTORIZER_PATH):
    raise FileNotFoundError(
        "Model files not found. Run 'python train.py' first to generate model/model.pkl and model/vectorizer.pkl."
    )

model = joblib.load(MODEL_PATH)
vectorizer = joblib.load(VECTORIZER_PATH)


@app.route("/")
def home():
    # Serves the redesigned frontend
    return render_template("index.html")


@app.route("/health", methods=["GET"])
def health():
    # Simple endpoint to verify the local server is running
    return jsonify({"status": "ok"})


@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip()
    if not email:
        return jsonify({"error": "Please enter some email text."}), 400

    features = vectorizer.transform([email])
    spam_prob = float(model.predict_proba(features)[0][1])

    SPAM_THRESHOLD = 0.75
    is_spam = spam_prob >= SPAM_THRESHOLD

    if is_spam:
        confidence = spam_prob
    else:
        # Scale legitimate confidence from 50% (at threshold) to 100% (at 0% spam risk)
        confidence = 0.5 + 0.5 * ((SPAM_THRESHOLD - spam_prob) / SPAM_THRESHOLD)

    return jsonify({
        "label": "Spam" if is_spam else "Legitimate",
        "confidence": round(confidence * 100, 2),
    })

if __name__ == "__main__":
    # Explicit host and port match the extension's API URL (http://127.0.0.1:5000/predict)
    app.run(host="127.0.0.1", port=5000, debug=True)