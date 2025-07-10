import { jest } from "@jest/globals";
import { EnhancedResponse, ResponseFactory, ResponseStatus, RiskLevel } from "../../../src/core/enhanced-response.js";

describe("Basic Enhanced Response Tests", () => {
  describe("EnhancedResponse", () => {
    it("should create a response with default values", () => {
      const response = new EnhancedResponse({});
      expect(response.status).toBe(ResponseStatus.SUCCESS);
      expect(response.success).toBeUndefined();
      expect(response.message).toBe("");
      expect(response.data).toBeNull();
      expect(response.suggestions).toEqual([]);
      expect(response.risks).toEqual([]);
    });

    it("should create a response with custom values", () => {
      const response = new EnhancedResponse({
        status: ResponseStatus.ERROR,
        message: "Test error",
        data: { error: "details" }
      });
      expect(response.status).toBe(ResponseStatus.ERROR);
      expect(response.success).toBeUndefined();
      expect(response.message).toBe("Test error");
      expect(response.data).toEqual({ error: "details" });
    });

    it("should add suggestions", () => {
      const response = new EnhancedResponse({});
      response.addSuggestion("test", "Test suggestion", "high");
      expect(response.suggestions).toHaveLength(1);
      expect(response.suggestions[0].action).toBe("test");
      expect(response.suggestions[0].description).toBe("Test suggestion");
      expect(response.suggestions[0].priority).toBe("high");
    });

    it("should add risks", () => {
      const response = new EnhancedResponse({});
      response.addRisk(RiskLevel.HIGH, "High risk operation");
      expect(response.risks).toHaveLength(1);
      expect(response.risks[0].level).toBe(RiskLevel.HIGH);
      expect(response.risks[0].description).toBe("High risk operation");
    });

    it("should add metadata", () => {
      const response = new EnhancedResponse({});
      response.addMetadata("testKey", "testValue");
      expect(response.metadata.testKey).toBe("testValue");
    });

    it("should add context", () => {
      const response = new EnhancedResponse({});
      response.addContext("user", "test-user");
      expect(response.context.user).toBe("test-user");
    });

    it("should set team activity", () => {
      const response = new EnhancedResponse({});
      const teamActivity = { commits: [], branches: [] };
      response.setTeamActivity(teamActivity);
      expect(response.teamActivity).toEqual(teamActivity);
    });

    it("should convert to object", () => {
      const response = new EnhancedResponse({
        status: ResponseStatus.SUCCESS,
        message: "Test",
        data: { value: 42 }
      });
      const obj = response.toObject();
      expect(obj.status).toBe("success");
      expect(obj.message).toBe("Test");
      expect(obj.data).toEqual({ value: 42 });
    });
  });

  describe("ResponseFactory", () => {
    it("should create success response", () => {
      const response = ResponseFactory.success("Success", { result: true });
      expect(response.status).toBe(ResponseStatus.SUCCESS);
      expect(response.message).toBe("Success");
      expect(response.data).toEqual({ result: true });
    });

    it("should create error response", () => {
      const error = new Error("Test error");
      const response = ResponseFactory.error("Failed", error);
      expect(response.status).toBe(ResponseStatus.ERROR);
      expect(response.message).toBe("Failed");
      expect(response.data.error).toBe("Test error");
    });

    it("should create warning response", () => {
      const response = ResponseFactory.warning("Warning", { issue: "minor" });
      expect(response.status).toBe(ResponseStatus.WARNING);
      expect(response.message).toBe("Warning");
      expect(response.data).toEqual({ issue: "minor" });
    });

    it("should create info response", () => {
      const response = ResponseFactory.info("Info", { detail: "value" });
      expect(response.status).toBe(ResponseStatus.INFO);
      expect(response.message).toBe("Info");
      expect(response.data).toEqual({ detail: "value" });
    });

    it("should create response from object", () => {
      const obj = {
        status: "success",
        message: "From object",
        data: { imported: true }
      };
      const response = ResponseFactory.fromObject(obj);
      expect(response.status).toBe(ResponseStatus.SUCCESS);
      expect(response.message).toBe("From object");
      expect(response.data).toEqual({ imported: true });
    });
  });

  describe("Response Methods", () => {
    it("should check if response has errors", () => {
      const success = ResponseFactory.success("OK");
      const error = ResponseFactory.error("Failed");
      
      expect(success.hasErrors()).toBe(false);
      expect(error.hasErrors()).toBe(true);
    });

    it("should check if response has warnings", () => {
      const success = ResponseFactory.success("OK");
      const warning = ResponseFactory.warning("Caution");
      
      expect(success.hasWarnings()).toBe(false);
      expect(warning.hasWarnings()).toBe(true);
    });

    it("should check if response has risks", () => {
      const response = ResponseFactory.success("OK");
      expect(response.risks.length).toBe(0);
      
      response.addRisk(RiskLevel.LOW, "Minor risk");
      expect(response.risks.length).toBeGreaterThan(0);
    });

    it("should check if response has suggestions", () => {
      const response = ResponseFactory.success("OK");
      expect(response.suggestions.length).toBe(0);
      
      response.addSuggestion("tip", "Try this", "low");
      expect(response.suggestions.length).toBeGreaterThan(0);
    });
  });
});