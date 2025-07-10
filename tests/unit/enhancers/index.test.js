import { jest } from "@jest/globals";
import {
  initializeDefaultEnhancers,
  createCustomPipeline,
  enhance,
  BaseEnhancer,
  EnhancerPriority,
  EnhancerPipeline,
  EnhancerRegistry,
  defaultRegistry,
  MetadataEnhancer,
  SuggestionsEnhancer,
  RiskAssessmentEnhancer,
  TeamActivityEnhancer,
} from "../../../src/enhancers/index.js";
import { EnhancedResponse } from "../../../src/core/enhanced-response.js";

// Mock the enhancer modules
jest.mock("../../../src/enhancers/core/metadata-enhancer.js", () => ({
  MetadataEnhancer: jest.fn().mockImplementation(() => ({
    name: "MetadataEnhancer",
    enhance: jest.fn((response) => response),
  })),
}));

jest.mock("../../../src/enhancers/core/suggestions-enhancer.js", () => ({
  SuggestionsEnhancer: jest.fn().mockImplementation(() => ({
    name: "SuggestionsEnhancer",
    enhance: jest.fn((response) => response),
  })),
}));

jest.mock("../../../src/enhancers/core/risk-assessment-enhancer.js", () => ({
  RiskAssessmentEnhancer: jest.fn().mockImplementation(() => ({
    name: "RiskAssessmentEnhancer",
    enhance: jest.fn((response) => response),
  })),
}));

jest.mock("../../../src/enhancers/core/team-activity-enhancer.js", () => ({
  TeamActivityEnhancer: jest.fn().mockImplementation(() => ({
    name: "TeamActivityEnhancer",
    enhance: jest.fn((response) => response),
  })),
}));

// Mock the registry
jest.mock("../../../src/enhancers/enhancer-registry.js", () => {
  const mockRegistry = {
    register: jest.fn().mockReturnThis(),
    createPipeline: jest.fn(),
    getPipeline: jest.fn(),
    clear: jest.fn(),
  };
  
  return {
    EnhancerRegistry: jest.fn(() => mockRegistry),
    defaultRegistry: mockRegistry,
  };
});

