import app from "./app.js";

const port = Number(process.env.PORT || 5000);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new Error("PORT must be an integer between 0 and 65535.");
}

const server = app.listen(port, (error) => {
  if (error) {
    console.error("Unable to start Doin:", error.message);
    process.exitCode = 1;
    return;
  }
  console.log(`Doin API listening on port ${server.address().port}`);
});
