const express = require("express");
const rateLimit = require("./middleware/rateLimit");
const audit = require("./middleware/audit");
const { errorHandler } = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth");
const meRoutes = require("./routes/me");
const coursesRoutes = require("./routes/courses");
const modulesRoutes = require("./routes/modules");
const examsRoutes = require("./routes/exams");
const questionBankRoutes = require("./routes/questionBank");
const questionsRoutes = require("./routes/questions");
const attemptsRoutes = require("./routes/attempts");

const app = express();

app.use(express.json());
app.use(rateLimit);
app.use(audit);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/me", meRoutes);
app.use("/courses", coursesRoutes);
app.use("/modules", modulesRoutes);
app.use("/exams", examsRoutes);
app.use("/question-bank", questionBankRoutes);
app.use("/questions", questionsRoutes);
app.use("/attempts", attemptsRoutes);

app.use(errorHandler);

module.exports = app;
