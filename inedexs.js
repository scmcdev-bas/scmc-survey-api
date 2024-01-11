app.post("/searchagentdata", (req, res) => {
    jwt.verify(req.body.token, secretKey, (err) => {
      if (err) {
        console.error("Invalid token:");
        res.status(200).json(false, "Invalid token");
      } else {
        try {
          const request = new sql.Request(pool);
          const agentname = req.body.search;
          request
            .input("agentname", sql.NVarChar, agentname)
            .query(
              "SELECT EMPLOYEE.EMP_ID AS agentID, EMPLOYEE.EMP_FIRSTNAME as AGENT_NAME, DIVISION.DIVISION_NAME , EMPLOYEE2.EMP_FIRSTNAME  as SUPERVISOR_NAME FROM EMPLOYEE JOIN DIVISION ON EMPLOYEE.DIVISION_ID = DIVISION.DIVISION_ID JOIN EMPLOYEE AS EMPLOYEE2 ON EMPLOYEE.DIVISION_ID = EMPLOYEE2.DIVISION_ID AND EMPLOYEE2.ROLE_ID = '2' WHERE EMPLOYEE.ROLE_ID = '3' AND EMPLOYEE.EMP_FIRSTNAME LIKE '%' + @agentname + '%'",
              (error, result) => {
                if (error) {
                  console.log(error);
                  res.status(400).json("Error while query data.");
                } else {
                  const data = result.recordset;
                  res.status(200).json(data);
                }
              }
            );
        } catch (error) {
          console.log(error);
          res.status(500).json("Error while connect Database.");
        }
      }
    });
  });
  app.post("/searchmanagerdata", (req, res) => {
    jwt.verify(req.body.token, secretKey, (err) => {
      if (err) {
        console.error("Invalid token:");
        res.status(200).json(false, "Invalid token");
      } else {
        try {
          const request = new sql.Request(pool);
          const managername = req.body.search;
          request
            .input("managername", sql.NVarChar, managername)
            .query(
              "SELECT EMPLOYEE.EMP_ID AS agentID, EMPLOYEE.EMP_FIRSTNAME as AGENT_NAME,DIVISION.DIVISION_ID, DIVISION.DIVISION_NAME FROM EMPLOYEE JOIN DIVISION ON EMPLOYEE.DIVISION_ID = DIVISION.DIVISION_ID WHERE EMPLOYEE.ROLE_ID = '2' AND EMPLOYEE.EMP_FIRSTNAME LIKE '%' + @managername + '%'",
              (error, result) => {
                if (error) {
                  console.log(error);
                  res.status(400).json("Error while query data.");
                } else {
                  res.status(200).json(result.recordset);
                }
              }
            );
        } catch (error) {
          console.log(error);
          res.status(500).json("Error while connect Database.");
        }
      }
    });
  });
  app.post("/searchuser", (req, res) => {
    jwt.verify(req.body.token, secretKey, (err) => {
      if (err) {
        console.error("Invalid token:");
        res.status(200).json(false, "Invalid token");
      } else {
        try {
          const request = new sql.Request(pool);
          const userName = req.body.searchUsername;
          const userFullname = req.body.searchName;
          const userRole = req.body.searchRole;
          request
            .input("userName", sql.NVarChar, userName)
            .input("userFullname", sql.NVarChar, userFullname)
            .input("userRole", sql.NVarChar, userRole)
            .query(
              "SELECT USER_PASSWORD.INSERT_DATE,USER_PASSWORD.USERNAME,EMPLOYEE.EMP_FIRSTNAME, ROLE.ROLE_NAME FROM USER_PASSWORD JOIN EMPLOYEE ON EMPLOYEE.EMP_ID = USER_PASSWORD.EMP_ID JOIN ROLE ON ROLE.ROLE_ID = EMPLOYEE.ROLE_ID WHERE USER_PASSWORD.USERNAME LIKE '%' + @userName + '%' AND EMPLOYEE.EMP_FIRSTNAME LIKE '%' + @userFullname + '%' AND ROLE.ROLE_ID LIKE '%' + @userRole + '%'",
              (error, result) => {
                if (error) {
                  console.log(error);
                  res.status(400).json("Error while query data.");
                } else {
                  const data = result.recordset;
                  data.forEach((obj) => {
                    const date = new Date(obj.INSERT_DATE);
                    const dateString = date.toISOString().split("T")[0];
                    obj.INSERT_DATE = dateString;
                  });
                  res.status(200).json(data);
                }
              }
            );
        } catch (error) {
          console.log(error);
          res.status(500).json("Error while connect Database.");
        }
      }
    });
  });
  //this is function that will start when user call port 3001 and using path login for login page
  //that check username is in database or not if true will check pass word and user role.
  app.post("/login", (req, res) => {
    const { username, password } = req.body;
    try {
      const request = new sql.Request(pool);
      const newPassword = btoa(password);
      request
        .input("username", sql.NVarChar, username)
        .query(
          "SELECT USER_PASSWORD.USERNAME,USER_PASSWORD.PASSWORD, ROLE.ROLE_NAME,EMPLOYEE.DIVISION_ID FROM USER_PASSWORD JOIN EMPLOYEE ON EMPLOYEE.EMP_ID = USER_PASSWORD.EMP_ID JOIN ROLE ON EMPLOYEE.ROLE_ID = ROLE.ROLE_ID WHERE USER_PASSWORD.USERNAME = @username;",
          (error, results) => {
            if (error) {
              console.log(error);
              res.status(500).json({ error: "Error while query data." });
            } else {
              if (
                results.recordset.length === 1 &&
                newPassword === results.recordset[0].PASSWORD
              ) {
                var userPermission = "";
                if (results.recordset[0].ROLE_NAME === "admin") {
                  userPermission = "admin";
                } else {
                  userPermission = "user";
                }
                const token = jwt.sign(
                  {
                    userName: results.recordset[0].USERNAME,
                    userRole: results.recordset[0].ROLE_NAME,
                    userPermission: userPermission,
                    userID: results.recordset[0].EMP_ID,
                    DIVISION_ID: results.recordset[0].DIVISION_ID,
                  },
                  secretKey
                );
                const response = {
                  data: userPermission,
                  token: token,
                };
                res.status(200).json({ response });
              } else if (username === "" || password === "") {
                res
                  .status(401)
                  .json({ error: "Please enter your Username and Password" });
              } else {
                res.status(401).json({ error: "Invalid Username or Password" });
                const logMessage = `${new Date().toISOString()}: มีการพยายามเข้าสู่ระบบด้วยชื่อผู้ใช้งาน ${username} ได้เข้าสู่ระบบ \n`;
                fs.writeFileSync("request.log", logMessage, { flag: "a+" });
              }
            }
          }
        );
    } catch (error) {
      res.status(500).json({ error: "Please check your Username and Password" });
      const logMessage = `${new Date().toISOString()}: เกิดข้อผิดพลาด ${error} ในการเข้าสู่ระบบ \n`;
      fs.writeFileSync("request.log", logMessage, { flag: "a+" });
    }
  });
  //this is function that will start when user call port 3001 and using path adduser
  //that check that user is in database alredy or not if not in database it will add userdata into database.
  app.post("/adduser", (req, res) => {
    jwt.verify(req.body.token, secretKey, (err, decoded) => {
      if (err) {
        console.error("Invalid token:");
        res.status(200).json(false, "Invalid token");
      } else {
        data = req.body.userData;
        try {
          //get date
          const moment = require("moment");
          const currentDate = moment().format("YYYY-MM-DD HH:mm:ss.SSS");
          //create connection
          const request = new sql.Request(pool);
          request
            .input("username", sql.NVarChar, data.username)
            .query(
              "SELECT * FROM USER_PASSWORD WHERE USERNAME = @username",
              (error, results) => {
                if (error) {
                  res.status(500).json({ error: "Error while query data." });
                } else {
                  //this check that not have this user in database
                  if (results.recordset.length === 0) {
                    try {
                      request
                        .input("agentID", sql.NVarChar, data.agentID)
                        .query(
                          "SELECT * FROM EMPLOYEE WHERE EMP_ID = @agentID",
                          (error, results) => {
                            if (error) {
                              res
                                .status(500)
                                .json({ error: "Error while query data." });
                            } else {
                              //this check that not have this user in database
                              if (results.recordset.length === 1) {
                                try {
                                  request
                                    .input(
                                      "insertusername",
                                      sql.NVarChar,
                                      data.username
                                    )
                                    .input("EMP_ID", sql.NVarChar, data.agentID)
                                    .input(
                                      "insertcurrentDate",
                                      sql.NVarChar,
                                      currentDate
                                    )
                                    .input(
                                      "insertpassword",
                                      sql.NVarChar,
                                      btoa(data.password)
                                    )
                                    .query(
                                      "INSERT INTO USER_PASSWORD (USERNAME,EMP_ID,PASSWORD, INSERT_DATE) VALUES (@insertusername, @EMP_ID, @insertpassword, @insertcurrentDate)",
                                      (insertError, insertResults) => {
                                        if (insertError) {
                                          console.log(insertError);
  
                                          res.status(400).json({
                                            message: "Error while insert data.",
                                          });
                                        } else {
                                          res.status(201).json({
                                            message: "Success",
                                            success: true,
                                          });
                                          const logMessage = `${new Date().toISOString()}: มีการนำเข้าข้อมูลด้วยชื่อผู้ใช้งาน ${
                                            data.username
                                          } สำเร็จ \n`;
                                          fs.writeFileSync(
                                            "insert_User.log",
                                            logMessage,
                                            {
                                              flag: "a+",
                                            }
                                          );
                                        }
                                      }
                                    );
                                } catch (error) {
                                  res.status(400).json({
                                    message:
                                      "Error while insert data (Please try use password in english and makesure User id is number.). ",
                                  });
                                }
                              } else {
                                res
                                  .status(201)
                                  .json({ message: "User ID not found." });
                              }
                            }
                          }
                        );
                    } catch (error) {
                      console.log(error);
                    }
                  } else {
                    res.status(201).json({ message: "This user is used" });
                  }
                }
              }
            );
        } catch (error) {
          res.status(500).json({ error: "Error while query data." });
        }
      }
    });
  });
  //this is function that will start when user call port 3001 and using path verifyadmin
  //check userRole that is admin or not if true will allow to use adminpage if not will giveback to loginpage
  app.post("/verifyadmin", (req, res) => {
    jwt.verify(req.body.token, secretKey, (err, decoded) => {
      if (err) {
        console.error("Invalid token:");
        res.status(200).json(false, "Invalid token");
      } else if (decoded.userPermission != "admin") {
        res.status(200).json(false);
      } else res.status(200).json(decoded.userName);
    });
  });
  //this is function that will start when user call port 3001 and using path verifyuser
  //same as verifyadmin but check Role user
  app.post("/verifyuser", (req, res) => {
    jwt.verify(req.body.token, secretKey, (err, decoded) => {
      if (err) {
        console.error("Invalid token:");
        res.status(200).json(false, "Invalid token");
      } else if (decoded.userPermission != "user") {
        res.status(200).json(false);
      } else res.status(200).json(decoded.userName);
    });
  });
  //check that user login already or not
  app.post("/verifylogin", (req, res) => {
    jwt.verify(req.body.token, secretKey, (err, decoded) => {
      if (err) {
      } else if (decoded.userRole === "admin") {
        res.status(200).json("admin");
      } else if (decoded.userRole === "user") {
        res.status(200).json("user");
      } else res.status(200).json(decoded.userName);
    });
  });
  app.post("/getdataset", (req, res) => {
    jwt.verify(req.body.token, secretKey, (err, decoded) => {
      if (err) {
        console.error("Invalid token:");
        res.status(200).json(false, "Invalid token");
      } else {
        if (decoded.userRole === "supervisor") {
          try {
            const currentDate = new Date()
              .toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
              .split(", ")[0];
            const request = new sql.Request(pool);
            request
              .input("currentDate", sql.NVarChar, currentDate)
              .input("DIVISION_ID", sql.NVarChar, decoded.DIVISION_ID)
              .query(
                "SELECT IVR_SURVEY_TRANS.SURVEY_TOPIC AS name, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 5 THEN 1 ELSE NULL END) AS Score5, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 4 THEN 1 ELSE NULL END) AS Score4, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 3 THEN 1 ELSE NULL END) AS Score3, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 2 THEN 1 ELSE NULL END) AS Score2, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 1 THEN 1 ELSE NULL END) AS Score1 FROM IVR_SURVEY_TRANS JOIN EMPLOYEE ON EMPLOYEE.EMP_ID = IVR_SURVEY_TRANS.AGENT_ID WHERE SURVEY_TOPIC <> '' AND EMPLOYEE.DIVISION_ID = @DIVISION_ID AND SURVEY_DATETIME >= @currentDate AND SURVEY_DATETIME <= DATEADD(day, 1, @currentDate) GROUP BY SURVEY_TOPIC;",
                (error, result) => {
                  if (error) {
                    console.log(error);
                    res.status(400).json("Error while query data.");
                  } else {
                    res.status(200).json(result.recordset);
                  }
                }
              );
          } catch (error) {
            console.log(error);
            res.status(500).json("Error while connect database.");
          }
        } else if (decoded.userRole === "manager") {
          try {
            const currentDate = new Date()
              .toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
              .split(", ")[0];
            const request = new sql.Request(pool);
            request
              .input("currentDate", sql.NVarChar, currentDate)
              .input("DIVISION_ID", sql.NVarChar, decoded.DIVISION_ID)
              .query(
                "SELECT IVR_SURVEY_TRANS.SURVEY_TOPIC AS name, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 5 THEN 1 ELSE NULL END) AS Score5, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 4 THEN 1 ELSE NULL END) AS Score4, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 3 THEN 1 ELSE NULL END) AS Score3, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 2 THEN 1 ELSE NULL END) AS Score2, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 1 THEN 1 ELSE NULL END) AS Score1 FROM IVR_SURVEY_TRANS JOIN EMPLOYEE ON EMPLOYEE.EMP_ID = IVR_SURVEY_TRANS.AGENT_ID WHERE SURVEY_TOPIC <> '' AND  SURVEY_DATETIME >= @currentDate AND SURVEY_DATETIME <= DATEADD(day, 1, @currentDate) GROUP BY SURVEY_TOPIC;",
                (error, result) => {
                  if (error) {
                    console.log(error);
                    res.status(400).json("Error while query data.");
                  } else {
                    res.status(200).json(result.recordset);
                  }
                }
              );
          } catch (error) {
            console.log(error);
            res.status(500).json("Error while connect database.");
          }
        }
      }
    });
  });
  app.post("/getdataset2", async (req, res) => {
    try {
      const { topics, startDate, endDate } = req.body;
  
      const topicParams = {
        T1115: topics.includes("1115") ? "1115" : null,
        ATM: topics.includes("ATM") ? "ATM" : null,
        CreditCard: topics.includes("CreditCard") ? "CreditCard" : null,
        MYMO: topics.includes("MYMO") ? "MYMO" : null,
        MYMO: topics.includes("MYMO") ? "MYMO" : null,
      };
      console.log(endDate)
      const query = `
        SELECT IVR_SURVEY_TRANS.SURVEY_TOPIC AS name,
          COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 5 THEN 1 ELSE NULL END) AS 'SCORE : 5',
          COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 4 THEN 1 ELSE NULL END) AS 'SCORE : 4',
          COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 3 THEN 1 ELSE NULL END) AS 'SCORE : 3',
          COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 2 THEN 1 ELSE NULL END) AS 'SCORE : 2',
          COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 1 THEN 1 ELSE NULL END) AS 'SCORE : 1'
        FROM IVR_SURVEY_TRANS
        JOIN EMPLOYEE ON EMPLOYEE.EMP_ID = IVR_SURVEY_TRANS.AGENT_ID
        WHERE (SURVEY_TOPIC = @T1115 OR SURVEY_TOPIC = @ATM OR SURVEY_TOPIC = @CreditCard OR SURVEY_TOPIC = @MYMO)
          AND SURVEY_TOPIC <> '' AND
          IVR_SURVEY_TRANS.SURVEY_DATETIME >= @startDate AND IVR_SURVEY_TRANS.SURVEY_DATETIME <= DATEADD(day, 1, @endDate)
        GROUP BY SURVEY_TOPIC;
      `;
  
      const pool = await sql.connect(config);
      const request = pool.request();
  
      for (const paramName in topicParams) {
        const paramValue = topicParams[paramName];
        request.input(paramName, sql.NVarChar, paramValue);
      }
      request.input('startDate', sql.DateTime, startDate);
      request.input('endDate', sql.DateTime, endDate);
  
      const result = await request.query(query);
      res.status(200).json(result.recordset);
      console.log(result.recordset)
    } catch (error) {
      console.log(error);
      res.status(500).json("Error while connecting to the database.");
    }
  });
  
  
  
  app.post("/getdatasetpercentage", (req, res) => {
    jwt.verify(req.body.token, secretKey, (err, decoded) => {
      if (err) {
        console.error("Invalid token:");
        res.status(200).json(false, "Invalid token");
      } else {
        const currentDate = new Date()
          .toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
          .split(", ")[0];
        const request = new sql.Request(pool);
        if (decoded.userRole === "supervisor") {
          try {
            request
              .input("currentDate", sql.NVarChar, currentDate)
              .input("DIVISION_ID", sql.NVarChar, decoded.DIVISION_ID)
              .query(
                "SELECT COUNT(IVR_SURVEY_TRANS.Score) AS scorelength, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 98 THEN 1 ELSE NULL END)  AS nodata, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 5 THEN 1 ELSE NULL END)  AS Score5, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 4 THEN 1 ELSE NULL END)  AS Score4, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 3 THEN 1 ELSE NULL END)  AS Score3, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 2 THEN 1 ELSE NULL END)  AS Score2, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 1 THEN 1 ELSE NULL END)  AS Score1 FROM IVR_SURVEY_TRANS JOIN EMPLOYEE ON EMPLOYEE.EMP_ID = IVR_SURVEY_TRANS.AGENT_ID WHERE  SURVEY_DATETIME >= @currentDate AND SURVEY_DATETIME <= DATEADD(day, 1, @currentDate) AND  EMPLOYEE.DIVISION_ID = @DIVISION_ID",
                (error, result) => {
                  if (error) {
                    console.log(error);
                    res.status(400).json("Error while query data.");
                  } else {
                    res.status(200).json(calculate(result));
                  }
                }
              );
          } catch (error) {
            console.log(error);
            res.status(500).json("Error while connect database.");
          }
        } else if (decoded.userRole === "manager") {
          try {
            request
              .input("currentDate", sql.NVarChar, currentDate)
              .query(
                "SELECT COUNT(Score) AS scorelength, COUNT(CASE WHEN Score = 98 THEN 1 ELSE NULL END)  AS nodata, COUNT(CASE WHEN Score = 5 THEN 1 ELSE NULL END)  AS Score5, COUNT(CASE WHEN Score = 4 THEN 1 ELSE NULL END)  AS Score4, COUNT(CASE WHEN Score = 3 THEN 1 ELSE NULL END)  AS Score3, COUNT(CASE WHEN Score = 2 THEN 1 ELSE NULL END)  AS Score2, COUNT(CASE WHEN Score = 1 THEN 1 ELSE NULL END)  AS Score1 FROM IVR_SURVEY_TRANS WHERE  SURVEY_DATETIME >= @currentDate AND SURVEY_DATETIME <= DATEADD(day, 1, @currentDate)",
                (error, result) => {
                  if (error) {
                    console.log(error);
                    res.status(400).json("Error while query data.");
                  } else {
                    res.json(calculate(result));
                  }
                }
              );
          } catch (error) {
            console.log(error);
            res.status(500).json("Error while connect database.");
          }
        }
      }
    });
  });
  
  app.post("/getdatasetadmin", (req, res) => {
    jwt.verify(req.body.token, secretKey, (err, decoded) => {
      if (err) {
        res.status(200).json(false, "Invalid token");
      } else {
        try {
          const currentDate = new Date()
            .toLocaleString("en-US", { timeZone: "Asia/Bangkok" })
            .split(", ")[0];
          const request = new sql.Request(pool);
          request
            .input("currentDate", sql.NVarChar, currentDate)
            .input("DIVISION_ID", sql.NVarChar, decoded.DIVISION_ID)
            .query(
              "SELECT IVR_SURVEY_TRANS.SURVEY_TOPIC AS name, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 5 THEN 1 ELSE NULL END) AS Score5, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 4 THEN 1 ELSE NULL END) AS Score4, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 3 THEN 1 ELSE NULL END) AS Score3, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 2 THEN 1 ELSE NULL END) AS Score2, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 1 THEN 1 ELSE NULL END) AS Score1 FROM IVR_SURVEY_TRANS JOIN EMPLOYEE ON EMPLOYEE.EMP_ID = IVR_SURVEY_TRANS.AGENT_ID WHERE SURVEY_TOPIC <> '' AND  SURVEY_DATETIME >= @currentDate AND SURVEY_DATETIME <= DATEADD(day, 1, @currentDate) GROUP BY SURVEY_TOPIC;",
              (error, result) => {
                if (error) {
                  console.log(error);
                  res.status(400).json("Error while query data.");
                } else {
                  res.status(200).json(result.recordset);
                }
              }
            );
        } catch (error) {
          console.log(error);
          res.status(500).json("Error while connect database.");
        }
      }
    });
  });
  
  app.post("/getdatasetpercentageadmin", (req, res) => {
    jwt.verify(req.body.token, secretKey, (err) => {
      if (err) {
        console.error("Invalid token:");
        res.status(200).json(false, "Invalid token");
      } else {
        try {
          const request = new sql.Request(pool);
          const currentDate = new Date()
            .toISOString()
            .slice(0, 19)
            .replace("T", " ");
          request
            .input("currentDate", sql.NVarChar, currentDate)
            .query(
              "SELECT COUNT(Score) AS scorelength, COUNT(CASE WHEN Score = 98 THEN 1 ELSE NULL END)  AS nodata, COUNT(CASE WHEN Score = 5 THEN 1 ELSE NULL END)  AS Score5, COUNT(CASE WHEN Score = 4 THEN 1 ELSE NULL END)  AS Score4, COUNT(CASE WHEN Score = 3 THEN 1 ELSE NULL END)  AS Score3, COUNT(CASE WHEN Score = 2 THEN 1 ELSE NULL END)  AS Score2, COUNT(CASE WHEN Score = 1 THEN 1 ELSE NULL END)  AS Score1 FROM IVR_SURVEY_TRANS WHERE  SURVEY_DATETIME >= @currentDate AND SURVEY_DATETIME <= DATEADD(day, 1, @currentDate)",
              (error, result) => {
                if (error) {
                  console.log(error);
                  res.status(400).json("Error while query data.");
                } else {
                  res.json(calculate(result));
                }
              }
            );
        } catch (error) {
          console.log(error);
          res.status(500).json("Error while connect database.");
        }
      }
    });
  });
  app.post("/getagent", (req, res) => {
    jwt.verify(req.body.token, secretKey, (err) => {
      if (err) {
        console.error("Invalid token:");
        res.status(200).json(false, "Invalid token");
      } else {
        try {
          const request = new sql.Request(pool);
          request
            .input("DIVISION_ID", sql.NVarChar, req.body.supervisor)
            .query(
              "SELECT EMP_ID,EMP_FIRSTNAME,DIVISION_ID FROM EMPLOYEE WHERE ROLE_ID = '3' AND DIVISION_ID = @DIVISION_ID",
              (error, result) => {
                if (error) {
                  console.log(error);
                  res.status(400).json("Error while query data.");
                } else {
                  res.status(200).json(result.recordset);
                }
              }
            );
        } catch (error) {
          console.log(error);
          res.status(500).json("Error while connect database");
        }
      }
    });
  });
  app.post("/getsupervisor", (req, res) => {
    jwt.verify(req.body.token, secretKey, (err, decoded) => {
      if (err) {
        console.error("Invalid token:");
        res.status(200).json(false, "Invalid token");
      } else {
        if (decoded.userRole === "supervisor") {
          try {
            const request = new sql.Request(pool);
            request
              .input("DIVISION_ID", sql.NVarChar, decoded.DIVISION_ID)
              .query(
                "SELECT EMP_ID,EMP_FIRSTNAME,DIVISION_ID FROM EMPLOYEE WHERE ROLE_ID = '2' AND DIVISION_ID = @DIVISION_ID",
                (error, result) => {
                  if (error) {
                    console.log(error);
                    res.status(400).json("Error while query data.");
                  } else {
                    res.status(200).json(result.recordset);
                  }
                }
              );
          } catch (error) {
            console.log(error);
            res.status(500).json("Error while connect database");
          }
        } else if (decoded.userRole === "manager") {
          try {
            const request = new sql.Request(pool);
            request.query(
              "SELECT EMP_ID,EMP_FIRSTNAME,DIVISION_ID FROM EMPLOYEE WHERE ROLE_ID = '2'",
              (error, result) => {
                if (error) {
                  console.log(error);
                  res.status(400).json("Error while query data.");
                } else {
                  res.status(200).json(result.recordset);
                }
              }
            );
          } catch (error) {
            console.log(error);
            res.status(500).json("Error while connect database");
          }
        }
      }
    });
  });
  app.post("/getpointreport", (req, res) => {
    jwt.verify(req.body.token, secretKey, (err, decoded) => {
      if (err) {
        console.error("Invalid token:");
        res.status(200).json(false, "Invalid token");
      } else {
        const request = new sql.Request(pool);
        data = req.body;
        const value1 = req.body.value1;
        const value2 = req.body.value2;
        const value3 = req.body.value3;
        const value4 = req.body.value4;
        const value5 = req.body.value5;
        const Noinput = req.body.noData;
        const topic = req.body.reportTopic;
        const cusTel = req.body.cusTel;
        const DIVISION = req.body.supervisor;
        const agent = req.body.agent;
        const startDate = req.body.startDateTime;
        const endDate = req.body.endDateTime;
        if (decoded.userRole === "supervisor") {
          try {
            request
              .input("value1", sql.NVarChar, value1)
              .input("value2", sql.NVarChar, value2)
              .input("value3", sql.NVarChar, value3)
              .input("value4", sql.NVarChar, value4)
              .input("value5", sql.NVarChar, value5)
              .input("Noinput", sql.NVarChar, Noinput)
              .input("topic", sql.NVarChar, topic)
              .input("start", sql.NVarChar, data.startDate)
              .input("end", sql.NVarChar, data.endDate)
              .input("cusTel", sql.NVarChar, cusTel)
              .input("DIVISION", sql.NVarChar, decoded.DIVISION_ID)
              .input("agent", sql.NVarChar, agent)
              .input("startDate", sql.NVarChar, startDate)
              .input("endDate", sql.NVarChar, endDate)
              .query(
                "SELECT DISTINCT CONVERT(varchar(10), IVR_SURVEY_TRANS.SURVEY_DATETIME, 111) AS Date, RIGHT(CONVERT(varchar(19), IVR_SURVEY_TRANS.SURVEY_DATETIME, 120), 8) AS Time, IVR_SURVEY_TRANS.AGENT_ID, EMPLOYEE.EMP_FIRSTNAME, DIVISION.DIVISION_NAME, IVR_SURVEY_TRANS.SCORE, IVR_SURVEY_TRANS.MSISDN, IVR_SURVEY_TRANS.PLACE, IVR_SURVEY_TRANS.ROUTE_POINT, IVR_SURVEY_TRANS.SURVEY_TOPIC, EMPLOYEE2.EMP_FIRSTNAME AS SUPERVISOR FROM IVR_SURVEY_TRANS JOIN EMPLOYEE ON EMPLOYEE.EMP_ID = IVR_SURVEY_TRANS.AGENT_ID JOIN DIVISION ON DIVISION.DIVISION_ID = EMPLOYEE.DIVISION_ID JOIN EMPLOYEE AS EMPLOYEE2 ON EMPLOYEE.DIVISION_ID = EMPLOYEE2.DIVISION_ID AND EMPLOYEE2.ROLE_ID = '2' WHERE IVR_SURVEY_TRANS.SURVEY_DATETIME >= @startDate AND IVR_SURVEY_TRANS.SURVEY_DATETIME <= @endDate AND DIVISION.DIVISION_ID = @DIVISION  AND EMPLOYEE.EMP_FIRSTNAME LIKE '%' + @AGENT + '%' AND IVR_SURVEY_TRANS.SURVEY_TOPIC LIKE '%' + @topic + '%' AND IVR_SURVEY_TRANS.MSISDN LIKE '%' + @cusTel + '%' AND (IVR_SURVEY_TRANS.SCORE LIKE @value1 OR IVR_SURVEY_TRANS.SCORE LIKE @value2 OR IVR_SURVEY_TRANS.SCORE LIKE @value3 OR IVR_SURVEY_TRANS.SCORE LIKE @value4 OR IVR_SURVEY_TRANS.SCORE LIKE @value5 OR IVR_SURVEY_TRANS.SCORE LIKE @Noinput)",
                (error, result) => {
                  if (error) {
                    console.log(error);
                    res.status(400).json("Error while query data.");
                  } else {
                    let data = result.recordset;
                    res.status(200).json(data);
                  }
                }
              );
          } catch (error) {
            console.log(error);
            res.status(500).json("Error while connect database.");
          }
        } else if (decoded.userRole === "manager") {
          try {
            request
              .input("value1", sql.NVarChar, value1)
              .input("value2", sql.NVarChar, value2)
              .input("value3", sql.NVarChar, value3)
              .input("value4", sql.NVarChar, value4)
              .input("value5", sql.NVarChar, value5)
              .input("Noinput", sql.NVarChar, Noinput)
              .input("topic", sql.NVarChar, topic)
              .input("start", sql.NVarChar, data.startDate)
              .input("end", sql.NVarChar, data.endDate)
              .input("cusTel", sql.NVarChar, cusTel)
              .input("DIVISION", sql.NVarChar, DIVISION)
              .input("agent", sql.NVarChar, agent)
              .input("startDate", sql.NVarChar, startDate)
              .input("endDate", sql.NVarChar, endDate)
              .query(
                "SELECT DISTINCT CONVERT(varchar(10), IVR_SURVEY_TRANS.SURVEY_DATETIME, 111) AS Date, RIGHT(CONVERT(varchar(19), IVR_SURVEY_TRANS.SURVEY_DATETIME, 120), 8) AS Time, IVR_SURVEY_TRANS.AGENT_ID, EMPLOYEE.EMP_FIRSTNAME, DIVISION.DIVISION_NAME, IVR_SURVEY_TRANS.SCORE, IVR_SURVEY_TRANS.MSISDN, IVR_SURVEY_TRANS.PLACE, IVR_SURVEY_TRANS.ROUTE_POINT, IVR_SURVEY_TRANS.SURVEY_TOPIC, EMPLOYEE2.EMP_FIRSTNAME AS SUPERVISOR FROM IVR_SURVEY_TRANS JOIN EMPLOYEE ON EMPLOYEE.EMP_ID = IVR_SURVEY_TRANS.AGENT_ID JOIN DIVISION ON DIVISION.DIVISION_ID = EMPLOYEE.DIVISION_ID JOIN EMPLOYEE AS EMPLOYEE2 ON EMPLOYEE.DIVISION_ID = EMPLOYEE2.DIVISION_ID AND EMPLOYEE2.ROLE_ID = '2' WHERE IVR_SURVEY_TRANS.SURVEY_DATETIME >= @startDate AND IVR_SURVEY_TRANS.SURVEY_DATETIME <= @endDate AND DIVISION.DIVISION_ID LIKE '%' + @DIVISION + '%' AND EMPLOYEE.EMP_FIRSTNAME LIKE '%' + @AGENT + '%' AND IVR_SURVEY_TRANS.SURVEY_TOPIC LIKE '%' + @topic + '%' AND IVR_SURVEY_TRANS.MSISDN LIKE '%' + @cusTel + '%' AND (IVR_SURVEY_TRANS.SCORE LIKE @value1 OR IVR_SURVEY_TRANS.SCORE LIKE @value2 OR IVR_SURVEY_TRANS.SCORE LIKE @value3 OR IVR_SURVEY_TRANS.SCORE LIKE @value4 OR IVR_SURVEY_TRANS.SCORE LIKE @value5 OR IVR_SURVEY_TRANS.SCORE LIKE @Noinput)",
                (error, result) => {
                  if (error) {
                    console.log(error);
                    res.status(400).json("Error while query data.");
                  } else {
                    let data = result.recordset;
  
                    res.status(200).json(data);
                  }
                }
              );
          } catch (error) {
            console.log(error);
            res.status(500).json("Error while connect database.");
          }
        }
      }
    });
  });
  
  app.post("/searchfromid", (req, res) => {
    jwt.verify(req.body.token, secretKey, (err) => {
      if (err) {
        console.error("Invalid token:");
        res.status(200).json(false, "Invalid token");
      } else {
        try {
          const request = new sql.Request(pool);
          const agentID = req.body.agentID;
          request
            .input("agentID", sql.NVarChar, agentID)
            .query(
              "SELECT EMP_FIRSTNAME FROM EMPLOYEE WHERE EMP_ID = @agentID",
              (error, result) => {
                if (error) {
                  console.log(error);
                  res.status(400).json("Error while query data.");
                } else {
                  const data = result.recordset;
                  res.status(200).json(data);
                }
              }
            );
        } catch (error) {
          console.log(error);
          res.status(500).json("Error while connect Database.");
        }
      }
    });
  });
  
  app.post("/", (req, res) => {
    jwt.verify(req.body.token, secretKey, (err, decoded) => {
      if (err) {
        console.error("Invalid token:");
        res.status(200).json(false, "Invalid token");
      } else {
        const request = new sql.Request(pool);
        data = req.body;
        if (decoded.userRole === "supervisor") {
          try {
            const request = new sql.Request(pool);
            data = req.body;
            request
              .input("supervisor", sql.NVarChar, decoded.DIVISION_ID)
              .input("agent", sql.NVarChar, data.agent)
              .input("reportTopic", sql.NVarChar, data.reportTopic)
              .input("startDate", sql.NVarChar, data.startDateTime)
              .input("endDate", sql.NVarChar, data.endDateTime)
              .query(
                "SELECT EMPLOYEE.EMP_FIRSTNAME, SUM(CASE WHEN IVR_SURVEY_TRANS.Score <> '98' THEN CAST(IVR_SURVEY_TRANS.Score AS INT) ELSE 0 END) AS sumscore, AVG(CASE WHEN IVR_SURVEY_TRANS.Score <> '98' THEN CAST(IVR_SURVEY_TRANS.Score AS FLOAT) ELSE NULL END) AS avgscore, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score <> '98' THEN IVR_SURVEY_TRANS.Score END) AS scorelength, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = '98' THEN 1 ELSE NULL END) AS nodata, SUM(CASE WHEN IVR_SURVEY_TRANS.Score = '5' THEN 1 ELSE 0 END) AS Score5, SUM(CASE WHEN IVR_SURVEY_TRANS.Score = '4' THEN 1 ELSE 0 END) AS Score4, SUM(CASE WHEN IVR_SURVEY_TRANS.Score = '3' THEN 1 ELSE 0 END) AS Score3, SUM(CASE WHEN IVR_SURVEY_TRANS.Score = '2' THEN 1 ELSE 0 END) AS Score2, SUM(CASE WHEN IVR_SURVEY_TRANS.Score = '1' THEN 1 ELSE 0 END) AS Score1 FROM IVR_SURVEY_TRANS JOIN EMPLOYEE ON EMPLOYEE.EMP_ID = IVR_SURVEY_TRANS.AGENT_ID WHERE IVR_SURVEY_TRANS.SURVEY_DATETIME >= @startDate AND IVR_SURVEY_TRANS.SURVEY_DATETIME <= @endDate AND EMPLOYEE.DIVISION_ID = @supervisor AND EMPLOYEE.EMP_FIRSTNAME LIKE '%' + @agent + '%' AND IVR_SURVEY_TRANS.SURVEY_TOPIC LIKE '%' + @reportTopic + '%' GROUP BY EMPLOYEE.EMP_FIRSTNAME ORDER BY EMPLOYEE.EMP_FIRSTNAME;",
                (error, result) => {
                  if (error) {
                    console.log(error);
                    res.status(400).json("Error while query data.");
                  } else {
                    res.status(200).json(result.recordset);
                  }
                }
              );
          } catch (error) {
            console.log(error);
            res.status(500).json("Error while connec database.");
          }
        } else if (decoded.userRole === "manager") {
          try {
            const request = new sql.Request(pool);
            data = req.body;
            request
              .input("supervisor", sql.NVarChar, data.supervisor)
              .input("agent", sql.NVarChar, data.agent)
              .input("reportTopic", sql.NVarChar, data.reportTopic)
              .input("startDate", sql.NVarChar, data.startDateTime)
              .input("endDate", sql.NVarChar, data.endDateTime)
              .query(
                "SELECT EMPLOYEE.EMP_FIRSTNAME, SUM(CASE WHEN IVR_SURVEY_TRANS.Score <> '98' THEN 1 ELSE 0 END) AS sumscore, AVG(CASE WHEN IVR_SURVEY_TRANS.Score <> '98' THEN IVR_SURVEY_TRANS.Score ELSE NULL END) AS avgscore, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score <> '98' THEN IVR_SURVEY_TRANS.Score END) AS scorelength, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = '98' THEN 1 ELSE NULL END) AS nodata, SUM(CASE WHEN IVR_SURVEY_TRANS.Score = '5' THEN 1 ELSE 0 END) AS Score5, SUM(CASE WHEN IVR_SURVEY_TRANS.Score = '4' THEN 1 ELSE 0 END) AS Score4, SUM(CASE WHEN IVR_SURVEY_TRANS.Score = '3' THEN 1 ELSE 0 END) AS Score3, SUM(CASE WHEN IVR_SURVEY_TRANS.Score = '2' THEN 1 ELSE 0 END) AS Score2, SUM(CASE WHEN IVR_SURVEY_TRANS.Score = '1' THEN 1 ELSE 0 END) AS Score1 FROM IVR_SURVEY_TRANS JOIN EMPLOYEE ON EMPLOYEE.EMP_ID = IVR_SURVEY_TRANS.AGENT_ID WHERE IVR_SURVEY_TRANS.SURVEY_DATETIME >= @startDate AND IVR_SURVEY_TRANS.SURVEY_DATETIME <= @endDate AND EMPLOYEE.DIVISION_ID LIKE '%' + @supervisor + '%' AND EMPLOYEE.EMP_FIRSTNAME LIKE '%' + @agent + '%' AND IVR_SURVEY_TRANS.SURVEY_TOPIC LIKE '%' + @reportTopic + '%' GROUP BY EMPLOYEE.EMP_FIRSTNAME ORDER BY EMPLOYEE.EMP_FIRSTNAME;",
                (error, result) => {
                  if (error) {
                    console.log(error);
                    res.status(400).json("Error while query data.");
                  } else {
                    res.status(200).json(result.recordset);
                  }
                }
              );
          } catch (error) {
            console.log(error);
            res.status(500).json("Error while connec database.");
          }
        }
      }
    });
  });
  
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
  
  app.post("/getdatafotsearchgharp", (req, res) => {
    jwt.verify(req.body.token, secretKey, (err, decoded) => {
      if (err) {
        console.error("Invalid token:");
        res.status(200).json(false, "Invalid token");
      } else {
        const startDate = req.body.startDate;
        const endDate = req.body.endDate;
        const request = new sql.Request(pool);
        data = req.body;
        if (decoded.userRole === "supervisor") {
          try {
            const startDate = req.body.startDate;
            const endDate = req.body.endDate;
            const request = new sql.Request(pool);
            request
              .input("startDate", sql.NVarChar, startDate)
              .input("endDate", sql.NVarChar, endDate)
              .input("DIVISION_ID", sql.NVarChar, decoded.DIVISION_ID)
              .query(
                "SELECT IVR_SURVEY_TRANS.SURVEY_TOPIC AS name, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 5 THEN 1 ELSE NULL END) AS Score5, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 4 THEN 1 ELSE NULL END) AS Score4, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 3 THEN 1 ELSE NULL END) AS Score3, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 2 THEN 1 ELSE NULL END) AS Score2, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 1 THEN 1 ELSE NULL END) AS Score1 FROM IVR_SURVEY_TRANS JOIN EMPLOYEE ON EMPLOYEE.EMP_ID = IVR_SURVEY_TRANS.AGENT_ID WHERE  IVR_SURVEY_TRANS.SURVEY_DATETIME >= @startDate AND IVR_SURVEY_TRANS.SURVEY_DATETIME < DATEADD(day, 1, @endDate) AND SURVEY_TOPIC <> '' AND  EMPLOYEE.DIVISION_ID = @DIVISION_ID GROUP BY SURVEY_TOPIC",
                (error, result) => {
                  if (error) {
                    console.log(error);
                    res.status(400).json("Error while query data.");
                  } else {
                    res.status(200).json(result.recordset);
                  }
                }
              );
          } catch (error) {
            console.log(error);
            res.status(500).json("Error while connect database.");
          }
        } else if (decoded.userRole === "manager") {
          try {
            const startDate = req.body.startDate;
            const endDate = req.body.endDate;
            const request = new sql.Request(pool);
            request
              .input("startDate", sql.NVarChar, startDate)
              .input("endDate", sql.NVarChar, endDate)
              .query(
                "SELECT SURVEY_TOPIC AS name, COUNT(CASE WHEN Score = 5 THEN 1 ELSE NULL END) AS 'Score5', COUNT(CASE WHEN Score = 4 THEN 1 ELSE NULL END) AS Score4, COUNT(CASE WHEN Score = 3 THEN 1 ELSE NULL END) AS Score3, COUNT(CASE WHEN Score = 2 THEN 1 ELSE NULL END) AS Score2, COUNT(CASE WHEN Score = 1 THEN 1 ELSE NULL END) AS Score1 FROM IVR_SURVEY_TRANS WHERE  IVR_SURVEY_TRANS.SURVEY_DATETIME >= @startDate AND IVR_SURVEY_TRANS.SURVEY_DATETIME < DATEADD(day, 1, @endDate) AND SURVEY_TOPIC <> ''GROUP BY SURVEY_TOPIC",
                (error, result) => {
                  if (error) {
                    console.log(error);
                    res.status(400).json("Error while query data.");
                  } else {
                    res.status(200).json(result.recordset);
                  }
                }
              );
          } catch (error) {
            console.log(error);
            res.status(500).json("Error while connect database.");
          }
        }
      }
    });
  });
  
  app.post("/getdataforsearchpercentage", (req, res) => {
    jwt.verify(req.body.token, secretKey, (err, decoded) => {
      if (err) {
        console.error("Invalid token:");
        res.status(200).json(false, "Invalid token");
      } else {
        const startDate = req.body.startDate;
        const endDate = req.body.endDate;
        const request = new sql.Request(pool);
  
        if (decoded.userRole === "supervisor") {
          try {
            request
              .input("startDate", sql.NVarChar, startDate)
              .input("endDate", sql.NVarChar, endDate)
              .input("DIVISION_ID", sql.NVarChar, decoded.DIVISION_ID)
              .query(
                "SELECT COUNT(IVR_SURVEY_TRANS.Score) AS scorelength, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 98 THEN 1 ELSE NULL END)  AS nodata, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 5 THEN 1 ELSE NULL END)  AS Score5, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 4 THEN 1 ELSE NULL END)  AS Score4, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 3 THEN 1 ELSE NULL END)  AS Score3, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 2 THEN 1 ELSE NULL END)  AS Score2, COUNT(CASE WHEN IVR_SURVEY_TRANS.Score = 1 THEN 1 ELSE NULL END)  AS Score1 FROM IVR_SURVEY_TRANS JOIN EMPLOYEE ON EMPLOYEE.EMP_ID = IVR_SURVEY_TRANS.AGENT_ID WHERE IVR_SURVEY_TRANS.SURVEY_DATETIME >= @startDate AND IVR_SURVEY_TRANS.SURVEY_DATETIME < DATEADD(day, 1, @endDate) AND DIVISION_ID = @DIVISION_ID",
                (error, result) => {
                  if (error) {
                    console.log(error);
                    res.status(400).json("Error while query data.");
                  } else {
                    res.json(calculate(result));
                  }
                }
              );
          } catch (error) {
            console.log(error);
            res.status(500).json("Error while connect database.");
          }
        } else if (decoded.userRole === "manager") {
          try {
            request
              .input("startDate", sql.NVarChar, startDate)
              .input("endDate", sql.NVarChar, endDate)
              .query(
                "SELECT COUNT(Score) AS scorelength, COUNT(CASE WHEN Score = 98 THEN 1 ELSE NULL END)  AS nodata, COUNT(CASE WHEN Score = 5 THEN 1 ELSE NULL END)  AS Score5, COUNT(CASE WHEN Score = 4 THEN 1 ELSE NULL END)  AS Score4, COUNT(CASE WHEN Score = 3 THEN 1 ELSE NULL END)  AS Score3, COUNT(CASE WHEN Score = 2 THEN 1 ELSE NULL END)  AS Score2, COUNT(CASE WHEN Score = 1 THEN 1 ELSE NULL END)  AS Score1 FROM IVR_SURVEY_TRANS WHERE IVR_SURVEY_TRANS.SURVEY_DATETIME >= @startDate AND IVR_SURVEY_TRANS.SURVEY_DATETIME < DATEADD(day, 1, @endDate) ",
                (error, result) => {
                  if (error) {
                    console.log(error);
                    res.status(400).json("Error while query data.");
                  } else {
                    res.json(calculate(result));
                  }
                }
              );
          } catch (error) {
            console.log(error);
            res.status(500).json("Error while connect database.");
          }
        }
      }
    });
  });