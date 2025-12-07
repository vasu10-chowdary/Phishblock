import pandas as pd
import json
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report

# --- 1. Load Data ---
try:
    # 1. Load the CSV, skipping any badly formatted lines
    data = pd.read_csv('urls_dataset.csv', on_bad_lines='skip')
    
    # 2. Check if the required 'url' and 'label' columns exist
    if 'url' not in data.columns or 'label' not in data.columns:
        print("Error: Your 'urls_dataset.csv' file MUST have 'url' and 'label' columns.")
        exit()
        
    # 3. --- THIS IS THE FIX ---
    # Drop any rows where the 'url' or 'label' column is blank (NA)
    data = data.dropna(subset=['url', 'label'])
    
    # 4. Now that data is clean, convert to the correct types
    X = data['url'].astype(str)
    y = data['label'].astype(int)

except FileNotFoundError:
    print("Error: 'urls_dataset.csv' not found.")
    print("Creating a dummy file for demonstration. Please replace with real data.")
    # (Dummy data for testing if file is missing)
    data = pd.DataFrame({
        'url': ['http://www.google.com', 'http://login-secure-bank.com.xyz/verify'],
        'label': [0, 1]
    })
    X = data['url']
    y = data['label']
except Exception as e:
    print(f"Error loading or processing CSV: {e}")
    print("Please check your 'urls_dataset.csv' file for formatting errors.")
    exit()


print(f"Loaded and cleaned {len(data)} URLs for training.")

# --- 2. Feature Engineering (TF-IDF) ---
vectorizer = TfidfVectorizer(analyzer='char_wb', ngram_range=(3, 5), max_features=5000)

print("Vectorizing URLs...")
X_features = vectorizer.fit_transform(X)

print("Splitting data...")
# Split data for training and testing
X_train, X_test, y_train, y_test = train_test_split(
    X_features, y, test_size=0.2, random_state=42, stratify=y
)

# --- 3. Model Training (Logistic Regression) ---
model = LogisticRegression(random_state=42, solver='liblinear', class_weight='balanced')

print("Training model...")
model.fit(X_train, y_train)

# --- 4. Model Evaluation ---
print("Evaluating model...")
y_pred = model.predict(X_test)
print("\n--- Model Performance ---")
print(classification_report(y_test, y_pred, zero_division=0))
print("-------------------------\n")

# --- 5. Export Model for JavaScript ---
print("Exporting model...")
vocabulary = vectorizer.vocabulary_
coefficients = model.coef_[0]
intercept = model.intercept_[0]

model_weights = {}
for token, index in vocabulary.items():
    model_weights[token] = coefficients[index]

# Convert numpy types to standard Python types for JSON
model_export = {
    'vocabulary': {k: int(v) for k, v in vocabulary.items()},
    'weights': {k: float(v) for k, v in model_weights.items()},
    'intercept': float(intercept),
    'ngram_range': (3, 5),
    'max_features': 5000
}

with open('phishblock_model.json', 'w') as f:
    json.dump(model_export, f)

print(f"Successfully exported model to 'phishblock_model.json'")
print(f"Model has {len(model_weights)} feature weights and an intercept.")