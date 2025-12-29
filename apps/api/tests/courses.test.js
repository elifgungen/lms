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

test("course create works for instructor", async () => {
  const email = `instructor_${Date.now()}@test.com`;
  const password = "Password123!";

  await request(app).post("/auth/register").send({ email, password });

  const user = await prisma.user.findUnique({ where: { email } });
  const role = await prisma.role.findUnique({ where: { name: "instructor" } });
  await prisma.userRole.create({
    data: { userId: user.id, roleId: role.id }
  });

  const login = await request(app).post("/auth/login").send({
    email,
    password
  });

  const res = await request(app)
    .post("/courses")
    .set("Authorization", `Bearer ${login.body.accessToken}`)
    .send({ title: "Course A", description: "Desc" });

  expect(res.status).toBe(201);
  expect(res.body.data.title).toBe("Course A");
});
