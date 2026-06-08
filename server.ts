import { app } from "./app";
import { initializeDatabase } from "./src/db/initializeDb";

initializeDatabase();

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
