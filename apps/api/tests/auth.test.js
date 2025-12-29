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

test("login succeeds", async () => {
  const email = `user_${Date.now()}@test.com`;
  const password = "Password123!";

  await request(app).post("/auth/register").send({ email, password });

  const res = await request(app).post("/auth/login").send({
    email,
    password
  });

  expect(res.status).toBe(200);
  expect(res.body.accessToken).toBeTruthy();
  expect(res.body.refreshToken).toBeTruthy();
});