describe("Enhancer Index", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    defaultRegistry.clear();
  });

  describe("exports", () => {
    it("should export all required components", () => {
      expect(BaseEnhancer).toBeDefined();
      expect(EnhancerPriority).toBeDefined();
      expect(EnhancerPipeline).toBeDefined();
      expect(EnhancerRegistry).toBeDefined();
      expect(defaultRegistry).toBeDefined();
      expect(MetadataEnhancer).toBeDefined();
      expect(SuggestionsEnhancer).toBeDefined();
      expect(RiskAssessmentEnhancer).toBeDefined();
      expect(TeamActivityEnhancer).toBeDefined();
    });
  });

  describe("initializeDefaultEnhancers", () => {
    it("should register all default enhancers with correct configuration", async () => {
      const result = await initializeDefaultEnhancers();

      expect(defaultRegistry.register).toHaveBeenCalledTimes(4);
      
      // Check MetadataEnhancer registration
      expect(defaultRegistry.register).toHaveBeenCalledWith(
        MetadataEnhancer,
        {
          enabled: true,
          config: {
            includeSystemInfo: true,
            includeProcessInfo: false,
            includeTimestamps: true,
          },
        }
      );

      // Check SuggestionsEnhancer registration
      expect(defaultRegistry.register).toHaveBeenCalledWith(
        SuggestionsEnhancer,
        {
          enabled: true,
          config: {
            maxSuggestions: 5,
            includeDocLinks: true,
            contextAnalysis: true,
          },
        }
      );

      // Check RiskAssessmentEnhancer registration
      expect(defaultRegistry.register).toHaveBeenCalledWith(
        RiskAssessmentEnhancer,
        {
          enabled: true,
          config: {
            evaluateGitRisks: true,
            evaluateFileRisks: true,
            evaluateSecurityRisks: true,
          },
        }
      );

      // Check TeamActivityEnhancer registration
      expect(defaultRegistry.register).toHaveBeenCalledWith(
        TeamActivityEnhancer,
        {
          enabled: true,
          config: {
            includeRecentCommits: true,
            includeActiveBranches: true,
            includeContributors: true,
            maxRecentItems: 5,
          },
        }
      );

      expect(result).toBe(defaultRegistry);
    });

    it("should create default pipeline with correct options", async () => {
      await initializeDefaultEnhancers();

      expect(defaultRegistry.createPipeline).toHaveBeenCalledWith("default", {
        parallel: false,
        continueOnError: true,
        timeout: 5000,
      });
    });

    it("should use provided registry if specified", async () => {
      const customRegistry = {
        register: jest.fn().mockReturnThis(),
        createPipeline: jest.fn(),
      };

      await initializeDefaultEnhancers(customRegistry);

      expect(customRegistry.register).toHaveBeenCalledTimes(4);
      expect(customRegistry.createPipeline).toHaveBeenCalled();
      expect(defaultRegistry.register).not.toHaveBeenCalled();
    });
  });

  describe("createCustomPipeline", () => {
    it("should create pipeline with specified enhancers", () => {
      const enhancerNames = ["MetadataEnhancer", "RiskAssessmentEnhancer"];
      const mockPipeline = { name: "custom-pipeline" };
      defaultRegistry.createPipeline.mockReturnValue(mockPipeline);

      const result = createCustomPipeline(enhancerNames);

      expect(defaultRegistry.createPipeline).toHaveBeenCalledWith(
        expect.stringMatching(/^custom-\d+$/),
        {
          enhancers: enhancerNames,
        }
      );
      expect(result).toBe(mockPipeline);
    });

    it("should use custom name if provided", () => {
      const enhancerNames = ["MetadataEnhancer"];
      const options = { name: "my-pipeline", parallel: true };
      const mockPipeline = { name: "my-pipeline" };
      defaultRegistry.createPipeline.mockReturnValue(mockPipeline);

      const result = createCustomPipeline(enhancerNames, options);

      expect(defaultRegistry.createPipeline).toHaveBeenCalledWith(
        "my-pipeline",
        {
          enhancers: enhancerNames,
          name: "my-pipeline",
          parallel: true,
        }
      );
      expect(result).toBe(mockPipeline);
    });

    it("should pass through all options", () => {
      const enhancerNames = ["SuggestionsEnhancer"];
      const options = {
        parallel: true,
        continueOnError: false,
        timeout: 10000,
        custom: "value",
      };

      createCustomPipeline(enhancerNames, options);

      expect(defaultRegistry.createPipeline).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          enhancers: enhancerNames,
          parallel: true,
          continueOnError: false,
          timeout: 10000,
          custom: "value",
        })
      );
    });
  });

  describe("enhance", () => {
    it("should enhance response using default pipeline", async () => {
      const mockPipeline = {
        process: jest.fn().mockResolvedValue("enhanced-response"),
      };
      defaultRegistry.getPipeline.mockReturnValue(mockPipeline);

      const response = new EnhancedResponse({ success: true });
      const context = { sessionId: "test" };

      const result = await enhance(response, context);

      expect(defaultRegistry.getPipeline).toHaveBeenCalledWith("default");
      expect(mockPipeline.process).toHaveBeenCalledWith(response, context);
      expect(result).toBe("enhanced-response");
    });

    it("should use empty context if not provided", async () => {
      const mockPipeline = {
        process: jest.fn().mockResolvedValue("enhanced-response"),
      };
      defaultRegistry.getPipeline.mockReturnValue(mockPipeline);

      const response = new EnhancedResponse({ success: true });

      await enhance(response);

      expect(mockPipeline.process).toHaveBeenCalledWith(response, {});
    });

    it("should throw error if default pipeline not initialized", async () => {
      defaultRegistry.getPipeline.mockReturnValue(null);

      const response = new EnhancedResponse({ success: true });

      await expect(enhance(response)).rejects.toThrow(
        "Default pipeline not initialized. Call initializeDefaultEnhancers() first."
      );
    });
  });

  describe("integration", () => {
    it("should support full initialization and enhancement flow", async () => {
      // Mock pipeline for integration test
      const mockPipeline = {
        process: jest.fn().mockImplementation(async (response) => {
          response.addMetadata("enhanced", true);
          return response;
        }),
      };
      defaultRegistry.createPipeline.mockReturnValue(mockPipeline);
      defaultRegistry.getPipeline.mockReturnValue(mockPipeline);

      // Initialize
      await initializeDefaultEnhancers();

      // Create response
      const response = new EnhancedResponse({
        success: true,
        message: "Test response",
      });

      // Enhance
      const enhanced = await enhance(response, { test: true });

      // Verify
      expect(enhanced.metadata.enhanced).toBe(true);
    });

    it("should support custom pipeline creation and usage", () => {
      const mockPipeline = {
        name: "custom-test",
        process: jest.fn(),
      };
      defaultRegistry.createPipeline.mockReturnValue(mockPipeline);

      // Create custom pipeline
      const pipeline = createCustomPipeline(
        ["MetadataEnhancer", "SuggestionsEnhancer"],
        {
          name: "custom-test",
          parallel: true,
          timeout: 3000,
        }
      );

      expect(pipeline).toBe(mockPipeline);
      expect(defaultRegistry.createPipeline).toHaveBeenCalledWith(
        "custom-test",
        {
          enhancers: ["MetadataEnhancer", "SuggestionsEnhancer"],
          name: "custom-test",
          parallel: true,
          timeout: 3000,
        }
      );
    });
  });
});