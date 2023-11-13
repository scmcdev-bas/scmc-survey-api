const https = require("https");
const express = require("express");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const xlsx = require("xlsx");
const pool = require("./src/db");
const userRoutes = require("./src/user");
const getDataFunction = require("./src/getdata");
const cors = require("cors"); 

const privateKey = "your_private_key_here"; // Add your private key
const certificate = "your_certificate_here"; // Add your certificate

const credentials = {
  key: privateKey,
  cert: certificate,
};

const app = express();

const secretKey = "newSecretKey";
const upload = multer({ dest: "uploads/" });

const {
  searchAgentData,
  searchManagerData,
  searchUser,
} = require("./src/search");

app.post("/searchagentdata", searchAgentData);
app.post("/searchmanagerdata", searchManagerData);
app.post("/searchuser", searchUser);

app.post("/login", userRoutes.login);
app.post("/adduser", userRoutes.addUser);
app.post("/verifyadmin", userRoutes.verifyAdmin);
app.post("/verifyuser", userRoutes.verifyUser);
app.post("/verifylogin", userRoutes.verifyLogin);

app.post("/getdatasetadmin", getDataFunction.getDataSetAdmin);
app.post("/getdataset", getDataFunction.getDataSet);
app.post("/getdataset2", getDataFunction.getDataSet2);
app.post("/getdatasetpercentage", getDataFunction.getDataSetPercentage);
app.post(
  "/getdatasetpercentageadmin",
  getDataFunction.getDataSetPercentageAdmin
);
app.post("/getagent", getDataFunction.getAgent);
app.post("/getsupervisor", getDataFunction.getSupervisor);
app.post("/getpointreport", getDataFunction.getPointReport);
app.post("/searchfromid", getDataFunction.searchFromId);
app.post("/getsummarypointreport", getDataFunction.getSummaryPointReport);
app.post("/getdatafotsearchgharp", getDataFunction.getDataForSearchGharp);
app.post(
  "/getdataforsearchpercentage",
  getDataFunction.getDataForSearchPercentage
);

app.post("/insertagent", upload.single("file"), (req, res) => {
  jwt.verify(req.query.token, secretKey, async (err) => {
    if (err) {
      console.error("Invalid token:", err);
      res.status(200).json({ success: false, message: "Invalid token" });
    } else {
      try {
        const name = req.query.USERNAME;

        const file = req.file;

        if (!file) {
          res.status(400).json({ message: "File to upload not found." });
          return;
        }

        const workbook = xlsx.read(file.buffer, { type: "buffer" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(worksheet);

        const connection = await pool.getConnection();

        try {
          await connection.beginTransaction();

          for (const row of data) {
            const date = new Date();
            const formattedDate = date
              .toISOString()
              .slice(0, 19)
              .replace("T", " ");

            const insertQuery = `
              INSERT INTO EMPLOYEE (EMP_FIRSTNAME, EMP_LASTNAME, ROLE_ID, DIVISION_ID, CREATE_BY, INSERT_DATE)
              VALUES (?, ?, ?, ?, ?, ?)`;

            const insertValues = [
              row.EMP_FIRSTNAME,
              row.EMP_LASTNAME,
              row.ROLE_ID,
              row.DIVISION_ID,
              name,
              formattedDate,
            ];

            await connection.query(insertQuery, insertValues);
          }

          await connection.commit();
          res.status(200).json({ message: "Upload data success." });
        } catch (error) {
          console.error(error);
          await connection.rollback();
          res.status(500).json({ message: "Error while insert data." });
        } finally {
          connection.release();
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({
          message: "Error while processing the file. Please check your file.",
        });
      }
    }
  });
});
app.use(cors()); 
const httpsServer = https.createServer(credentials, app);

httpsServer.listen(3001, () => {
  console.log("Server is running on port 3001 (HTTPS)");
});

