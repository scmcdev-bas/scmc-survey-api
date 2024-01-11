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
const insertSurvey = require("./src/insertSurvet");
const credentials = {
  key: privateKey,
  cert: certificate,
};
const app = express();
const { Buffer } = require("buffer");
const secretKey = "newSecretKey";
const upload = multer({ dest: "uploads/" });
const {
  searchAgentData,
  searchManagerData,
  searchUser,
  deleteAgent,
  deleteUser,
  getNoAgentData,
  searchTeam,
  deleteTeam,
  editTeam,
  newTeam,
  editAgent
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
app.post("/deleteagent", deleteAgent);
app.post("/deleteuser", deleteUser);
app.post("/getnoagentdata",getNoAgentData)
app.post("/searchTeam", searchTeam);
app.post("/deleteteam", deleteTeam);
app.post("/editteam", editTeam);
app.post("/newteam", newTeam);
app.post("/editagent",editAgent)


app.post("/login", userRoutes.login);
app.post("/adduser", userRoutes.addUser);
app.post("/verifyadmin", userRoutes.verifyAdmin);
app.post("/verifyuser", userRoutes.verifyUser);
app.post("/verifylogin", userRoutes.verifyLogin);
app.post("/changepassword", userRoutes.changePassword);



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
app.post("/getsummarypointreport", getDataFunction.getSummaryPonintReport);
app.post("/getdatafotsearchgharp", getDataFunction.getDataForSearchGharp);
app.post("/getqueusname", getDataFunction.getQueusName);
app.post("/newqueus", getDataFunction.newQueus);
app.post("/deletequeus",getDataFunction.deleteQueus)
app.post("/getdatasetadmin",getDataFunction.getDataSetAdmin)

app.post(
  "/getdataforsearchpercentage",
  getDataFunction.getDataForSearchPercentage
);
app.post("/surveyinsert", insertSurvey.insertSurvey);
app.post("/insertagent", upload.single("file"), async (req, res) => {
  try {
    jwt.verify(req.query.token, secretKey, async (err, decoded) => {
      if (err) {
        console.error("Invalid token:", err);
        res.status(401).json({ success: false, message: "Invalid token" });
      } else {
        try {
          const name = decoded.userName;
          const file = req.file;

          if (!file) {
            return res
              .status(400)
              .json({ message: "File to upload not found." });
          }

          const workbook = xlsx.readFile(file.path);
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const data = xlsx.utils.sheet_to_json(worksheet);
          const isAddUser = req.query.isAddUser;

          try {
            pool.getConnection((err, connection) => {
              if (err) {
                console.error("Error connecting to database: ", err);
                return res
                  .status(500)
                  .json({ error: "Error connecting to the database." });
              }

              const date = new Date();
              const formattedDate = date
                .toISOString()
                .replace("T", " ")
                .substring(0, 19);
              const checkquery = `SELECT * FROM EMPLOYEE WHERE EMP_ID = ?;`;
              const query = `INSERT INTO EMPLOYEE (EMP_ID, EMP_FIRSTNAME, EMP_LASTNAME, ROLE_ID, DIVISION_ID, CREATE_BY, INSERT_DATE) 
                VALUES (?, ?, ?, ?, ?, ?, ?);
              `;
              const userQuery = `INSERT INTO USER_PASSWORD (USERNAME, PASSWORD, EMP_ID, INSERT_DATE) 
                VALUES (?, ?, ?, ?);
              `;

              const queryPromises = data.map((row) => {
                return new Promise((resolve, reject) => {
                  connection.query(
                    checkquery,
                    [row.EMP_ID],
                    (error, result) => {
                      if (error) {
                        console.error(error);
                        reject(error);
                      } else if (result.length === 0) {
                        connection.query(
                          query,
                          [
                            row.EMP_ID,
                            row.EMP_FIRSTNAME,
                            row.EMP_LASTNAME,
                            row.ROLE_ID,
                            row.DIVISION_ID,
                            name,
                            formattedDate,
                          ],
                          (error, result) => {
                            if (error) {
                              console.error(error);
                              reject(error);
                            } else {
                              resolve(result);
                            }
                          }
                        );
                      } else {
                        resolve({
                          message: `EMP_ID ${row.EMP_ID} already exists.`,
                        });
                      }
                    }
                  );
                });
              });

              let userQueryPromises;

              if (isAddUser === "true") {
                userQueryPromises = data.map((row) => {
                  return new Promise((resolve, reject) => {
                    const checkUserQuery = `SELECT * FROM USER_PASSWORD WHERE EMP_ID = ?;`;

                    connection.query(
                      checkUserQuery,
                      [row.EMP_ID],
                      (checkError, checkResult) => {
                        if (checkError) {
                          console.error(checkError);
                          reject(checkError);
                        } else if (checkResult.length === 0) {
                          connection.query(
                            userQuery,
                            [
                              row.EMP_ID,
                              Buffer.from("password").toString("base64"),
                              row.EMP_ID,
                              formattedDate,
                            ],
                            (error, result) => {
                              if (error) {
                                console.error(error);
                                reject(error);
                              } else {
                                resolve(result);
                              }
                            }
                          );
                        } else {
                          resolve({
                            message: `EMP_ID ${row.EMP_ID} already has a user password.`,
                          });
                        }
                      }
                    );
                  });
                });
              }

              Promise.all([...queryPromises, ...(userQueryPromises || [])])
                .then((results) => {
                  res
                    .status(200)
                    .json({ message: "Upload data success.", results });
                })
                .catch((error) => {
                  console.error(error);
                  res.status(400).json({ error: "Error while querying data." });
                })
                .finally(() => {
                  connection.release();
                });
            });
          } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error while inserting data." });
          }
        } catch (error) {
          console.error(error);
          res.status(500).json({
            message: "Error while processing the file. Please check your file.",
          });
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

const httpsServer = https.createServer(credentials, app);

httpsServer.listen(2083, () => {
  console.log("Server is running on port 2083 (HTTPS)");
});
// const httpServer = http.createServer(app);

// httpServer.listen(2083, () => {
//   console.log("Server is running on port 2083 (HTTP)");
// });
