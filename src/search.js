const jwt = require("jsonwebtoken");
const { sql, pool, secretKey } = require("./db"); // Assuming you have exported sql, pool, and secretKey from the db.js file

const searchAgentData = (req, res) => {
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
                res.status(400).json("Error while querying data.");
              } else {
                const data = result.recordset;
                res.status(200).json(data);
              }
            }
          );
      } catch (error) {
        console.log(error);
        res.status(500).json("Error while connecting to the Database.");
      }
    }
  });
};
const searchManagerData = (req, res) => {
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
};
const searchUser = (req, res) => {
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
};
module.exports = {
  searchAgentData,
  searchManagerData,
  searchUser,
};
