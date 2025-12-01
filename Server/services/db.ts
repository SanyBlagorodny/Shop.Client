import mysql, { Connection } from "mysql2/promise";

const host = process.env.LOCAL_HOST;
const port = Number(process.env.DATABASE_PORT);
const username = process.env.ADMIN_USERNAME;
const password = process.env.ADMIN_PASSWORD;
const databaseName = process.env.DATABASE_NAME;

export async function initDataBase(): Promise<Connection | null> {
    let connection: Connection | null = null;

    try {
        connection = await mysql.createConnection({
            host: host,
            port: port,
            password: password,
            user: username,
            database: databaseName
        });

        // ensure credentials table and default admin user exist for Shop.Admin authentication
        await connection.query(
            `CREATE TABLE IF NOT EXISTS credentials (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
        );

        await connection.query(
            `INSERT INTO credentials (username, password)
             SELECT ?, ?
             FROM DUAL
             WHERE NOT EXISTS (
               SELECT 1 FROM credentials WHERE username = ?
             )`,
            ["admin", "admin", "admin"]
        );
    } catch (err: any) {
        console.error(err.message || err);
        return null;
    }

    console.log(`Connection to DB ProductsApplication established`);
    return connection;
}