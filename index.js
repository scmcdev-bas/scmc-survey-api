const fs = require("fs");
const https = require("https");
const http = require("http");
const express = require("express");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const xlsx = require("xlsx");
const pool = require("./src/db");
const cors = require("cors");
const privateKey = fs.readFileSync("./private.key", "utf8");
const bodyParser = require("body-parser");
const certificate = fs.readFileSync("./server.crt", "utf8");
const insertSurvey = require('./src/insertSurvet')
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
const userRoutes = require("./src/user");
const getDataFunction = require("./src/getdata");

app.use(
  cors({
    // origin: "https://localhost:2063", // Remove the trailing slash
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
    optionsSuccessStatus: 204,
  })
);
app.use(bodyParser.json()); 
app.post("/searchagentdata", searchAgentData);
app.post("/searchmanagerdata", searchManagerData);
app.post("/searchuser", searchUser);

app.post("/login", userRoutes.login);
app.post("/adduser", userRoutes.addUser);
app.post("/verifyadmin", userRoutes.verifyAdmin);
app.post("/verifyuser", userRoutes.verifyUser);
app.post("/verifylogin", userRoutes.verifyLogin);

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
app.post("/surveyinsert",insertSurvey.insertSurvey)
app.post("/insertagent", upload.single("file"), (req, res) => {
  jwt.verify(req.query.token, secretKey, async (err) => {
    if (err) {
      console.error("Invalid token:");
      res.status(200).json(false, "Invalid token");
    } else {
      try {
        const name = req.query.USERNAME;

        const file = req.file;

        if (!file) {
          res.status(400).json({ message: "File to upload not found." });
          return;
        }

        const workbook = xlsx.readFile(file.path);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(worksheet);

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
          const request = new sql.Request(transaction);
          for (const row of data) {
            const date = new Date();
            const formattedDate = date
              .toISOString()
              .replace("T", " ")
              .substring(0, 19);
            await request.query(
              `INSERT INTO EMPLOYEE (EMP_FIRSTNAME,EMP_LASTNAME, ROLE_ID, DIVISION_ID,CREATE_BY,INSERT_DATE) VALUES ('${row.EMP_FIRSTNAME}', '${row.EMP_LASTNAME}', '${row.ROLE_ID}', '${row.DIVISION_ID}', '${name}', '${formattedDate}')`
            );
          }

          await transaction.commit();
          res.status(200).json({ message: "Upload data success." });
        } catch (error) {
          console.error(error);
          await transaction.rollback();
          res.status(500).json({ message: "Error while insert data." });
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

const httpsServer = https.createServer(credentials, app);

httpsServer.listen(2083, () => {
  console.log("Server is running on port 2083 (HTTPS)");
});
// const httpServer = http.createServer(app);

// httpServer.listen(2083, () => {
//   console.log("Server is running on port 2083 (HTTP)");
// });