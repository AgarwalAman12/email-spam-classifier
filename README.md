# Email Spam Classifier

Flask web app that classifies emails as Spam or Legitimate (TF-IDF + Logistic Regression).

## Setup
```
python -m venv venv
venv\Scripts\activate        (macOS/Linux: source venv/bin/activate)
pip install -r requirements.txt
python train.py
python app.py
```
Open http://127.0.0.1:5000