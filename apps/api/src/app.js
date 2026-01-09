const express = require("express");
const cors = require("cors");
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
const assignmentsRoutes = require("./routes/assignments");
const proctoringRoutes = require("./routes/proctoring");
const liveClassRoutes = require("./routes/liveClass");
const usersRoutes = require("./routes/users");
const twoFactorRoutes = require("./routes/twoFactor");
const omrRoutes = require("./routes/omr");
const plagiarismRoutes = require("./routes/plagiarism");
const templatesRoutes = require("./routes/templates");
const mattermostRoutes = require("./routes/mattermost");
const qtiRoutes = require("./routes/qti");
const xapiRoutes = require("./routes/xapi");
const storageRoutes = require("./routes/storage");

const app = express();

app.use(express.json());
// Allow all origins for mobile app access (demo mode)
app.use(cors());
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
app.use("/assignments", assignmentsRoutes);
app.use("/proctoring", proctoringRoutes);
app.use("/live-classes", liveClassRoutes);
app.use("/users", usersRoutes);
app.use("/2fa", twoFactorRoutes);
app.use("/omr", omrRoutes);
app.use("/plagiarism", plagiarismRoutes);
app.use("/templates", templatesRoutes);
app.use("/mattermost", mattermostRoutes);
app.use("/qti", qtiRoutes);
app.use("/xapi", xapiRoutes);
app.use("/storage", storageRoutes);

app.use(errorHandler);

module.exports = app;
