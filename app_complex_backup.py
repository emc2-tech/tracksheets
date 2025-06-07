# flask application loads to this webpage; http://127.0.0.1:5000/

from flask import Flask, request, jsonify, render_template
import pandas as pd

app = Flask(__name__)

@app.route("/")
def home():
    return "Hello, Flask is running!"

# Load the table from an Excel file
def load_table():
    return pd.read_excel("table.xlsx")


@app.route("/get_table", methods=["GET"])
def get_table():
    df = load_table()
    return jsonify(df.to_dict(orient="records"))

@app.route("/save_table", methods=["POST"])
def save_table():
    data = request.json
    df = pd.DataFrame(data)
    df.to_excel("table.xlsx", index=False)  # Save changes
    return jsonify({"status": "success"})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)