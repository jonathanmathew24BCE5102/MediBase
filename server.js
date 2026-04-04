const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ─── DB CONFIG ────────────────────────────────────────────────────────────────
const pool = new Pool({
  user: "postgres",         // your PostgreSQL username
  host: "localhost",
  database: "hospitaldb",     // your database name
  password: "jnhacks18", // your PostgreSQL password
  port: 5432,
});

const query = (sql, params) => pool.query(sql, params);

// ─── LOGIN ────────────────────────────────────────────────────────────────────
// Change these credentials as you like
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
app.get("/api/patients",   async (_, res) => res.json((await query("SELECT * FROM Patient ORDER BY Patient_ID")).rows));
app.get("/api/doctors",    async (_, res) => res.json((await query("SELECT * FROM Doctor ORDER BY Doctor_ID")).rows));
app.get("/api/treatments", async (_, res) => res.json((await query("SELECT * FROM Treatment ORDER BY Treatment_ID")).rows));
app.get("/api/medicines",  async (_, res) => res.json((await query("SELECT * FROM Medicine ORDER BY Medicine_ID")).rows));

app.get("/api/appointments", async (_, res) => res.json((await query(`
  SELECT A.Appointment_ID, P.Name AS patient_name, D.Name AS doctor_name,
         A.Appointment_Date, A.Appointment_Time, A.Patient_ID, A.Doctor_ID
  FROM Appointment A
  JOIN Patient P ON A.Patient_ID = P.Patient_ID
  JOIN Doctor  D ON A.Doctor_ID  = D.Doctor_ID
  ORDER BY A.Appointment_Date
`)).rows));

app.get("/api/bills", async (_, res) => res.json((await query(`
  SELECT B.Bill_ID, P.Name AS patient_name, B.Bill_Date, B.Amount, B.Patient_ID
  FROM Bill B JOIN Patient P ON B.Patient_ID = P.Patient_ID
  ORDER BY B.Bill_Date
`)).rows));

app.get("/api/includes-treatment", async (_, res) => res.json((await query(`
  SELECT IT.Treatment_ID, T.Treatment_Name, IT.Appointment_ID,
         P.Name AS patient_name, D.Name AS doctor_name, A.Appointment_Date
  FROM Includes_Treatment IT
  JOIN Treatment  T ON IT.Treatment_ID   = T.Treatment_ID
  JOIN Appointment A ON IT.Appointment_ID = A.Appointment_ID
  JOIN Patient    P ON A.Patient_ID       = P.Patient_ID
  JOIN Doctor     D ON A.Doctor_ID        = D.Doctor_ID
  ORDER BY IT.Appointment_ID
`)).rows));

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
app.get("/api/analytics/revenue", async (_, res) =>
  res.json((await query("SELECT SUM(Amount) AS total FROM Bill")).rows[0]));

app.get("/api/analytics/patients-per-doctor", async (_, res) =>
  res.json((await query(`
    SELECT D.Name AS doctor_name, COUNT(A.Patient_ID) AS total
    FROM Doctor D JOIN Appointment A ON D.Doctor_ID = A.Doctor_ID
    GROUP BY D.Name ORDER BY total DESC
  `)).rows));

app.get("/api/analytics/medicine-cost", async (_, res) =>
  res.json((await query(`
    SELECT T.Treatment_Name, SUM(M.Price * M.Quantity) AS total_cost
    FROM Treatment T JOIN Medicine M ON T.Treatment_ID = M.Treatment_ID
    GROUP BY T.Treatment_Name ORDER BY total_cost DESC
  `)).rows));

