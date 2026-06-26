import { check } from "k6";
import http from "k6/http";

const BASE_URL = __ENV.BASE_URL || "http://host.docker.internal:3002";

export const options = {
  vus: 2,
  duration: "10s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/health`);

  check(res, {
    "status is 200": (r) => r.status === 200,
    "body has UP": (r) => typeof r.body === "string" && r.body.includes("UP"),
  });

  sleep(1);
}
