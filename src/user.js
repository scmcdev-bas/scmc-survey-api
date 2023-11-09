const jwt = require("jsonwebtoken");
const fs = require("fs");
const { sql, pool, secretKey } = require("./db");

const login = (req, res) => {
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
};

const addUser = (req, res) => {
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
};

const verifyAdmin = (req, res) => {
  jwt.verify(req.body.token, secretKey, (err, decoded) => {
    if (err) {
      console.error("Invalid token:");
      res.status(200).json(false, "Invalid token");
    } else if (decoded.userPermission != "admin") {
      res.status(200).json(false);
    } else res.status(200).json(decoded.userName);
  });
};

const verifyUser = (req, res) => {
  jwt.verify(req.body.token, secretKey, (err, decoded) => {
    if (err) {
      console.error("Invalid token:");
      res.status(200).json(false, "Invalid token");
    } else if (decoded.userPermission != "user") {
      res.status(200).json(false);
    } else res.status(200).json(decoded.userName);
  });
};

const verifyLogin = (req, res) => {
  jwt.verify(req.body.token, secretKey, (err, decoded) => {
    if (err) {
    } else if (decoded.userRole === "admin") {
      res.status(200).json("admin");
    } else if (decoded.userRole === "user") {
      res.status(200).json("user");
    } else res.status(200).json(decoded.userName);
  });
};

module.exports = {
  login,
  addUser,
  verifyAdmin,
  verifyUser,
  verifyLogin,
};
