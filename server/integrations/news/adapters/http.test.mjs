import { describe, it, expect } from "vitest";
import { readTextLimited } from "./http.js";

const streamResponse = (chunks, headers = {}) =>
  new Response(
    new ReadableStream({
      start(controller) {
        for (const c of chunks) controller.enqueue(new TextEncoder().encode(c));
        controller.close();
      },
    }),
    { headers }
  );

describe("readTextLimited", () => {
  it("returns the body when under the limit", async () => {
    expect(await readTextLimited(streamResponse(["hello ", "world"]), 100)).toBe("hello world");
  });

  it("rejects early on a large Content-Length", async () => {
    const res = streamResponse(["x"], { "content-length": "5000" });
    await expect(readTextLimited(res, 100)).rejects.toThrow(/larger than 100 bytes/);
  });

  it("aborts a stream that exceeds the limit without Content-Length", async () => {
    const res = streamResponse(["a".repeat(60), "b".repeat(60)]);
    await expect(readTextLimited(res, 100)).rejects.toThrow(/larger than 100 bytes/);
  });

  it("handles multi-byte characters split across chunks", async () => {
    const bytes = new TextEncoder().encode("blåbær");
    const res = new Response(
      new ReadableStream({
        start(c) {
          c.enqueue(bytes.slice(0, 3));
          c.enqueue(bytes.slice(3));
          c.close();
        },
      })
    );
    expect(await readTextLimited(res, 100)).toBe("blåbær");
  });
});
