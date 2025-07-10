import { jest } from "@jest/globals";

// Mock enhanced response
const mockEnhancedResponse = {
  toObject: jest.fn().mockReturnValue({
    status: "success",
    message: "Test",
    data: { result: true },
  }),
};

const mockResponseFactory = {
  success: jest.fn().mockReturnValue(mockEnhancedResponse),
  error: jest.fn().mockReturnValue(mockEnhancedResponse),
};

jest.unstable_mockModule("../../../src/core/enhanced-response.js", () => ({
  ResponseFactory: mockResponseFactory,
  EnhancedResponse: jest.fn(() => mockEnhancedResponse),
}));

// Mock enhancers
const mockEnhance = jest.fn().mockImplementation(async (response) => response);
jest.unstable_mockModule("../../../src/enhancers/index.js", () => ({
  enhance: mockEnhance,
  initializeDefaultEnhancers: jest.fn(),
}));

// Import after mocking
const { wrapToolWithEnhancer, initializeEnhancers } = await import(
  "../../../src/core/server-enhancer-integration.js"
);

describe("Server Enhancer Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("wrapToolWithEnhancer", () => {
    it("should wrap a tool handler with enhancement", async () => {
      const mockHandler = jest.fn().mockResolvedValue({
        success: true,
        data: { value: 42 },
      });

      const wrappedHandler = wrapToolWithEnhancer(mockHandler);
      const result = await wrappedHandler({ param: "test" });

      expect(mockHandler).toHaveBeenCalledWith({ param: "test" });
      expect(mockEnhance).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should handle tool errors", async () => {
      const mockHandler = jest.fn().mockRejectedValue(new Error("Tool failed"));

      const wrappedHandler = wrapToolWithEnhancer(mockHandler);
      const result = await wrappedHandler({});

      expect(mockResponseFactory.error).toHaveBeenCalled();
      expect(mockEnhance).toHaveBeenCalled();
    });

    it("should pass context to enhancer", async () => {
      const mockHandler = jest.fn().mockResolvedValue({
        success: true,
        data: {},
      });

      const wrappedHandler = wrapToolWithEnhancer(mockHandler);
      await wrappedHandler({ operation: "test" });

      expect(mockEnhance).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          operation: expect.any(String),
        })
      );
    });

    it("should handle legacy response format", async () => {
      const mockHandler = jest.fn().mockResolvedValue({
        success: true,
        message: "Legacy response",
        data: { old: true },
      });

      const wrappedHandler = wrapToolWithEnhancer(mockHandler);
      const result = await wrappedHandler({});

      expect(mockResponseFactory.success).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should preserve tool metadata", async () => {
      const mockHandler = jest.fn().mockResolvedValue({
        success: true,
        data: {},
      });
      mockHandler.name = "testTool";
      mockHandler.description = "Test tool";

      const wrappedHandler = wrapToolWithEnhancer(mockHandler);

      expect(wrappedHandler.name).toBe("testTool");
      expect(wrappedHandler.description).toBe("Test tool");
    });
  });

  describe("initializeEnhancers", () => {
    it("should initialize default enhancers", async () => {
      const { initializeDefaultEnhancers } = await import("../../../src/enhancers/index.js");
      
      await initializeEnhancers();

      expect(initializeDefaultEnhancers).toHaveBeenCalled();
    });

    it("should handle initialization errors", async () => {
      const { initializeDefaultEnhancers } = await import("../../../src/enhancers/index.js");
      initializeDefaultEnhancers.mockRejectedValueOnce(new Error("Init failed"));

      await expect(initializeEnhancers()).rejects.toThrow("Init failed");
    });
  });

  describe("integration", () => {
    it("should support full enhancement workflow", async () => {
      const mockHandler = jest.fn().mockResolvedValue({
        success: true,
        data: { workflow: "complete" },
      });

      const wrappedHandler = wrapToolWithEnhancer(mockHandler);
      const params = { action: "process" };
      
      const result = await wrappedHandler(params);

      // Verify the flow
      expect(mockHandler).toHaveBeenCalledWith(params);
      expect(mockResponseFactory.success).toHaveBeenCalled();
      expect(mockEnhance).toHaveBeenCalled();
      expect(mockEnhancedResponse.toObject).toHaveBeenCalled();
      expect(result).toEqual({
        status: "success",
        message: "Test",
        data: { result: true },
      });
    });

    it("should handle different response statuses", async () => {
      const mockHandler = jest.fn().mockResolvedValue({
        success: false,
        error: "Something went wrong",
      });

      const wrappedHandler = wrapToolWithEnhancer(mockHandler);
      await wrappedHandler({});

      expect(mockResponseFactory.error).toHaveBeenCalled();
    });
  });
});