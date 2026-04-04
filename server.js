const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ─── DB CONFIG (FIXED FOR LOCAL + RENDER) ─────────────────────────────────────
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgres://postgres:jnhacks18@localhost:5432/hospitaldb",
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false,
});

const query = (sql, params) => pool.query(sql, params);

// ─── LOGIN ────────────────────────────────────────────────────────────────────
const CREDENTIALS = { username: "admin", password: "hospital123" };

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (username === CREDENTIALS.username && password === CREDENTIALS.password) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Invalid username or password" });
  }
});

// ─── GET ALL TABLES ───────────────────────────────────────────────────────────
app.get("/api/patients", async (_, res) =>
  res.json((await query("SELECT * FROM Patient ORDER BY Patient_ID")).rows)
);

app.get("/api/doctors", async (_, res) =>
  res.json((await query("SELECT * FROM Doctor ORDER BY Doctor_ID")).rows)
);

app.get("/api/treatments", async (_, res) =>
  res.json((await query("SELECT * FROM Treatment ORDER BY Treatment_ID")).rows)
);

app.get("/api/medicines", async (_, res) =>
  res.json((await query("SELECT * FROM Medicine ORDER BY Medicine_ID")).rows)
);

app.get("/api/appointments", async (_, res) =>
  res.json(
    (
      await query(`
  SELECT A.Appointment_ID, P.Name AS patient_name, D.Name AS doctor_name,
         A.Appointment_Date, A.Appointment_Time, A.Patient_ID, A.Doctor_ID
  FROM Appointment A
  JOIN Patient P ON A.Patient_ID = P.Patient_ID
  JOIN Doctor  D ON A.Doctor_ID  = D.Doctor_ID
  ORDER BY A.Appointment_Date
`)
    ).rows
  )
);

app.get("/api/bills", async (_, res) =>
  res.json(
    (
      await query(`
  SELECT B.Bill_ID, P.Name AS patient_name, B.Bill_Date, B.Amount, B.Patient_ID
  FROM Bill B JOIN Patient P ON B.Patient_ID = P.Patient_ID
  ORDER BY B.Bill_Date
`)
    ).rows
  )
);

app.get("/api/includes-treatment", async (_, res) =>
  res.json(
    (
      await query(`
  SELECT IT.Treatment_ID, T.Treatment_Name, IT.Appointment_ID,
         P.Name AS patient_name, D.Name AS doctor_name, A.Appointment_Date
  FROM Includes_Treatment IT
  JOIN Treatment  T ON IT.Treatment_ID   = T.Treatment_ID
  JOIN Appointment A ON IT.Appointment_ID = A.Appointment_ID
  JOIN Patient    P ON A.Patient_ID       = P.Patient_ID
  JOIN Doctor     D ON A.Doctor_ID        = D.Doctor_ID
  ORDER BY IT.Appointment_ID
`)
    ).rows
  )
);

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
app.get("/api/analytics/revenue", async (_, res) =>
  res.json((await query("SELECT SUM(Amount) AS total FROM Bill")).rows[0])
);

app.get("/api/analytics/patients-per-doctor", async (_, res) =>
  res.json(
    (
      await query(`
    SELECT D.Name AS doctor_name, COUNT(A.Patient_ID) AS total
    FROM Doctor D JOIN Appointment A ON D.Doctor_ID = A.Doctor_ID
    GROUP BY D.Name ORDER BY total DESC
  `)
    ).rows
  )
);

app.get("/api/analytics/medicine-cost", async (_, res) =>
  res.json(
    (
      await query(`
    SELECT T.Treatment_Name, SUM(M.Price * M.Quantity) AS total_cost
    FROM Treatment T JOIN Medicine M ON T.Treatment_ID = M.Treatment_ID
    GROUP BY T.Treatment_Name ORDER BY total_cost DESC
  `)
    ).rows
  )
);

// ─── INSERT ───────────────────────────────────────────────────────────────────
app.post("/api/patients", async (req, res) => {
  const { patient_id, name, age, gender, phone, address } = req.body;
  try {
    await query("INSERT INTO Patient VALUES ($1,$2,$3,$4,$5,$6)", [
      patient_id,
      name,
      age,
      gender,
      phone,
      address,
    ]);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/api/doctors", async (req, res) => {
  const { doctor_id, name, specialization, phone, salary } = req.body;
  try {
    await query("INSERT INTO Doctor VALUES ($1,$2,$3,$4,$5)", [
      doctor_id,
      name,
      specialization,
      phone,
      salary,
    ]);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

app.listen(PORT, () =>
  console.log(`✅ Server running on port ${PORT}`)
);