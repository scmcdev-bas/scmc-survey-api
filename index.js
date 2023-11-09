const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
app.use(cors());
app.use(express.json());
const secretKey = "newSecretKey";
const fs = require("fs");
const { log } = require("console");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const xlsx = require("xlsx");
const pool = require("./src/db");
const {
  searchAgentData,
  searchManagerData,
  searchUser,
} = require("./src/search");
const userRoutes = require("./src/user");
const getDataFunction = require("./src/getdata"); // Assuming the getdata.js file is in the same directory

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

app.listen(3001, () => {
  console.log("Server is running on port 3001");
});
