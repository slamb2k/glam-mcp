import { jest } from "@jest/globals";
import {
  transformResponseData,
  mergeResponses,
  filterResponse,
  chainResponses,
  fromLegacyResponse,
  toLegacyResponse,
  withTiming,
  createResponseValidator,
} from "../../../src/utils/enhanced-response-utils.js";
import { 
  EnhancedResponse, 
  ResponseFactory, 
  ResponseStatus, 
  RiskLevel 
} from "../../../src/core/enhanced-response.js";

describe("Enhanced Response Utils", () => {
  describe("transformResponseData", () => {
    it("should transform response data", () => {
      const response = ResponseFactory.success("Test", { value: 10 });
      const transformed = transformResponseData(response, (data) => ({
        ...data,
        value: data.value * 2,
      }));

      expect(transformed.data.value).toBe(20);
      expect(transformed.message).toBe("Test");
    });

    it("should preserve other response properties", () => {
      const response = ResponseFactory.error("Error", new Error("Test"));
      response.addSuggestion("fix", "Fix the error", "high");
      
      const transformed = transformResponseData(response, (data) => ({
        ...data,
        transformed: true,
      }));

      expect(transformed.status).toBe(ResponseStatus.ERROR);
      expect(transformed.suggestions.length).toBe(1);
      expect(transformed.data.transformed).toBe(true);
    });
  });

  describe("mergeResponses", () => {
    it("should merge multiple responses with default strategy", () => {
      const response1 = ResponseFactory.success("First", { a: 1 });
      const response2 = ResponseFactory.success("Second", { b: 2 });
      const response3 = ResponseFactory.warning("Third", { c: 3 });

      const merged = mergeResponses([response1, response2, response3]);

      expect(merged.status).toBe(ResponseStatus.WARNING); // Highest severity
      expect(merged.data).toEqual({ First: { a: 1 }, Second: { b: 2 }, Third: { c: 3 } });
      expect(merged.message).toBe("Combined response");
    });

    it("should handle empty responses array", () => {
      const merged = mergeResponses([]);
      
      expect(merged.status).toBe(ResponseStatus.INFO);
      expect(merged.message).toBe("No responses to merge");
    });

    it("should return single response unchanged", () => {
      const response = ResponseFactory.success("Single", { data: true });
      const merged = mergeResponses([response]);
      
      expect(merged).toBe(response);
    });

    it("should use first-error strategy", () => {
      const response1 = ResponseFactory.success("Success", { a: 1 });
      const response2 = ResponseFactory.error("First error", new Error("Error 1"));
      const response3 = ResponseFactory.error("Second error", new Error("Error 2"));

      const merged = mergeResponses([response1, response2, response3], {
        combineStrategy: "first-error",
      });

      expect(merged).toBe(response2);
    });

    it("should combine suggestions and risks", () => {
      const response1 = ResponseFactory.success("First");
      response1.addSuggestion("action1", "Do something", "high");
      response1.addRisk(RiskLevel.LOW, "Minor risk");

      const response2 = ResponseFactory.success("Second");
      response2.addSuggestion("action2", "Do something else", "medium");
      response2.addRisk(RiskLevel.HIGH, "Major risk");

      const merged = mergeResponses([response1, response2]);

      expect(merged.suggestions.length).toBe(2);
      expect(merged.risks.length).toBe(2);
    });

    it("should use custom message", () => {
      const responses = [
        ResponseFactory.success("First"),
        ResponseFactory.success("Second"),
      ];

      const merged = mergeResponses(responses, {
        message: "Custom merge message",
      });

      expect(merged.message).toBe("Custom merge message");
    });
  });

  describe("filterResponse", () => {
    it("should filter by status", () => {
      const response = ResponseFactory.success("Test", { value: 42 });
      
      const filtered = filterResponse(response, { includeData: true });
      expect(filtered).toBeInstanceOf(EnhancedResponse);
      expect(filtered.data).toEqual({ value: 42 });

      const notFiltered = filterResponse(response, { includeData: false });
      expect(notFiltered.data).toBeNull();
    });

    it("should filter by risk level", () => {
      const response = ResponseFactory.success("Test");
      response.addRisk(RiskLevel.HIGH, "High risk operation");

      const filtered = filterResponse(response, { minRiskLevel: RiskLevel.MEDIUM });
      expect(filtered.risks).toHaveLength(1);

      const notFiltered = filterResponse(response, { minRiskLevel: RiskLevel.CRITICAL });
      expect(notFiltered.risks).toHaveLength(0);
    });

    it("should filter data inclusion", () => {
      const response = ResponseFactory.success("Test", { 
        type: "important",
        value: 100 
      });

      const filtered = filterResponse(response, {
        includeData: true,
      });
      expect(filtered.data).toBeDefined();

      const notFiltered = filterResponse(response, {
        includeData: false,
      });
      expect(notFiltered.data).toBeNull();
    });

    it("should filter suggestions inclusion", () => {
      const response = ResponseFactory.success("Test", { value: 50 });
      response.addSuggestion("test", "Test suggestion", "high");

      const filtered = filterResponse(response, {
        includeSuggestions: true,
      });
      expect(filtered.suggestions).toHaveLength(1);

      const notFiltered = filterResponse(response, {
        includeSuggestions: false,
      });
      expect(notFiltered.suggestions).toHaveLength(0);
    });
  });

  describe("chainResponses", () => {
    it("should chain response processors", () => {
      const initial = ResponseFactory.success("Start", { value: 1 });

      const result = chainResponses(
        initial,
        (response) => {
          response.data.value *= 2;
          return response;
        },
        (response) => {
          response.data.value += 10;
          return response;
        },
        (response) => {
          response.addSuggestion("final", "Final step", "low");
          return response;
        }
      );

      expect(result.data.value).toBe(12); // (1 * 2) + 10
      expect(result.suggestions.length).toBe(1);
    });

    it("should handle processor that returns new response", () => {
      const initial = ResponseFactory.success("Start", { value: 1 });

      const result = chainResponses(
        initial,
        (response) => ResponseFactory.success("Modified", { value: response.data.value * 10 })
      );

      expect(result.message).toBe("Modified");
      expect(result.data.value).toBe(10);
    });
  });

  describe("fromLegacyResponse", () => {
    it("should convert legacy success response", () => {
      const legacy = {
        success: true,
        message: "Operation completed",
        data: { result: 42 },
        context: { user: "test" },
      };

      const enhanced = fromLegacyResponse(legacy);

      expect(enhanced).toBeInstanceOf(EnhancedResponse);
      expect(enhanced.status).toBe(ResponseStatus.SUCCESS);
      expect(enhanced.message).toBe("Operation completed");
      expect(enhanced.data).toEqual({ result: 42 });
      expect(enhanced.metadata.legacy).toBe(true);
    });

    it("should convert legacy error response", () => {
      const legacy = {
        success: false,
        error: "Operation failed",
        code: "ERR_001",
      };

      const enhanced = fromLegacyResponse(legacy);

      expect(enhanced.status).toBe(ResponseStatus.ERROR);
      expect(enhanced.message).toBe("");
      expect(enhanced.data).toBe("Operation failed");
      expect(enhanced.metadata.legacy).toBe(true);
    });

    it("should handle legacy without special fields", () => {
      const legacy = {
        success: true,
        message: "Done",
        data: { completed: true },
      };

      const enhanced = fromLegacyResponse(legacy);

      expect(enhanced.status).toBe(ResponseStatus.SUCCESS);
      expect(enhanced.data).toEqual({ completed: true });
    });

    it("should handle legacy with status field", () => {
      const legacy = {
        status: ResponseStatus.WARNING,
        message: "Warning message",
        data: { warning: true },
      };

      const enhanced = fromLegacyResponse(legacy);

      expect(enhanced.status).toBe(ResponseStatus.WARNING);
      expect(enhanced.data).toEqual({ warning: true });
    });
  });

  describe("toLegacyResponse", () => {
    it("should convert enhanced response to legacy format", () => {
      const enhanced = ResponseFactory.success("Operation completed", { result: 42 });
      enhanced.addContext("user", "test");
      enhanced.addSuggestion("next", "Do this next", "high");
      enhanced.addRisk(RiskLevel.MEDIUM, "Some risk");

      const legacy = toLegacyResponse(enhanced);

      expect(legacy.success).toBe(true);
      expect(legacy.message).toBe("Operation completed");
      expect(legacy.data).toEqual({ result: 42 });
      expect(legacy.timestamp).toBeDefined();
    });

    it("should convert error response", () => {
      const enhanced = ResponseFactory.error("Failed", new Error("Test error"));
      
      const legacy = toLegacyResponse(enhanced);

      expect(legacy.success).toBe(false);
      expect(legacy.error).toBe("Test error");
      expect(legacy.message).toBe("Failed");
    });

    it("should handle response with team activity", () => {
      const enhanced = ResponseFactory.success("Done");
      enhanced.setTeamActivity({
        recentCommits: [{ author: "John", message: "Fix" }],
        activeContributors: ["John"],
      });

      const legacy = toLegacyResponse(enhanced);

      expect(legacy.success).toBe(true);
      expect(legacy.message).toBe("Done");
    });
  });

  describe("withTiming", () => {
    it("should add timing information to synchronous operation", async () => {
      const operation = () => ({ result: "done" });
      const responseFactory = (data) => ResponseFactory.success("Done", data);
      
      const timedOperation = withTiming(operation, responseFactory);
      const response = await timedOperation();

      expect(response.status).toBe(ResponseStatus.SUCCESS);
      expect(response.data).toEqual({ result: "done" });
      expect(response.metadata.duration).toBeDefined();
      expect(response.metadata.duration).toBeGreaterThanOrEqual(0);
    });

    it("should add timing to async operation", async () => {
      const operation = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { result: "async done" };
      };
      const responseFactory = (data) => ResponseFactory.success("Async done", data);

      const timedOperation = withTiming(operation, responseFactory);
      const response = await timedOperation();

      expect(response.data).toEqual({ result: "async done" });
      expect(response.metadata.duration).toBeGreaterThanOrEqual(50);
    });

    it("should handle operation that returns response", async () => {
      const operation = () => ResponseFactory.success("Custom", { custom: true });

      const timedOperation = withTiming(operation, (response) => response);
      const response = await timedOperation();

      expect(response.message).toBe("Custom");
      expect(response.data.custom).toBe(true);
      expect(response.metadata.duration).toBeDefined();
    });

    it("should handle operation errors", async () => {
      const operation = () => {
        throw new Error("Operation failed");
      };

      const timedOperation = withTiming(operation, ResponseFactory.success);
      const response = await timedOperation();

      expect(response.status).toBe(ResponseStatus.ERROR);
      expect(response.message).toBe("Operation failed");
      expect(response.metadata.duration).toBeDefined();
    });

    it("should use response factory if provided", async () => {
      const operation = () => ({ result: 42 });
      const factory = (data) => ResponseFactory.info("Custom info", data);

      const timedOperation = withTiming(operation, factory);
      const response = await timedOperation();

      expect(response.status).toBe(ResponseStatus.INFO);
      expect(response.message).toBe("Custom info");
      expect(response.data.result).toBe(42);
      expect(response.metadata.duration).toBeDefined();
    });
  });

  describe("createResponseValidator", () => {
    it("should validate response against schema", () => {
      const schema = {
        requiredFields: ["name", "value"],
        dataType: "object",
      };

      const validator = createResponseValidator(schema);

      const validResponse = ResponseFactory.success("Valid", {
        name: "Test",
        value: 42,
      });

      const invalidResponse = ResponseFactory.success("Invalid", {
        name: "Test",
        // missing value field
      });

      const validResult = validator(validResponse);
      expect(validResult).toBe(validResponse);

      const invalidResult = validator(invalidResponse);
      expect(invalidResult.status).toBe(ResponseStatus.ERROR);
      expect(invalidResult.data.error.errors).toContain("Missing required field: value");
    });

    it("should validate data type", () => {
      const schema = {
        dataType: "array",
      };

      const validator = createResponseValidator(schema);

      const validResponse = ResponseFactory.success("Valid", [1, 2, 3]);
      const invalidResponse = ResponseFactory.success("Invalid", { not: "array" });

      const validResult = validator(validResponse);
      expect(validResult).toBe(validResponse);

      const invalidResult = validator(invalidResponse);
      expect(invalidResult.status).toBe(ResponseStatus.ERROR);
      expect(invalidResult.data.error.errors).toContain("Expected data type array, got object");
    });

    it("should handle valid response", () => {
      const schema = {
        requiredFields: [],
        dataType: "object",
      };

      const validator = createResponseValidator(schema);

      const response = ResponseFactory.success("Valid", {
        any: "data",
      });

      const result = validator(response);
      expect(result).toBe(response);
    });
  });
});