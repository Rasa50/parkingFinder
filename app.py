from flask import Flask, render_template, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from urllib.parse import quote_plus 

app = Flask(__name__)

# --- KONFIGURASI DATABASE ---
# Sesuaikan password postgresql kamu
password_db = '123' 
encoded_pass = quote_plus(password_db)
app.config['SQLALCHEMY_DATABASE_URI'] = f'postgresql://postgres:{encoded_pass}@localhost:5432/parking'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

class ParkingSlot(db.Model):
    __tablename__ = 'parking_slots'
    id = db.Column(db.String(10), primary_key=True) # Slot 1, Slot 2...
    floor = db.Column(db.Integer, default=1)
    status = db.Column(db.String(20), default='empty')
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)

class ParkingLog(db.Model):
    __tablename__ = 'parking_logs'
    id = db.Column(db.Integer, primary_key=True)
    slot_id = db.Column(db.String(10), db.ForeignKey('parking_slots.id'))
    action = db.Column(db.String(20))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

def init_db():
    with app.app_context():
        db.drop_all() # Reset total biar bersih
        db.create_all()
        
        if not ParkingSlot.query.first():
            print("Mengisi Database Sesuai Peta Excel...")
            
            # === LANTAI 1 (Slot 1 - 14) ===
            for i in range(1, 15):
                db.session.add(ParkingSlot(id=f'Slot {i}', floor=1, status='empty'))
            
            # === LANTAI 2 (Slot 15 - 67) ===
            for i in range(15, 68):
                db.session.add(ParkingSlot(id=f'Slot {i}', floor=2, status='empty'))
                
            db.session.commit()
            print(f"Berhasil membuat {67} slot parkir!")

init_db()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/slots", methods=["GET"])
def get_slots():
    slots = ParkingSlot.query.all()
    result = {slot.id: slot.status for slot in slots}
    return jsonify(result)

@app.route("/api/update", methods=["POST"])
def update_slot():
    data = request.json
    slot_id = data.get('id')
    new_status = data.get('status')
    
    slot = ParkingSlot.query.get(slot_id)
    if slot:
        slot.status = new_status
        slot.last_updated = datetime.utcnow()
        action = "ENTRY" if new_status == "occupied" else "EXIT"
        db.session.add(ParkingLog(slot_id=slot_id, action=action))
        db.session.commit()
        return jsonify({"message": "Success", "id": slot_id, "status": new_status})
    return jsonify({"message": "Slot not found"}), 404

if __name__ == "__main__":
    app.run(debug=True)