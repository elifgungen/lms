const request = require("supertest");
const app = require("../src/app");
const prisma = require("../src/db");
const { ensureRoles } = require("../src/startup/init");

beforeAll(async () => {
  await ensureRoles();
});

afterAll(async () => {
  await prisma.$disconnect();
});

test("rbac blocks student on course create", async () => {
  const email = `student_${Date.now()}@test.com`;
  const password = "Password123!";

  await request(app).post("/auth/register").send({ email, password });

  const login = await request(app).post("/auth/login").send({
    email,
    password
  });

  const res = await request(app)
    .post("/courses")
    .set("Authorization", `Bearer ${login.body.accessToken}`)
    .send({ title: "Course A", description: "Desc" });

  expect(res.status).toBe(403);
});
