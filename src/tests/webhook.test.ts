import { describe, expect, test, it} from 'vitest'; 
import request from "supertest";
import {app} from "../index"

describe("POST /api/webhooks", () => {
  it("should return the sum of two numbers", async () => {
    const res = await request(app).post("/api/webhooks").send({
      url: 'https://api.shubham.xyz', 
      events: ['payment received', 'payment initiated'], 
      secret: 'xyzad'
    }); 
    expect(res.statusCode).toBe(201);
    expect(res.body.url).toBe('https://api.shubham.xyz');
  });

  it("should return 400 body doesnt contain or has invalid inputs", async () => {
    const res = await request(app).post("/api/webhooks").send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Invalid input");
  })
})

describe("GET /api/webhooks", () => {
  it("should return registered webhooks"), async () => {
    const res = await request(app).get("api/webhooks")
    expect(res.statusCode).toBe(200);
    expect(res.body[0].url).toBe("https://api.shubham.xyz")
  }
}) 