// ─── INSERT ───────────────────────────────────────────────────────────────────
app.post("/api/patients", async (req, res) => {
  const { patient_id, name, age, gender, phone, address } = req.body;
  try { await query("INSERT INTO Patient VALUES ($1,$2,$3,$4,$5,$6)", [patient_id, name, age, gender, phone, address]); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.post("/api/doctors", async (req, res) => {
  const { doctor_id, name, specialization, phone, salary } = req.body;
  try { await query("INSERT INTO Doctor VALUES ($1,$2,$3,$4,$5)", [doctor_id, name, specialization, phone, salary]); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.post("/api/appointments", async (req, res) => {
  const { appointment_id, appointment_date, appointment_time, patient_id, doctor_id } = req.body;
  try { await query("INSERT INTO Appointment VALUES ($1,$2,$3,$4,$5)", [appointment_id, appointment_date, appointment_time, patient_id, doctor_id]); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.post("/api/bills", async (req, res) => {
  const { bill_id, bill_date, amount, patient_id } = req.body;
  try { await query("INSERT INTO Bill VALUES ($1,$2,$3,$4)", [bill_id, bill_date, amount, patient_id]); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.post("/api/medicines", async (req, res) => {
  const { medicine_id, medicine_name, price, quantity, treatment_id } = req.body;
  try { await query("INSERT INTO Medicine VALUES ($1,$2,$3,$4,$5)", [medicine_id, medicine_name, price, quantity, treatment_id]); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.post("/api/includes-treatment", async (req, res) => {
  const { treatment_id, appointment_id } = req.body;
  try { await query("INSERT INTO Includes_Treatment VALUES ($1,$2)", [treatment_id, appointment_id]); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// ─── UPDATE ───────────────────────────────────────────────────────────────────
app.put("/api/patients/:id", async (req, res) => {
  const { name, age, gender, phone, address } = req.body;
  try { await query("UPDATE Patient SET Name=$1,Age=$2,Gender=$3,Phone=$4,Address=$5 WHERE Patient_ID=$6", [name,age,gender,phone,address,req.params.id]); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.put("/api/doctors/:id", async (req, res) => {
  const { name, specialization, phone, salary } = req.body;
  try { await query("UPDATE Doctor SET Name=$1,Specialization=$2,Phone=$3,Salary=$4 WHERE Doctor_ID=$5", [name,specialization,phone,salary,req.params.id]); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.put("/api/appointments/:id", async (req, res) => {
  const { appointment_date, appointment_time, patient_id, doctor_id } = req.body;
  try { await query("UPDATE Appointment SET Appointment_Date=$1,Appointment_Time=$2,Patient_ID=$3,Doctor_ID=$4 WHERE Appointment_ID=$5", [appointment_date,appointment_time,patient_id,doctor_id,req.params.id]); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.put("/api/bills/:id", async (req, res) => {
  const { bill_date, amount, patient_id } = req.body;
  try { await query("UPDATE Bill SET Bill_Date=$1,Amount=$2,Patient_ID=$3 WHERE Bill_ID=$4", [bill_date,amount,patient_id,req.params.id]); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.put("/api/medicines/:id", async (req, res) => {
  const { medicine_name, price, quantity, treatment_id } = req.body;
  try { await query("UPDATE Medicine SET Medicine_Name=$1,Price=$2,Quantity=$3,Treatment_ID=$4 WHERE Medicine_ID=$5", [medicine_name,price,quantity,treatment_id,req.params.id]); res.json({ success: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// ─── DELETE ───────────────────────────────────────────────────────────────────
app.delete("/api/patients/:id",     async (req, res) => { try { await query("DELETE FROM Patient WHERE Patient_ID=$1",         [req.params.id]); res.json({success:true}); } catch(e){ res.status(400).json({error:e.message}); }});
app.delete("/api/doctors/:id",      async (req, res) => { try { await query("DELETE FROM Doctor WHERE Doctor_ID=$1",           [req.params.id]); res.json({success:true}); } catch(e){ res.status(400).json({error:e.message}); }});
app.delete("/api/appointments/:id", async (req, res) => { try { await query("DELETE FROM Appointment WHERE Appointment_ID=$1", [req.params.id]); res.json({success:true}); } catch(e){ res.status(400).json({error:e.message}); }});
app.delete("/api/bills/:id",        async (req, res) => { try { await query("DELETE FROM Bill WHERE Bill_ID=$1",               [req.params.id]); res.json({success:true}); } catch(e){ res.status(400).json({error:e.message}); }});
app.delete("/api/medicines/:id",    async (req, res) => { try { await query("DELETE FROM Medicine WHERE Medicine_ID=$1",       [req.params.id]); res.json({success:true}); } catch(e){ res.status(400).json({error:e.message}); }});

// ─── START ────────────────────────────────────────────────────────────────────
app.listen(3000, () => console.log("✅  Hospital DBMS running at http://localhost:3000"));
