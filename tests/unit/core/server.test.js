import { jest } from "@jest/globals";

describe("Core Server", () => {
  let consoleLogSpy;

  beforeEach(() => {
    jest.resetModules();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it("should log greeting message", async () => {
    await import("../../../src/core/server.js");
    
    expect(consoleLogSpy).toHaveBeenCalledWith("Hello from glam-mcp!");
  });
});