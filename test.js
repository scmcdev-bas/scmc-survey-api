app.post("/test", upload.single('file'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ message: 'No file uploaded.' });
        return;
      }
      const workbook = xlsx.readFile(file.path);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = xlsx.utils.sheet_to_json(worksheet);
      await poolConnect;
      const transaction = new sql.Transaction(pool);
      await transaction.begin();
      try {
        const request = new sql.Request(pool);
        for (const row of data) {
          request.query(
            `SELECT SUPERVISOR_ID FROM M_SUPERVISOR WHERE SUPERVISOR_ID = '${row.SUPERVISOR_ID}'`, (error, result) => {
              console.log(result.rowsAffected)
              if(error){
                res.status(500).json({ message: 'Error inserting data into the database.' });
              }else{
                res.status(200).json({message : 'success'})
              }
            }
          );
        }
        await transaction.commit();
      } catch (error) {
        console.error(error);
        await transaction.rollback();
        res.status(500).json({ message: 'Error inserting data into the database.' });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error processing the file.' });
    }
  });
  
  
  
  


  app.post("/test", upload.single("file"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        res.json("ไม่พบไฟลืเพื่ออัปโหลด");
        return;
      }
      const workbook = xlsx.readFile(file.path);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = xlsx.utils.sheet_to_json(worksheet);
      const transaction = new sql.Transaction(pool);
      await transaction.begin();
      let totalData = 0;
      try {
        for (const row of data) {
          const result = await new Promise((resolve, reject) => {
            const request = new sql.Request(transaction);
            request.query(
              `SELECT SUPERVISOR_ID FROM M_SUPERVISOR WHERE SUPERVISOR_ID = '${row.SUPERVISOR_ID}'`,
              (error, result) => {
                if (error) {
                  reject(error);
                } else {
                  resolve(result);
                }
              }
            );
          });
          totalData += result.rowsAffected[0];
        }
  
        if (totalData === 0) {
          try {
            for (const row of data) {
              const date = new Date();
              const formattedDate = date.toISOString().replace('T', ' ').substring(0, 19);
              await transaction.request().query(
                `INSERT INTO M_SUPERVISOR (SUPERVISOR_ID, SUPERVISOR_NAME, DIVISION_ID, DIVISION_NAME, INSERT_DATE) VALUES ('${row.SUPERVISOR_ID}', '${row.SUPERVISOR_NAME}', '${row.DIVISION_ID}', '${row.DIVISION_NAME}', '${formattedDate}')`
              );
            }
            await transaction.commit();
            res.json('อัปโหลดไฟล์สำเร็จ');
          } catch (error) {
            console.error(error);
            await transaction.rollback();
            res.json('เกิดข้อผิดพลาดในการอัปโหลด');
          }
        } else {
          res.json("ข้อมูลที่ต้องการเพิ่มมีข้อมูลในระบบแล้ว");
        }
      } catch (error) {
        console.error(error);
      }
    } catch (error) {
      console.error(error);
      res.json("เกิดข้อผิดพลาดในการแปลงไฟล์");
    }
  });